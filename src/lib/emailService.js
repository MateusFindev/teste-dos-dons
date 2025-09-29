import emailjs from '@emailjs/browser'

// =================== CONFIG ===================
// Pegue do .env (recomendado) ou deixe fallback
const EMAILJS_CONFIG = {
  serviceId: import.meta?.env?.VITE_EMAILJS_SERVICE_ID || 'service_teste_dons',
  templateId: import.meta?.env?.VITE_EMAILJS_TEMPLATE_ID || 'template_resultado',
  publicKey:  import.meta?.env?.VITE_EMAILJS_PUBLIC_KEY  || 'YOUR_PUBLIC_KEY'
}

// Evita reinit múltiplas vezes em ambientes HMR
let _emailjsInited = false
if (!_emailjsInited && EMAILJS_CONFIG.publicKey && EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY') {
  emailjs.init(EMAILJS_CONFIG.publicKey)
  _emailjsInited = true
}

// Mapeamento de e-mails das igrejas (secretaria)
const EMAIL_IGREJAS = {
  'OBPC Cascavel - São Cristóvão': 'administrativo@obpccascavel.com.br',
  'OBPC Cafelândia': 'administrativo@obpccafelandia.com.br'
}

// =================== HELPERS ===================

/**
 * Monta o texto legível (para {{message}} do template)
 */
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

/**
 * Monta os parâmetros comuns do template (mesmo template para secretaria e usuário)
 * - Você pode usar todos esses placeholders no EmailJS
 */
const buildTemplateParams = (formData, resultados, opts = {}) => {
  const textoResultados = formatarResultadosParaEmail(formData, resultados)
  const data  = new Date()

  return {
    // ======= Campos dinâmicos principais do template =======
    from_name: opts.from_name ?? `${formData.igreja} - Sistema Teste dos Dons`,
    reply_to:  formData.email || 'nao-responder@exemplo.com',
    message:   textoResultados,
    results_json: JSON.stringify(resultados || [], null, 2),

    // ======= Campos auxiliares / detalhes do participante =======
    participante_nome: formData.nome,
    participante_igreja: formData.igreja,
    participante_email: formData.email || 'Não informado',
    data_teste: data.toLocaleDateString('pt-BR'),
    hora_teste: data.toLocaleTimeString('pt-BR'),
    dom_principal: resultados?.[0]?.nome || 'N/A',
    pontuacao_principal: resultados?.[0]?.pontuacao || 0,

    // ======= Roteamento/Assunto dinâmico (use no template se quiser) =======
    to_email: opts.to_email, // use {{to_email}} como "To" no template do EmailJS (ou configure destino fixo no painel)
    to_name:  opts.to_name,
    subject:  opts.subject ?? `Resultado do Teste dos Dons - ${formData.nome}`
  }
}

/**
 * Envia via EmailJS usando o mesmo template para qualquer destino
 */
const enviarComTemplateUnico = async (templateParams) => {
  const resp = await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    templateParams
  )
  return resp
}

// =================== EXPORTS ===================

/**
 * Enviar email para a secretaria da igreja (usa o MESMO template)
 */
export const enviarEmailSecretaria = async (formData, resultados) => {
  try {
    const emailSecretaria = EMAIL_IGREJAS[formData.igreja]
    if (!emailSecretaria) {
      throw new Error('Email da secretaria não encontrado para esta igreja')
    }

    const params = buildTemplateParams(formData, resultados, {
      to_email: emailSecretaria,
      to_name: `Secretaria ${formData.igreja}`,
      from_name: 'Sistema Teste dos Dons',
      subject: `Novo Teste dos Dons - ${formData.nome}`
    })

    const response = await enviarComTemplateUnico(params)
    console.log('Email enviado para secretaria:', response)
    return { success: true, response }
  } catch (error) {
    console.error('Erro ao enviar email para secretaria:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Enviar email para o usuário (usa o MESMO template)
 */
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

    const response = await enviarComTemplateUnico(params)
    console.log('Email enviado para usuário:', response)
    return { success: true, response }
  } catch (error) {
    console.error('Erro ao enviar email para usuário:', error)
    return { success: false, error: error?.message || String(error) }
  }
}

/**
 * Enviar ambos (secretaria e usuário)
 */
export const enviarEmails = async (formData, resultados) => {
  const resultadosEnvio = {
    secretaria: { success: false },
    usuario: { success: false }
  }
  try {
    resultadosEnvio.secretaria = await enviarEmailSecretaria(formData, resultados)
    resultadosEnvio.usuario   = await enviarEmailUsuario(formData, resultados)
    return resultadosEnvio
  } catch (error) {
    console.error('Erro geral no envio de emails:', error)
    return resultadosEnvio
  }
}

/**
 * Validar configuração do EmailJS
 */
export const validarConfiguracaoEmail = () => {
  const valid =
    !!EMAILJS_CONFIG.serviceId &&
    !!EMAILJS_CONFIG.templateId &&
    !!EMAILJS_CONFIG.publicKey &&
    EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY'

  return {
    isConfigured: valid,
    message: valid
      ? 'EmailJS configurado corretamente'
      : 'Defina VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY no .env'
  }
}
