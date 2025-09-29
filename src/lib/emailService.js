
const EMAILJS_CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_teste_dons',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_resultado',
  publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY'
}

const EMAIL_IGREJAS = {
  'OBPC Cascavel - São Cristóvão': 'administrativo@obpccascavel.com.br',
  'OBPC Cafelândia': 'ti@obpccafelandia.org'
}

// ===== helpers (iguais aos seus) =====
const formatarResultadosParaEmail = (formData, resultados) => {
  const top3 = (resultados || []).slice(0, 3)
  const data  = new Date()
  const dataStr = data.toLocaleDateString('pt-BR')
  const horaStr = data.toLocaleTimeString('pt-BR')

  let texto = `
=== TESTE DOS DONS ESPIRITUAIS ===

PARTICIPANTE:
Nome: ${formData.nome}
Igreja: ${formData.igreja}
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

  const safe = (v) => (v ?? '')
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
    top3_percentual: safe(t(2).percentual ?? 0),
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

  // Este objeto é o que vamos "espalhar" com ...blocos
  return { ...top, tabela_resultados_html: linhas }
}

const buildTemplateParams = (formData, resultados, opts = {}) => {
  const textoResultados = formatarResultadosParaEmail(formData, resultados)
  const data  = new Date()
  const blocos = montarBlocosEmail(resultados) // <- gera os campos do email estilizado

  return {
    from_name: opts.from_name ?? `${formData.igreja} - Sistema Teste dos Dons`,
    reply_to:  formData.email || 'nao-responder@exemplo.com',
    message:   textoResultados,
    results_json: JSON.stringify(resultados || [], null, 2),

    participante_nome: formData.nome,
    participante_igreja: formData.igreja,
    participante_email: formData.email || 'Não informado',
    data_teste: data.toLocaleDateString('pt-BR'),
    hora_teste: data.toLocaleTimeString('pt-BR'),
    dom_principal: resultados?.[0]?.nome || 'N/A',
    pontuacao_principal: resultados?.[0]?.pontuacao || 0,

    to_email: opts.to_email,
    to_name:  opts.to_name,
    subject:  opts.subject ?? `Resultado do Teste dos Dons - ${formData.nome}`,

    // Blocos para o HTML do template (top1/2/3 + tabela)
    ...blocos
  }
}

const enviarViaApi = async (templateParams) => {
  const resp = await fetch('/api/emailjs/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template_params: templateParams }) // <— aninhado
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || !data?.ok) {
    throw new Error(data?.error || `Falha no envio (${resp.status})`)
  }
  return data
}

// ===== exports =====
export const enviarEmailSecretaria = async (formData, resultados) => {
  try {
    const emailSecretaria = EMAIL_IGREJAS[formData.igreja]
    if (!emailSecretaria) throw new Error('Email da secretaria não encontrado para esta igreja')

    const params = buildTemplateParams(formData, resultados, {
      to_email: emailSecretaria,
      to_name: `Secretaria ${formData.igreja}`,
      from_name: 'Sistema Teste dos Dons',
      subject: `Novo Teste dos Dons - ${formData.nome}`
    })

    const response = await enviarViaApi(params)
    console.log('Email enviado para secretaria:', response)
    return { success: true, response }
  } catch (error) {
    console.error('Erro ao enviar email para secretaria:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

export const enviarEmailUsuario = async (formData, resultados) => {
  try {
    if (!formData.email || !formData.email.trim()) {
      return { success: true, message: 'Email do usuário não fornecido' }
    }

    const params = buildTemplateParams(formData, resultados, {
      to_email: formData.email,
      to_name: formData.nome,
      from_name: `${formData.igreja} - Sistema Teste dos Dons`,
      subject: `Seus Resultados do Teste dos Dons - ${formData.nome}`
    })

    const response = await enviarViaApi(params)
    console.log('Email enviado para usuário:', response)
    return { success: true, response }
  } catch (error) {
    console.error('Erro ao enviar email para usuário:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

export const enviarEmails = async (formData, resultados) => {
  const out = { secretaria: { success: false }, usuario: { success: false } }
  try {
    // se a sua lógica enviar só para Cafelândia, verifique aqui antes
    const enviarSecretaria = formData.igreja === 'OBPC Cafelândia'

    if (enviarSecretaria) {
      out.secretaria = await enviarEmailSecretaria(formData, resultados)
      // rate limit 1 req/seg: pequena pausa adicional por segurança
      await new Promise(r => setTimeout(r, 1200))
    } else {
      out.secretaria = { success: true, skipped: true }
    }

    out.usuario = await enviarEmailUsuario(formData, resultados)
    return out
  } catch (err) {
    console.error('Erro geral no envio de emails:', err)
    return out
  }
}

export const validarConfiguracaoEmail = () => ({
  isConfigured: true,
  message: 'Envio via API serverless habilitado'
})

