// SpellVault — acesso à API pública do Scryfall (cartas, imagens, preços, regras e nomes em português).
// O Scryfall pede no máximo ~10 pedidos por segundo: todos os pedidos passam por uma fila com 110 ms de intervalo.
(function () {
  const SV = (window.SV = window.SV || {});
  const API = "https://api.scryfall.com";
  // memória da sessão: evita repetir pedidos ao navegar entre as telas
  const cache = { resumo: new Map(), ficha: new Map(), impressoes: new Map(), rulings: new Map(), idiomas: new Map(), sets: null, icones: {} };
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
    const url = /^https:/.test(caminho) ? caminho : API + caminho;
    if (!url.startsWith(API + "/")) throw new Error("Endereço inesperado.");
    return agendar(async () => {
      const r = await fetch(url, corpo ? { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corpo) } : { headers: { Accept: "application/json" } });
      const j = await r.json().catch(() => null);
      if (!r.ok) { const e = new Error((j && j.details) || "Erro " + r.status); e.status = r.status; throw e; }
      return j;
    });
  }

  // carta do Scryfall → formato compacto guardado na coleção
  function resumo(c) {
    const f0 = c.card_faces && c.card_faces[0], f1 = c.card_faces && c.card_faces[1];
    const img = c.image_uris || (f0 && f0.image_uris) || {};
    // texto impresso na língua da própria carta (nas cartas em inglês não existe)
    const imp = c.lang && c.lang !== "en" ? {
      lang: c.lang,
      nome: c.printed_name || (f0 && f0.printed_name) || c.name,
      tipo: c.printed_type_line || (f0 && f0.printed_type_line) || "",
      texto: c.printed_text || (c.card_faces ? c.card_faces.map((f) => f.printed_text || "").join("\n—\n") : ""),
    } : null;
    const r = {
      sf: c.id, nome: c.name, lang: c.lang, set: c.set, setNome: c.set_name, num: c.collector_number,
      raridade: c.rarity, cores: c.colors || (f0 && f0.colors) || [], identidade: c.color_identity || [],
      tipo: c.type_line || (f0 && f0.type_line) || "", custo: c.mana_cost ?? (f0 ? f0.mana_cost : ""), cmc: c.cmc || 0,
      texto: c.oracle_text ?? (c.card_faces ? c.card_faces.map((f) => f.oracle_text).join("\n—\n") : ""),
      pt: imp && imp.lang === "pt" ? { nome: imp.nome, tipo: imp.tipo, texto: imp.texto } : null, imp,
      forca: c.power ?? (f0 && f0.power), resist: c.toughness ?? (f0 && f0.toughness), lealdade: c.loyalty,
      img: img.normal || "", imgPeq: img.small || "", arte: img.art_crop || "",
      verso: f1 && f1.image_uris ? f1.image_uris.normal : "", artista: c.artist || "",
      usd: +(c.prices && c.prices.usd) || 0, usdFoil: +(c.prices && c.prices.usd_foil) || 0, uri: c.scryfall_uri || "",
      foilPossivel: (c.finishes || []).includes("foil"), lendaria: /Legendary/.test(c.type_line || ""), lancamento: c.released_at || "",
    };
    cache.resumo.set(c.id, r);
    return r;
  }

  // ficha completa: tudo o que o Scryfall sabe sobre a impressão (não é guardada na coleção, só na sessão)
  function fichaDe(c) {
    const f0 = c.card_faces && c.card_faces[0];
    const p = c.prices || {};
    const faces = c.card_faces ? c.card_faces.map((f) => ({
      nome: f.name, custo: f.mana_cost || "", tipo: f.type_line || "", texto: f.oracle_text || "", flavor: f.flavor_text || "",
      forca: f.power, resist: f.toughness, lealdade: f.loyalty, defesa: f.defense,
      img: (f.image_uris && f.image_uris.normal) || (c.image_uris && c.image_uris.normal) || "", artista: f.artist || c.artist || "",
    })) : null;
    return Object.assign({}, resumo(c), {
      oracleId: c.oracle_id || (f0 && f0.oracle_id) || "",
      flavor: c.flavor_text || (f0 && f0.flavor_text) || "",
      palavras: c.keywords || [], legal: c.legalities || {},
      lancamento: c.released_at || "", acabamentos: c.finishes || [], jogos: c.games || [],
      edhrec: c.edhrec_rank || 0, reservada: !!c.reserved, produz: c.produced_mana || [],
      layout: c.layout || "", defesa: c.defense, moldura: c.frame || "", borda: c.border_color || "", cheia: !!c.full_art, promo: c.promo_types || [],
      partes: (c.all_parts || []).filter((x) => x.id !== c.id).map((x) => ({ id: x.id, nome: x.name, tipo: x.type_line || "", comp: x.component })),
      eur: +p.eur || 0, eurFoil: +p.eur_foil || 0, usdEtched: +p.usd_etched || 0, tix: +p.tix || 0,
      links: c.related_uris || {}, faces,
    });
  }

  // só os campos que valem a pena guardar na coleção (a ficha completa fica na memória da sessão)
  const CAMPOS = ["sf", "nome", "lang", "set", "setNome", "num", "raridade", "cores", "identidade", "tipo", "custo", "cmc", "texto", "pt", "imp", "forca", "resist", "lealdade", "img", "imgPeq", "arte", "verso", "artista", "usd", "usdFoil", "uri", "foilPossivel", "lendaria", "lancamento"];

  const sf = {
    resumo, cache,
    // ícone da edição: o endereço vem do próprio Scryfall (promoções usam o ícone de outra edição)
    icone: (codigo) => cache.icones[codigo] || "",
    compacto: (x) => Object.fromEntries(CAMPOS.filter((k) => k in x).map((k) => [k, x[k]])),
    cacheResumo: (id) => cache.resumo.get(id),
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

    // ---------- consulta ----------
    // uma página de resultados; "url" é o endereço da próxima página devolvido pelo próprio Scryfall
    async pagina(q, { unique = "cards", order = "name", dir = "auto", multilingue = true, url = "" } = {}) {
      const caminho = url || `/cards/search?q=${encodeURIComponent(q)}&unique=${unique}&order=${order}&dir=${dir}${multilingue ? "&include_multilingual=true" : ""}`;
      try {
        const j = await pedir(caminho);
        return { itens: j.data.map(resumo), total: j.total_cards ?? j.data.length, proxima: j.has_more ? j.next_page : "" };
      } catch (e) { if (e.status === 404) return { itens: [], total: 0, proxima: "" }; throw e; }
    },
    // ficha completa por id da impressão
    async ficha(id) {
      if (cache.ficha.has(id)) return cache.ficha.get(id);
      const f = fichaDe(await pedir(`/cards/${id}`));
      cache.ficha.set(id, f); return f;
    },
    // todas as edições de uma carta (por "oracle id"), da mais nova para a mais antiga
    async edicoes(oracleId, url = "") {
      const k = oracleId + "|" + url;
      if (cache.impressoes.has(k)) return cache.impressoes.get(k);
      const j = await pedir(url || `/cards/search?q=${encodeURIComponent("oracleid:" + oracleId)}&unique=prints&order=released&dir=desc&include_extras=true`);
      const r = { itens: j.data.map(resumo), total: j.total_cards ?? j.data.length, proxima: j.has_more ? j.next_page : "" };
      cache.impressoes.set(k, r); return r;
    },
    // decisões oficiais (rulings): o Scryfall só tem em inglês
    async rulings(id) {
      if (cache.rulings.has(id)) return cache.rulings.get(id);
      const j = await pedir(`/cards/${id}/rulings`).catch((e) => { if (e.status === 404) return { data: [] }; throw e; });
      cache.rulings.set(id, j.data); return j.data;
    },
    // a mesma impressão em todas as línguas em que foi publicada
    async idiomas(set, num) {
      const k = set + ":" + num;
      if (cache.idiomas.has(k)) return cache.idiomas.get(k);
      let l = [];
      try { const j = await pedir(`/cards/search?q=${encodeURIComponent(`e:${set} cn:"${num}" lang:any`)}&unique=prints&include_multilingual=true`); l = j.data.map(resumo); }
      catch (e) { if (e.status !== 404) throw e; }
      cache.idiomas.set(k, l); return l;
    },
    // lista de edições (código, nome, tipo, data) guardada por 7 dias
    async sets() {
      if (cache.sets) return cache.sets;
      const guardar = (l) => { cache.sets = l; l.forEach((s) => { if (s.i) cache.icones[s.c] = s.i; }); return l; };
      try { const k = JSON.parse(localStorage.getItem("sv:sets2") || "null"); if (k && Date.now() - k.t < 7 * 864e5) return guardar(k.l); } catch {}
      const j = await pedir("/sets");
      const l = guardar(j.data.map((s) => ({ c: s.code, n: s.name, t: s.set_type, d: s.released_at || "", i: s.icon_svg_uri || "" })).sort((a, b) => b.d.localeCompare(a.d)));
      try { localStorage.setItem("sv:sets2", JSON.stringify({ t: Date.now(), l })); } catch {}
      return l;
    },

    // 1) nome exato em inglês  2) nome exato em qualquer língua  3) aproximado em inglês (erros de leitura)  4) busca ampla
    async identificar(texto) {
      const limpo = texto.replace(/[^\p{L}\p{N}' ,\-]/gu, " ").replace(/\s+/g, " ").trim();
      if (limpo.length < 3) return null;
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
