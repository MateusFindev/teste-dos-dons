// src/pages/EnviarResultado.jsx
import { useEffect, useState } from "react";
import { autoSendFromUrlParam } from "@/lib/sendEmailById";

export default function EnviarResultado() {
  const [status, setStatus] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      const r = await autoSendFromUrlParam("id"); // pega ?id=...
      setStatus({ loading: false, ...r });
    })();
  }, []);

  if (status.loading) return <p>Enviando e-mail...</p>;
  if (!status.success) return <p>Erro: {String(status.detail)}</p>;

  return <p>E-mail enviado com sucesso! ✅</p>;
}
