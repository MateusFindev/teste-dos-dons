// src/lib/sendEmailById.js
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase"; // <- mesmo diretório do seu firebase.js/similar

// Converte Firestore Timestamp/Date para Date nativa
function toDateSafe(v) {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (typeof v === "number") return new Date(v);
    if (typeof v === "string") return new Date(v);
    if (v?.seconds) return new Date(v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6));
  } catch (_) {}
  return null;
}

function buildTextEmail(data) {
  const resultados = Array.isArray(data.resultados) ? data.resultados : [];
  const linhas = resultados
    .map((r, i) => {
      const pct = r?.percentual != null ? ` (${r.percentual}%)` : "";
      const pts = r?.pontuacao != null ? ` — ${r.pontuacao} pts` : "";
      return `${String(i + 1).padStart(2, "0")}. ${r?.nome || "—"}${pct}${pts}`;
    })
    .join("\n");

  const dt = toDateSafe(data.dataRealizacao);
  const dataFmt = dt ? dt.toLocaleString("pt-BR") : null;

  return [
    `Olá ${data?.nome || ""},`,
    "",
    "Aqui estão os resultados do seu Teste dos Dons:",
    "",
    linhas || "—",
    "",
    data?.organizacao ? `Organização: ${data.organizacao}` : null,
    dataFmt ? `Data: ${dataFmt}` : null,
    "",
    "Se precisar do PDF, entre no app e use a opção de imprimir/salvar.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtmlEmail(data) {
  const resultados = Array.isArray(data.resultados) ? data.resultados : [];
  const dt = toDateSafe(data.dataRealizacao);
  const dataFmt = dt ? dt.toLocaleString("pt-BR") : "";

  const itens = resultados
    .map(
      (r, i) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${i + 1}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r?.nome || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r?.pontuacao ?? "-"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${r?.percentual != null ? r.percentual + "%" : "-"}</td>
        </tr>`
    )
    .join("");

  const top3 = resultados.slice(0, 3).map((r) => r?.nome).filter(Boolean);

  return `
  <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.5;color:#111">
    <h2 style="margin:0 0 8px">Olá ${data?.nome || ""}!</h2>
    <p style="margin:0 0 12px">Aqui estão os resultados do seu <strong>Teste dos Dons</strong>.</p>

    ${
      top3.length
        ? `<p style="margin:0 0 16px"><strong>Top 3:</strong> ${top3.join(", ")}</p>`
        : ""
    }

    <table style="border-collapse:collapse;width:100%;max-width:720px;background:#fff;border:1px solid #eee">
      <thead>
        <tr style="background:#f8fafc">
          <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eee">#</th>
          <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eee">Dom</th>
          <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eee">Pontos</th>
          <th style="text-align:left;padding:10px 12px;border-bottom:1px solid #eee">% Máx.</th>
        </tr>
      </thead>
      <tbody>${itens}</tbody>
    </table>

    <p style="margin:16px 0 0">
      ${data?.organizacao ? `<div><strong>Organização:</strong> ${data.organizacao}</div>` : ""}
      ${dataFmt ? `<div><strong>Data:</strong> ${dataFmt}</div>` : ""}
    </p>

    <p style="margin:16px 0 0;color:#334155">
      Dica: salve o PDF dentro do app para manter seus registros.
    </p>
  </div>`;
}

/**
 * Envia o resultado por e-mail usando o doc {id} da coleção 'resultados-teste-dons'.
 * Default: tenta '/api/send-email' (Nodemailer). Se falhar com 404, tenta '/api/emailjs/send' (legado).
 */
export async function sendEmailById(id, opts = {}) {
  console.log("[sendEmailById] start", { id, opts });
  if (!id) return { success: false, detail: "id ausente" };

  // 1) Busca documento
  const ref = doc(db, "resultados-teste-dons", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { success: false, detail: "Documento não encontrado" };
  const data = snap.data();

  const to = data?.email?.trim?.().toLowerCase?.();
  if (!to) return { success: false, detail: "Documento não possui campo 'email'." };

  const top3 = Array.isArray(data.resultados) ? data.resultados.slice(0, 3) : [];
  const subject =
    `Seu resultado do Teste dos Dons` +
    (top3.length ? ` — Top 3: ${top3.map((d) => d?.nome).filter(Boolean).join(", ")}` : "");

  const text = buildTextEmail(data);
  const html = buildHtmlEmail(data);

  // 2) Endpoint preferido: Nodemailer
  const primary = opts.endpoint || "/api/send-email";
  const payload = { to, subject, text, html }; // compatível com nodemailer handlers comuns

  // helper pra tentar 1 endpoint
  const tryPost = async (endpoint) => {
    console.log("[sendEmailById] POST", endpoint, payload);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let json = null;
    try { json = await res.json(); } catch {}
    console.log("[sendEmailById] resposta HTTP:", res.status, json);
    return { res, json };
  };

  // tenta primary
  let { res, json } = await tryPost(primary);
  if (res.status === 404 || res.status === 405) {
    // fallback automático pro legado EmailJS, só se existir
    const fallback = "/api/emailjs/send";
    ({ res, json } = await tryPost(fallback));
  }

  if (!res.ok || json?.success === false || json?.ok === false) {
    return { success: false, detail: json?.error || `HTTP ${res.status}`, raw: json };
  }
  return { success: true, detail: json };
}
