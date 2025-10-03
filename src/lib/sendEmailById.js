// src/lib/sendEmailById.js
// Funções utilitárias para enviar o resultado por e-mail a partir de um ID no Firestore (v9 modular)

import { doc, getDoc } from "firebase/firestore";
import db from "./firebase"; // este arquivo já existe no repo e exporta o Firestore (conforme README)
                              // se exportar como { db }, troque para: import { db } from "./firebase";

/**
 * Envia e-mail do resultado para o usuário dono do documento.
 * Busca na coleção `resultados-teste-dons/{id}` (ver README do repo).
 *
 * @param {string} id - ID do documento no Firestore.
 * @param {object} [opts]
 * @param {string} [opts.toOverride] - Força envio para outro e-mail (útil para teste).
 * @param {string} [opts.endpoint="/api/emailjs/send"] - Endpoint serverless que fará o envio.
 * @returns {Promise<{success:boolean, detail?:any}>}
 */
export async function sendEmailById(id, opts = {}) {
  const endpoint = opts.endpoint || "/api/emailjs/send";

  if (!id || typeof id !== "string") {
    return { success: false, detail: "id inválido" };
  }

  // 1) Busca o documento no Firestore
  const ref = doc(db, "resultados-teste-dons", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { success: false, detail: "Documento não encontrado" };
  }

  const data = snap.data();

  // Espera-se que exista o campo `email` no documento; se não houver, falha com mensagem clara.
  const to = opts.toOverride || data.email;
  if (!to) {
    return { success: false, detail: "Documento não possui campo 'email'." };
  }

  // Top 3 dons (se houver o array `resultados` ordenado)
  const top3 = Array.isArray(data.resultados)
    ? data.resultados.slice(0, 3).map((r) => r?.nome).filter(Boolean)
    : [];

  // Monta um assunto/corpo amigáveis. Ajuste livremente o copy.
  const subject = `Seu resultado do Teste dos Dons${top3.length ? ` — Top 3: ${top3.join(", ")}` : ""}`;

  const linhasResultado = Array.isArray(data.resultados)
    ? data.resultados
        .map((r, i) => {
          const rank = String(i + 1).padStart(2, "0");
          const pct = r?.percentual != null ? ` (${r.percentual}%)` : "";
          const pts = r?.pontuacao != null ? ` — ${r.pontuacao} pts` : "";
          return `${rank}. ${r?.nome || "—"}${pct}${pts}`;
        })
        .join("\n")
    : "—";

  const corpo = [
    `Olá ${data?.nome || ""},`,
    "",
    "Aqui estão os resultados do seu Teste dos Dons:",
    "",
    linhasResultado,
    "",
    data?.igreja ? `Igreja: ${data.igreja}` : null,
    data?.dataRealizacao ? `Data: ${new Date(data.dataRealizacao).toLocaleString()}` : null,
    "",
    "Anexo mental: lembre-se que o DOM é para serviço — use-o para edificar pessoas.",
    "",
    "Se precisar do PDF, acesse a página de resultados e use a opção de baixar.",
    "",
    "Abraço!"
  ]
    .filter(Boolean)
    .join("\n");

  // 2) Dispara para o endpoint serverless que você já usa (api/emailjs)
  // O seu endpoint costuma exigir: to, subject, text (ou html). Adapte se necessário.
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      subject,
      text: corpo,

      // Caso seu /api/emailjs/send aceite campos extras, inclua aqui:
      // templateId: "...",
      // variables: { nome: data?.nome, top3, link: `https://seuapp/enviar?id=${id}` },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    return {
      success: false,
      detail: json?.error || json || `Falha HTTP ${res.status}`,
    };
  }

  return { success: true, detail: json };
}

/**
 * Lê um param da URL (ex.: "id") e dispara o envio automaticamente.
 * Útil para criar uma rota /enviar?id=ABC e publicar o link.
 *
 * @param {string} [paramName="id"]
 * @param {object} [opts] - repassa para sendEmailById
 * @returns {Promise<{success:boolean, detail?:any, id?:string}>}
 */
export async function autoSendFromUrlParam(paramName = "id", opts = {}) {
  const url = new URL(window.location.href);
  const id = url.searchParams.get(paramName);
  if (!id) return { success: false, detail: `Query param '${paramName}' ausente` };

  const result = await sendEmailById(id, opts);
  return { ...result, id };
}
