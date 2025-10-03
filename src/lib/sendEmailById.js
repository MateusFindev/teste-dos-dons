// src/lib/sendEmailById.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, ""); // ex.: https://meu-backend.com

function toDateSafe(v) {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (typeof v === "number") return new Date(v);
    if (typeof v === "string") return new Date(v);
    if (v?.seconds) return new Date(v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6));
  } catch {}
  return null;
}

export async function sendEmailById(id) {
  console.log("[sendEmailById] start", { id, API_BASE });
  if (!id) return { success: false, detail: "id ausente" };

  const ref = doc(db, "resultados-teste-dons", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { success: false, detail: "Documento não encontrado" };

  const data = snap.data();
  const to = data?.email?.trim?.().toLowerCase?.();
  if (!to) return { success: false, detail: "Documento não possui campo 'email'." };

  const top3 = Array.isArray(data.resultados) ? data.resultados.slice(0, 3) : [];
  const subject = `Seu resultado do Teste dos Dons${top3.length ? ` — Top 3: ${top3.map(d=>d?.nome).filter(Boolean).join(", ")}` : ""}`;

  const linhas = (Array.isArray(data.resultados) ? data.resultados : [])
    .map((r, i) => `${String(i+1).padStart(2,"0")}. ${r?.nome||"—"}${r?.percentual!=null?` (${r.percentual}%)`:""}${r?.pontuacao!=null?` — ${r.pontuacao} pts`:""}`)
    .join("\n");

  const dt = toDateSafe(data.dataRealizacao);
  const text = [
    `Olá ${data?.nome || ""},`,
    "",
    "Aqui estão os resultados do seu Teste dos Dons:",
    "",
    linhas || "—",
    "",
    data?.organizacao ? `Organização: ${data.organizacao}` : null,
    dt ? `Data: ${dt.toLocaleString("pt-BR")}` : null,
    "",
    "Se precisar do PDF, entre no app e use a opção de imprimir/salvar.",
  ].filter(Boolean).join("\n");

  const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 8px">Olá ${data?.nome || ""}!</h2>
    <p style="margin:0 0 12px">Aqui estão os resultados do seu <strong>Teste dos Dons</strong>.</p>
    ${top3.length ? `<p style="margin:0 0 16px"><strong>Top 3:</strong> ${top3.map(t=>t?.nome).filter(Boolean).join(", ")}</p>` : ""}
    <pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #eee;border-radius:8px;padding:12px">${linhas || "—"}</pre>
    <p style="margin:16px 0 0">
      ${data?.organizacao ? `<div><strong>Organização:</strong> ${data.organizacao}</div>` : ""}
      ${dt ? `<div><strong>Data:</strong> ${dt.toLocaleString("pt-BR")}</div>` : ""}
    </p>
  </div>`;

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>> AQUI ESTÁ O PULO DO GATO <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
  // Use o host do backend, não relativo:
  const endpoint = `${API_BASE}/api/send-email`; // ajuste se no seu back for `/send-email`
  console.log("[sendEmailById] POST", endpoint, { to, subject });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, text, html }),
  });

  let json = null;
  try { json = await res.json(); } catch {}
  console.log("[sendEmailById] resposta HTTP:", res.status, json);

  if (!res.ok || json?.ok === false || json?.success === false) {
    return { success: false, detail: json?.error || `HTTP ${res.status}`, raw: json };
  }
  return { success: true, detail: json };
}
