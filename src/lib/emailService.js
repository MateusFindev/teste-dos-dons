// lib/emailService.js
// Requer: npm i @emailjs/browser
import * as EmailJS from '@emailjs/browser'

/**
 * CONFIG
 * - Se definir VITE_EMAIL_BACKEND_URL, tentará enviar via backend.
 * - Caso contrário, usa EmailJS direto no client.
 * - Em DEV, se as chaves do EmailJS não estiverem configuradas, simula sucesso (mock).
 */
const EMAIL_BACKEND_URL = import.meta.env.VITE_EMAIL_BACKEND_URL || ''
const IS_DEV = !!import.meta.env.DEV
const FAKE_OK_DEV = (import.meta.env.VITE_EMAIL_FAKE_OK_DEV ?? 'true') === 'true'

const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || ''
}

// Organização → e-mail da coordenação (null/undefined = não enviar)
const EMAIL_ORGANIZACOES = {
  AEAV: 'aeav@aeav.com.br',
  Paranáfrigor: 'joaquim@paranafrigor.com.br',
  'OBPC Cascavel - São Cristóvão': 'administrativo@obpccascavel.com.br',
  'OBPC Cafelândia': 'ti@obpccafelandia.org',
  'Sem organização': null
}

// ===== helpers =====
const formatarResultadosParaEmail = (formData, resultados) => {
  const top3 = (resultados || []).slice(0, 3)
  const data = new Date()
  const dataStr = data.toLocaleDateString('pt-BR')
  const horaStr = data.toLocaleTimeString('pt-BR')

  let texto = `
=== TESTE DOS DONS ESPIRITUAIS ===

PARTICIPANTE:
Nome: ${formData.nome}
Organização: ${formData.igreja}
Email: ${formData.email || 'Não informado'}
Data: ${dataStr} às ${horaStr}

=== TOP 3 DONS PRINCIPAIS ===
`.trim()

  top3.forEach((dom, i) => {
    texto += `
${i + 1}º lugar: ${dom?.nome ?? 'N/A'}
Pontuação: ${dom?.pontuacao ?? 0} pontos (${dom?.percentual ?? 0}% do máximo)`
  })

  texto += `

=== PONTUAÇÃO COMPLETA ===
`
  ;(resultados || []).forEach((dom, i) => {
    texto += `${i + 1}. ${dom?.nome ?? 'N/A'}: ${dom?.pontuacao ?? 0} pts (${dom?.percentual ?? 0}%)\n`
  })

  texto += `
=== INTERPRETAÇÃO ===
• Pontuação alta (200+ pontos): Dom principal - busque oportunidades para desenvolvê-lo
• Pontuação média (100-199 pontos): Potencial para desenvolvimento
• Pontuação baixa (0-99 pontos): Não é necessariamente uma área de fraqueza

Este teste foi gerado automaticamente pelo sistema Teste dos Dons.
`

  return texto
}

const montarBlocosEmail = (resultados) => {
  const arr = Array.isArray(resultados) ? resultados : []
  const top3 = arr.slice(0, 3)

  const safe = (v) => v ?? ''
  const t = (i) => top3[i] || {}

  const top = {
    top1_nome: safe(t(0).nome),
    top1_pontos: safe(t(0).pontuacao ?? 0),
    top1_percentual: safe(t(0).percentual ?? 0),

    top2_nome: safe(t(1).nome),
    top2_pontos: safe(t(1).pontuacao ?? 0),
    top2_percentual: safe(t(1).percentual ?? 0),

    top3_nome: safe(t(2).nome),
    top3_pontos: safe(t(2).pontuacao ?? 0),
    top3_percentual: safe(t(2).percentual ?? 0)
  }

  const linhas = arr
    .map((dom, i) => {
      const pct = Math.max(0, Math.min(100, Number(dom.percentual || 0)))
      return `
<tr>
  <td style="font:12px Arial,Helvetica,sans-serif;color:#333;padding:8px;border-bottom:1px solid #f2f2f2;">${i + 1}</td>
  <td style="font:600 13px Arial,Helvetica,sans-serif;color:#111;padding:8px;border-bottom:1px solid #f2f2f2;">${dom.nome}</td>
  <td style="padding:8px;border-bottom:1px solid #f2f2f2;">
    <div style="width:160px;max-width:100%;height:8px;background:#eee;border-radius:6px;overflow:hidden;">
      <div style="height:8px;width:${pct}%;background:#6b5cf6;"></div>
    </div>
  </td>
  <td style="font:600 12px Arial,Helvetica,sans-serif;color:#2b2b2b;padding:8px;border-bottom:1px solid #f2f2f2;text-align:right;">
    ${dom.pontuacao} pts &nbsp;|&nbsp; ${pct}%
  </td>
</tr>`
    })
    .join('')

  return { ...top, tabela_resultados_html: linhas }
}

