import emailjs from '@emailjs/browser'

// Configurações do EmailJS (você precisará configurar no painel do EmailJS)
const EMAILJS_CONFIG = {
  serviceId: 'service_teste_dons', // Será configurado no EmailJS
  templateId: 'template_resultado', // Será configurado no EmailJS
  publicKey: 'YOUR_PUBLIC_KEY' // Será configurado no EmailJS
}

// Inicializar EmailJS
emailjs.init(EMAILJS_CONFIG.publicKey)

// Mapeamento de emails das igrejas
const EMAIL_IGREJAS = {
  'OBPC Cascavel - São Cristóvão': 'administrativo@obpccascavel.com.br',
  'OBPC Cafelândia': 'administrativo@obpccafelandia.com.br'
}

/**
 * Formatar resultados para email
 */
const formatarResultadosParaEmail = (formData, resultados) => {
  const top3 = resultados.slice(0, 3)
  
  let textoResultados = `
=== TESTE DOS DONS ESPIRITUAIS ===

PARTICIPANTE:
Nome: ${formData.nome}
Igreja: ${formData.igreja}
Email: ${formData.email || 'Não informado'}
Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}

=== TOP 3 DONS PRINCIPAIS ===
`

  top3.forEach((dom, index) => {
    textoResultados += `
${index + 1}º lugar: ${dom.nome}
Pontuação: ${dom.pontuacao} pontos (${dom.percentual}% do máximo)
`
  })

  textoResultados += `
=== PONTUAÇÃO COMPLETA ===
`

  resultados.forEach((dom, index) => {
    textoResultados += `${index + 1}. ${dom.nome}: ${dom.pontuacao} pts (${dom.percentual}%)\n`
  })

  textoResultados += `
=== INTERPRETAÇÃO ===
• Pontuação alta (200+ pontos): Dom principal - busque oportunidades para desenvolvê-lo
• Pontuação média (100-199 pontos): Potencial para desenvolvimento
• Pontuação baixa (0-99 pontos): Não é necessariamente uma área de fraqueza

Este teste foi gerado automaticamente pelo sistema Teste dos Dons.
`

  return textoResultados
}

/**
 * Enviar email para a secretaria da igreja
 */
export const enviarEmailSecretaria = async (formData, resultados) => {
  try {
    const emailSecretaria = EMAIL_IGREJAS[formData.igreja]
    
    if (!emailSecretaria) {
      throw new Error('Email da secretaria não encontrado para esta igreja')
    }

    const textoResultados = formatarResultadosParaEmail(formData, resultados)

    const templateParams = {
      to_email: emailSecretaria,
      to_name: `Secretaria ${formData.igreja}`,
      from_name: 'Sistema Teste dos Dons',
      subject: `Novo Teste dos Dons - ${formData.nome}`,
      message: textoResultados,
      participante_nome: formData.nome,
      participante_igreja: formData.igreja,
      participante_email: formData.email || 'Não informado',
      data_teste: new Date().toLocaleDateString('pt-BR'),
      hora_teste: new Date().toLocaleTimeString('pt-BR'),
      dom_principal: resultados[0]?.nome || 'N/A',
      pontuacao_principal: resultados[0]?.pontuacao || 0
    }

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    )

    console.log('Email enviado para secretaria:', response)
    return { success: true, response }

  } catch (error) {
    console.error('Erro ao enviar email para secretaria:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enviar email para o usuário
 */
export const enviarEmailUsuario = async (formData, resultados) => {
  try {
    if (!formData.email || !formData.email.trim()) {
      return { success: true, message: 'Email do usuário não fornecido' }
    }

    const textoResultados = formatarResultadosParaEmail(formData, resultados)

    const templateParams = {
      to_email: formData.email,
      to_name: formData.nome,
      from_name: `${formData.igreja} - Sistema Teste dos Dons`,
      subject: `Seus Resultados do Teste dos Dons - ${formData.nome}`,
      message: textoResultados,
      participante_nome: formData.nome,
      participante_igreja: formData.igreja,
      participante_email: formData.email,
      data_teste: new Date().toLocaleDateString('pt-BR'),
      hora_teste: new Date().toLocaleTimeString('pt-BR'),
      dom_principal: resultados[0]?.nome || 'N/A',
      pontuacao_principal: resultados[0]?.pontuacao || 0
    }

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams
    )

    console.log('Email enviado para usuário:', response)
    return { success: true, response }

  } catch (error) {
    console.error('Erro ao enviar email para usuário:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Enviar emails para secretaria e usuário
 */
export const enviarEmails = async (formData, resultados) => {
  const resultadosEnvio = {
    secretaria: { success: false },
    usuario: { success: false }
  }

  try {
    // Enviar para secretaria
    resultadosEnvio.secretaria = await enviarEmailSecretaria(formData, resultados)
    
    // Enviar para usuário (se email fornecido)
    resultadosEnvio.usuario = await enviarEmailUsuario(formData, resultados)

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
  const isConfigured = 
    EMAILJS_CONFIG.serviceId !== 'service_teste_dons' &&
    EMAILJS_CONFIG.templateId !== 'template_resultado' &&
    EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY'

  return {
    isConfigured,
    message: isConfigured 
      ? 'EmailJS configurado corretamente' 
      : 'EmailJS precisa ser configurado no arquivo emailService.js'
  }
}
