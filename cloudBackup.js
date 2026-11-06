// Camada de persistência remota automática (Cloud Vault) e suporte a disco
// persistente (REUNI_DATA_DIR) para ambientes com sistema de arquivos efêmero
// (ex.: Render Free Tier, que hiberna após 15 min de inatividade e reseta o
// container local para o commit do GitHub).
//
// Zero dependências externas: utiliza apenas fetch nativo do Node.js.
// Quando REUNI_GITHUB_TOKEN (ou GITHUB_TOKEN) está configurado no servidor,
// sincroniza data/reuni_db.json em uma branch isolada ("reuni-data-vault"),
// evitando loops de auto-deploy na branch "main".

import path from 'node:path'
import { ALLOWED_COLLECTIONS, applyOps, purgeDeleted } from './dbOps.js'

const DEFAULT_REPO = 'Vinimoura123/REUNI_FINANCEIRO'
const DEFAULT_VAULT_BRANCH = 'reuni-data-vault'
const VAULT_FILE_PATH = 'state/reuni_db.json'

let cachedSha = null
let syncTimer = null
let pendingSnapshot = null
let activeWritePromise = Promise.resolve()
let lastCloudSyncAt = null
let lastCloudError = null

export function resolveStoragePaths(rootDir) {
  const customDataDir = (process.env.REUNI_DATA_DIR || '').trim()
  const activeDataDir = customDataDir ? path.resolve(customDataDir) : path.join(rootDir, 'data')
  return {
    dataDir: activeDataDir,
    dbPath: path.join(activeDataDir, 'reuni_db.json'),
    localBackupsDir: path.join(activeDataDir, 'backups'),
    localDocsDir: path.join(activeDataDir, 'comprovantes'),
    seedDbPath: path.join(rootDir, 'data', 'reuni_db.seed.json'),
    usingPersistentDisk: Boolean(customDataDir)
  }
}

function getCloudConfig() {
  const githubToken = (process.env.REUNI_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '').trim()
  const githubRepo = (process.env.REUNI_GITHUB_REPO || DEFAULT_REPO).trim()
  const githubBranch = (process.env.REUNI_GITHUB_BRANCH || DEFAULT_VAULT_BRANCH).trim()
  const webhookUrl = (process.env.REUNI_CLOUD_SYNC_URL || '').trim()

  if (githubToken && githubRepo.includes('/')) {
    return { mode: 'github-vault', githubToken, githubRepo, githubBranch }
  }
  if (webhookUrl) {
    return { mode: 'webhook-kv', webhookUrl, webhookSecret: (process.env.REUNI_CLOUD_SYNC_SECRET || '').trim() }
  }
  return { mode: 'none' }
}

export function getCloudSyncTelemetry(usingPersistentDisk = false) {
  const cfg = getCloudConfig()
  return {
    cloudVaultEnabled: cfg.mode !== 'none' || usingPersistentDisk,
    persistenceMode: cfg.mode !== 'none'
      ? cfg.mode
      : (usingPersistentDisk ? 'persistent-disk' : 'browser-replica-mesh+local-disk'),
    lastCloudSyncAt,
    lastCloudError
  }
}

function githubHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'reuni-financeiro-cloud-vault'
  }
}

