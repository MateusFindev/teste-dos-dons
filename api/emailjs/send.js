// api/emailjs/send.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' })
  }

  try {
    const body = await readJson(req)

    // 👇 Aceita dois formatos:
    // A) { to_email, subject, ... }
    // B) { template_params: { to_email, subject, ... } }
    const template_params = body?.template_params && typeof body.template_params === 'object'
      ? body.template_params
      : body

    const service_id  = process.env.EMAILJS_SERVICE_ID
    const template_id = process.env.EMAILJS_TEMPLATE_ID
    const user_id     = process.env.EMAILJS_PUBLIC_KEY      // public key
    const accessToken = process.env.EMAILJS_PRIVATE_KEY     // private key (se estiver exigindo)

    if (!service_id || !template_id || !user_id) {
      return res.status(500).json({ ok: false, error: 'EMAILJS envs ausentes' })
    }

    const payload = {
      service_id,
      template_id,
      user_id,
      // Só envia accessToken se existir (contas sem Private Key não precisam)
      ...(accessToken ? { accessToken } : {}),
      template_params
    }

    const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const text = await r.text()
    if (!r.ok) {
      // EmailJS costuma devolver texto (ex.: “The user ID is required”)
      return res.status(r.status).json({ ok: false, error: text || `EmailJS error ${r.status}` })
    }

    return res.status(200).json({ ok: true, data: text }) // geralmente "OK"
  } catch (err) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) })
  }
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}
