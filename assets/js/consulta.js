// SpellVault — consulta de cartas, no estilo da busca da LigaMagic: nome em português ou inglês, filtros, atalhos,
// resultados com preço e a ficha completa de cada carta. Os dados vêm do Scryfall.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, brl, num2, toast, folha, fecharFolha } = SV;

  const COR_CHIPS = [["W", "Branco"], ["U", "Azul"], ["B", "Preto"], ["R", "Vermelho"], ["G", "Verde"], ["C", "Incolor"], ["M", "Multicolor"]];
  const TIPOS = [["creature", "Criatura"], ["instant", "Instantâneo"], ["sorcery", "Feitiço"], ["artifact", "Artefato"], ["enchantment", "Encantamento"], ["land", "Terreno"], ["planeswalker", "Planeswalker"], ["battle", "Batalha"], ["legendary", "Lendária"]];
  const RARIDADES = [["common", "Comum"], ["uncommon", "Incomum"], ["rare", "Rara"], ["mythic", "Mítica"]];
  const FORMATOS = [["commander", "Commander"], ["standard", "Standard"], ["pioneer", "Pioneer"], ["modern", "Modern"], ["legacy", "Legacy"], ["vintage", "Vintage"], ["pauper", "Pauper"], ["brawl", "Brawl"], ["historic", "Historic"], ["oathbreaker", "Oathbreaker"]];
  const ORDENS = [["name", "Nome"], ["usd", "Preço"], ["cmc", "Custo de mana"], ["released", "Lançamento"], ["edhrec", "Popularidade (EDHREC)"], ["rarity", "Raridade"], ["color", "Cor"]];
  const ATALHOS = [
    { ico: "groups", nome: "Mais jogadas no Commander", q: "f:commander game:paper", ordem: "edhrec" },
    { ico: "diamond", nome: "Mais caras", q: "game:paper", ordem: "usd", dir: "desc" },
    { ico: "lock", nome: "Reserved List", q: "is:reserved", ordem: "usd", dir: "desc" },
    { ico: "new_releases", nome: "Lançamentos", q: "game:paper", ordem: "released", dir: "desc" },
    { ico: "crown", nome: "Comandantes", q: "is:commander game:paper", ordem: "edhrec" },
    { ico: "toll", nome: "Terrenos mais jogados", q: "t:land f:commander game:paper", ordem: "edhrec" },
  ];

  const novoFiltro = () => ({ cores: [], modoCor: "contem", tipos: [], cmcOp: "<=", cmc: "", raridades: [], set: "", formato: "", texto: "", precoMax: "", foil: false, reservada: false, papel: true, prints: false, ordem: "name", dir: "auto" });
  // o estado fica na memória: voltar para a aba mantém a pesquisa
  const E = { q: "", f: novoFiltro(), itens: [], total: 0, proxima: "", rotulo: "", feito: false, carregando: false, erro: "", consulta: "" };

  const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const ehSimples = (q) => !/[:<>="()]/.test(q);
  function contaFiltros(f) {
    return (f.cores.length ? 1 : 0) + (f.tipos.length ? 1 : 0) + (f.cmc !== "" ? 1 : 0) + (f.raridades.length ? 1 : 0) + (f.set ? 1 : 0) + (f.formato ? 1 : 0) + (f.texto.trim() ? 1 : 0) + (f.precoMax ? 1 : 0) + (f.foil ? 1 : 0) + (f.reservada ? 1 : 0) + (f.prints ? 1 : 0) + (f.ordem !== "name" || f.dir !== "auto" ? 1 : 0);
  }
  // consulta do Scryfall a partir do que o jogador escolheu
  function montarQuery() {
    const f = E.f, q = E.q.trim(), p = [];
    if (q) p.push(q);
    const base = f.cores.filter((x) => "WUBRG".includes(x)).join("").toLowerCase();
    if (base) p.push(`${f.modoCor === "identidade" ? "id" : "c"}${f.modoCor === "exatas" ? "=" : f.modoCor === "identidade" ? "<=" : ">="}${base}`);
    if (f.cores.includes("C")) p.push("c:c");
    if (f.cores.includes("M")) p.push("c:m");
    f.tipos.forEach((t) => p.push(`t:${t}`));
    if (f.cmc !== "" && !isNaN(+f.cmc)) p.push(`cmc${f.cmcOp}${+f.cmc}`);
    if (f.raridades.length) p.push(f.raridades.length === 1 ? `r:${f.raridades[0]}` : `(${f.raridades.map((r) => `r:${r}`).join(" OR ")})`);
    if (f.set) p.push(`e:${f.set}`);
    if (f.formato) p.push(`f:${f.formato}`);
    if (f.texto.trim()) p.push(`o:"${f.texto.trim().replace(/"/g, "")}"`);
    if (f.precoMax) { const usd = SV.liga.numero(f.precoMax) / SV.d.config().cotacao; if (usd > 0) p.push(`usd<=${usd.toFixed(2)}`); }
    if (f.foil) p.push("is:foil");
    if (f.reservada) p.push("is:reserved");
    if (p.length && f.papel && !/game:paper/.test(p.join(" "))) p.push("game:paper");
    return p.join(" ");
  }
  // nome digitado igual ou começando igual vem primeiro (o Scryfall ordena só por ordem alfabética)
  function priorizar(itens, q) {
    const a = semAcento(q.trim());
    const peso = (c) => { const n = [semAcento(c.nome), semAcento(c.pt && c.pt.nome)]; return n.includes(a) ? 0 : n.some((x) => x.startsWith(a)) ? 1 : 2; };
    return itens.map((c, i) => [c, i]).sort((x, y) => peso(x[0]) - peso(y[0]) || x[1] - y[1]).map((x) => x[0]);
  }

  async function pesquisar(el, mais = false) {
    const q = montarQuery();
    if (!q) { toast("Digite um nome ou escolha filtros.", "search"); return; }
    E.consulta = q; E.erro = ""; E.carregando = true; if (!mais) { E.itens = []; E.total = 0; E.proxima = ""; E.feito = false; }
    desenharResultados(el);
    try {
      const f = E.f;
      const r = await SV.sf.pagina(q, { unique: f.prints ? "prints" : "cards", order: f.ordem, dir: f.dir, multilingue: !f.prints, url: mais ? E.proxima : "" });
      let itens = mais ? E.itens.concat(r.itens) : r.itens;
      if (!mais && ehSimples(E.q) && E.q.trim() && f.ordem === "name") itens = priorizar(itens, E.q);
      E.itens = itens; E.total = r.total; E.proxima = r.proxima;
    } catch (e) { E.erro = e.status === 400 || e.status === 422 ? "O Scryfall não entendeu esta consulta: " + e.message : "Sem conexão com o Scryfall agora. Tente de novo."; }
    E.carregando = false; E.feito = true;
    desenharResultados(el);
  }

  function tile(c, tenho) {
    const nome = c.pt ? c.pt.nome : c.nome, v = SV.d.valorInfo(c), n = tenho[c.nome] || 0;
    return `<a class="carta-mini" href="#ver-${c.sf}">
      <div class="img">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.nome)}" loading="lazy"/>` : ic("style")}</div>
      ${n ? `<span class="selo-cofre">No cofre ×${n}</span>` : ""}
      <div class="rodape"><b>${esc(nome)}</b><small><span class="raridade ${esc(c.raridade)}">${esc(SV.nomeRaridade[c.raridade] || "")}</span><span class="v">${v.v ? brl(v.v) : "—"}</span></small></div></a>`;
  }
  function desenharResultados(el) {
    const box = $("#res-cons", el); if (!box) return;
    atualizarExtras(el);
    if (!E.feito && !E.carregando) { box.innerHTML = ""; return; }
    const tenho = {}; SV.d.cartas().forEach((c) => (tenho[c.nome] = (tenho[c.nome] || 0) + 1));
    if (E.carregando && !E.itens.length) { box.innerHTML = `<p class="dim" style="text-align:center;padding:26px"><span class="carregando"></span> Consultando o oráculo…</p>`; return; }
    box.innerHTML = `
      <div class="fila"><span class="rot">${ic("style")}${E.erro ? "Consulta" : `${E.total.toLocaleString("pt-BR")} ${E.total === 1 ? "carta" : "cartas"}${E.rotulo ? " · " + esc(E.rotulo) : ""}`}</span></div>
      <p class="q-gerada mt">${esc(E.consulta)}</p>
      ${E.erro ? `<p class="tomo pad mt" style="color:#ffb3ad">${ic("error")} ${esc(E.erro)}</p>` : ""}
      ${!E.erro && !E.itens.length ? `<div class="vazio">${ic("search_off")}Nenhuma carta encontrada. Tente outro nome ou afrouxe os filtros.</div>` : ""}
      <div class="grade-cartas mt">${E.itens.map((c) => tile(c, tenho)).join("")}</div>
      ${E.proxima ? `<button class="bt cheio mt2" data-c="mais" ${E.carregando ? "disabled" : ""}>${E.carregando ? `<span class="carregando"></span> Carregando…` : `${ic("expand_more")}Mostrar mais (${(E.total - E.itens.length).toLocaleString("pt-BR")})`}</button>` : ""}`;
  }

  function desenhar(el) {
    const nF = contaFiltros(E.f);
    el.innerHTML = `<div class="pagina">
      <header class="topo"><span class="selo">${ic("travel_explore")}</span><div class="marca"><b>SpellVault</b><small>Consulta · oráculo de cartas</small></div>
        <div class="acoes"></div></header>
      <form class="busca" id="f-cons" role="search">${ic("search")}<input id="q-cons" value="${esc(E.q)}" placeholder="Nome da carta, em português ou inglês" autocomplete="off" enterkeyhint="search"/><button class="bt peq ouro">Buscar</button></form>
      <div id="sugestoes" class="chips mt" style="min-height:0"></div>
      <div class="chips mt" aria-label="Atalhos">
        <a class="chip on" href="#forja">${ic("construction")}Forja de decks</a>
        <button class="chip ${nF ? "on" : ""}" data-c="filtros">${ic("tune")}Filtros${nF ? ` (${nF})` : ""}</button>
        <button class="chip" data-c="limpar" ${E.feito || nF || E.q ? "" : "hidden"}>${ic("close")}Limpar</button>
        ${ATALHOS.map((a, i) => `<button class="chip" data-at="${i}">${ic(a.ico)}${a.nome}</button>`).join("")}
      </div>
      <div id="res-cons" class="mt"></div>
      <div id="dicas-cons" ${E.feito ? "hidden" : ""}>
        <section class="tomo cantos pad mt2 forja-chamada"><p class="rot">${ic("construction")}Forja de decks</p>
          <h2 style="font:600 22px var(--fc);margin-top:6px">Escreva o comandante e receba um deck</h2>
          <p class="muted">Cartas de alta sinergia, aceleração, compra, remoção e as condições de vitória (combos incluídos no app Android).</p>
          <a class="bt ouro cheio mt" href="#forja">${ic("local_fire_department")}Abrir a Forja</a></section>
        <section class="tomo cantos pad mt2"><p class="rot">${ic("storefront")}Na LigaMagic</p>
        <p class="muted mt">A LigaMagic mostra preços de lojas brasileiras e a variação do mercado. Abra por aqui e, se quiser, guarde a cotação na ficha da carta.</p>
        <div class="chips quebra mt"><a class="chip" href="${esc(SV.liga.urlAlta)}" target="_blank" rel="noopener">${ic("trending_up")}Cards em alta</a><a class="chip" href="${esc(SV.liga.urlQueda)}" target="_blank" rel="noopener">${ic("trending_down")}Cards em queda</a><a class="chip" href="${esc(SV.liga.urlReserved)}" target="_blank" rel="noopener">${ic("lock")}Reserved List</a><a class="chip" href="${esc(SV.liga.urlLista)}" target="_blank" rel="noopener">${ic("receipt_long")}Compra por lista</a><a class="chip" href="${esc(SV.liga.urlEdicoes)}" target="_blank" rel="noopener">${ic("layers")}Edições</a></div></section>
        <p class="dim mt" style="font-size:14.5px">Dica: dá para escrever a consulta como no Scryfall, por exemplo <b>t:legendary c:dimir cmc&lt;=3</b>.</p></div>
    </div>`;
    desenharResultados(el);
  }
  // mostra ou esconde o que depende de já haver uma pesquisa na tela
  function atualizarExtras(el) {
    const algo = E.feito || E.carregando || contaFiltros(E.f) > 0 || E.q.trim() !== "";
    const l = $("[data-c=limpar]", el); if (l) l.hidden = !algo;
    const d = $("#dicas-cons", el); if (d) d.hidden = E.feito || E.carregando;
    const f = $("[data-c=filtros]", el); if (f) { const n = contaFiltros(E.f); f.classList.toggle("on", n > 0); f.innerHTML = `${ic("tune")}Filtros${n ? ` (${n})` : ""}`; }
  }

  // ---------- filtros ----------
  function folhaFiltros(el) {
    const F = JSON.parse(JSON.stringify(E.f));
    const chip = (grupo, k, n, on) => `<button type="button" class="chip ${on ? "on" : ""}" data-f="${grupo}" data-k="${k}">${n}</button>`;
    const f = folha(`<h2>Filtros da consulta</h2><p class="muted">Combine à vontade. O nome digitado na busca também vale.</p>
      <div class="filtro-grupo"><p class="rot">Cores</p><div class="chips quebra mt" id="fc-cores">${COR_CHIPS.map(([k, n]) => chip("cores", k, n, F.cores.includes(k))).join("")}</div>
        <div class="seg mt" id="fc-modo">${[["contem", "Contém"], ["exatas", "Exatamente"], ["identidade", "Identidade"]].map(([k, n]) => `<button type="button" data-modo="${k}" class="${F.modoCor === k ? "on" : ""}">${n}</button>`).join("")}</div>
        <small class="dim" style="display:block;margin-top:5px;font-style:italic">“Identidade” mostra o que cabe num comandante dessas cores.</small></div>
      <div class="filtro-grupo"><p class="rot">Tipo</p><div class="chips quebra mt" id="fc-tipos">${TIPOS.map(([k, n]) => chip("tipos", k, n, F.tipos.includes(k))).join("")}</div></div>
      <div class="filtro-grupo campo"><label for="fc-cmc">Custo de mana convertido</label><div class="sel-linha"><select id="fc-cmcop"><option value="<=" ${F.cmcOp === "<=" ? "selected" : ""}>até</option><option value="=" ${F.cmcOp === "=" ? "selected" : ""}>igual a</option><option value=">=" ${F.cmcOp === ">=" ? "selected" : ""}>pelo menos</option></select><input id="fc-cmc" type="number" min="0" max="20" inputmode="numeric" placeholder="ex.: 3" value="${esc(F.cmc)}"/></div></div>
      <div class="filtro-grupo"><p class="rot">Raridade</p><div class="chips quebra mt" id="fc-rar">${RARIDADES.map(([k, n]) => chip("raridades", k, n, F.raridades.includes(k))).join("")}</div></div>
      <div class="filtro-grupo campo"><label for="fc-set">Edição</label><input id="fc-set" list="lista-sets" placeholder="Nome ou código (ex.: Commander Masters ou cmm)" value="${esc(F.set)}" autocomplete="off"/><datalist id="lista-sets"></datalist></div>
      <div class="filtro-grupo campo"><label for="fc-formato">Legal no formato</label><select id="fc-formato"><option value="">Qualquer</option>${FORMATOS.map(([k, n]) => `<option value="${k}" ${F.formato === k ? "selected" : ""}>${n}</option>`).join("")}</select></div>
      <div class="filtro-grupo campo"><label for="fc-texto">Texto de regras contém</label><input id="fc-texto" placeholder="Em inglês, ex.: draw a card" value="${esc(F.texto)}" autocomplete="off"/></div>
      <div class="filtro-grupo campo"><label for="fc-preco">Preço máximo (R$)</label><input id="fc-preco" inputmode="decimal" placeholder="ex.: 50" value="${esc(F.precoMax)}" autocomplete="off"/><small>Convertido pelo dólar ajustado no Grimório.</small></div>
      <div class="filtro-grupo dupla campo"><div><label for="fc-ordem">Ordenar por</label><select id="fc-ordem">${ORDENS.map(([k, n]) => `<option value="${k}" ${F.ordem === k ? "selected" : ""}>${n}</option>`).join("")}</select></div><div><label for="fc-dir">Direção</label><select id="fc-dir">${[["auto", "Automática"], ["asc", "Crescente"], ["desc", "Decrescente"]].map(([k, n]) => `<option value="${k}" ${F.dir === k ? "selected" : ""}>${n}</option>`).join("")}</select></div></div>
      <div class="filtro-grupo"><label class="check"><input type="checkbox" id="fc-papel" ${F.papel ? "checked" : ""}/>Só cartas de papel (sem digitais)</label>
        <label class="check mt"><input type="checkbox" id="fc-foil" ${F.foil ? "checked" : ""}/>Existe em foil</label>
        <label class="check mt"><input type="checkbox" id="fc-res" ${F.reservada ? "checked" : ""}/>Só Reserved List</label>
        <label class="check mt"><input type="checkbox" id="fc-prints" ${F.prints ? "checked" : ""}/>Mostrar todas as edições (uma carta por impressão)</label></div>
      <div class="dupla mt2"><button type="button" class="bt" id="fc-limpar">Limpar tudo</button><button type="button" class="bt ouro" id="fc-ok">${ic("search")}Aplicar filtros</button></div>`);
    // lista de edições para o campo "Edição"
    SV.sf.sets().then((l) => { const dl = $("#lista-sets", f); if (dl) dl.innerHTML = l.slice(0, 1200).map((s) => `<option value="${esc(s.c)}">${esc(s.n)}</option>`).join(""); }).catch(() => {});
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.f) { const l = F[b.dataset.f], k = b.dataset.k, i = l.indexOf(k); i >= 0 ? l.splice(i, 1) : l.push(k); b.classList.toggle("on", i < 0); }
      else if (b.dataset.modo) { F.modoCor = b.dataset.modo; $$("#fc-modo button", f).forEach((x) => x.classList.toggle("on", x === b)); }
      else if (b.id === "fc-limpar") { E.f = novoFiltro(); E.itens = []; E.total = 0; E.proxima = ""; E.feito = false; E.erro = ""; E.consulta = ""; fecharFolha(); desenhar(el); }
      else if (b.id === "fc-ok") {
        F.cmcOp = $("#fc-cmcop", f).value; F.cmc = $("#fc-cmc", f).value.trim(); F.formato = $("#fc-formato", f).value; F.texto = $("#fc-texto", f).value; F.precoMax = $("#fc-preco", f).value.trim();
        F.ordem = $("#fc-ordem", f).value; F.dir = $("#fc-dir", f).value; F.papel = $("#fc-papel", f).checked; F.foil = $("#fc-foil", f).checked; F.reservada = $("#fc-res", f).checked; F.prints = $("#fc-prints", f).checked;
        // aceita o nome da edição ou o código
        const v = $("#fc-set", f).value.trim().toLowerCase();
        const l = (SV.sf.cache.sets || []);
        F.set = !v ? "" : l.some((s) => s.c === v) ? v : ((l.find((s) => semAcento(s.n).includes(semAcento(v))) || {}).c || v);
        E.f = F; E.rotulo = ""; fecharFolha(); desenhar(el); pesquisar(el);
      }
    });
  }

  SV.telas = SV.telas || {};
  SV.telas.consulta = {
    montar(el) {
      desenhar(el);
      let vez = 0;
      const sug = SV.debounce(async (q) => {
        const minha = ++vez, box = $("#sugestoes", el); if (!box) return;
        if (q.length < 3 || !ehSimples(q) || /[^\x00-\x7F]/.test(q)) { box.innerHTML = ""; return; }
        try { const nomes = await SV.sf.autocompletar(q); if (minha === vez && $("#sugestoes", el)) $("#sugestoes", el).innerHTML = nomes.slice(0, 8).map((n) => `<button class="chip" data-sug="${esc(n)}">${esc(n)}</button>`).join(""); } catch {}
      }, 280);
      // a tela é redesenhada (limpar, atalhos, filtros): por isso os eventos ficam no contêiner e não no campo
      el.oninput = (e) => { if (e.target.id === "q-cons") { E.q = e.target.value; atualizarExtras(el); sug(e.target.value.trim()); } };
      el.onsubmit = (e) => { if (e.target.id !== "f-cons") return; e.preventDefault(); E.q = $("#q-cons", el).value; E.rotulo = ""; vez++; $("#sugestoes", el).innerHTML = ""; pesquisar(el); };
      el.onclick = (e) => {
        const b = e.target.closest("[data-c],[data-at],[data-sug]"); if (!b) return;
        if (b.dataset.sug) { E.q = b.dataset.sug; $("#q-cons", el).value = E.q; E.rotulo = ""; vez++; $("#sugestoes", el).innerHTML = ""; pesquisar(el); }
        else if (b.dataset.at !== undefined) { const a = ATALHOS[+b.dataset.at]; E.f = novoFiltro(); E.f.ordem = a.ordem; E.f.dir = a.dir || "auto"; E.q = a.q; E.rotulo = a.nome; $("#q-cons", el).value = a.q; desenhar(el); pesquisar(el); }
        else if (b.dataset.c === "filtros") folhaFiltros(el);
        else if (b.dataset.c === "limpar") { E.q = ""; E.f = novoFiltro(); E.itens = []; E.total = 0; E.proxima = ""; E.feito = false; E.erro = ""; E.rotulo = ""; E.consulta = ""; desenhar(el); }
        else if (b.dataset.c === "mais") pesquisar(el, true);
      };
    },
    desmontar(el) { el.onclick = null; el.onsubmit = null; el.oninput = null; },
  };
})();
