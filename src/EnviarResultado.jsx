import { useEffect, useState } from "react";
import { sendEmailById } from "@/lib/sendEmailById"; // a função que te passei

export default function EnviarResultado() {
  const [status, setStatus] = useState({ loading: true });

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const id = url.searchParams.get("id");
      if (!id) {
        setStatus({ loading: false, success: false, detail: "Query param 'id' ausente" });
        return;
      }
      const r = await sendEmailById(id);
      setStatus({ loading: false, ...r });
    })();
  }, []);

  if (status.loading) return <p>Enviando e-mail...</p>;
  if (!status.success) return <p>Erro: {String(status.detail)}</p>;
  return <p>E-mail enviado com sucesso ✅</p>;
}
