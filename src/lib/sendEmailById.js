// src/lib/sendEmailById.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // ajuste o path se o seu firebase estiver em outro lugar

/**
 * Envia e-mail do resultado para o usuário dono do documento {id} em 'resultados-teste-dons'
 * Usa o endpoint /api/emailjs/send do próprio app (mesmo host).
 */
export async function sendEmailById(id, opts = {}) {
  console.log("[sendEmailById] start", { id, opts });
  if (!id) return { success: false, detail: "id ausente" };

  const endpoint = opts.endpoint || "/api/emailjs/send";

  // 1) Busca documento no Firestore
  const ref = doc(db, "resultados-teste-dons", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.warn("[sendEmailById] doc não encontrado:", id);
    return { success: false, detail: "Documento não encontrado" };
  }

  const data = snap.data();
  const to = data?.email?.trim?.().toLowerCase?.();
  if (!to) {
    console.warn("[sendEmailById] documento sem campo 'email':", { id, data });
    return { success: false, detail: "Documento não possui campo 'email'." };
  }

  // 2) Monta assunto/corpo (texto simples). Se quiser, troco por HTML depois.
  const top3 = Array.isArray(data.resultados) ? data.resultados.slice(0, 3) : [];
  const subject =
    `Seu resultado do Teste dos Dons` + (top3.length ? ` — Top 3: ${top3.map(d => d?.nome).filter(Boolean).join(", ")}` : "");

  const linhas = Array.isArray(data.resultados)
    ? data.resultados.map((r, i) => {
        const pct = r?.percentual != null ? ` (${r.percentual}%)` : "";
        const pts = r?.pontuacao != null ? ` — ${r.pontuacao} pts` : "";
        return `${String(i + 1).padStart(2, "0")}. ${r?.nome || "—"}${pct}${pts}`;
      }).join("\n")
    : "—";

  const corpo = [
    `Olá ${data?.nome || ""},`,
    "",
    "Aqui estão os resultados do seu Teste dos Dons:",
    "",
    linhas,
    "",
    data?.organizacao ? `Organização: ${data.organizacao}` : null,
    data?.dataRealizacao ? `Data: ${new Date(data.dataRealizacao).toLocaleString("pt-BR")}` : null,
    "",
    "Se precisar do PDF, entre no app e use a opção de imprimir/salvar.",
  ].filter(Boolean).join("\n");

  // 3) Chama o endpoint serverless
  const payload = { to, subject, text: corpo };
  console.log("[sendEmailById] POST", endpoint, payload);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let json = null;
  try { json = await res.json(); } catch {}
  console.log("[sendEmailById] resposta HTTP:", res.status, json);

  if (!res.ok || json?.success === false) {
    return { success: false, detail: json?.error || `HTTP ${res.status}`, raw: json };
  }
  return { success: true, detail: json };
}
