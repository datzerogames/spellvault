// SpellVault — acesso à API pública do Scryfall (cartas, imagens, preços e nomes em português).
// O Scryfall pede no máximo ~10 pedidos por segundo: todos os pedidos passam por uma fila com 110 ms de intervalo.
(function () {
  const SV = (window.SV = window.SV || {});
  const API = "https://api.scryfall.com";
  let fila = Promise.resolve(), ultimo = 0;

  function agendar(fn) {
    const p = fila.then(async () => {
      const espera = Math.max(0, ultimo + 110 - Date.now());
      if (espera) await new Promise((r) => setTimeout(r, espera));
      ultimo = Date.now();
      return fn();
    });
    fila = p.catch(() => {});
    return p;
  }
  async function pedir(caminho, corpo) {
    return agendar(async () => {
      const r = await fetch(API + caminho, corpo ? { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corpo) } : { headers: { Accept: "application/json" } });
      const j = await r.json().catch(() => null);
      if (!r.ok) { const e = new Error((j && j.details) || "Erro " + r.status); e.status = r.status; throw e; }
      return j;
    });
  }

  // carta do Scryfall → formato compacto guardado na coleção
  function resumo(c) {
    const f0 = c.card_faces && c.card_faces[0], f1 = c.card_faces && c.card_faces[1];
    const img = c.image_uris || (f0 && f0.image_uris) || {};
    const pt = c.lang === "pt";
    return {
      sf: c.id, nome: c.name, lang: c.lang, set: c.set, setNome: c.set_name, num: c.collector_number,
      raridade: c.rarity, cores: c.colors || (f0 && f0.colors) || [], identidade: c.color_identity || [],
      tipo: c.type_line || (f0 && f0.type_line) || "", custo: c.mana_cost ?? (f0 ? f0.mana_cost : ""), cmc: c.cmc || 0,
      texto: c.oracle_text ?? (c.card_faces ? c.card_faces.map((f) => f.oracle_text).join("\n—\n") : ""),
      pt: pt ? { nome: c.printed_name || (f0 && f0.printed_name) || c.name, tipo: c.printed_type_line || (f0 && f0.printed_type_line) || "", texto: c.printed_text || (c.card_faces ? c.card_faces.map((f) => f.printed_text || "").join("\n—\n") : "") } : null,
      forca: c.power ?? (f0 && f0.power), resist: c.toughness ?? (f0 && f0.toughness), lealdade: c.loyalty,
      img: img.normal || "", imgPeq: img.small || "", arte: img.art_crop || "",
      verso: f1 && f1.image_uris ? f1.image_uris.normal : "", artista: c.artist || "",
      usd: +(c.prices && c.prices.usd) || 0, usdFoil: +(c.prices && c.prices.usd_foil) || 0, uri: c.scryfall_uri || "",
      foilPossivel: (c.finishes || []).includes("foil"), lendaria: /Legendary/.test(c.type_line || ""),
    };
  }

  const sf = {
    resumo,
    autocompletar: (q) => pedir(`/cards/autocomplete?q=${encodeURIComponent(q)}`).then((j) => j.data),
    porNome: (nome, aproximado = false) => pedir(`/cards/named?${aproximado ? "fuzzy" : "exact"}=${encodeURIComponent(nome)}`).then(resumo),
    buscar: (q, extra = "") => pedir(`/cards/search?q=${encodeURIComponent(q)}${extra}`).then((j) => j.data.map(resumo)).catch((e) => { if (e.status === 404) return []; throw e; }),
    impressoes: (nome) => sf.buscar(`!"${nome}"`, "&unique=prints&order=released&dir=desc"),
    // aceita nome em português ou outra língua
    multilingue: (q) => sf.buscar(q, "&include_multilingual=true"),
    async emPortugues(set, num) {
      try { const c = await pedir(`/cards/${set}/${encodeURIComponent(num)}/pt`); return resumo(c).pt; } catch { return null; }
    },
    // até 75 cartas por pedido
    async lote(identificadores) {
      const out = [];
      for (let i = 0; i < identificadores.length; i += 75) {
        const j = await pedir("/cards/collection", { identifiers: identificadores.slice(i, i + 75) });
        out.push(...j.data.map(resumo));
      }
      return out;
    },
    // primeira tentativa por nome exato/aproximado; se falhar, procura em todas as línguas
    async identificar(texto) {
      const limpo = texto.replace(/[^\p{L}\p{N}' ,\-]/gu, " ").replace(/\s+/g, " ").trim();
      if (limpo.length < 3) return null;
      // 1) nome exato em inglês  2) nome exato em qualquer língua  3) aproximado em inglês (erros de leitura)  4) busca ampla
      try { return await sf.porNome(limpo); } catch {}
      const exato = await sf.buscar(`!"${limpo}"`, "&include_multilingual=true").catch(() => []);
      if (exato[0]) { try { const en = await sf.porNome(exato[0].nome); en.pt = exato[0].pt || en.pt; return en; } catch { return exato[0]; } }
      try { return await sf.porNome(limpo, true); } catch {}
      const r = await sf.multilingue(limpo).catch(() => []);
      if (r[0]) { if (r[0].lang !== "en") { try { const en = await sf.porNome(r[0].nome); en.pt = r[0].pt; return en; } catch {} } return r[0]; }
      return null;
    },
  };
  SV.sf = sf;
})();
