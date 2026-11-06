// SpellVault — Forja de decks: o jogador escreve o comandante e o app monta um deck de Commander com cartas de alta
// sinergia (aceleração, compra, remoção, o tema do comandante) e condições claras de vitória.
//
// De onde vem cada coisa (e por que NÃO consultamos o EDHREC):
//  • Scryfall (API pública): as cartas, na ordem de popularidade "edhrec_rank", filtradas pela identidade de cor do
//    comandante, pelo formato Commander e pelo tema detectado no texto dele. Gratuito e liberado para apps.
//  • Commander Spellbook (API pública): combos de verdade que incluem o comandante e os que a lista já contém.
//    O navegador bloqueia (CORS); no app Android a chamada sai pelo HTTP nativo, então os combos aparecem só lá.
//  • EDHREC: os termos de uso proíbem consultas automáticas e a republicação dos dados. Por isso o app só abre o
//    EDHREC para o jogador (atalhos) e analisa a lista que o próprio jogador colar aqui.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, brl, toast, confirmar } = SV;
  SV.telas = SV.telas || {};

  // ---------- endereços de apoio ----------
  const slug = (nome) => nome.split(" // ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’,.:!?"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const urlEdhrec = (n) => `https://edhrec.com/commanders/${slug(n)}`;
  const urlEdhrecCombos = (n) => `https://edhrec.com/combos/${slug(n)}`;
  const urlSpellbook = (n) => `https://commanderspellbook.com/search/?q=${encodeURIComponent(`card:"${n}"`)}`;
  const SPELLBOOK = "https://backend.commanderspellbook.com";
  const frente = (n) => String(n || "").split(" // ")[0];
  const curto = (tipo) => String(tipo || "").split(" — ")[0].replace("Legendary ", "Lendária ").replace("Creature", "Criatura").replace("Artifact", "Artefato").replace("Enchantment", "Encantamento").replace("Instant", "Mágica instantânea").replace("Sorcery", "Feitiço").replace("Land", "Terreno");

  // ---------- Commander Spellbook (só onde o HTTP não é bloqueado por CORS) ----------
  let spellbookLiberado = null;
  async function http(url, corpo) {
    const P = (window.Capacitor && window.Capacitor.Plugins) || {};
    if (SV.nativo() && P.CapacitorHttp) {
      const r = await P.CapacitorHttp.request({ url, method: corpo ? "POST" : "GET", headers: { Accept: "application/json", "Content-Type": "application/json" }, data: corpo || undefined, connectTimeout: 15000, readTimeout: 40000 });
      if (r.status >= 400) throw new Error("HTTP " + r.status);
      return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
    }
    const r = await fetch(url, corpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) } : { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  async function temSpellbook() {
    if (spellbookLiberado !== null) return spellbookLiberado;
    if (SV.nativo()) return (spellbookLiberado = true);
    try { await http(`${SPELLBOOK}/variants/?limit=1`); spellbookLiberado = true; } catch { spellbookLiberado = false; }
    return spellbookLiberado;
  }
  const resumoCombo = (v) => ({
    id: v.id, usa: (v.uses || []).map((u) => u.card.name), produz: (v.produces || []).map((p) => p.feature.name),
    passos: String(v.description || "").split("\n").map((s) => s.trim()).filter(Boolean), pop: v.popularity || 0, mana: v.manaNeeded || "", pre: v.easyPrerequisites || "", ident: String(v.identity || ""),
  });
  const identCabe = (idc, ident) => String(idc || "").toUpperCase().replace(/C/g, "").split("").every((ch) => ident.includes(ch));
  async function combosDoComandante(nome, ident) {
    const j = await http(`${SPELLBOOK}/variants/?q=${encodeURIComponent(`card:"${nome}"`)}&ordering=-popularity&limit=40`);
    return (j.results || []).map(resumoCombo).filter((c) => identCabe(c.ident, ident) && c.usa.length <= 4);
  }
  async function combosDaLista(cmdNome, nomes) {
    const j = await http(`${SPELLBOOK}/find-my-combos`, { commanders: cmdNome ? [{ card: cmdNome, quantity: 1 }] : [], main: nomes.map((n) => ({ card: n, quantity: 1 })) });
    const r = j.results || j;
    return { incluidos: (r.included || []).map(resumoCombo), quase: (r.almostIncluded || []).map(resumoCombo) };
  }

  // ---------- por que uma carta ajuda a vencer ----------
  function motivoVitoria(c) {
    const t = String(c.texto || "").toLowerCase();
    if (/you win the game/.test(t)) return "Vence o jogo direto";
    if (/each opponent loses|target opponent loses|each opponent .{0,30}loses/.test(t)) return "Drena a mesa: cada oponente perde vida";
    if (/extra combat|additional combat phase/.test(t)) return "Combate extra: dobra o dano do ataque";
    if (/creatures you control (get|have) [^.]{0,40}(\+\d|\+x|trample|double strike)/.test(t)) return "Bônus em massa: transforma o exército em vitória";
    if (/damage to each opponent|damage to each other player/.test(t)) return "Dano direto em todos os oponentes";
    if (/extra turn/.test(t)) return "Turno extra";
    if (/(twice|double) (that many|the number)|doubles? the number/.test(t)) return "Dobra o que o deck produz";
    return "";
  }

  // ---------- temas que o texto do comandante sugere ----------
  const TEMAS = [
    { id: "fichas", nome: "Fichas", ico: "groups", re: /\btokens?\b|populate/gi, plano: "encher a mesa de fichas e atacar com tudo, turbinadas por bônus em massa",
      m: ['(o:"create" o:"creature token") -o:treasure', '(o:"tokens you control" or o:"twice that many" or o:populate or o:"token would be created")'], v: ['(otag:anthem or o:"creatures you control get")'] },
    { id: "contadores", nome: "Marcadores +1/+1", ico: "add_circle", re: /\+1\/\+1 counter|proliferate/gi, plano: "acumular marcadores +1/+1 e fazer poucas criaturas virarem ameaças enormes",
      m: ['o:"+1/+1 counter" (o:"whenever" or o:"each" or o:"proliferate" or o:"double" or o:"twice")'], v: ['(o:proliferate or o:"twice that many") o:counter'] },
    { id: "sacrificio", nome: "Sacrifício", ico: "skull", re: /sacrifice|\bdies?\b/gi, plano: "sacrificar criaturas para drenar a mesa a cada morte",
      m: ['(o:"whenever a creature you control dies" or o:"whenever another creature dies" or o:"sacrifice a creature" or otag:sacrifice-outlet)'], v: ['o:"each opponent" (o:loses or o:damage) (o:dies or o:sacrifice)'] },
    { id: "feiticos", nome: "Instantâneas e feitiços", ico: "bolt", re: /instant or sorcery|noncreature spell|magecraft|copy target (instant|sorcery)/gi, plano: "encadear instantâneas e feitiços, copiá-los e transformar cada mágica em dano ou vantagem",
      m: ['(o:"whenever you cast" (o:instant or o:noncreature) or o:magecraft)', '(t:instant or t:sorcery) cmc<=3'], v: ['o:copy (o:instant or o:sorcery)'] },
    { id: "cemiterio", nome: "Cemitério e reanimação", ico: "deceased", re: /graveyard|reanimate|flashback|from your graveyard/gi, plano: "encher o cemitério e devolver as criaturas mais fortes ao campo",
      m: ['(otag:reanimate or (o:graveyard o:battlefield o:return))', 'o:"from your graveyard" (o:cast or o:play)'], v: ['t:creature cmc>=6 (o:trample or o:flying or o:"each opponent")'] },
    { id: "artefatos", nome: "Artefatos", ico: "precision_manufacturing", re: /artifact/gi, plano: "controlar muitos artefatos e transformar cada um em valor",
      m: ['(o:artifact (o:whenever or o:"for each" or o:"you control"))', 't:artifact o:whenever'], v: ['o:artifact o:"each opponent" (o:damage or o:loses)'] },
    { id: "encantamentos", nome: "Encantamentos", ico: "auto_fix_high", re: /enchantment|\baura\b|constellation|enchanted/gi, plano: "acumular encantamentos e ativar os gatilhos de cada um",
      m: ['(o:constellation or (o:enchantment o:whenever) or o:"enchantments you control")'], v: ['t:enchantment (o:"each opponent" or o:"extra")'] },
    { id: "equipamento", nome: "Equipamentos e auras", ico: "shield", re: /equip|attach|enchanted creature/gi, plano: "equipar o comandante, protegê-lo e vencer por dano de comandante (21)",
      m: ['(t:equipment or o:"equipped creature" or o:attach)'], v: ['(otag:extra-combat or o:"double strike" or o:hexproof) (o:equipped or o:enchanted)'] },
    { id: "terrenos", nome: "Terrenos (landfall)", ico: "landscape", re: /landfall|land enters|additional land|play (a |an )?(additional )?land/gi, plano: "jogar terrenos extras e usar cada um para gerar vantagem ou dano",
      m: ['(o:landfall or o:"additional land" or o:"land enters the battlefield under your control")'], v: ['o:landfall o:damage'] },
    { id: "blink", nome: "Piscar e entra-em-campo", ico: "flash_on", re: /enters the battlefield|exile .{0,30}return|flicker|blink/gi, plano: "reutilizar os efeitos de entrada em campo e juntar valor a cada turno",
      m: ['(otag:blink or o:"whenever a creature enters the battlefield under your control")'], v: ['o:"enters the battlefield" o:"each opponent"'] },
    { id: "vida", nome: "Ganho de vida", ico: "favorite", re: /gain(s)? .{0,25}life|lifelink|life total/gi, plano: "ganhar muita vida e converter isso em dano ou em vantagem na mesa",
      m: ['(o:"whenever you gain life" or o:lifelink or o:"gain life")'], v: ['o:"life you gained" or o:"whenever you gain life" o:"each opponent"'] },
    { id: "combate", nome: "Combate e ataque", ico: "swords", re: /whenever .{0,40}attacks|haste|extra combat|combat damage/gi, plano: "atacar todo turno com gatilhos de combate e vencer pelo dano",
      m: ['(o:"whenever" o:attacks or o:haste or otag:extra-combat)'], v: ['(otag:extra-combat or o:"additional combat")'] },
    { id: "tesouros", nome: "Tesouros e mana", ico: "paid", re: /treasure/gi, plano: "criar tesouros, gastar a mana extra e despejar ameaças maiores que a mesa",
      m: ['(o:treasure (o:whenever or o:sacrifice or o:create))'], v: ['o:treasure o:"each opponent"'] },
    { id: "planeswalkers", nome: "Planeswalkers", ico: "stars", re: /planeswalker|loyalty/gi, plano: "proteger planeswalkers e usar a lealdade para dominar a mesa",
      m: ['(t:planeswalker or o:"loyalty counter")'], v: ['t:planeswalker (o:"each opponent" or o:ultimate)'] },
    { id: "veneno", nome: "Veneno e infectar", ico: "science", re: /poison|infect|toxic/gi, plano: "envenenar os oponentes: 10 marcadores de veneno vencem a partida",
      m: ['(o:infect or o:poison or o:toxic)'], v: ['o:"poison counter" o:"each opponent"'] },
    { id: "roda", nome: "Compra em massa (wheel)", ico: "sync", re: /each player (discards|draws)|wheel|discard (your|their) hand/gi, plano: "girar as mãos de todos e punir cada carta comprada pelos oponentes",
      m: ['((o:"each player" o:discards o:draws) or o:"whenever an opponent draws")'], v: ['o:"whenever an opponent draws" o:damage'] },
  ];
  const IGNORAR_TIPOS = new Set(["Legendary", "Creature", "Human", "Warrior", "Rogue", "Noble", "Wizard", "Shaman", "Cleric", "Knight", "Soldier", "Scout", "Advisor", "Artificer", "Monk", "Berserker"]);

  function detectarTemas(cmd) {
    const texto = String(cmd.texto || ""), tipos = (String(cmd.tipo || "").split(" — ")[1] || "").split(/\s+/).filter(Boolean);
    const achados = [];
    // tribal: o comandante fala do próprio tipo de criatura (Goblin, Vampiro, Elfo…)
    for (const tp of tipos) {
      if (IGNORAR_TIPOS.has(tp) && !new RegExp(`\\b${tp}s?\\b`, "i").test(texto.replace(cmd.nome, ""))) continue;
      if (new RegExp(`\\b${tp}(s|es)?\\b`, "i").test(texto.split(cmd.nome).join(""))) {
        const t = tp.toLowerCase();
        achados.push({ id: "tribo-" + t, nome: `Tribal ${tp}`, ico: "diversity_3", score: 6, plano: `montar uma horda de ${tp}s e aproveitar os bônus de tribo`,
          m: [`(t:${t} or o:changeling)`, `otag:typal-${t} -t:${t}`], v: [`(o:"other ${t}" or o:"${t}s you control") (o:"get" or o:"+")`] });
        break;
      }
    }
    TEMAS.forEach((t) => { const n = (texto.match(t.re) || []).length; if (n) achados.push(Object.assign({ score: n * (t.id === "combate" ? 0.8 : 1.4) }, t)); });
    achados.sort((a, b) => b.score - a.score);
    const tribo = achados.find((a) => a.id.startsWith("tribo-"));
    const outros = achados.filter((a) => !a.id.startsWith("tribo-")).slice(0, tribo ? 2 : 3);
    return [...(tribo ? [tribo] : []), ...outros];
  }

  // ---------- geração do deck ----------
  const BASICOS = { W: "Plains", U: "Island", B: "Swamp", R: "Mountain", G: "Forest" };
  const compactar = (c, cat, extra = {}) => {
    const { texto, pt, imp, ...r } = SV.sf.compacto(c);
    return Object.assign(r, { cat, qtd: 1, motivo: "" }, extra);
  };
  const posseDe = () => new Set(SV.d.cartas().map((c) => frente(c.nome)));

  async function gerar(cmd, op, prog) {
    const ident = cmd.identidade || [], posse = posseDe();
    const IDQ = ident.length ? `id<=${ident.join("").toLowerCase()}` : "id<=c";
    const orc = op.orc ? ` usd<=${op.orc}` : "";
    const BASE = `game:paper f:commander -is:funny -t:land ${IDQ}${orc}`;
    const temas = detectarTemas(cmd);
    const usados = new Set([frente(cmd.nome)]);
    const linhas = [], pools = {};
    let feito = 0; const passos = 8 + temas.length * 2;
    const avanca = (txt) => { feito++; prog(txt, Math.min(0.96, feito / passos)); };

    const buscar = async (q, extra = "") => {
      try { const r = await SV.sf.pagina(`${q} ${extra || BASE}`, { order: "edhrec", multilingue: false }); return r.itens; } catch { return []; }
    };
    // dá uma pequena vantagem às cartas que o jogador já tem
    const ordenar = (l) => (op.colecao ? l.map((c, i) => ({ c, k: i - (posse.has(frente(c.nome)) ? 25 : 0) })).sort((a, b) => a.k - b.k).map((x) => x.c) : l);
    const pegar = (lista, n, cat, extra = {}) => {
      const sobra = []; let pegou = 0;
      for (const c of ordenar(lista)) {
        if (usados.has(frente(c.nome))) continue;
        if (pegou < n) { usados.add(frente(c.nome)); linhas.push(compactar(c, cat, typeof extra === "function" ? extra(c) : extra)); pegou++; } else sobra.push(c);
      }
      pools[cat] = (pools[cat] || []).concat(sobra.slice(0, 40));
      return pegou;
    };

    // 1) combos do Commander Spellbook que incluem o comandante (só onde o HTTP nativo existe)
    let combosCmd = [];
    if (op.combos && (await temSpellbook())) {
      prog("Consultando combos no Commander Spellbook…", 0.04);
      try { combosCmd = await combosDoComandante(cmd.nome, ident); } catch { combosCmd = []; }
      avanca("Combos do comandante");
      const nomes = [];
      for (const cb of combosCmd.slice(0, 12)) {
        const outros = cb.usa.filter((n) => frente(n) !== frente(cmd.nome));
        if (nomes.length + outros.filter((n) => !nomes.includes(n)).length > 6) continue;
        outros.forEach((n) => { if (!nomes.includes(n)) nomes.push(n); });
        if (nomes.length >= 5) break;
      }
      if (nomes.length) {
        try {
          const achadas = await SV.sf.lote(nomes.map((name) => ({ name })));
          const mot = {}; combosCmd.forEach((cb) => cb.usa.forEach((n) => { if (!mot[frente(n)]) mot[frente(n)] = cb.produz[0] || "combo"; }));
          pegar(achadas.filter((c) => !op.orc || !c.usd || c.usd <= op.orc), 6, "vitoria", (c) => ({ motivo: `Combo com o comandante: ${(mot[frente(c.nome)] || "vitória").replace(/^Infinite /i, "infinito: ")}`, combo: true }));
        } catch { /* sem rede: segue sem os combos */ }
      }
    } else avanca("Combos (indisponíveis aqui)");

    // 2) finalizadores dos temas e finalizadores gerais
    prog("Procurando condições de vitória…", 0.12);
    for (const t of temas) {
      for (const q of t.v || []) { const l = await buscar(q); pegar(l, t.id.startsWith("tribo-") ? 2 : 1, "vitoria", (c) => ({ motivo: motivoVitoria(c) || `Finalizador do plano ${t.nome.toLowerCase()}` })); }
      avanca(`Vitória: ${t.nome}`);
    }
    const geral = await buscar('cmc>=4 (otag:extra-combat or (o:"each opponent" o:loses o:life) or (o:"creatures you control get" (o:trample or o:"+2/+0" or o:"double strike")))');
    pegar(geral.filter((c) => motivoVitoria(c)), Math.max(0, 6 - linhas.filter((l) => l.cat === "vitoria").length), "vitoria", (c) => ({ motivo: motivoVitoria(c) }));
    avanca("Finalizadores gerais");

    // 3) sinergia: o tema (ou temas) do comandante
    // o tribal (se houver) fica com cerca de metade das vagas de sinergia; o resto divide o que sobra
    const tribalOuFichas = temas.some((t) => /^(tribo-|fichas|combate)/.test(t.id));
    const nVarredura = tribalOuFichas ? 1 : 2;
    const sinergiaTotal = Math.max(14, 63 - linhas.length - (9 + 8 + 6 + nVarredura)); // o que sobra depois das vitórias e do básico
    const nTribo = temas.filter((t) => t.id.startsWith("tribo-")).length, nOutros = temas.length - nTribo;
    const cotaTribo = nTribo ? (nOutros ? Math.round(sinergiaTotal * 0.47) : sinergiaTotal) : 0, cotaOutro = nOutros ? Math.round((sinergiaTotal - cotaTribo) / nOutros) : 0;
    for (let i = 0; i < temas.length; i++) {
      const t = temas[i], parte = t.id.startsWith("tribo-") ? cotaTribo : cotaOutro, porBusca = Math.ceil(parte / t.m.length);
      prog(`Buscando sinergia: ${t.nome}…`, 0.2 + (i / Math.max(1, temas.length)) * 0.35);
      for (const q of t.m) pegar(await buscar(q), porBusca, "sin:" + t.id);
      avanca(`Sinergia: ${t.nome}`);
    }

    // 4) o básico de todo Commander
    const cats = [
      ["ramp", 9, '(otag:mana-rock or otag:mana-dork or (otag:ramp t:sorcery)) cmc<=3'],
      ["compra", 8, "otag:draw -otag:mana-rock cmc<=5"],
      ["remocao", 6, "otag:removal -otag:sweeper cmc<=5"],
      ["varredura", nVarredura, "otag:sweeper"],
    ];
    const rotulos = { ramp: "aceleração", compra: "compra de cartas", remocao: "remoção", varredura: "varreduras" };
    for (let i = 0; i < cats.length; i++) {
      const [cat, n, q] = cats[i];
      prog(`Buscando ${rotulos[cat]}…`, 0.6 + 0.08 * i);
      pegar(await buscar(q), n, cat); avanca(cat);
    }
    // completa as 63 cartas fora de terrenos (99 menos 36 terrenos) caso alguma busca tenha vindo curta
    const faltam = 63 - linhas.length;
    if (faltam > 0) { prog("Completando com cartas populares…", 0.92); pegar(await buscar("cmc>=0"), faltam, "sin:" + (temas.length ? temas[0].id : "geral")); }
    if (linhas.length > 63) linhas.length = 63; // nunca passa de 100 cartas com o comandante

    // 5) terrenos: utilitários da identidade + básicos na proporção das cores usadas
    prog("Escolhendo terrenos…", 0.95);
    const nUtil = ident.length <= 1 ? 6 : ident.length === 2 ? 10 : ident.length === 3 ? 13 : 15;
    const filtroMono = ident.length <= 1 ? ' -o:"any color" -o:"color identity" -o:"opponent controls could produce" -o:"any type"' : "";
    const terrenos = await buscar("t:land -t:basic", `game:paper f:commander -is:funny ${IDQ}${orc}${filtroMono}`);
    pegar(terrenos.filter((c) => !/^Snow-Covered/.test(c.nome)), nUtil, "terreno");
    const nBas = 36 - linhas.filter((l) => l.cat === "terreno").length;
    const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    const conta = (custo, k) => (String(custo || "").match(/\{[^}]+\}/g) || []).forEach((s) => ["W", "U", "B", "R", "G"].forEach((cor) => { if (s.includes(cor)) pips[cor] += k; }));
    linhas.forEach((l) => conta(l.custo, 1)); conta(cmd.custo, 3);
    const cores = ident.length ? ident : [];
    const bas = {};
    if (!cores.length) bas.Wastes = nBas;
    else {
      const tot = cores.reduce((s, cor) => s + pips[cor], 0) || cores.length; let rest = nBas;
      cores.forEach((cor, i) => { const q = i === cores.length - 1 ? rest : Math.max(1, Math.round((nBas * (pips[cor] || 1)) / tot)); bas[BASICOS[cor]] = Math.min(q, rest - (cores.length - 1 - i)); rest -= bas[BASICOS[cor]]; });
    }
    try {
      const cartasBas = await SV.sf.lote(Object.keys(bas).map((name) => ({ name })));
      cartasBas.forEach((c) => linhas.push(compactar(c, "basico", { qtd: bas[c.nome] || 1 })));
    } catch { Object.entries(bas).forEach(([nome, qtd]) => linhas.push({ nome, qtd, cat: "basico", sf: "", img: "", imgPeq: "", usd: 0, cmc: 0, tipo: "Basic Land", custo: "", motivo: "" })); }
    prog("Pronto!", 1);

    return {
      id: "", nome: `${cmd.nome} · Forja`, cmd: compactar(cmd, "cmd"), cmdNome: cmd.nome, ident, temas: temas.map((t) => ({ id: t.id, nome: t.nome, ico: t.ico, plano: t.plano })),
      plano: planoTexto(cmd, temas), linhas, pools, orc: op.orc || 0, em: Date.now(), combosCmd: combosCmd.slice(0, 3),
    };
  }
  function planoTexto(cmd, temas) {
    if (!temas.length) return `Montar uma mesa sólida com aceleração e compra, proteger ${cmd.nome} e fechar o jogo com os finalizadores abaixo.`;
    return `Com ${cmd.nome}, o caminho é ${temas.map((t) => t.plano).join("; e também ")}.`;
  }

  // ---------- leitura de uma lista colada (EDHREC, Moxfield, Archidekt, texto simples…) ----------
  function lerLista(txt) {
    const itens = [], vistos = new Map(); let cmdNome = "", secao = "";
    txt.split(/\r?\n/).forEach((bruta) => {
      let l = bruta.trim();
      if (!l || /^(\/\/|#)/.test(l)) return; // comentários (o " // " do meio de "Fire // Ice" não conta)
      const cab = l.match(/^(commander|comandante|deck|main|mainboard|sideboard|maybeboard|companion)s?:?$/i);
      if (cab) { secao = cab[1].toLowerCase(); return; }
      if (/^(sideboard|maybeboard)/i.test(secao)) return;
      const eCmd = /\*CMDR\*/i.test(l);
      l = l.replace(/\s+\*[A-Za-z]+\*/g, "");
      const m = l.match(/^(\d+)\s*x?\s+(.+?)(?:\s+\([A-Za-z0-9]{2,6}\)(?:\s+\S+)?)?$/) || l.match(/^()(.+)$/);
      if (!m) return;
      const qtd = +m[1] || 1, nome = m[2].trim();
      if ((eCmd || /^(commander|comandante)/.test(secao)) && !cmdNome) { cmdNome = nome; return; }
      vistos.set(nome, (vistos.get(nome) || 0) + qtd);
    });
    vistos.forEach((qtd, nome) => itens.push({ nome, qtd }));
    return { itens, cmdNome };
  }
  const BASICOS_NOMES = new Set(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes", "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp", "Snow-Covered Mountain", "Snow-Covered Forest"]);
  function tipoCat(tipo) {
    const t = String(tipo || "");
    if (/Land/.test(t)) return "tipo:terreno"; if (/Creature/.test(t)) return "tipo:criatura"; if (/Planeswalker/.test(t)) return "tipo:planeswalker";
    if (/Artifact/.test(t)) return "tipo:artefato"; if (/Enchantment/.test(t)) return "tipo:encantamento"; if (/Instant|Sorcery/.test(t)) return "tipo:magica"; return "tipo:outro";
  }
  async function analisarColada(txt, cmdInformado, prog) {
    const { itens, cmdNome: cabecalho } = lerLista(txt);
    if (!itens.length) throw new Error("Não achei nenhuma carta no texto colado.");
    const nomeCmd = cmdInformado || cabecalho;
    const pedir = [...itens.map((i) => i.nome)]; if (nomeCmd && !pedir.includes(nomeCmd)) pedir.push(nomeCmd);
    prog("Procurando as cartas no Scryfall…", 0.3);
    const achadas = await SV.sf.lote(pedir.map((name) => ({ name })));
    const por = {}; achadas.forEach((c) => { por[frente(c.nome).toLowerCase()] = c; por[c.nome.toLowerCase()] = c; });
    const linhas = [], nao = [];
    itens.forEach((i) => {
      const c = por[i.nome.toLowerCase()] || por[frente(i.nome).toLowerCase()];
      if (!c) { nao.push(i.nome); return; }
      if (nomeCmd && frente(c.nome).toLowerCase() === frente(nomeCmd).toLowerCase()) return;
      linhas.push(compactar(c, BASICOS_NOMES.has(c.nome) ? "basico" : tipoCat(c.tipo), { qtd: i.qtd, motivo: motivoVitoria(c) }));
    });
    const cmd = nomeCmd ? por[nomeCmd.toLowerCase()] || por[frente(nomeCmd).toLowerCase()] || null : null;
    prog("Pronto!", 1);
    return { id: "", nome: cmd ? `${cmd.nome} · lista analisada` : "Lista analisada", cmd: cmd ? compactar(cmd, "cmd") : null, cmdNome: cmd ? cmd.nome : "", ident: cmd ? cmd.identidade : [], temas: [], plano: "", linhas, pools: {}, orc: 0, em: Date.now(), importado: true, naoAchei: nao, combosCmd: [] };
  }

  // ---------- estado e utilidades da tela ----------
  const F = { tela: "home", q: "", sug: [], cmd: null, orc: 0, colecao: true, combos: true, deck: null, colada: "", gerando: false, combosDeck: null };
  const total = (d) => d.linhas.reduce((s, l) => s + (l.qtd || 1), 0) + (d.cmd ? 1 : 0);
  const decksForjados = () => SV.d.decks().filter((d) => d.forja);
  const pontoCor = (ident) => (ident && ident.length ? ident : ["C"]).map((c) => `<i class="gota" style="background:var(--${c})"></i>`).join("");
  const NOMES_CAT = { vitoria: ["Condições de vitória", "emoji_events"], ramp: ["Aceleração de mana", "bolt"], compra: ["Compra de cartas", "style"], remocao: ["Remoção e interação", "swords"], varredura: ["Varreduras", "mop"], terreno: ["Terrenos de utilidade", "landscape"], basico: ["Terrenos básicos", "grass"],
    "tipo:criatura": ["Criaturas", "pets"], "tipo:magica": ["Instantâneas e feitiços", "bolt"], "tipo:artefato": ["Artefatos", "precision_manufacturing"], "tipo:encantamento": ["Encantamentos", "auto_fix_high"], "tipo:planeswalker": ["Planeswalkers", "stars"], "tipo:terreno": ["Terrenos", "landscape"], "tipo:outro": ["Outras", "more_horiz"] };
  function secoesDe(d) {
    const ordem = ["vitoria", ...d.temas.map((t) => "sin:" + t.id), "sin:geral", "ramp", "compra", "remocao", "varredura", "terreno", "basico", "tipo:criatura", "tipo:magica", "tipo:artefato", "tipo:encantamento", "tipo:planeswalker", "tipo:terreno", "tipo:outro"];
    return ordem.map((cat) => {
      const l = d.linhas.map((x, i) => ({ x, i })).filter((o) => o.x.cat === cat); if (!l.length) return null;
      const t = d.temas.find((tm) => "sin:" + tm.id === cat);
      const [nome, ico] = t ? [`Sinergia · ${t.nome}`, t.ico] : cat === "sin:geral" ? ["Cartas populares", "star"] : NOMES_CAT[cat] || [cat, "style"];
      return { cat, nome, ico, itens: l };
    }).filter(Boolean);
  }
  const valorLinha = (l) => (l.usd || 0) * (l.qtd || 1);
  const textoLista = (d, so) => [d.cmd ? `1 ${d.cmd.nome}` : null, ...d.linhas.filter((l) => !so || so(l)).map((l) => `${l.qtd || 1} ${l.nome}`)].filter(Boolean).join("\n");

  // ---------- desenho ----------
  function linhaHtml(d, o, posse, salvo) {
    const l = o.x, tem = posse.has(frente(l.nome)), basico = l.cat === "basico";
    return `<li class="linha-carta" data-i="${o.i}">
      ${l.sf ? `<a href="#ver-${l.sf}" class="mini">${l.imgPeq ? `<img src="${esc(l.imgPeq)}" alt="" loading="lazy"/>` : ic("style")}</a>` : `<span class="mini">${ic("grass")}</span>`}
      <div class="info">${l.sf ? `<a href="#ver-${l.sf}"><b>${esc(l.nome)}</b></a>` : `<b>${esc(l.nome)}</b>`}
        <small>${l.custo ? SV.mana(l.custo) : ""}<span>${esc(curto(l.tipo))}${l.usd ? ` · US$ ${l.usd.toFixed(2)}` : ""}</span></small>
        ${l.motivo ? `<small class="motivo">${ic(l.combo ? "link" : "emoji_events")}${esc(l.motivo)}</small>` : ""}</div>
      <div class="lado">${basico ? `<b class="qtd">×${l.qtd}</b>` : ""}${tem ? `<span class="etiqueta ouro" title="Está na sua coleção">${ic("check")}tenho</span>` : ""}
        ${!basico && !d.importado && !salvo && (d.pools[l.cat] || []).length ? `<button class="ico-bt peq" data-f="trocar" data-i="${o.i}" aria-label="Trocar por outra sugestão">${ic("autorenew")}</button>` : ""}
        ${!basico && !salvo ? `<button class="ico-bt peq" data-f="tirar" data-i="${o.i}" aria-label="Tirar do deck">${ic("close")}</button>` : ""}</div></li>`;
  }
  function comboHtml(cb, posse, naLista, falta) {
    return `<li class="combo"><div class="etiquetas">${cb.usa.map((n) => `<span class="etiqueta ${falta && falta === n ? "sangue" : naLista.has(frente(n)) ? "ouro" : ""}">${esc(n)}</span>`).join("")}</div>
      <p class="resultado">${ic("bolt")}${esc(cb.produz.slice(0, 4).join(" · ").replace(/Infinite /g, "infinito: ")) || "Combo"}</p>
      ${cb.passos.length ? `<details><summary>Como funciona</summary><ol>${cb.passos.slice(0, 8).map((p) => `<li>${esc(p)}</li>`).join("")}</ol>${cb.pre ? `<p class="dim">Antes: ${esc(cb.pre)}</p>` : ""}</details>` : ""}
      <div class="fila" style="gap:8px;margin-top:8px">${falta ? `<button class="bt peq ouro" data-f="add-combo" data-nome="${esc(falta)}">${ic("add")}Adicionar ${esc(falta)}</button>` : ""}<a class="bt peq" style="margin-left:auto" href="https://commanderspellbook.com/combo/${esc(cb.id)}/" target="_blank" rel="noopener">${ic("open_in_new")}Spellbook</a></div></li>`;
  }

  function desenharHome(el) {
    const salvos = decksForjados();
    el.innerHTML = `<div class="pagina">
      <header class="topo"><a class="ico-bt" href="#consulta" aria-label="Voltar à Consulta">${ic("arrow_back")}</a><div class="marca"><b style="font-size:20px">Forja de decks</b><small>Commander · do comandante ao deck</small></div><div class="acoes"></div></header>
      <section class="tomo cantos pad forja-hero">
        <p class="rot">${ic("local_fire_department")}Escreva o comandante</p>
        <p class="muted mt">O app monta um deck de 100 cartas: sinergia com o tema do comandante, aceleração, compra, remoção, terrenos e as <b>condições de vitória</b> bem claras.</p>
        <form class="busca mt" id="f-forja" role="search">${ic("search")}<input id="q-forja" value="${esc(F.q)}" placeholder="Ex.: Krenko, Mob Boss · Atraxa · Edgar Markov" autocomplete="off" enterkeyhint="search"/><button class="bt peq ouro">Buscar</button></form>
        <div id="sug-forja" class="res-busca"></div>
        <div class="chips mt" aria-label="Exemplos">${["Krenko, Mob Boss", "Atraxa, Praetors' Voice", "Edgar Markov", "Korvold, Fae-Cursed King", "Muldrotha, the Gravetide", "Yuriko, the Tiger's Shadow"].map((n) => `<button class="chip" data-f="exemplo" data-nome="${esc(n)}">${esc(n.split(",")[0])}</button>`).join("")}</div>
      </section>
      <div id="cmd-escolhido"></div>
      <section class="tomo pad mt2 form" id="opcoes-forja">
        <div class="campo"><label>Orçamento por carta</label><div class="seg" id="seg-orc">${[[0, "Livre"], [10, "US$ 10"], [3, "US$ 3"], [1, "US$ 1"]].map(([v, t]) => `<button data-f="orc" data-v="${v}" class="${F.orc === v ? "on" : ""}">${t}</button>`).join("")}</div></div>
        <label class="check"><input type="checkbox" id="op-colecao" ${F.colecao ? "checked" : ""}/>Dar preferência às cartas que já tenho na coleção</label>
        <label class="check"><input type="checkbox" id="op-combos" ${F.combos ? "checked" : ""}/>Incluir combos do Commander Spellbook <span class="dim">(app Android)</span></label>
        <button class="bt ouro cheio" id="bt-forjar" data-f="forjar" ${F.cmd ? "" : "disabled"}>${ic("construction")}${F.cmd ? `Forjar o deck de ${esc(F.cmd.nome.split(",")[0])}` : "Escolha um comandante"}</button>
        <div id="prog-forja" hidden></div>
      </section>
      ${salvos.length ? `<h2 class="rubrica"><span>Decks forjados</span></h2><section class="tomo pad"><ul class="decks">${salvos.map((d) => `<li>${ic("construction")}<a href="#forja-d${d.id}" style="flex:1;min-width:0"><b>${esc(d.nome)}</b><br/><small class="dim">${d.lista.reduce((s, l) => s + (l.qtd || 1), 0) + 1} cartas${d.comandante ? " · " + esc(d.comandante) : ""}</small></a><button class="ico-bt" data-f="apagar-deck" data-id="${d.id}" aria-label="Apagar deck">${ic("delete")}</button></li>`).join("")}</ul></section>` : ""}
      <h2 class="rubrica"><span>Já tem uma lista?</span></h2>
      <section class="tomo pad"><p class="muted">Cole aqui a lista de um deck (por exemplo, copiada do EDHREC, Moxfield ou Archidekt) e o SpellVault mostra o que você já tem, o preço, as cartas de vitória e os combos.</p>
        <div class="campo mt"><textarea id="colada" rows="6" placeholder="1 Sol Ring&#10;1 Krenko, Mob Boss&#10;1 Goblin Chieftain&#10;…" spellcheck="false">${esc(F.colada)}</textarea></div>
        <button class="bt cheio mt" data-f="analisar">${ic("troubleshoot")}Analisar a lista colada</button><p class="dim mt" id="msg-colada" style="font-size:14.5px"></p></section>
      <section class="tomo pad mt2"><p class="rot">${ic("info")}De onde vêm as sugestões</p>
        <p class="muted mt" style="font-size:16px">As cartas saem de buscas no <b>Scryfall</b> (ordenadas pela popularidade e filtradas pela cor, pelo formato e pelo tema do comandante) e os combos vêm do <b>Commander Spellbook</b>. O <b>EDHREC</b> não é consultado pelo app, porque os termos dele não permitem acesso automático: os botões da lista abrem o comandante lá para você comparar.</p></section>
    </div>`;
    if (F.cmd) mostrarEscolhido(el);
    if (F.sug.length) desenharSugestoes(el);
  }
  function desenharSugestoes(el) {
    const s = $("#sug-forja", el); if (!s) return;
    s.innerHTML = F.sug.map((c, i) => `<button data-f="escolher" data-i="${i}">${c.arte ? `<img src="${esc(c.arte)}" alt=""/>` : ""}<div><b>${esc(c.nome)}</b><small>${pontoCor(c.identidade)} ${esc(curto(c.tipo))}</small></div></button>`).join("");
  }
  function mostrarEscolhido(el) {
    const c = F.cmd, z = $("#cmd-escolhido", el); if (!z) return;
    z.innerHTML = c ? `<section class="tomo cantos pad mt2 cmd-escolhido"><div class="fila" style="gap:12px;align-items:center">${c.imgPeq ? `<img class="mini-cmd" src="${esc(c.imgPeq)}" alt=""/>` : ""}<div style="flex:1;min-width:0"><p class="rot">${ic("workspace_premium")}Comandante</p><b style="font:600 20px/1.15 var(--fc);display:block;margin-top:4px">${esc(c.nome)}</b><small class="dim">${pontoCor(c.identidade)} ${esc(c.tipo)}</small></div><button class="ico-bt" data-f="trocar-cmd" aria-label="Escolher outro comandante">${ic("close")}</button></div></section>` : "";
  }

  function desenharDeck(el, salvo) {
    const d = F.deck, cfg = SV.d.config(), posse = posseDe();
    const naLista = new Set(d.linhas.map((l) => frente(l.nome))); if (d.cmd) naLista.add(frente(d.cmd.nome));
    const secs = secoesDe(d);
    const preco = d.linhas.reduce((s, l) => s + valorLinha(l), 0) + (d.cmd ? d.cmd.usd || 0 : 0);
    const tenho = d.linhas.filter((l) => l.cat !== "basico" && posse.has(frente(l.nome))).length, naoBasicas = d.linhas.filter((l) => l.cat !== "basico").length;
    const curva = Array.from({ length: 8 }, (_, i) => d.linhas.filter((l) => !/Land/.test(l.tipo || "") && Math.min(7, Math.round(l.cmc || 0)) === i).reduce((s, l) => s + (l.qtd || 1), 0));
    const maxC = Math.max(1, ...curva);
    const vits = d.linhas.filter((l) => l.motivo && !l.combo);
    el.innerHTML = `<div class="pagina">
      <header class="topo"><button class="ico-bt" data-f="voltar" aria-label="Voltar">${ic("arrow_back")}</button><div class="marca"><b style="font-size:19px">${esc(d.cmdNome || "Lista")}</b><small>${salvo ? "Deck salvo" : d.importado ? "Lista analisada" : "Deck forjado"} · ${total(d)} cartas</small></div><div class="acoes"></div></header>
      ${d.cmd ? `<section class="tomo cantos pad"><div class="fila" style="gap:14px;align-items:flex-start">${d.cmd.img ? `<a href="#ver-${d.cmd.sf}"><img class="img-cmd" src="${esc(d.cmd.img)}" alt="${esc(d.cmd.nome)}"/></a>` : ""}<div style="flex:1;min-width:0">
        <p class="rot">${ic("workspace_premium")}Comandante</p><h2 style="font:600 22px/1.15 var(--fc);margin:4px 0 6px">${esc(d.cmd.nome)}</h2><p class="muted" style="font-size:15px">${pontoCor(d.ident)} ${esc(d.cmd.tipo)}</p>
        ${d.temas.length ? `<div class="etiquetas mt">${d.temas.map((t) => `<span class="etiqueta ouro">${ic(t.ico)} ${esc(t.nome)}</span>`).join("")}</div>` : ""}</div></div></section>` : ""}
      <div class="resumo"><div class="tomo"><b class="num">${total(d)}</b><span>cartas</span></div><div class="tomo"><b class="num">${brl(preco * cfg.cotacao).replace("R$ ", "")}</b><span>R$ estimado</span></div><div class="tomo"><b class="num">${tenho}/${naoBasicas}</b><span>você tem</span></div></div>
      ${d.orc ? `<p class="dim" style="font-size:14.5px;text-align:center">Orçamento: até US$ ${d.orc} por carta.</p>` : ""}
      <section class="tomo cantos pad mt2 como-vencer"><p class="rot">${ic("emoji_events")}Como este deck vence</p>
        ${d.plano ? `<p class="plano">${esc(d.plano)}</p>` : `<p class="muted mt">Veja abaixo as cartas e os combos que fecham o jogo.</p>`}
        ${vits.length ? `<ul class="vits">${vits.map((l) => `<li>${l.sf ? `<a href="#ver-${l.sf}"><b>${esc(l.nome)}</b></a>` : `<b>${esc(l.nome)}</b>`}<span>${esc(l.motivo)}</span></li>`).join("")}</ul>` : ""}
        <div id="combos-forja" class="mt"><p class="dim"><span class="carregando"></span> Procurando combos…</p></div>
        <div class="chips quebra mt">${d.cmdNome ? `<a class="chip" href="${esc(urlEdhrec(d.cmdNome))}" target="_blank" rel="noopener">${ic("open_in_new")}EDHREC</a><a class="chip" href="${esc(urlEdhrecCombos(d.cmdNome))}" target="_blank" rel="noopener">${ic("link")}Combos no EDHREC</a><a class="chip" href="${esc(urlSpellbook(d.cmdNome))}" target="_blank" rel="noopener">${ic("bolt")}Spellbook</a>` : ""}</div></section>
      <section class="tomo pad mt2"><p class="rot">${ic("bar_chart")}Curva de mana (sem terrenos)</p><div class="curva mt">${curva.map((n, i) => `<div><i style="height:${Math.round((n / maxC) * 100)}%"></i><b>${n || ""}</b><span>${i === 7 ? "7+" : i}</span></div>`).join("")}</div></section>
      ${d.naoAchei && d.naoAchei.length ? `<p class="tomo pad mt2 muted" style="font-size:15px">${ic("warning")} Não achei no Scryfall: ${esc(d.naoAchei.slice(0, 12).join(", "))}${d.naoAchei.length > 12 ? "…" : ""}</p>` : ""}
      ${secs.map((s) => `<details class="secao-deck" ${["vitoria", "ramp", "compra"].includes(s.cat) || s.cat.startsWith("sin:") ? "open" : ""}><summary>${ic(s.ico)}<b>${esc(s.nome)}</b><span class="n">${s.itens.reduce((n, o) => n + (o.x.qtd || 1), 0)}</span></summary><ul class="lista-deck">${s.itens.map((o) => linhaHtml(d, o, posse, salvo)).join("")}</ul></details>`).join("")}
      <div class="fila mt2" style="flex-wrap:wrap;gap:8px"><button class="bt ouro" style="flex:1" data-f="copiar">${ic("content_copy")}Copiar lista</button><button class="bt" style="flex:1" data-f="compartilhar">${ic("share")}Compartilhar</button></div>
      <div class="fila mt" style="flex-wrap:wrap;gap:8px">${salvo ? "" : `<button class="bt" style="flex:1" data-f="salvar">${ic("bookmark_add")}Salvar deck</button>`}<button class="bt" style="flex:1" data-f="faltantes">${ic("favorite")}Faltantes → desejos</button></div>
      <div class="dupla mt"><button class="bt" data-f="liga">${ic("storefront")}Copiar o que falta</button><a class="bt" href="${esc(SV.liga.urlLista)}" target="_blank" rel="noopener">${ic("open_in_new")}Compra por Lista</a></div>
      <p class="dim mt" style="font-size:14px">Preços do Scryfall (US$), só como referência. Sugestões automáticas: revise o deck antes de montar.</p>
    </div>`;
    carregarCombos(el);
  }

  async function carregarCombos(el) {
    const d = F.deck, z = $("#combos-forja", el); if (!z) return;
    const pinta = (h) => { const x = $("#combos-forja", el); if (x) x.innerHTML = h; };
    if (!(await temSpellbook())) { pinta(`<p class="dim" style="font-size:15px">${ic("bolt")} Combos do Commander Spellbook: o navegador bloqueia esta consulta. No <b>app Android</b> eles aparecem aqui sozinhos; no navegador, use o botão “Spellbook” abaixo.</p>`); return; }
    const nomes = d.linhas.filter((l) => l.cat !== "basico").map((l) => l.nome);
    try {
      const r = await combosDaLista(d.cmdNome, nomes);
      const naLista = new Set(nomes.map(frente)); if (d.cmdNome) naLista.add(frente(d.cmdNome));
      const posse = posseDe();
      const quase = r.quase.map((c) => ({ c, falta: c.usa.filter((n) => !naLista.has(frente(n))) })).filter((o) => o.falta.length === 1).sort((a, b) => b.c.pop - a.c.pop).slice(0, 5);
      pinta(`${r.incluidos.length ? `<p class="rot">${ic("check_circle")}Combos prontos nesta lista (${r.incluidos.length})</p><ul class="combos">${r.incluidos.slice(0, 6).map((c) => comboHtml(c, posse, naLista)).join("")}</ul>` : `<p class="muted">Nenhum combo completo na lista ainda.</p>`}
        ${quase.length ? `<p class="rot mt">${ic("add_circle")}Falta só uma carta</p><ul class="combos">${quase.map((o) => comboHtml(o.c, posse, naLista, o.falta[0])).join("")}</ul>` : ""}`);
    } catch { pinta(`<p class="dim" style="font-size:15px">${ic("cloud_off")} Não consegui falar com o Commander Spellbook agora. <button class="bt peq" data-f="recombos">Tentar de novo</button></p>`); }
  }

  // ---------- a tela ----------
  SV.telas.forja = {
    montar(el, arg) {
      if (arg && arg.startsWith("d")) {
        const s = SV.d.decks().find((d) => d.id === arg.slice(1) && d.forja);
        if (!s) { location.hash = "#forja"; return; }
        F.deck = { id: s.id, nome: s.nome, cmd: s.cmd || null, cmdNome: s.comandante, ident: s.ident || [], temas: s.temas || [], plano: s.plano || "", linhas: s.lista, pools: {}, orc: s.orc || 0, importado: !!s.importado, naoAchei: [] };
        F.tela = "salvo";
      } else if (F.tela === "salvo") { F.tela = "home"; F.deck = null; }
      const salvo = F.tela === "salvo";
      if (F.deck) desenharDeck(el, salvo); else desenharHome(el);
      ligar(el);
    },
    desmontar(el) { el.onclick = null; el.onsubmit = null; el.oninput = null; el.onchange = null; },
  };

  function ligar(el) {
    // comandantes cujo nome (em inglês ou português) contém o que foi digitado, do mais popular para o menos
    const procurar = async (q, exato) => {
      const limpo = q.replace(/[,"]/g, " ").replace(/\s+/g, " ").trim();
      const consulta = exato ? `is:commander !"${q.replace(/"/g, "")}"` : `is:commander ${limpo}`;
      try { return (await SV.sf.buscar(consulta, "&order=edhrec&include_multilingual=true")).filter((c, i, l) => l.findIndex((x) => x.nome === c.nome) === i); } catch { return []; }
    };
    const buscarSug = SV.debounce(async () => {
      const q = F.q.trim(); const s = $("#sug-forja", el); if (!s || q.length < 2) { F.sug = []; if (s) s.innerHTML = ""; return; }
      s.innerHTML = `<p class="dim"><span class="carregando"></span> Procurando comandantes…</p>`;
      F.sug = (await procurar(q, false)).slice(0, 6);
      if (!$("#sug-forja", el)) return;
      if (F.sug.length) desenharSugestoes(el); else s.innerHTML = `<p class="dim">Nenhum comandante encontrado para “${esc(q)}”. Confira o nome (pode ser em português ou inglês).</p>`;
    }, 350);
    const escolher = (c) => { F.cmd = c; F.sug = []; F.q = c.nome; const s = $("#sug-forja", el); if (s) s.innerHTML = ""; const i = $("#q-forja", el); if (i) i.value = c.nome; mostrarEscolhido(el); const b = $("#bt-forjar", el); if (b) { b.disabled = false; b.innerHTML = `${ic("construction")}Forjar o deck de ${esc(c.nome.split(",")[0])}`; } };
    el.oninput = (e) => { if (e.target.id === "q-forja") { F.q = e.target.value; buscarSug(); } if (e.target.id === "colada") F.colada = e.target.value; };
    el.onchange = (e) => { if (e.target.id === "op-colecao") F.colecao = e.target.checked; if (e.target.id === "op-combos") F.combos = e.target.checked; };
    el.onsubmit = async (e) => {
      if (e.target.id !== "f-forja") return; e.preventDefault();
      const q = F.q.trim(); if (q.length < 2) return;
      const s = $("#sug-forja", el); s.innerHTML = `<p class="dim"><span class="carregando"></span> Procurando…</p>`;
      let lista = await procurar(q, true); // nome exato primeiro
      if (!lista.length) lista = await procurar(q, false);
      if (lista.length === 1) return escolher(lista[0]);
      const igual = lista.find((c) => c.nome.toLowerCase() === q.toLowerCase());
      if (igual) return escolher(igual);
      if (lista.length) { F.sug = lista.slice(0, 6); return desenharSugestoes(el); }
      // não é comandante: diz qual carta é, em vez de só falhar
      let achou = null; try { achou = await SV.sf.identificar(q); } catch {}
      s.innerHTML = achou ? `<p class="dim">${esc(achou.nome)} não pode ser comandante. Escolha uma criatura lendária ou uma carta que diga “pode ser seu comandante”.</p>` : `<p class="dim">Não achei esse comandante. Confira o nome (pode ser em português ou inglês).</p>`;
    };
    el.onclick = async (e) => {
      const b = e.target.closest("[data-f]"); if (!b) return;
      const f = b.dataset.f, d = F.deck;
      if (f === "exemplo") { F.q = b.dataset.nome; const i = $("#q-forja", el); if (i) i.value = F.q; el.querySelector("#f-forja").requestSubmit(); }
      else if (f === "escolher") escolher(F.sug[+b.dataset.i]);
      else if (f === "trocar-cmd") { F.cmd = null; F.q = ""; SV.telas.forja.montar(el); }
      else if (f === "orc") { F.orc = +b.dataset.v; $$("#seg-orc button", el).forEach((x) => x.classList.toggle("on", x === b)); }
      else if (f === "forjar") iniciarForja(el);
      else if (f === "analisar") analisarTexto(el);
      else if (f === "apagar-deck") { if (await confirmar("Apagar este deck?", "A lista forjada sai do aparelho (as cartas da coleção não mudam).", "Apagar")) { SV.d.salvarDecks(SV.d.decks().filter((x) => x.id !== b.dataset.id)); SV.telas.forja.montar(el); } }
      else if (f === "voltar") { F.deck = null; F.tela = "home"; if (location.hash !== "#forja") location.hash = "#forja"; else SV.telas.forja.montar(el); }
      else if (d) await acaoDeck(el, f, b, d);
    };
  }

  function progresso(el) {
    const z = $("#prog-forja", el); if (z) { z.hidden = false; z.innerHTML = `<p class="rot"><span class="carregando"></span><span id="prog-txt">Começando…</span></p><div class="barra"><i id="prog-barra" style="width:2%"></i></div>`; }
    return (txt, fr) => { const t = $("#prog-txt", el), br = $("#prog-barra", el); if (t) t.textContent = txt; if (br) br.style.width = Math.round(fr * 100) + "%"; };
  }
  async function iniciarForja(el) {
    if (!F.cmd || F.gerando) return;
    F.gerando = true; const bt = $("#bt-forjar", el); if (bt) bt.disabled = true;
    const prog = progresso(el);
    try {
      F.deck = await gerar(F.cmd, { orc: F.orc, colecao: F.colecao, combos: F.combos }, prog); F.tela = "deck";
      F.gerando = false; desenharDeck(el, false); window.scrollTo(0, 0);
    } catch (e) { F.gerando = false; if (bt) bt.disabled = false; const z = $("#prog-forja", el); if (z) z.innerHTML = `<p class="dim">${ic("cloud_off")} Não consegui montar o deck agora (${esc(e.message || "sem conexão")}). Confira a internet e tente de novo.</p>`; }
  }
  async function analisarTexto(el) {
    const msg = $("#msg-colada", el), txt = ($("#colada", el).value || "").trim();
    if (!txt) { msg.textContent = "Cole primeiro a lista de cartas."; return; }
    msg.innerHTML = `<span class="carregando"></span> Lendo a lista…`;
    try {
      F.deck = await analisarColada(txt, F.cmd ? F.cmd.nome : "", (t) => { msg.innerHTML = `<span class="carregando"></span> ${esc(t)}`; }); F.tela = "deck";
      desenharDeck(el, false); window.scrollTo(0, 0);
    } catch (e) { msg.textContent = e.message || "Não consegui ler a lista."; }
  }

  // depois de entrar uma carta, o deck volta a 100: sai a última carta de sinergia (ou, na falta, um terreno básico)
  function manter100(d, protegida) {
    if (total(d) <= 100) return "";
    for (let i = d.linhas.length - 1; i >= 0; i--) {
      const l = d.linhas[i];
      if (l.cat.startsWith("sin:") && l.nome !== protegida) { d.linhas.splice(i, 1); return l.nome; }
    }
    const bas = d.linhas.filter((l) => l.cat === "basico").sort((a, b) => b.qtd - a.qtd)[0];
    if (bas && bas.qtd > 1) { bas.qtd--; return bas.nome; }
    return "";
  }

  async function acaoDeck(el, f, b, d) {
    const redesenhar = () => { desenharDeck(el, F.tela === "salvo"); };
    if (f === "trocar") {
      const i = +b.dataset.i, l = d.linhas[i]; const pool = d.pools[l.cat] || [];
      const usados = new Set(d.linhas.map((x) => frente(x.nome)));
      const k = pool.findIndex((c) => !usados.has(frente(c.nome)));
      if (k < 0) return toast("Não há outra sugestão para esta categoria.", "info");
      const [novo] = pool.splice(k, 1); d.linhas[i] = compactar(novo, l.cat, { motivo: l.cat === "vitoria" ? motivoVitoria(novo) : "" }); redesenhar();
    }
    else if (f === "tirar") { d.linhas.splice(+b.dataset.i, 1); redesenhar(); }
    else if (f === "copiar") { await SV.copiar(textoLista(d)); toast("Lista copiada: cole no Moxfield, Archidekt ou na Liga.", "content_copy"); }
    else if (f === "liga") { const posse = posseDe(); const falta = textoLista(d, (l) => !posse.has(frente(l.nome)) && l.cat !== "basico"); if (!falta) return toast("Você já tem tudo o que não é terreno básico.", "info"); await SV.copiar(falta); toast("Copiei só o que falta. Cole na Compra por Lista da Liga.", "storefront"); }
    else if (f === "compartilhar") await SV.compartilhar(d.nome, textoLista(d));
    else if (f === "salvar") {
      const id = SV.d.uid();
      const lista = d.linhas.map((l) => Object.assign({}, l));
      SV.d.salvarDecks(SV.d.decks().concat({ id, nome: d.nome, comandante: d.cmdNome, forja: true, cmd: d.cmd, ident: d.ident, temas: d.temas, plano: d.plano, orc: d.orc, importado: !!d.importado, lista, em: Date.now() }));
      toast("Deck salvo no Grimório", "bookmark_added"); F.deck = null; F.tela = "home"; location.hash = "#forja-d" + id;
    }
    else if (f === "faltantes") {
      const posse = posseDe(); let n = 0;
      d.linhas.forEach((l) => { if (l.cat === "basico" || posse.has(frente(l.nome)) || !l.sf || SV.desejoDe(l.nome)) return; SV.desejar(l); n++; });
      toast(n ? `${n} carta(s) na lista de desejos` : "Nada para adicionar: você já tem tudo (ou já estão na lista).", n ? "favorite" : "info");
    }
    else if (f === "add-combo") {
      b.disabled = true;
      try {
        const c = await SV.sf.porNome(b.dataset.nome, true); const usados = new Set(d.linhas.map((x) => frente(x.nome)));
        if (!usados.has(frente(c.nome))) {
          d.linhas.push(compactar(c, "vitoria", { motivo: "Completa um combo da lista", combo: true }));
          const saiu = manter100(d, c.nome);
          toast(saiu ? `${c.nome} entrou; ${saiu} saiu para manter 100 cartas` : `${c.nome} entrou no deck`, "add"); redesenhar();
        }
      } catch { toast("Não achei essa carta agora.", "cloud_off"); b.disabled = false; }
    }
    else if (f === "recombos") carregarCombos(el);
  }

  SV.forja = { gerar, detectarTemas, motivoVitoria, lerLista, slug };
})();
