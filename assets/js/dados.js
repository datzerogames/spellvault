// SpellVault — dados do jogador guardados no aparelho (localStorage): álbuns, cartas, decks e ajustes.
(function () {
  const SV = (window.SV = window.SV || {});
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("sv:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("sv:" + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem("sv:" + k); } catch {} },
  };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const TIPOS = {
    "2x2": { nome: "Álbum 2x2", cols: 2, rows: 2, icone: "auto_stories" },
    "3x3": { nome: "Pasta 3x3", cols: 3, rows: 3, icone: "grid_view" },
    "4x3": { nome: "Pasta 4x3", cols: 4, rows: 3, icone: "view_module" },
    caixa: { nome: "Deck box", cols: 0, rows: 0, icone: "inventory_2" },
    gaveteiro: { nome: "Gaveteiro", cols: 0, rows: 0, icone: "table_rows" },
  };
  const CORES_CAPA = ["#3a2617", "#24361f", "#1c2a3d", "#3d1b1c", "#2c2238", "#1d1d1d", "#4a3a1c"];
  const ehCaixa = (a) => !TIPOS[a.tipo].rows;
  const porPagina = (a) => (ehCaixa(a) ? a.capacidade : TIPOS[a.tipo].cols * TIPOS[a.tipo].rows);
  const capacidade = (a) => (ehCaixa(a) ? a.capacidade : porPagina(a) * a.paginas);
  const paginaDo = (a, slot) => Math.ceil(slot / porPagina(a));

  const d = {
    TIPOS, CORES_CAPA, ehCaixa, porPagina, capacidade, paginaDo, uid, LS,
    config: () => Object.assign({ nome: "Planeswalker", cotacao: 5.4, idioma: "pt", albumPadrao: "", usarLiga: true }, LS.get("config", {})),
    salvarConfig: (c) => LS.set("config", Object.assign(d.config(), c)),

    albuns: () => LS.get("albuns", []),
    album: (id) => d.albuns().find((a) => a.id === id),
    salvarAlbum(a) { const l = d.albuns(); const i = l.findIndex((x) => x.id === a.id); i >= 0 ? (l[i] = a) : l.push(a); LS.set("albuns", l); return a; },
    removerAlbum(id) { LS.set("albuns", d.albuns().filter((a) => a.id !== id)); LS.set("cartas", d.cartas().map((c) => (c.album === id ? Object.assign(c, { album: "", slot: 0 }) : c))); },

    cartas: () => LS.get("cartas", []),
    carta: (id) => d.cartas().find((c) => c.id === id),
    salvarCartas: (l) => LS.set("cartas", l),
    adicionar(dadosSf, extra = {}) {
      const l = d.cartas();
      const c = Object.assign({ id: uid(), foil: false, troca: false, condicao: "NM", idioma: "EN", album: "", slot: 0, deck: "", adicionada: Date.now() }, dadosSf, extra);
      if (c.album && !c.slot) c.slot = d.proximoLivre(c.album);
      l.push(c); d.salvarCartas(l); return c;
    },
    atualizar(id, patch) { const l = d.cartas().map((c) => (c.id === id ? Object.assign(c, patch) : c)); d.salvarCartas(l); return l.find((c) => c.id === id); },
    remover(id) { d.salvarCartas(d.cartas().filter((c) => c.id !== id)); },
    ocupacao(albumId) { const m = {}; d.cartas().forEach((c) => { if (c.album === albumId && c.slot) m[c.slot] = c; }); return m; },
    proximoLivre(albumId, desde = 1) {
      const a = d.album(albumId); if (!a) return 0;
      const oc = d.ocupacao(albumId), cap = capacidade(a);
      for (let s = Math.max(1, desde); s <= cap; s++) if (!oc[s]) return s;
      for (let s = 1; s < desde; s++) if (!oc[s]) return s;
      return 0;
    },
    copias: (nome) => d.cartas().filter((c) => c.nome === nome),
    // ---------- cotação da LigaMagic: só o que o próprio jogador digitou (a Liga não tem acesso automático) ----------
    liga: () => LS.get("liga", {}),
    chaveLiga: (c, foil = !!c.foil) => `${c.set}:${c.num}:${foil ? "f" : "n"}`,
    cotacaoLiga: (c, foil = !!c.foil) => d.liga()[d.chaveLiga(c, foil)] || null,
    salvarLiga(c, foil, q) { const m = d.liga(); m[d.chaveLiga(c, foil)] = { menor: q.menor || 0, medio: q.medio || 0, maior: q.maior || 0, em: Date.now(), nome: c.nome }; LS.set("liga", m); },
    removerLiga(c, foil) { const m = d.liga(); delete m[d.chaveLiga(c, foil)]; LS.set("liga", m); },
    // valor em R$: a cotação da Liga informada pelo jogador, quando existe; senão o preço do Scryfall convertido
    valorInfo(c, cfg = d.config()) {
      const q = cfg.usarLiga !== false ? d.cotacaoLiga(c, !!c.foil) : null;
      const vl = q && (q.medio || q.menor || q.maior);
      if (vl) return { v: vl, fonte: "liga", em: q.em };
      const usd = c.foil && c.usdFoil ? c.usdFoil : c.usd || c.usdFoil || 0;
      return { v: usd * cfg.cotacao, fonte: usd ? "scryfall" : "", em: 0 };
    },
    valor: (c, cfg) => d.valorInfo(c, cfg).v,

    // ---------- lista de desejos ----------
    desejos: () => LS.get("desejos", []),
    salvarDesejos: (l) => LS.set("desejos", l),

    decks: () => LS.get("decks", []),
    salvarDecks: (l) => LS.set("decks", l),

    exportar: () => JSON.stringify({ app: "SpellVault", versao: 1, em: new Date().toISOString(), config: d.config(), albuns: d.albuns(), cartas: d.cartas(), decks: d.decks(), jogo: LS.get("jogo", null), liga: d.liga(), desejos: d.desejos() }, null, 1),
    importar(txt) {
      const j = JSON.parse(txt);
      if (j.app !== "SpellVault" || !Array.isArray(j.cartas)) throw new Error("Este arquivo não é um backup do SpellVault.");
      LS.set("config", j.config || {}); LS.set("albuns", j.albuns || []); LS.set("cartas", j.cartas); LS.set("decks", j.decks || []);
      if (j.jogo) LS.set("jogo", j.jogo);
      LS.set("liga", j.liga || {}); LS.set("desejos", j.desejos || []);
    },
    apagarTudo() { ["config", "albuns", "cartas", "decks", "jogo", "semeado", "liga", "desejos"].forEach(LS.del); },
  };

  // coleção de exemplo no primeiro uso: álbuns montados e cartas buscadas no Scryfall
  d.semear = async function () {
    if (LS.get("semeado", false)) return false;
    const verde = { id: uid(), nome: "Álbum 2x2 Verde", nota: "Fichário de raras e comandantes", tipo: "2x2", paginas: 25, sleeve: "Sleeve KMC Black", capa: "#24361f" };
    const preta = { id: uid(), nome: "Pasta 3x3 Preta", nota: "Coleção geral e trocas", tipo: "3x3", paginas: 40, sleeve: "Ultra Pro 9 bolsos", capa: "#1d1d1d" };
    const caixa = { id: uid(), nome: "Deck box EDH", nota: "Deck do Edgar Markov", tipo: "caixa", capacidade: 100, sleeve: "Dragon Shield Matte", capa: "#3d1b1c" };
    LS.set("albuns", [verde, preta, caixa]);
    LS.set("decks", [{ id: uid(), nome: "Edgar Markov — vampiros", comandante: "Edgar Markov" }]);
    d.salvarConfig({ albumPadrao: verde.id });
    const plano = [
      ["Rhystic Study", verde, 17], ["Demonic Tutor", verde, 18, true], ["Cyclonic Rift", verde, 19], ["Sol Ring", verde, 20, true],
      ["Smothering Tithe", verde, 1], ["The One Ring", verde, 2], ["Sheoldred, the Apocalypse", verde, 3, true], ["Gaea's Cradle", verde, 4],
      ["Swords to Plowshares", preta, 1], ["Counterspell", preta, 2], ["Lightning Bolt", preta, 3], ["Llanowar Elves", preta, 4],
      ["Arcane Signet", preta, 5], ["Command Tower", preta, 6], ["Atraxa, Praetors' Voice", preta, 10], ["Sol Ring", preta, 54],
      ["Edgar Markov", caixa, 1], ["Sol Ring", caixa, 2], ["Bloodline Keeper", caixa, 3], ["Cordial Vampire", caixa, 4],
    ];
    const nomes = [...new Set(plano.map((p) => p[0]))];
    const dadosSf = await SV.sf.lote(nomes.map((name) => (name === "Sol Ring" ? { name, set: "cmm" } : { name })));
    // cartas de duas faces voltam como "Frente // Verso": indexa também pelo nome da frente
    const porNome = Object.fromEntries(dadosSf.flatMap((c) => [[c.nome, c], [c.nome.split(" // ")[0], c]]));
    const cartas = plano.filter((p) => porNome[p[0]]).map(([nome, alb, slot, foil], i) => Object.assign({ id: uid(), condicao: ["NM", "NM", "LP", "NM", "SP"][i % 5], idioma: i % 4 === 1 ? "PT" : "EN", deck: alb === caixa ? d.decks()[0].id : "", adicionada: Date.now() - i * 3600e3 }, porNome[nome], { album: alb.id, slot, foil: !!foil }));
    d.salvarCartas(cartas);
    LS.set("semeado", true);
    return true;
  };

  SV.d = d;
})();
