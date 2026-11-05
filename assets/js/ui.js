// SpellVault — utilidades de interface compartilhadas (folha, aviso, mana, formatação).
(function () {
  const SV = (window.SV = window.SV || {});
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ic = (n, cls = "") => `<span class="ms ${cls}" aria-hidden="true">${n}</span>`;
  const brl = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num2 = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dataBr = (ts) => new Date(ts).toLocaleDateString("pt-BR");

  // custo de mana "{2}{U}{U}" → bolinhas coloridas
  function mana(custo) {
    if (!custo) return "";
    return `<span class="mana" aria-label="Custo ${esc(custo)}">${(custo.match(/\{[^}]+\}/g) || [])
      .map((s) => { const k = s.slice(1, -1); const cor = /^[WUBRG]$/.test(k) ? k : /^[WUBRG]\//.test(k) ? k[0] : /^\d+$|^X$/.test(k) ? "N" : "C"; return `<span class="pip ${cor}">${esc(k.replace("/P", "ᵖ").replace("/", ""))}</span>`; })
      .join("")}</span>`;
  }

  function toast(msg, icone = "auto_awesome") {
    const t = $("#toast"); t.innerHTML = ic(icone) + esc(msg); t.classList.add("on");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("on"), 2600);
  }

  // folha que sobe do rodapé (substitui alert/confirm)
  let aoFechar = null;
  function folha(html, opts = {}) {
    // cada folha nasce num elemento novo, para não herdar os ouvintes da anterior
    const velho = $("#folha"), f = velho.cloneNode(false), v = $("#veu");
    velho.replaceWith(f);
    f.innerHTML = `<div class="alca"></div><button class="ico-bt fechar" data-sv="fechar-folha" aria-label="Fechar">${ic("close")}</button>${html}`;
    f.hidden = false; v.hidden = false; aoFechar = opts.aoFechar || null;
    const foco = f.querySelector("[autofocus]"); if (foco) setTimeout(() => foco.focus(), 60);
    return f;
  }
  function fecharFolha() { const f = $("#folha"); if (f.hidden) return; f.hidden = true; $("#veu").hidden = true; f.innerHTML = ""; const cb = aoFechar; aoFechar = null; cb && cb(); }
  function confirmar(titulo, texto, rotuloOk = "Confirmar", perigo = true) {
    return new Promise((ok) => {
      let resp = false;
      const f = folha(`<h2>${esc(titulo)}</h2><p class="muted" style="margin:6px 0 18px">${esc(texto)}</p><div class="dupla"><button class="bt" data-r="0">Cancelar</button><button class="bt ${perigo ? "sangue" : "ouro"}" data-r="1">${esc(rotuloOk)}</button></div>`, { aoFechar: () => ok(resp) });
      f.querySelectorAll("[data-r]").forEach((b) => b.addEventListener("click", () => { resp = b.dataset.r === "1"; fecharFolha(); }));
    });
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-sv=fechar-folha]") || e.target.id === "veu") fecharFolha(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharFolha(); });
  // ícone de edição que não carregar some, em vez de aparecer quebrado
  document.addEventListener("error", (e) => { const t = e.target; if (t && t.classList && t.classList.contains("seticon")) t.style.visibility = "hidden"; }, true);

  async function copiar(txt) {
    try { await navigator.clipboard.writeText(txt); toast("Copiado", "content_copy"); }
    catch { const i = document.createElement("textarea"); i.value = txt; document.body.appendChild(i); i.select(); try { document.execCommand("copy"); toast("Copiado", "content_copy"); } catch {} i.remove(); }
  }
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const nomeRaridade = { common: "Comum", uncommon: "Incomum", rare: "Rara", mythic: "Mítica", special: "Especial", bonus: "Bônus" };

  Object.assign(SV, { $, $$, esc, ic, brl, num2, dataBr, mana, toast, folha, fecharFolha, confirmar, copiar, debounce, nomeRaridade });
})();
