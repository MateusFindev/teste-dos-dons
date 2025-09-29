// api/emailjs/send.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const {
      // todos os params dinâmicos do seu template vão aqui
      to_email, to_name, subject, message, results_json,
      participante_nome, participante_igreja, participante_email,
      data_teste, hora_teste, dom_principal, pontuacao_principal,
      // ...qualquer outro que você estiver usando
    } = req.body || {}

    // Monta o payload esperado pelo REST do EmailJS
    const body = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,     // public key (user_id)
      accessToken: process.env.EMAILJS_PRIVATE_KEY, // private key (access token)
      template_params: {
        to_email, to_name, subject, message, results_json,
        participante_nome, participante_igreja, participante_email,
        data_teste, hora_teste, dom_principal, pontuacao_principal,
      }
    }

    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const text = await r.text()
    if (!r.ok) {
      return res.status(r.status).json({ ok: false, error: text || `EmailJS error ${r.status}` })
    }

    // EmailJS responde "OK" em texto puro quando sucesso
    return res.status(200).json({ ok: true, data: text })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Falha ao enviar e-mail' })
  }
}
