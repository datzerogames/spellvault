// SpellVault — coleção: lista com filtros, detalhe da carta (3D, tradução, onde está guardada) e os fluxos
// de adicionar, mover e designar a deck, usados também pelos álbuns e pelo scanner.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, brl, mana, toast, folha, fecharFolha, confirmar } = SV;

  const CORES = [["W", "Branco"], ["U", "Azul"], ["B", "Preto"], ["R", "Vermelho"], ["G", "Verde"], ["M", "Multicolor"], ["C", "Incolor"]];
  const TIPOS_CARTA = [["Creature", "Criatura"], ["Instant", "Instantâneo"], ["Sorcery", "Feitiço"], ["Artifact", "Artefato"], ["Enchantment", "Encantamento"], ["Land", "Terreno"], ["Planeswalker", "Planeswalker"]];
  const CONDICOES = [["NM", "Near Mint"], ["SP", "Slightly Played"], ["MP", "Moderately Played"], ["HP", "Heavily Played"], ["D", "Danificada"]];
  const IDIOMAS = ["EN", "PT", "ES", "JA", "DE", "FR", "IT"];
  const filtro = { q: "", cor: "", tipo: "", foil: false, troca: false, album: "", ordem: "recentes" };

  const nomeExibido = (c) => (SV.d.config().idioma === "pt" && c.pt && c.pt.nome ? c.pt.nome : c.nome);
  const corDe = (c) => (c.cores && c.cores.length > 1 ? "M" : c.cores && c.cores.length ? c.cores[0] : "C");

  function cartaMini(c, extra = "") {
    return `<a class="carta-mini" href="#carta-${c.id}" ${extra}>
      <div class="img">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.nome)}" loading="lazy"/>` : ic("style")}</div>
      ${c.foil ? `<span class="selo-foil">Foil</span><span class="foil-brilho"></span>` : ""}${c.troca ? `<span class="selo-cofre">Troca</span>` : ""}
      <div class="rodape"><b>${esc(nomeExibido(c))}</b>${localDe(c)}<small><span class="raridade ${esc(c.raridade)}">${esc(SV.nomeRaridade[c.raridade] || "")}</span><span class="v">${SV.d.valorInfo(c).v ? brl(SV.d.valorInfo(c).v) : "—"}${SV.d.valorInfo(c).fonte === "liga" ? ' <i class="liga-tag">Liga</i>' : ""}</span></small></div>
    </a>`;
  }

  function localDe(c) {
    const a = SV.d.album(c.album);
    return `<span class="loc">${ic("pin_drop")}${a ? esc(a.nome) + " · " + (SV.d.ehCaixa(a) ? "#" : "slot ") + c.slot : "sem lugar"}</span>`;
  }

  // "Canto inferior direito da grade", "Linha do meio, à esquerda"…
  function posicaoTexto(a, slot) {
    if (!a || SV.d.ehCaixa(a)) return a ? `Posição ${slot} contando da frente da caixa` : "";
    const t = SV.d.TIPOS[a.tipo], k = (slot - 1) % SV.d.porPagina(a), lin = Math.floor(k / t.cols), col = k % t.cols;
    const L = t.rows === 1 ? "" : lin === 0 ? "superior" : lin === t.rows - 1 ? "inferior" : "do meio";
    const C = col === 0 ? "esquerdo" : col === t.cols - 1 ? "direito" : "central";
    if (L && L !== "do meio" && C !== "central") return `Canto ${L} ${C} da página`;
    return `Linha ${L === "do meio" ? "do meio" : L}, ${C === "central" ? "no centro" : C === "esquerdo" ? "à esquerda" : "à direita"}`;
  }

  // ---------- tela: coleção ----------
  function filtrar() {
    const q = SV.d.cartas().filter((c) => {
      const t = (c.nome + " " + (c.pt ? c.pt.nome : "") + " " + c.setNome + " " + c.tipo).toLowerCase();
      return (!filtro.q || t.includes(filtro.q.toLowerCase())) && (!filtro.cor || corDe(c) === filtro.cor) && (!filtro.tipo || c.tipo.includes(filtro.tipo)) && (!filtro.foil || c.foil) && (!filtro.troca || c.troca) && (!filtro.album || (filtro.album === "-" ? !c.album : c.album === filtro.album));
    });
    const ord = { recentes: (a, b) => b.adicionada - a.adicionada, valor: (a, b) => SV.d.valor(b) - SV.d.valor(a), nome: (a, b) => nomeExibido(a).localeCompare(nomeExibido(b)), cmc: (a, b) => a.cmc - b.cmc }[filtro.ordem];
    return q.sort(ord);
  }
  function desenharLista(el) {
    const l = filtrar(), todas = SV.d.cartas();
    $("#lista-col", el).innerHTML = l.length ? `<div class="grade-cartas">${l.map((c) => cartaMini(c)).join("")}</div>` : `<div class="vazio">${ic("style")}${todas.length ? "Nenhuma carta com esses filtros." : "Sua coleção ainda está vazia. Escaneie ou adicione a primeira carta."}</div>`;
    $("#cont-col", el).textContent = `${l.length} de ${todas.length}`;
  }
  SV.telas = SV.telas || {};
  let modoCol = "cofre";
  const contaDesejos = () => SV.d.desejos().reduce((s, x) => s + x.qtd, 0);
  function corpoCofre(el) {
    const todas = SV.d.cartas(), cfg = SV.d.config();
    const total = todas.reduce((s, c) => s + SV.d.valor(c, cfg), 0);
    $("#corpo-col", el).innerHTML = `
      <div class="resumo"><div class="tomo"><b class="num">${todas.length}</b><span>cartas</span></div><div class="tomo"><b class="num">${brl(total).replace("R$ ", "")}</b><span>R$ estimado</span></div><div class="tomo"><b class="num">${todas.filter((c) => c.foil).length}</b><span>foils</span></div></div>
      <label class="busca">${ic("search")}<input id="q-col" value="${esc(filtro.q)}" placeholder="Buscar no cofre (nome, edição, tipo)" autocomplete="off"/><button type="button" class="ico-bt" data-c="limpar-busca" aria-label="Limpar a busca" ${filtro.q ? "" : "hidden"}>${ic("close")}</button></label>
      <div class="chips mt" id="chips-cor"><button class="chip ${!filtro.cor ? "on" : ""}" data-cor="">Todas</button>${CORES.map(([k, n]) => `<button class="chip ${filtro.cor === k ? "on" : ""}" data-cor="${k}"><span class="pip ${k === "M" ? "X" : k}" style="width:14px;height:14px"></span>${n}</button>`).join("")}</div>
      <div class="chips" id="chips-tipo"><button class="chip ${filtro.foil ? "on" : ""}" data-foil="1">${ic("auto_awesome")}Foil</button><button class="chip ${filtro.troca ? "on" : ""}" data-troca="1">${ic("swap_horiz")}Para troca</button>
        <label class="chip ${filtro.album ? "on" : ""}" style="cursor:pointer">${ic("folder_special")}<select id="alb-col" aria-label="Filtrar por álbum" style="background:none;border:0;color:inherit;font:inherit;outline:0;max-width:150px"><option value="" style="background:#17110d">Todos os álbuns</option>${SV.d.albuns().map((a) => `<option value="${a.id}" ${filtro.album === a.id ? "selected" : ""} style="background:#17110d">${esc(a.nome)}</option>`).join("")}<option value="-" ${filtro.album === "-" ? "selected" : ""} style="background:#17110d">Sem lugar</option></select></label>${TIPOS_CARTA.map(([k, n]) => `<button class="chip ${filtro.tipo === k ? "on" : ""}" data-tipo="${k}">${n}</button>`).join("")}</div>
      <div class="fila mt"><span class="rot">${ic("style")}<span id="cont-col"></span></span><span class="espaco"></span>
        <label class="chip" style="cursor:pointer">${ic("sort")}<select id="ordem-col" style="background:none;border:0;color:inherit;font:inherit;outline:0">${[["recentes", "Recentes"], ["valor", "Mais valiosas"], ["nome", "Nome"], ["cmc", "Custo de mana"]].map(([v, t]) => `<option value="${v}" ${filtro.ordem === v ? "selected" : ""} style="background:#17110d">${t}</option>`).join("")}</select></label></div>
      <div id="lista-col" class="mt"></div>`;
    desenharLista(el);
    $("#q-col", el).addEventListener("input", SV.debounce((e) => { filtro.q = e.target.value.trim(); const x = $("[data-c=limpar-busca]", el); if (x) x.hidden = !filtro.q; desenharLista(el); }, 160));
    $("#alb-col", el).addEventListener("change", (e) => { filtro.album = e.target.value; e.target.closest("label").classList.toggle("on", !!filtro.album); desenharLista(el); });
    $("#ordem-col", el).addEventListener("change", (e) => { filtro.ordem = e.target.value; desenharLista(el); });
  }
  SV.telas.colecao = {
    montar(el) {
      el.innerHTML = `<div class="pagina">
        <header class="topo"><span class="selo">${ic("style")}</span><div class="marca"><b>SpellVault</b><small>Coleção · tesouro do cofre</small></div>
          <div class="acoes"><a class="ico-bt" href="#scanner" aria-label="Escanear carta">${ic("center_focus_strong")}</a></div></header>
        <div class="seg" id="seg-modo"><button data-modo="cofre">${ic("style")}Cofre (${SV.d.cartas().length})</button><button data-modo="desejos">${ic("favorite")}Desejos (${contaDesejos()})</button></div>
        <div id="corpo-col" class="mt"></div>
      </div>
      <button class="fab" data-c="adicionar" aria-label="Adicionar carta">${ic("add")}</button>`;
      const mostrar = () => {
        if (modoCol === "cofre") corpoCofre(el);
        else SV.desejos.montar($("#corpo-col", el), () => { const d = $('#seg-modo [data-modo="desejos"]', el); if (d) d.innerHTML = `${ic("favorite")}Desejos (${contaDesejos()})`; });
        $$("#seg-modo button", el).forEach((x) => x.classList.toggle("on", x.dataset.modo === modoCol));
        $(".fab", el).hidden = modoCol !== "cofre";
      };
      mostrar();
      el.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.modo) { modoCol = b.dataset.modo; mostrar(); }
        else if (modoCol !== "cofre") return;
        else if (b.dataset.cor !== undefined) { filtro.cor = b.dataset.cor; $$("#chips-cor .chip", el).forEach((x) => x.classList.toggle("on", x === b)); desenharLista(el); }
        else if (b.dataset.tipo) { filtro.tipo = filtro.tipo === b.dataset.tipo ? "" : b.dataset.tipo; $$("#chips-tipo [data-tipo]", el).forEach((x) => x.classList.toggle("on", x.dataset.tipo === filtro.tipo)); desenharLista(el); }
        else if (b.dataset.foil) { filtro.foil = !filtro.foil; b.classList.toggle("on", filtro.foil); desenharLista(el); }
        else if (b.dataset.troca) { filtro.troca = !filtro.troca; b.classList.toggle("on", filtro.troca); desenharLista(el); }
        else if (b.dataset.c === "limpar-busca") { filtro.q = ""; const i = $("#q-col", el); i.value = ""; b.hidden = true; i.focus(); desenharLista(el); }
        else if (b.dataset.c === "adicionar") abrirAdicionar({ aoAdicionar: () => SV.telas.colecao.montar(el) });
      };
    },
    desmontar(el) { el.onclick = null; },
  };

  // ---------- tradução (cache em todas as cópias com o mesmo nome) ----------
  async function traducao(c) {
    if (c.pt || c.ptBuscado) return c.pt;
    let pt = await SV.sf.emPortugues(c.set, c.num);
    if (!pt) { const r = await SV.sf.buscar(`!"${c.nome}" lang:pt`, "&include_multilingual=true").catch(() => []); pt = r[0] ? r[0].pt : null; }
    SV.d.salvarCartas(SV.d.cartas().map((x) => (x.nome === c.nome ? Object.assign(x, { pt: x.pt || pt, ptBuscado: true }) : x)));
    return pt;
  }

  function mapaPagina(a, slot, clique) {
    const t = SV.d.TIPOS[a.tipo], pp = SV.d.porPagina(a), pag = SV.d.paginaDo(a, slot), oc = SV.d.ocupacao(a.id);
    const ini = (pag - 1) * pp + 1;
    return `<div class="mapa-pag" style="grid-template-columns:repeat(${t.cols},1fr);max-width:${t.cols * 92}px">${Array.from({ length: pp }, (_, i) => { const s = ini + i, o = oc[s]; return `<div class="${s === slot ? "alvo" : ""}" ${clique ? `data-slot="${s}" role="button" tabindex="0"` : ""}>${o && o.imgPeq ? `<img src="${esc(o.imgPeq)}" alt=""/>` : ""}<span>${s === slot && !clique ? "#" + s : s}</span><span style="font-size:9px;letter-spacing:.1em">${s === slot ? "" : o ? "ocupado" : "vazio"}</span></div>`; }).join("")}</div>`;
  }

  // cartão 3D: inclina com o dedo/mouse; no foil o brilho holográfico acompanha
  function carta3d(el, foil) {
    if (!el) return;
    let ativo = false;
    const mover = (x, y) => {
      const r = el.getBoundingClientRect(), px = (x - r.left) / r.width, py = (y - r.top) / r.height;
      const virada = el.dataset.virada === "1" ? 180 : 0;
      el.style.transition = "transform .08s";
      el.style.transform = `rotateY(${virada + (px - 0.5) * 30}deg) rotateX(${(0.5 - py) * 26}deg)`;
      el.style.setProperty("--lx", px * 100 + "%"); el.style.setProperty("--ly", py * 100 + "%");
      if (foil) { el.style.setProperty("--hx", px * 100 + "%"); el.style.setProperty("--hy", py * 100 + "%"); el.style.setProperty("--ang", 90 + px * 60); }
    };
    const solta = () => { ativo = false; el.style.transition = ""; el.style.transform = `rotateY(${el.dataset.virada === "1" ? 180 : 0}deg)`; };
    el.addEventListener("pointerdown", (e) => { ativo = true; el.setPointerCapture(e.pointerId); mover(e.clientX, e.clientY); });
    el.addEventListener("pointermove", (e) => { if (ativo || e.pointerType === "mouse") mover(e.clientX, e.clientY); });
    el.addEventListener("pointerup", solta); el.addEventListener("pointerleave", solta); el.addEventListener("pointercancel", solta);
  }

  // ---------- folhas de ação ----------
  function opcoesAlbum(sel) { return `<option value="">Sem lugar (só na coleção)</option>` + SV.d.albuns().map((a) => `<option value="${a.id}" ${a.id === sel ? "selected" : ""}>${esc(a.nome)}</option>`).join(""); }
  function folhaMover(c, depois) {
    let alb = c.album || SV.d.config().albumPadrao || (SV.d.albuns()[0] || {}).id || "", slot = c.slot || 0;
    const f = folha(`<h2>Mudar de lugar</h2><p class="muted">${esc(c.nome)} · hoje em ${esc(SV.d.album(c.album) ? SV.d.album(c.album).nome + ", slot " + c.slot : "nenhum álbum")}</p>
      <div class="campo mt"><label for="alb-m">Álbum</label><select id="alb-m">${opcoesAlbum(alb)}</select></div>
      <div class="campo mt"><label for="slot-m">Slot</label><input id="slot-m" type="number" min="1" inputmode="numeric"/><small id="dica-m"></small></div>
      <div id="grade-m"></div>
      <button class="bt ouro cheio mt2" id="ok-m">${ic("swap_horiz")}Mover para cá</button>`);
    const desenhar = () => {
      const a = SV.d.album(alb), inp = $("#slot-m", f);
      if (!a) { inp.disabled = true; inp.value = ""; $("#grade-m", f).innerHTML = ""; $("#dica-m", f).textContent = "A carta fica só na coleção, sem lugar físico."; return; }
      inp.disabled = false; inp.max = SV.d.capacidade(a);
      if (!slot || (alb !== c.album && SV.d.ocupacao(a.id)[slot])) slot = SV.d.proximoLivre(a.id) || 1;
      inp.value = slot;
      const o = SV.d.ocupacao(a.id)[slot];
      $("#dica-m", f).textContent = o && o.id !== c.id ? `Ocupado por ${o.nome}: as duas trocam de lugar.` : SV.d.ehCaixa(a) ? `Posição livre na ${a.nome}.` : `Página ${SV.d.paginaDo(a, slot)} · ${posicaoTexto(a, slot)}. Toque num espaço da página para escolher.`;
      $("#grade-m", f).innerHTML = SV.d.ehCaixa(a) ? "" : mapaPagina(a, slot, true);
    };
    desenhar();
    $("#alb-m", f).addEventListener("change", (e) => { alb = e.target.value; slot = 0; desenhar(); });
    $("#slot-m", f).addEventListener("change", (e) => { const a = SV.d.album(alb); slot = Math.max(1, Math.min(SV.d.capacidade(a), +e.target.value || 1)); desenhar(); });
    f.addEventListener("click", (e) => {
      const s = e.target.closest("[data-slot]"); if (s) { slot = +s.dataset.slot; desenhar(); return; }
      if (e.target.closest("#ok-m")) {
        const a = SV.d.album(alb), o = a && SV.d.ocupacao(a.id)[slot];
        if (o && o.id !== c.id) SV.d.atualizar(o.id, { album: c.album, slot: c.slot });
        SV.d.atualizar(c.id, { album: a ? a.id : "", slot: a ? slot : 0 });
        toast(a ? `Guardada em ${a.nome}, slot ${slot}` : "Carta sem lugar definido", "pin_drop"); fecharFolha(); depois && depois();
      }
    });
  }
  function folhaDeck(c, depois) {
    const f = folha(`<h2>Designar a deck</h2><p class="muted">${esc(c.nome)}</p>
      <div class="res-busca">${[{ id: "", nome: "Nenhum deck" }].concat(SV.d.decks()).map((dk) => `<button data-deck="${dk.id}">${ic(dk.id ? "swords" : "block")}<div><b>${esc(dk.nome)}</b>${dk.comandante ? `<small>Comandante: ${esc(dk.comandante)}</small>` : ""}</div>${c.deck === dk.id ? `<span class="espaco"></span>${ic("check", "ouro")}` : ""}</button>`).join("")}</div>
      <div class="campo mt"><label for="novo-deck">Ou crie um deck</label><input id="novo-deck" placeholder="Ex.: Atraxa superfriends"/></div>
      <button class="bt ouro cheio mt" id="criar-deck">${ic("add")}Criar e designar</button>`);
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-deck]");
      if (b) { SV.d.atualizar(c.id, { deck: b.dataset.deck }); toast(b.dataset.deck ? "Designada ao deck" : "Removida do deck", "swords"); fecharFolha(); depois && depois(); }
      if (e.target.closest("#criar-deck")) { const nome = $("#novo-deck", f).value.trim(); if (!nome) { toast("Dê um nome ao deck.", "edit"); return; } const dk = { id: SV.d.uid(), nome, comandante: "" }; SV.d.salvarDecks(SV.d.decks().concat(dk)); SV.d.atualizar(c.id, { deck: dk.id }); toast(`Deck “${nome}” criado`, "swords"); fecharFolha(); depois && depois(); }
    });
  }
  function folhaEditar(c, depois) {
    const f = folha(`<h2>Estado da cópia</h2><p class="muted">${esc(c.nome)} · ${esc(c.setNome)}</p>
      <div class="campo mt"><label>Condição</label><div class="seg" id="seg-cond">${CONDICOES.map(([k]) => `<button data-cond="${k}" class="${c.condicao === k ? "on" : ""}">${k}</button>`).join("")}</div></div>
      <div class="campo mt"><label for="idi">Idioma da carta</label><select id="idi">${IDIOMAS.map((x) => `<option ${x === c.idioma ? "selected" : ""}>${x}</option>`).join("")}</select></div>
      <label class="check mt"><input type="checkbox" id="foil-e" ${c.foil ? "checked" : ""}/>Cópia foil</label>
      <label class="check mt"><input type="checkbox" id="troca-e" ${c.troca ? "checked" : ""}/>Disponível para troca</label>
      <button class="bt ouro cheio mt2" id="ok-e">${ic("save")}Salvar</button>`);
    let cond = c.condicao;
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cond]"); if (b) { cond = b.dataset.cond; $$("#seg-cond button", f).forEach((x) => x.classList.toggle("on", x === b)); }
      if (e.target.closest("#ok-e")) { SV.d.atualizar(c.id, { condicao: cond, idioma: $("#idi", f).value, foil: $("#foil-e", f).checked, troca: $("#troca-e", f).checked }); toast("Cópia atualizada", "save"); fecharFolha(); depois && depois(); }
    });
  }

  // ---------- adicionar carta: busca → edição → destino ----------
  function abrirAdicionar(opts = {}) {
    const f = folha(`<h2>Nova carta no cofre</h2><p class="muted">${opts.album ? `Destino: ${esc(SV.d.album(opts.album).nome)}, slot ${opts.slot}` : "Busque pelo nome em português ou inglês."}</p>
      <form class="busca mt" id="f-busca">${ic("search")}<input id="q-add" placeholder="Ex.: Anel Solar ou Sol Ring" autocomplete="off" autofocus/><button class="bt peq ouro">Buscar</button></form>
      <div class="res-busca" id="res-add"></div>`);
    const res = $("#res-add", f);
    // só a resposta mais recente aparece (a sugestão pode chegar depois da busca completa)
    let vez = 0, timer;
    const sugerir = (q) => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const minha = ++vez;
        if (q.length < 2) { res.innerHTML = ""; return; }
        try { const nomes = await SV.sf.autocompletar(q); if (minha !== vez) return; res.innerHTML = nomes.slice(0, 10).map((n) => `<button data-nome="${esc(n)}">${ic("style")}<div><b>${esc(n)}</b></div></button>`).join("") || `<p class="dim">Toque em Buscar para procurar em português.</p>`; } catch { if (minha === vez) res.innerHTML = `<p class="dim">Sem conexão com o Scryfall.</p>`; }
      }, 250);
    };
    $("#q-add", f).addEventListener("input", (e) => sugerir(e.target.value.trim()));
    $("#f-busca", f).addEventListener("submit", async (e) => {
      e.preventDefault(); clearTimeout(timer); const minha = ++vez; const q = $("#q-add", f).value.trim(); if (!q) { toast("Digite o nome da carta.", "search"); return; }
      res.innerHTML = `<p class="dim"><span class="carregando"></span> Consultando o oráculo…</p>`;
      const r = await SV.sf.multilingue(q).catch(() => []);
      if (minha !== vez) return;
      const unicos = [...new Map(r.map((c) => [c.nome, c])).values()].slice(0, 12);
      res.innerHTML = unicos.length ? unicos.map((c) => `<button data-nome="${esc(c.nome)}"><img class="carta" src="${esc(c.imgPeq)}" alt="" loading="lazy"/><div><b>${esc(c.pt ? c.pt.nome : c.nome)}</b><small>${esc(c.pt ? c.nome + " · " : "")}${esc(c.tipo)}</small></div></button>`).join("") : `<p class="dim">Nada encontrado para “${esc(q)}”.</p>`;
    });
    f.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-nome]"); if (!b) return;
      res.innerHTML = `<p class="dim"><span class="carregando"></span> Buscando edições…</p>`;
      const eds = await SV.sf.impressoes(b.dataset.nome).catch(() => []);
      if (!eds.length) { res.innerHTML = `<p class="dim">Não consegui carregar as edições.</p>`; return; }
      res.innerHTML = `<p class="rot">${ic("layers")}Escolha a edição (${eds.length})</p>` + eds.slice(0, 40).map((c, i) => `<button data-ed="${i}"><img class="carta" src="${esc(c.imgPeq)}" alt="" loading="lazy"/><div><b>${esc(c.setNome)}</b><small>${esc(c.set.toUpperCase())} #${esc(c.num)} · ${esc(SV.nomeRaridade[c.raridade] || "")} · ${c.usd || c.usdFoil ? "US$ " + (c.usd || c.usdFoil).toFixed(2) : "sem preço"}</small></div></button>`).join("");
      res.onclick = (ev) => { const x = ev.target.closest("[data-ed]"); if (x) { ev.stopPropagation(); folhaDestino(eds[+x.dataset.ed], opts); } };
    });
  }
  function folhaDestino(dadosSf, opts = {}) {
    let alb = opts.album || SV.d.config().albumPadrao || "", cond = "NM";
    const f = folha(`<h2>${esc(dadosSf.nome)}</h2><p class="muted">${esc(dadosSf.setNome)} · ${esc(dadosSf.set.toUpperCase())} #${esc(dadosSf.num)}</p>
      <div class="resultado tomo mt"><img src="${esc(dadosSf.img)}" alt=""/><div><span class="raridade ${esc(dadosSf.raridade)}">${esc(SV.nomeRaridade[dadosSf.raridade] || "")}</span><p class="mt" style="font-size:15px">${esc(dadosSf.tipo)}</p><p class="ouro mt" style="font:700 20px var(--ft)">${dadosSf.usd || dadosSf.usdFoil ? brl((dadosSf.usd || dadosSf.usdFoil) * SV.d.config().cotacao) : "Sem preço no Scryfall"}</p><p class="dim" style="font-size:14px">Você já tem ${SV.d.copias(dadosSf.nome).length} cópia(s).</p></div></div>
      <div class="campo mt"><label>Condição</label><div class="seg" id="seg-cd">${CONDICOES.map(([k]) => `<button type="button" data-cond="${k}" class="${k === cond ? "on" : ""}">${k}</button>`).join("")}</div></div>
      <div class="dupla mt"><div class="campo"><label for="idi-d">Idioma</label><select id="idi-d">${IDIOMAS.map((x) => `<option>${x}</option>`).join("")}</select></div><div class="campo"><label for="deck-d">Deck</label><select id="deck-d"><option value="">Nenhum</option>${SV.d.decks().map((dk) => `<option value="${dk.id}">${esc(dk.nome)}</option>`).join("")}</select></div></div>
      ${dadosSf.foilPossivel ? `<label class="check mt"><input type="checkbox" id="foil-d" ${opts.foil ? "checked" : ""}/>Cópia foil</label>` : ""}
      <label class="check mt"><input type="checkbox" id="troca-d" ${opts.troca ? "checked" : ""}/>Disponível para troca</label>
      <div class="campo mt"><label for="alb-d">Guardar em</label><select id="alb-d">${opcoesAlbum(alb)}</select><small id="slot-d"></small></div>
      <button class="bt ouro cheio mt2" id="ok-d">${ic("bookmark_add")}Adicionar à coleção</button>`);
    const dica = () => { const a = SV.d.album(alb); $("#slot-d", f).textContent = a ? (opts.album === alb && opts.slot ? `Vai para o slot ${opts.slot}.` : `Vai para o próximo slot livre: ${SV.d.proximoLivre(a.id) || "álbum cheio"}.`) : "Fica só na coleção, sem lugar físico."; };
    dica();
    $("#alb-d", f).addEventListener("change", (e) => { alb = e.target.value; dica(); });
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cond]"); if (b) { cond = b.dataset.cond; $$("#seg-cd button", f).forEach((x) => x.classList.toggle("on", x === b)); }
      if (e.target.closest("#ok-d")) {
        const a = SV.d.album(alb);
        const slot = a ? (opts.album === alb && opts.slot ? opts.slot : SV.d.proximoLivre(a.id)) : 0;
        if (a && !slot) { toast("Esse álbum está cheio. Escolha outro.", "warning"); return; }
        const c = SV.d.adicionar(dadosSf, { condicao: cond, idioma: $("#idi-d", f).value, deck: $("#deck-d", f).value, foil: !!($("#foil-d", f) || {}).checked, troca: $("#troca-d", f).checked, album: a ? a.id : "", slot });
        toast(a ? `${c.nome} guardada: ${a.nome}, slot ${slot}` : `${c.nome} adicionada`, "bookmark_added");
        fecharFolha(); opts.aoAdicionar && opts.aoAdicionar(c);
      }
    });
  }

  Object.assign(SV, { cartaMini, posicaoTexto, abrirAdicionar, folhaDestino, folhaMover, folhaDeck, folhaEditar, mapaPagina, nomeExibido, carta3d, traducao, CONDICOES, corDe });
})();