const buildTemplateParams = (formData, resultados, opts = {}) => {
  const textoResultados = formatarResultadosParaEmail(formData, resultados)
  const data = new Date()
  const blocos = montarBlocosEmail(resultados)

  return {
    from_name: opts.from_name ?? `${formData.igreja || 'Sem organização'} - Sistema Teste dos Dons`,
    reply_to: formData.email || 'nao-responder@exemplo.com',
    message: textoResultados,
    results_json: JSON.stringify(resultados || [], null, 2),

    participante_nome: formData.nome,
    participante_igreja: formData.igreja,            // compat com template atual
    participante_organizacao: formData.igreja || '', // campo opcional, caso ajuste o template
    participante_email: formData.email || 'Não informado',
    data_teste: data.toLocaleDateString('pt-BR'),
    hora_teste: data.toLocaleTimeString('pt-BR'),
    dom_principal: resultados?.[0]?.nome || 'N/A',
    pontuacao_principal: resultados?.[0]?.pontuacao || 0,

    to_email: opts.to_email,
    to_name: opts.to_name,
    subject: opts.subject ?? `Resultado do Teste dos Dons - ${formData.nome}`,

    ...blocos
  }
}

/**
 * Estratégia de envio:
 * 1) Se EMAIL_BACKEND_URL estiver definido -> envia via backend (server-side).
 * 2) Senão, se chaves EmailJS estiverem definidas -> EmailJS no client.
 * 3) Senão, em DEV e FAKE_OK_DEV=true -> MOCK (simula sucesso).
 * 4) Caso contrário -> not_configured.
 */
const enviar = async (templateParams) => {
  // 1) Backend (opcional)
  if (EMAIL_BACKEND_URL) {
    try {
      const resp = await fetch(EMAIL_BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_params: templateParams })
      })
      const data = await resp.json().catch(() => ({}))
      if (resp.ok && (data?.ok || data?.success)) {
        return { ok: true, provider: 'backend', data }
      }
      const e = data?.error || `Falha no envio (${resp.status})`
      return { ok: false, error: e, detail: data }
    } catch (e) {
      // falhou o backend: segue o fluxo (EmailJS / Mock)
      console.warn('[email] backend falhou, tentando EmailJS:', e?.message || e)
    }
  }

  // 2) EmailJS no client
  const { serviceId, templateId, publicKey } = EMAILJS_CONFIG
  if (serviceId && templateId && publicKey) {
    try {
      const result = await EmailJS.send(serviceId, templateId, templateParams, { publicKey })
      return { ok: true, provider: 'emailjs', result }
    } catch (err) {
      if (err?.status === 400 && /Public Key is invalid/i.test(err?.text || '')) {
        return { ok: false, error: 'invalid_public_key', detail: err?.text }
      }
      return { ok: false, error: err?.message || 'unknown_error', detail: err }
    }
  }

  // 3) Mock em DEV
  if (IS_DEV && FAKE_OK_DEV) {
    console.warn('[email] MOCK: chaves ausentes. Simulando envio com sucesso (dev).')
    console.debug('[email] payload simulado:', templateParams)
    return { ok: true, provider: 'mock', debug: 'no_keys_dev_mock' }
  }

  // 4) Não configurado
  return { ok: false, error: 'not_configured' }
}

// ===== exports =====
export const enviarEmailSecretaria = async (formData, resultados, destinatarioOverride) => {
  try {
    const emailCoord = destinatarioOverride ?? EMAIL_ORGANIZACOES[formData.igreja]
    if (!emailCoord) return { success: false, error: 'not_configured' }

    const params = buildTemplateParams(formData, resultados, {
      to_email: emailCoord,
      to_name: `Coordenação ${formData.igreja}`,
      from_name: 'Sistema Teste dos Dons',
      subject: `Novo Teste dos Dons - ${formData.nome}`
    })

    const response = await enviar(params)
    if (!response?.ok) return { success: false, error: response?.error || 'send_failed', detail: response?.detail }

    return { success: true, response }
  } catch (error) {
    return { success: false, error: error?.message || String(error) }
  }
}

export const enviarEmailUsuario = async (formData, resultados) => {
  try {
    const to = (formData?.email || '').trim()
    if (!to) return { success: false, error: 'not_configured' }

    const params = buildTemplateParams(formData, resultados, {
      to_email: to,
      to_name: formData.nome,
      from_name: `${formData.igreja || 'Sem organização'} - Sistema Teste dos Dons`,
      subject: `Seus Resultados do Teste dos Dons - ${formData.nome}`
    })

    const response = await enviar(params)
    if (!response?.ok) return { success: false, error: response?.error || 'send_failed', detail: response?.detail }

    return { success: true, response }
  } catch (error) {
    return { success: false, error: error?.message || String(error) }
  }
}

export const enviarEmails = async (formData, resultados) => {
  const out = { secretaria: { success: false }, usuario: { success: false } }
  try {
    const emailOrg = EMAIL_ORGANIZACOES[formData.igreja]
    const enviarCoord = !!emailOrg

    if (enviarCoord) {
      out.secretaria = await enviarEmailSecretaria(formData, resultados, emailOrg)
      await new Promise(r => setTimeout(r, 1200)) // rate limit
    } else {
      out.secretaria = { success: false, error: 'not_configured', skipped: true }
    }

    out.usuario = await enviarEmailUsuario(formData, resultados)
    return out
  } catch (err) {
    return out
  }
}

// Informativo
export const validarConfiguracaoEmail = () => ({
  backend: !!EMAIL_BACKEND_URL,
  emailjsConfigured: !!(EMAILJS_CONFIG.serviceId && EMAILJS_CONFIG.templateId && EMAILJS_CONFIG.publicKey),
  isDev: IS_DEV,
  fakeOkDev: FAKE_OK_DEV
})
