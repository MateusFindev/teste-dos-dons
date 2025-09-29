// api/emailjs/health.js
export default function handler(req, res) {
  const has = (v) => (v ? 'yes' : 'no')
  res.status(200).json({
    ok: true,
    service_id: has(process.env.EMAILJS_SERVICE_ID),
    template_id: has(process.env.EMAILJS_TEMPLATE_ID),
    public_key: has(process.env.EMAILJS_PUBLIC_KEY),
    private_key: has(process.env.EMAILJS_PRIVATE_KEY),
    method: req.method
  })
}