async function ensureGithubVaultBranch(githubToken, githubRepo, githubBranch) {
  const refUrl = `https://api.github.com/repos/${githubRepo}/git/ref/heads/${encodeURIComponent(githubBranch)}`
  const checkRes = await fetch(refUrl, { headers: githubHeaders(githubToken) })
  if (checkRes.ok) return true
  if (checkRes.status !== 404) return false

  const repoRes = await fetch(`https://api.github.com/repos/${githubRepo}`, { headers: githubHeaders(githubToken) })
  if (!repoRes.ok) return false
  const repoMeta = await repoRes.json()
  const defaultBranch = repoMeta.default_branch || 'main'

  const baseRefRes = await fetch(
    `https://api.github.com/repos/${githubRepo}/git/ref/heads/${encodeURIComponent(defaultBranch)}`,
    { headers: githubHeaders(githubToken) }
  )
  if (!baseRefRes.ok) return false
  const baseRef = await baseRefRes.json()
  const baseSha = baseRef?.object?.sha
  if (!baseSha) return false

  const createRes = await fetch(`https://api.github.com/repos/${githubRepo}/git/refs`, {
    method: 'POST',
    headers: { ...githubHeaders(githubToken), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${githubBranch}`, sha: baseSha })
  })
  return createRes.ok || createRes.status === 422
}

async function fetchRemoteSnapshot() {
  const cfg = getCloudConfig()
  if (cfg.mode === 'github-vault') {
    const url = `https://api.github.com/repos/${cfg.githubRepo}/contents/${VAULT_FILE_PATH}?ref=${encodeURIComponent(cfg.githubBranch)}`
    const res = await fetch(url, { headers: githubHeaders(cfg.githubToken) })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`GitHub Vault GET HTTP ${res.status}`)
    const payload = await res.json()
    if (payload.sha) cachedSha = payload.sha
    if (!payload.content) return null
    const decoded = Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString('utf-8')
    return JSON.parse(decoded)
  }

  if (cfg.mode === 'webhook-kv') {
    const headers = { Accept: 'application/json' }
    if (cfg.webhookSecret) headers.Authorization = `Bearer ${cfg.webhookSecret}`
    const res = await fetch(cfg.webhookUrl, { headers })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Cloud Sync GET HTTP ${res.status}`)
    return await res.json()
  }

  return null
}

async function pushRemoteSnapshot(snapshot) {
  const cfg = getCloudConfig()
  if (cfg.mode === 'none') return false

  if (cfg.mode === 'github-vault') {
    await ensureGithubVaultBranch(cfg.githubToken, cfg.githubRepo, cfg.githubBranch)
    const contentBase64 = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8').toString('base64')
    const url = `https://api.github.com/repos/${cfg.githubRepo}/contents/${VAULT_FILE_PATH}`

    const attemptPut = async (shaToUse) => {
      const body = {
        message: `chore(vault): sync reuni_db rev #${snapshot.revision || 0}`,
        content: contentBase64,
        branch: cfg.githubBranch
      }
      if (shaToUse) body.sha = shaToUse
      return fetch(url, {
        method: 'PUT',
        headers: { ...githubHeaders(cfg.githubToken), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    }

    if (!cachedSha) {
      const metaRes = await fetch(`${url}?ref=${encodeURIComponent(cfg.githubBranch)}`, {
        headers: githubHeaders(cfg.githubToken)
      })
      if (metaRes.ok) {
        const meta = await metaRes.json()
        cachedSha = meta.sha || null
      }
    }

    let putRes = await attemptPut(cachedSha)
    if (putRes.status === 409 || putRes.status === 422) {
      const refreshRes = await fetch(`${url}?ref=${encodeURIComponent(cfg.githubBranch)}`, {
        headers: githubHeaders(cfg.githubToken)
      })
      if (refreshRes.ok) {
        const meta = await refreshRes.json()
        cachedSha = meta.sha || null
      }
      putRes = await attemptPut(cachedSha)
    }

    if (!putRes.ok) {
      throw new Error(`GitHub Vault PUT HTTP ${putRes.status}`)
    }
    const saved = await putRes.json()
    if (saved?.content?.sha) cachedSha = saved.content.sha
    lastCloudSyncAt = new Date().toISOString()
    lastCloudError = null
    return true
  }

  if (cfg.mode === 'webhook-kv') {
    const headers = { 'Content-Type': 'application/json' }
    if (cfg.webhookSecret) headers.Authorization = `Bearer ${cfg.webhookSecret}`
    const res = await fetch(cfg.webhookUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(snapshot)
    })
    if (!res.ok) throw new Error(`Cloud Sync PUT HTTP ${res.status}`)
    lastCloudSyncAt = new Date().toISOString()
    lastCloudError = null
    return true
  }

  return false
}

// Mescla um snapshot remoto com o estado local sem jamais destruir registros
// existentes: aplica tombstones remotos e faz upsertMany de todas as coleções.
export function mergeCloudSnapshotIntoLocal(localDb, remoteDb) {
  if (!remoteDb || typeof remoteDb !== 'object') return { merged: localDb, changed: false }
  const beforeStr = JSON.stringify(localDb)
  const target = structuredClone(localDb)

  if (!target.deletedIds || typeof target.deletedIds !== 'object') target.deletedIds = {}
  if (remoteDb.deletedIds && typeof remoteDb.deletedIds === 'object') {
    for (const [delId, ts] of Object.entries(remoteDb.deletedIds)) {
      target.deletedIds[delId] = Math.max(Number(target.deletedIds[delId]) || 0, Number(ts) || 1)
    }
  }

  const ops = []
  for (const col of ALLOWED_COLLECTIONS) {
    if (Array.isArray(remoteDb[col]) && remoteDb[col].length > 0) {
      ops.push({ op: 'upsertMany', colecao: col, items: remoteDb[col] })
    }
  }

  if (ops.length > 0) {
    applyOps(target, ops, { minRevision: Number(remoteDb.revision) || 0 })
  } else {
    purgeDeleted(target)
    if ((Number(remoteDb.revision) || 0) > (Number(target.revision) || 0)) {
      target.revision = Number(remoteDb.revision)
    }
    if ((Number(remoteDb.updatedAt) || 0) > (Number(target.updatedAt) || 0)) {
      target.updatedAt = Number(remoteDb.updatedAt)
    }
  }

  const changed = JSON.stringify(target) !== beforeStr
  return { merged: target, changed }
}

export async function hydrateDbFromCloud(localDb) {
  const cfg = getCloudConfig()
  if (cfg.mode === 'none') return { db: localDb, hydrated: false }
  try {
    const remote = await fetchRemoteSnapshot()
    if (!remote) return { db: localDb, hydrated: false }
    const { merged, changed } = mergeCloudSnapshotIntoLocal(localDb, remote)
    lastCloudSyncAt = new Date().toISOString()
    lastCloudError = null
    return { db: merged, hydrated: changed }
  } catch (err) {
    lastCloudError = err.message
    console.warn('⚠️ [Cloud Vault] Não foi possível hidratar da nuvem na inicialização:', err.message)
    return { db: localDb, hydrated: false }
  }
}

export function scheduleCloudBackup(dbSnapshot) {
  const cfg = getCloudConfig()
  if (cfg.mode === 'none') return
  pendingSnapshot = structuredClone(dbSnapshot)

  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    const toWrite = pendingSnapshot
    pendingSnapshot = null
    syncTimer = null
    if (!toWrite) return

    activeWritePromise = activeWritePromise
      .then(() => pushRemoteSnapshot(toWrite))
      .catch(err => {
        lastCloudError = err.message
        console.warn('⚠️ [Cloud Vault] Falha ao espelhar estado remoto:', err.message)
      })
  }, 1200)
}
