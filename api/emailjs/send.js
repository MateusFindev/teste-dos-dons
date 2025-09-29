// api/emailjs/send.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    const {
      to_email, to_name, subject, message, results_json,
      participante_nome, participante_igreja, participante_email,
      data_teste, hora_teste, dom_principal, pontuacao_principal,
    } = req.body || {}

    const body = {
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,      // public key
      accessToken: process.env.EMAILJS_PRIVATE_KEY, // private key
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
    return res.status(200).json({ ok: true, data: text }) // geralmente "OK"
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || 'Falha ao enviar e-mail' })
  }
}
