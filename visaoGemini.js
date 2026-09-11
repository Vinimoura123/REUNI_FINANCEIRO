// Chama a API do Gemini (Google) pra rodar o extrator-comprovante de
// verdade (visão computacional) — ver
// antigravity-reuni/agents/extrator-comprovante/prompt.md.
//
// A chave (GEMINI_API_KEY) nunca fica no código, só em variável de
// ambiente, e nunca é exposta ao navegador — só o servidor chama o Gemini.
// GEMINI_MODEL é configurável (padrão abaixo) porque nomes de modelo do
// Gemini mudam com o tempo; se o padrão parar de funcionar, ajuste a env
// var sem precisar mexer em código.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

const PROMPT_EXTRACAO = `Você é um leitor de comprovantes de pagamento. Analise a imagem e extraia:
1. O valor TOTAL efetivamente pago (se houver subtotal e total, use o total).
2. A data da transação, no formato AAAA-MM-DD.
3. O nome do fornecedor, beneficiário ou contraparte, exatamente como aparece impresso.

Regras estritas:
- Nunca invente um campo. Se não conseguir ler com certeza, esse campo é null.
- Se a imagem inteira for ilegível, cortada demais, ou não parecer um comprovante de pagamento de verdade, os três campos vêm null e confianca fica baixa (<= 0.3).
- Se faltar o ano na data, o campo data_extraida vem null (nunca completa o ano por suposição).
- confianca (0.0 a 1.0) reflete a certeza conjunta sobre os três campos juntos, não uma média otimista — se qualquer um estiver ambíguo, a confiança cai junto.

Responda SOMENTE com um JSON válido, exatamente neste formato, sem texto antes ou depois:
{"valor_extraido": number ou null, "data_extraida": "AAAA-MM-DD" ou null, "fornecedor_extraido": string ou null, "confianca": number}`

export function geminiConfigurado() {
  return Boolean(GEMINI_API_KEY)
}

export async function extrairComprovanteViaGemini(base64Data, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurado no ambiente do servidor.')
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

  const body = {
    contents: [{
      parts: [
        { text: PROMPT_EXTRACAO },
        { inline_data: { mime_type: mimeType, data: base64Data } }
      ]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0
    }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API retornou ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const textoResposta = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!textoResposta) {
    throw new Error('Resposta do Gemini sem texto — possível bloqueio de conteúdo ou formato inesperado.')
  }

  let extraido
  try {
    extraido = JSON.parse(textoResposta)
  } catch (e) {
    throw new Error(`Resposta do Gemini não é JSON válido: ${textoResposta.slice(0, 300)}`)
  }

  // Nunca confia cegamente na forma da resposta do modelo — valida e
  // normaliza antes de devolver, mesmas regras do extrator-comprovante.
  const valor = typeof extraido.valor_extraido === 'number' ? extraido.valor_extraido : null
  const data_ = typeof extraido.data_extraida === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(extraido.data_extraida)
    ? extraido.data_extraida
    : null
  const fornecedor = typeof extraido.fornecedor_extraido === 'string' ? extraido.fornecedor_extraido : null
  const confianca = typeof extraido.confianca === 'number' ? Math.max(0, Math.min(1, extraido.confianca)) : 0

  return { valor_extraido: valor, data_extraida: data_, fornecedor_extraido: fornecedor, confianca }
}
