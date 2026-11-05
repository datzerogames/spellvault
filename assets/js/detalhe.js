// SpellVault — ficha completa da carta: imagem 3D, idiomas, regras, preços, cotação da Liga, legalidade por formato,
// todas as edições, decisões oficiais, cartas relacionadas e detalhes técnicos.
// Serve para cartas do cofre (#carta-id, com "onde está guardada") e para qualquer carta da consulta (#ver-id).
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, brl, num2, dataBr, mana, toast, confirmar } = SV;
  let sessao = 0; // cada tela aberta ganha um número; respostas atrasadas de telas antigas são ignoradas

  const FORMATOS = [["standard", "Standard"], ["pioneer", "Pioneer"], ["modern", "Modern"], ["legacy", "Legacy"], ["vintage", "Vintage"], ["commander", "Commander"], ["pauper", "Pauper"], ["brawl", "Brawl"], ["historic", "Historic"], ["timeless", "Timeless"], ["explorer", "Explorer"], ["alchemy", "Alchemy"], ["oathbreaker", "Oathbreaker"], ["penny", "Penny Dreadful"], ["duel", "Duel Commander"], ["paupercommander", "Pauper Commander"], ["predh", "Pre-EDH"], ["premodern", "Premodern"], ["oldschool", "Old School"], ["gladiator", "Gladiator"]];
  const ROT_LEGAL = { legal: "Legal", not_legal: "Não legal", banned: "Banida", restricted: "Restrita" };
  const ACABAMENTO = { nonfoil: "Normal", foil: "Foil", etched: "Etched" };
  const JOGOS = { paper: "Papel", mtgo: "MTG Online", arena: "Arena" };
  const COMPONENTE = { token: "Token", meld_part: "Peça de fusão", meld_result: "Fusão pronta", combo_piece: "Peça de combo" };
  const COR_NOME = { W: "Branco", U: "Azul", B: "Preto", R: "Vermelho", G: "Verde", C: "Incolor" };
  const LAYOUT = { normal: "Normal", transform: "Dupla face (transforma)", modal_dfc: "Dupla face (modal)", split: "Dividida", flip: "Virar", meld: "Fusão", adventure: "Aventura", saga: "Saga", class: "Classe", case: "Caso", leveler: "Evolutiva", mutate: "Mutar", prototype: "Protótipo", token: "Token", double_faced_token: "Token dupla face", emblem: "Emblema", planar: "Planar", scheme: "Esquema", vanguard: "Vanguard", art_series: "Série de arte", reversible_card: "Carta reversível", battle: "Batalha" };
  const LANG_NOME = { en: "Inglês", pt: "Português", es: "Espanhol", fr: "Francês", de: "Alemão", it: "Italiano", ja: "Japonês", ko: "Coreano", ru: "Russo", zhs: "Chinês simplificado", zht: "Chinês tradicional", ph: "Phyrexiano" };
  const LANG_ORDEM = ["en", "pt", "es", "fr", "de", "it", "ja", "ko", "ru", "zhs", "zht", "ph"];

  const cores = (l) => (l && l.length ? l.map((k) => COR_NOME[k] || k).join(", ") : "Incolor");
  const dataLonga = (d) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");
  const m = (v) => (v ? num2(v) : "—");
  const bAtual = (S) => S.f || S.base;
  // a impressão na língua escolhida (inclusive a em inglês, quando a carta aberta veio de outra língua)
  const entradaIdioma = (S) => S.idiomas.find((x) => x.lang === S.lang) || null;
  const ptHtml = (x) => (x.forca != null && x.forca !== "" ? `<span class="num">${esc(x.forca)}/${esc(x.resist)}</span>` : x.lealdade ? `<span class="num">${ic("shield")}${esc(x.lealdade)}</span>` : x.defesa ? `<span class="num">${ic("security")}${esc(x.defesa)}</span>` : "");

  function langsDisponiveis(S) {
    const s = new Set(["en"]);
    S.idiomas.forEach((x) => s.add(x.lang));
    if (S.base.lang) s.add(S.base.lang);
    const idx = (l) => (LANG_ORDEM.includes(l) ? LANG_ORDEM.indexOf(l) : 99);
    return [...s].sort((a, b) => idx(a) - idx(b));
  }
  const chipsIdioma = (S) => langsDisponiveis(S).map((l) => `<button class="chip ${l === S.lang ? "on" : ""}" data-dt="lang" data-l="${l}" aria-label="${esc(LANG_NOME[l] || l)}" title="${esc(LANG_NOME[l] || l)}">${l.toUpperCase()}</button>`).join("");

  // ---------- blocos de texto ----------
  function regrasHtml(S) {
    const b = bAtual(S), e = entradaIdioma(S);
    const bloco = (custo, tipo, texto, pt, flavor) => `<div class="texto-regras"><div class="tipo"><span>${esc(tipo)}</span><span class="fila" style="gap:8px">${mana(custo)}${pt}</span></div><div>${esc(texto || "—")}</div>${flavor ? `<p class="flavor">${esc(flavor)}</p>` : ""}</div>`;
    if (e && e.imp && (e.imp.texto || e.imp.tipo)) return bloco(b.custo, e.imp.tipo || b.tipo, e.imp.texto || b.texto, ptHtml(b), "");
    if (S.f && S.f.faces && S.f.faces.length > 1) return S.f.faces.map((fc) => bloco(fc.custo, fc.tipo, fc.texto, ptHtml(fc), fc.flavor)).join("");
    return bloco(S.f && S.f.faces ? S.f.faces[0].custo : "", b.tipo, b.texto, ptHtml(b), S.f ? S.f.flavor : "");
  }
  function precosHtml(S) {
    const b = bAtual(S), cfg = SV.d.config(), cot = cfg.cotacao;
    const minha = S.copia ? SV.d.valorInfo(S.copia, cfg) : null;
    const r = (v) => (v ? num2(v * cot) : "—");
    return `<section class="tomo pad">
      <p class="rot">${ic("payments")}Preços</p>
      ${minha ? `<div class="preco mt"><div><span class="rot">Valor da sua cópia</span><b class="num">${minha.v ? brl(minha.v) : "Sem preço"}</b></div><small class="dim" style="text-align:right">${minha.fonte === "liga" ? `cotação da Liga<br/>de ${dataBr(minha.em)}` : minha.fonte === "scryfall" ? `Scryfall × ${num2(cot)}` : "sem preço no Scryfall"}</small></div>` : ""}
      <div class="tab-wrap mt"><table class="tab-preco"><thead><tr><th></th><th>Normal</th><th>Foil</th><th>Etched</th></tr></thead><tbody>
        <tr><th>Scryfall · US$</th><td>${m(b.usd)}</td><td>${m(b.usdFoil)}</td><td>${m(b.usdEtched)}</td></tr>
        <tr class="destaque"><th>≈ em R$</th><td>${r(b.usd)}</td><td>${r(b.usdFoil)}</td><td>${r(b.usdEtched)}</td></tr>
        <tr><th>Europa · €</th><td>${m(b.eur)}</td><td>${m(b.eurFoil)}</td><td>—</td></tr>
      </tbody></table></div>
      <p class="dim mt" style="font-size:14px">Referência do Scryfall em dólar, convertida pela cotação ${num2(cot)} (ajuste no Grimório).${b.tix ? ` No MTG Online: ${num2(b.tix)} tix.` : ""}</p>
    </section>`;
  }
  function legalHtml(S) {
    if (!S.f) return `<p class="dim"><span class="carregando"></span> Carregando…</p>`;
    return `<div class="legal-grade">${FORMATOS.map(([k, n]) => { const st = S.f.legal[k] || "not_legal"; return `<div class="leg ${st}"><span>${n}</span><b>${ROT_LEGAL[st] || st}</b></div>`; }).join("")}</div>
      ${S.f.reservada ? `<p class="mt" style="color:var(--ouro2)">${ic("lock")} Está na Reserved List: nunca será reimpressa.</p>` : ""}`;
  }
  function edicoesHtml(S) {
    if (!S.edicoes) return `<p class="dim"><span class="carregando"></span> Buscando todas as edições…</p>`;
    const cot = SV.d.config().cotacao, atual = bAtual(S).sf;
    const linhas = S.edicoes.itens.map((x) => {
      const pre = (x.usd || x.usdFoil) ? `R$ ${num2((x.usd || x.usdFoil) * cot)}` : "—";
      const q = SV.d.cotacaoLiga(x, false), liga = q && (q.medio || q.menor || q.maior);
      return `<li><a href="#ver-${x.sf}" class="${x.sf === atual ? "aqui" : ""}">${SV.sf.icone(x.set) ? `<img class="seticon" src="${esc(SV.sf.icone(x.set))}" alt="" loading="lazy"/>` : `<span class="seticon"></span>`}<span class="info"><b>${esc(x.setNome)}</b><small>${esc(x.set.toUpperCase())} #${esc(x.num)} · ${esc(SV.nomeRaridade[x.raridade] || "")} · ${esc((x.lancamento || "").slice(0, 4) || "")}${x.foilPossivel ? " · foil" : ""}</small></span><span class="pv">${liga ? `R$ ${num2(liga)}<small>Liga</small>` : `${pre}<small>${x.usd || x.usdFoil ? "Scryfall" : ""}</small>`}</span></a></li>`;
    }).join("");
    return `<ul class="edicoes">${linhas}</ul>${S.edicoes.proxima ? `<button class="bt cheio mt" data-dt="mais-edicoes">${ic("expand_more")}Mostrar mais edições</button>` : ""}
      <p class="dim mt" style="font-size:14px">${S.edicoes.total} impressões no total. Toque numa edição para ver a ficha dela.</p>`;
  }
  function rulingsHtml(S) {
    if (!S.rulings) return `<p class="dim"><span class="carregando"></span> Buscando decisões oficiais…</p>`;
    if (!S.rulings.length) return `<p class="muted">Esta carta não tem decisões oficiais publicadas.</p>`;
    return `<ul class="regras-of">${S.rulings.map((r) => `<li><time>${dataLonga(r.published_at)} · ${esc(r.source === "wotc" ? "Wizards of the Coast" : "Scryfall")}</time><p lang="en">${esc(r.comment)}</p></li>`).join("")}</ul>
      <p class="dim mt" style="font-size:14px">Texto oficial, publicado só em inglês.</p>`;
  }
  function partesHtml(S) {
    if (!S.f) return `<p class="dim"><span class="carregando"></span> Carregando…</p>`;
    if (!S.f.partes.length) return `<p class="muted">Esta carta não tem tokens nem peças relacionadas.</p>`;
    return `<ul class="edicoes">${S.f.partes.map((p) => `<li><a href="#ver-${p.id}"><span class="ms" style="color:var(--ouro)">${p.comp === "token" ? "token" : "extension"}</span><span class="info"><b>${esc(p.nome)}</b><small>${esc(COMPONENTE[p.comp] || p.comp)} · ${esc(p.tipo)}</small></span>${ic("chevron_right", "dim")}</a></li>`).join("")}</ul>`;
  }
  function detalhesHtml(S) {
    const b = bAtual(S), f = S.f;
    const L = [
      ["Edição", `${esc(b.setNome)} (${esc(b.set.toUpperCase())})`], ["Número", esc(b.num)],
      ["Lançamento", f ? dataLonga(f.lancamento) : "—"], ["Raridade", esc(SV.nomeRaridade[b.raridade] || b.raridade)],
      ["Artista", esc(b.artista || "—")], ["Custo convertido", esc(b.cmc)], ["Cores", cores(b.cores)], ["Identidade de cor", cores(b.identidade)],
    ];
    if (f) L.push(
      ["Produz mana", f.produz.length ? f.produz.map((k) => COR_NOME[k] || k).join(", ") : "—"],
      ["Palavras-chave", esc(f.palavras.join(", ") || "—")],
      ["Acabamentos", esc(f.acabamentos.map((x) => ACABAMENTO[x] || x).join(", ") || "—")],
      ["Disponível em", esc(f.jogos.map((x) => JOGOS[x] || x).join(", ") || "—")],
      ["Layout", esc(LAYOUT[f.layout] || f.layout || "—")], ["Moldura", esc(f.moldura || "—")], ["Borda", esc(f.borda || "—")],
      ["Arte total", f.cheia ? "Sim" : "Não"], ["Promoção", esc(f.promo.join(", ") || "—")],
      ["Ranking EDHREC", f.edhrec ? "#" + f.edhrec.toLocaleString("pt-BR") : "—"], ["Reserved List", f.reservada ? "Sim" : "Não"],
    );
    return `<dl class="dl">${L.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;
  }
  function ligacoesHtml(S) {
    const b = bAtual(S), l = (S.f && S.f.links) || {};
    const a = (href, ico, txt) => `<a class="bt fantasma" href="${esc(href)}" target="_blank" rel="noopener">${ic(ico)}${txt}</a>`;
    return `<div class="acoes-carta">
      ${b.uri ? a(b.uri, "open_in_new", "Scryfall") : ""}${l.gatherer ? a(l.gatherer, "menu_book", "Gatherer (oficial da Wizards)") : ""}${l.edhrec ? a(l.edhrec, "groups", "EDHREC (decks Commander)") : ""}
      ${a(SV.liga.urlCarta(b.nome), "storefront", "Esta carta na LigaMagic")}${a(SV.liga.urlBusca(b.nome), "search", "Buscar “" + esc(b.nome.split(" // ")[0]) + "” na LigaMagic")}
    </div>`;
  }

  // gavetas que abrem e fecham; o conteúdo é montado por quem tem os dados
  const GAVETAS = [
    ["legal", "gavel", "Legalidade por formato", legalHtml, () => ""],
    ["edicoes", "layers", "Todas as edições", edicoesHtml, (S) => (S.edicoes ? S.edicoes.total : "")],
    ["rulings", "menu_book", "Decisões oficiais (rulings)", rulingsHtml, (S) => (S.rulings ? S.rulings.length : "")],
    ["partes", "extension", "Cartas relacionadas e tokens", partesHtml, (S) => (S.f ? S.f.partes.length : "")],
    ["detalhes", "info", "Detalhes técnicos", detalhesHtml, () => ""],
    ["ligacoes", "link", "Ligações", ligacoesHtml, () => ""],
  ];
  const gavetaHtml = ([id, ico, tit, corpo, cont], S) => `<section class="tomo gaveta ${S.abertas[id] ? "aberta" : ""}" id="gv-${id}">
      <button class="gaveta-cab" data-dt="gaveta" data-g="${id}" aria-expanded="${!!S.abertas[id]}">${ic(ico)}<span>${tit}</span><span class="n">${cont(S)}</span>${ic("expand_more", "seta")}</button>
      <div class="gaveta-corpo" ${S.abertas[id] ? "" : "hidden"}>${S.abertas[id] ? corpo(S) : ""}</div></section>`;

  // ---------- página ----------
  function html(S) {
    const b = bAtual(S), c = S.copia, cfg = SV.d.config(), e = entradaIdioma(S);
    const copias = SV.d.copias(b.nome), k = c ? copias.findIndex((x) => x.id === c.id) + 1 : 0;
    const a = c ? SV.d.album(c.album) : null, deck = c ? SV.d.decks().find((x) => x.id === c.deck) : null;
    const desejo = SV.desejoDe ? SV.desejoDe(b.nome) : null;
    const nome = e && e.imp ? e.imp.nome : b.nome;
    const frente = (e && e.img) || b.img, verso = (e && e.verso) || b.verso, foil = !!(c && c.foil);
    const cond = c ? (SV.CONDICOES.find((x) => x[0] === c.condicao) || ["", c.condicao])[1] : "";
    return `<div class="pagina">
      <header class="topo"><button class="ico-bt" data-dt="voltar" aria-label="Voltar">${ic("arrow_back")}</button>
        <div class="marca"><b style="font-size:19px">Ficha da carta</b><small>${c ? "Onde está guardada" : "Consulta no oráculo"}</small></div>
        <div class="acoes"><button class="ico-bt" data-dt="compartilhar" aria-label="Copiar nome">${ic("share")}</button></div></header>
      <div class="detalhe">
        <div class="coluna-carta">
          <div class="palco3d"><div class="carta3d" id="c3d" data-virada="${S.virada ? 1 : 0}" style="transform:rotateY(${S.virada ? 180 : 0}deg)">
            <div class="face frente">${frente ? `<img src="${esc(frente)}" alt="${esc(nome)}"/>` : `<div class="verso-proprio"><b>${esc(nome)}</b></div>`}<div class="reflexo"></div>${foil ? `<div class="holo"></div>` : ""}</div>
            <div class="face tras">${verso ? `<img src="${esc(verso)}" alt="Verso de ${esc(nome)}"/>` : `<div class="verso-proprio"><span class="sigilo">${ic("auto_stories")}</span><b>SpellVault</b><span class="muted" style="font-size:14px">Cofre de ${esc(cfg.nome)}</span></div>`}<div class="reflexo"></div></div>
          </div></div>
          <div class="ctrl-3d"><button class="bt peq" data-dt="virar">${ic("flip")}Virar</button>${foil ? `<span class="etiqueta ouro" style="align-self:center">${ic("auto_awesome")} Foil holográfico</span>` : ""}</div>
          <div class="chips idiomas mt" id="chips-idioma" role="group" aria-label="Idioma da carta">${chipsIdioma(S)}</div>
          <p class="dim" style="text-align:center;font-size:13.5px;margin-top:6px">Arraste a carta para inclinar · arte de ${esc(b.artista || "—")}</p>
        </div>
        <div style="display:grid;gap:14px;min-width:0">
          <div class="nome-carta"><div class="fila"><span class="raridade ${esc(b.raridade)}">${esc(SV.nomeRaridade[b.raridade] || b.raridade)}</span>${foil ? `<span class="etiqueta ouro">Foil</span>` : ""}<span class="espaco"></span>${mana(b.custo)}</div>
            <h1 id="nome-c">${esc(nome)}</h1><p class="en" id="nome-en">${e && e.imp ? esc(b.nome) : ""}</p></div>
          <div class="etiquetas"><span class="etiqueta">${esc(b.set.toUpperCase())} #${esc(b.num)}</span><span class="etiqueta">${esc(b.setNome)}</span>${c ? `<span class="etiqueta">${esc(cond)} (${esc(c.condicao)})</span><span class="etiqueta">${esc(c.idioma)}</span>` : ""}${deck ? `<span class="etiqueta ouro">${ic("swords")} ${esc(deck.nome)}</span>` : ""}${S.f && S.f.reservada ? `<span class="etiqueta ouro">${ic("lock")} Reserved List</span>` : ""}</div>
          <div id="regras-wrap" style="display:grid;gap:10px">${regrasHtml(S)}</div>
          ${S.f && S.f.palavras.length ? `<div class="etiquetas">${S.f.palavras.map((p) => `<span class="etiqueta">${esc(p)}</span>`).join("")}</div>` : ""}
          <div id="precos-wrap">${precosHtml(S)}</div>
          <div id="liga-wrap">${SV.liga.bloco(b)}</div>
          ${c ? `<section class="tomo cantos onde">
              <div class="fila"><h3>${ic("pin_drop")}Onde está guardada?</h3><span class="espaco"></span><span class="etiqueta ouro">Cópia ${k}/${copias.length}</span></div>
              ${a ? `<p class="rot mt">${ic(SV.d.TIPOS[a.tipo].icone)}${esc(a.nome)}</p><p class="muted">${esc(a.nota || "")}</p>
                <p class="local">${SV.d.ehCaixa(a) ? `Posição <em>${c.slot}</em>` : `Página ${SV.d.paginaDo(a, c.slot)} · <em>Slot ${c.slot}</em>`}</p><p class="dim">${esc(SV.posicaoTexto(a, c.slot))}</p>
                ${SV.d.ehCaixa(a) ? "" : SV.mapaPagina(a, c.slot)}
                <p class="dim" style="font-size:14px">${esc(a.sleeve ? "Proteção: " + a.sleeve : "")}</p>` : `<p class="muted mt">Esta cópia ainda não tem lugar. Guarde-a num álbum para achá-la depois.</p>`}
            </section>` : ""}
          <section class="tomo pad"><p class="rot">${ic("stacks")}${c ? "Todas as cópias" : "No seu cofre"} (${copias.length})</p>
            ${copias.length ? `<ul class="copias">${copias.map((x) => { const ax = SV.d.album(x.album); return `<li>${ic(x.deck ? "swords" : ax ? SV.d.TIPOS[ax.tipo].icone : "inventory")}<a href="#carta-${x.id}" style="flex:1;min-width:0"><b>${esc(ax ? ax.nome + " (slot " + x.slot + ")" : "Sem lugar definido")}</b><small>${esc(x.setNome)} · ${esc(x.condicao)} · ${x.foil ? "Foil" : "Normal"} · ${esc(x.idioma)}</small></a>${c && x.id === c.id ? `<span class="aqui">Aqui</span>` : ""}</li>`; }).join("")}</ul>` : `<p class="muted mt">Você ainda não tem esta carta.</p>`}
            ${c ? "" : `<div class="dupla mt"><button class="bt ouro" data-dt="add">${ic("bookmark_add")}Adicionar ao cofre</button><button class="bt" data-dt="desejo">${ic("favorite", desejo ? "fill" : "")}${desejo ? `Nos desejos (${desejo.qtd})` : "Lista de desejos"}</button></div>`}
          </section>
          ${c ? `<div class="acoes-carta">
              <button class="bt ouro cheio" data-dt="mover">${ic("swap_horiz")}Mudar de slot / álbum</button>
              <div class="dupla"><button class="bt" data-dt="deck">${ic("swords")}Designar a deck</button><button class="bt" data-dt="editar">${ic("edit")}Estado e foil</button></div>
              <div class="dupla"><button class="bt" data-dt="add">${ic("bookmark_add")}Outra cópia</button><button class="bt sangue" data-dt="remover">${ic("delete_forever")}Desvincular</button></div>
            </div>` : ""}
          ${GAVETAS.map((g) => gavetaHtml(g, S)).join("")}
        </div>
      </div></div>`;
  }

  // atualiza só o que muda ao trocar de idioma (sem refazer a página e perder a carta 3D)
  function aplicarIdioma(el, S) {
    const b = bAtual(S), e = entradaIdioma(S), nome = e && e.imp ? e.imp.nome : b.nome;
    $("#nome-c", el).textContent = nome; $("#nome-en", el).textContent = e && e.imp ? b.nome : "";
    $("#regras-wrap", el).innerHTML = regrasHtml(S);
    $("#chips-idioma", el).innerHTML = chipsIdioma(S);
    const fr = $(".face.frente img", el), tr = $(".face.tras img", el), f1 = (e && e.img) || b.img, v1 = (e && e.verso) || b.verso;
    if (fr && f1) { fr.src = f1; fr.alt = nome; } if (tr && v1) tr.src = v1;
  }
  function atualizarGaveta(el, S, id) {
    const g = GAVETAS.find((x) => x[0] === id); if (!g) return;
    const box = $("#gv-" + id, el); if (!box) return;
    box.classList.toggle("aberta", !!S.abertas[id]);
    $(".gaveta-cab", box).setAttribute("aria-expanded", !!S.abertas[id]);
    $(".gaveta-cab .n", box).textContent = g[4](S);
    const corpo = $(".gaveta-corpo", box); corpo.hidden = !S.abertas[id];
    if (S.abertas[id]) corpo.innerHTML = g[3](S);
  }

  async function carregarGaveta(el, S, id, minha) {
    try {
      if (id === "edicoes" && !S.edicoes && S.f && S.f.oracleId) { await SV.sf.sets().catch(() => {}); S.edicoes = await SV.sf.edicoes(S.f.oracleId); }
      if (id === "rulings" && !S.rulings) S.rulings = await SV.sf.rulings(bAtual(S).sf);
    } catch { if (id === "edicoes") S.edicoes = { itens: [], total: 0, proxima: "" }; if (id === "rulings") S.rulings = []; toast("Sem conexão com o Scryfall agora.", "cloud_off"); }
    if (minha === sessao) atualizarGaveta(el, S, id);
  }

  function pagina(el, S, minha) {
    el.innerHTML = html(S);
    SV.carta3d($("#c3d", el), !!(S.copia && S.copia.foil));
    el.onclick = async (ev) => {
      const b = ev.target.closest("[data-dt],[data-liga]"); if (!b) return;
      if (b.dataset.liga === "cotacao") return SV.liga.folhaCotacao(bAtual(S), () => { $("#liga-wrap", el).innerHTML = SV.liga.bloco(bAtual(S)); $("#precos-wrap", el).innerHTML = precosHtml(S); if (S.abertas.edicoes) atualizarGaveta(el, S, "edicoes"); }, !!(S.copia && S.copia.foil));
      const acao = b.dataset.dt, c = S.copia, base = bAtual(S);
      if (acao === "voltar") history.length > 1 ? history.back() : (location.hash = c ? "#colecao" : "#consulta");
      else if (acao === "virar") { const x = $("#c3d", el); S.virada = !S.virada; x.dataset.virada = S.virada ? "1" : "0"; x.style.transform = `rotateY(${S.virada ? 180 : 0}deg)`; }
      else if (acao === "lang") { S.lang = b.dataset.l; aplicarIdioma(el, S); }
      else if (acao === "compartilhar") SV.copiar(`${base.nome} — ${base.setNome} (${base.set.toUpperCase()} #${base.num})`);
      else if (acao === "gaveta") {
        const id = b.dataset.g; S.abertas[id] = !S.abertas[id]; atualizarGaveta(el, S, id);
        if (S.abertas[id] && ((id === "edicoes" && !S.edicoes) || (id === "rulings" && !S.rulings))) carregarGaveta(el, S, id, minha);
      }
      else if (acao === "mais-edicoes") {
        b.disabled = true;
        try { await SV.sf.sets().catch(() => {}); const r = await SV.sf.edicoes(S.f.oracleId, S.edicoes.proxima); S.edicoes = { itens: S.edicoes.itens.concat(r.itens), total: r.total, proxima: r.proxima }; } catch { toast("Não consegui carregar mais.", "cloud_off"); }
        if (minha === sessao) atualizarGaveta(el, S, "edicoes");
      }
      else if (acao === "add") SV.folhaDestino(SV.sf.compacto(base), { aoAdicionar: (nova) => { location.hash = "#carta-" + nova.id; } });
      else if (acao === "desejo") { const d = SV.desejar(base); toast(`${base.nome} na lista de desejos (${d.qtd})`, "favorite"); pagina(el, S, minha); }
      else if (c && acao === "mover") SV.folhaMover(c, () => pagina(el, Object.assign(S, { copia: SV.d.carta(c.id) }), minha));
      else if (c && acao === "deck") SV.folhaDeck(c, () => pagina(el, Object.assign(S, { copia: SV.d.carta(c.id) }), minha));
      else if (c && acao === "editar") SV.folhaEditar(c, () => pagina(el, Object.assign(S, { copia: SV.d.carta(c.id) }), minha));
      else if (c && acao === "remover") {
        const a = SV.d.album(c.album);
        if (await confirmar("Desvincular esta cópia?", `${c.nome} sai do cofre${a ? " e o slot " + c.slot + " de " + a.nome + " fica livre" : ""}.`, "Desvincular")) { SV.d.remover(c.id); toast("Cópia desvinculada", "delete"); location.hash = "#colecao"; }
      }
    };
  }

  // idioma inicial: o da cópia que o jogador tem; senão o preferido nos ajustes, se existir
  function idiomaInicial(S) {
    const tem = (l) => l === "en" || S.idiomas.some((x) => x.lang === l);
    const da = S.copia && S.copia.idioma ? S.copia.idioma.toLowerCase() : "";
    if (da && tem(da)) return da;
    return SV.d.config().idioma === "pt" && tem("pt") ? "pt" : "en";
  }
  async function iniciar(el, S, minha) {
    try { S.f = await SV.sf.ficha(S.base.sf); } catch { S.f = null; if (!S.base.nome) { el.innerHTML = `<div class="pagina"><div class="vazio">${ic("cloud_off")}Não consegui carregar esta carta. Verifique a internet.<br/><a class="bt mt" href="#consulta">Voltar à consulta</a></div></div>`; return; } }
    if (minha !== sessao) return;
    if (S.f) { pagina(el, S, minha); }
    // idiomas em segundo plano: a página já está útil
    try {
      S.idiomas = await SV.sf.idiomas(S.base.set, S.base.num);
      if (minha !== sessao) return;
      const pt = S.idiomas.find((x) => x.lang === "pt");
      if (pt && pt.pt) SV.d.salvarCartas(SV.d.cartas().map((x) => (x.nome === S.base.nome && !x.pt ? Object.assign(x, { pt: pt.pt, ptBuscado: true }) : x)));
      S.lang = idiomaInicial(S);
      aplicarIdioma(el, S);
    } catch { /* sem idiomas extras: fica em inglês */ }
  }

  function montar(el, S) {
    const minha = ++sessao;
    S = Object.assign({ f: null, idiomas: [], lang: "en", abertas: { legal: false, edicoes: false, rulings: false, partes: false, detalhes: false, ligacoes: false }, edicoes: null, rulings: null, virada: false }, S);
    if (!S.base || !S.base.nome) { el.innerHTML = `<div class="pagina"><div class="vazio" style="padding-top:26vh"><span class="carregando"></span><p class="mt">Abrindo a ficha…</p></div></div>`; SV.sf.ficha(S.id).then((f) => { if (minha !== sessao) return; S.base = f; S.f = f; pagina(el, S, minha); iniciarIdiomas(el, S, minha); }).catch(() => { if (minha === sessao) el.innerHTML = `<div class="pagina"><div class="vazio">${ic("help")}Carta não encontrada ou sem conexão.<br/><a class="bt mt" href="#consulta">Voltar à consulta</a></div></div>`; }); return; }
    pagina(el, S, minha);
    iniciar(el, S, minha);
  }
  async function iniciarIdiomas(el, S, minha) {
    try {
      S.idiomas = await SV.sf.idiomas(S.base.set, S.base.num);
      if (minha !== sessao) return;
      S.lang = idiomaInicial(S); aplicarIdioma(el, S);
    } catch {}
  }

  SV.telas = SV.telas || {};
  SV.telas.carta = {
    montar(el, id) {
      const c = SV.d.carta(id);
      if (!c) { sessao++; el.innerHTML = `<div class="pagina"><div class="vazio">${ic("help")}Esta carta não está mais no cofre.<br/><a class="bt mt" href="#colecao">Voltar à coleção</a></div></div>`; return; }
      montar(el, { modo: "copia", id, copia: c, base: c });
    },
    desmontar(el) { sessao++; el.onclick = null; },
  };
  SV.telas.ver = {
    montar(el, id) { montar(el, { modo: "ver", id, copia: null, base: SV.sf.cacheResumo(id) || null }); },
    desmontar(el) { sessao++; el.onclick = null; },
  };
})();
