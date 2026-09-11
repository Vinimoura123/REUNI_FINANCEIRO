import { useEffect, useState } from 'react'
import { Lock, Loader2 } from 'lucide-react'
import { getAccessToken, setAccessToken, clearAccessToken, verifyAccessToken } from '../lib/auth'

// Bloqueia o app inteiro (leitura e escrita) até um REUNI_ACCESS_TOKEN válido
// ser informado. Fica fora do FinanceProvider de propósito: nada tenta ler
// /api/data antes de existir um token verificado.
export default function AuthGate({ children }) {
  const [status, setStatus] = useState('verificando') // verificando | autorizado | bloqueado
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const tokenSalvo = getAccessToken()
    if (!tokenSalvo) {
      setStatus('bloqueado')
      return
    }
    verifyAccessToken(tokenSalvo).then(ok => {
      if (ok) {
        setStatus('autorizado')
      } else {
        clearAccessToken()
        setStatus('bloqueado')
      }
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!senha || enviando) return
    setEnviando(true)
    setErro('')
    const ok = await verifyAccessToken(senha)
    setEnviando(false)
    if (ok) {
      setAccessToken(senha)
      setStatus('autorizado')
    } else {
      setErro('Senha incorreta.')
    }
  }

  if (status === 'verificando') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100">
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    )
  }

  if (status === 'autorizado') {
    return children
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-950 text-zinc-100 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl"
      >
        <div className="flex items-center gap-2 text-zinc-100">
          <Lock className="w-5 h-5" />
          <h1 className="text-sm font-semibold">REUNI Financeiro — acesso restrito</h1>
        </div>
        <p className="text-xs text-zinc-400">
          Digite a senha de acesso da comissão de Financeiro para continuar.
        </p>
        <input
          type="password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha de acesso"
          className="w-full px-3.5 py-2.5 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-600"
        />
        {erro && <p className="text-xs text-red-400">{erro}</p>}
        <button
          type="submit"
          disabled={enviando || !senha}
          className="w-full px-4 py-2.5 text-sm font-semibold bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
        >
          {enviando ? 'Verificando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
