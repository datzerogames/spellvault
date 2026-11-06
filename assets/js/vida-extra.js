// SpellVault — ferramentas da mesa de Commander (barra da tela Vida): Mana Pool, monarca, busca de comandante no
// Scryfall, trono dos comandantes, regras do comandante e o aviso de COMBO!. Usa o estado salvo por vida.js.
(function () {
  const SV = (window.SV = window.SV || {});
  const V = SV.vida;
  const { $, $$, esc, ic, toast, folha, fecharFolha } = SV;

  const MANAS = [["W", "Branco"], ["U", "Azul"], ["B", "Preto"], ["R", "Vermelho"], ["G", "Verde"], ["C", "Incolor"]];
  const IMPOSTO = "Cada vez que você conjura seu comandante da zona de comando depois da primeira, ele custa {2} a mais para cada vez que já foi conjurado na partida.";
  const pips = (ident) => SV.mana((ident || []).map((k) => `{${k}}`).join(""));
  const chipsJogadores = (j, sel, attr) => j.jogadores.map((p, k) => `<button class="chip ${k === sel ? "on" : ""}" data-${attr}="${k}">${esc(p.nome)}${k === j.eu ? " (você)" : ""}</button>`).join("");

  // ---------- MANA POOL ----------
  V.acoes.mana = (el) => {
    let ativo = V.jogo().eu;
    const corpo = () => {
      const j = V.jogo(), p = j.jogadores[ativo], m = V.manaDe(p);
      return `<div class="mana-total"><span class="rot">${ic("blur_on")}Total flutuante</span><b class="num">${V.manaTotal(p)}</b></div>
        <div class="linha-cont">${ic("thunderstorm")}<span>Tempestade (storm)<br/><small class="dim">Feitiços conjurados no turno</small></span><div class="q"><button class="ico-bt" data-st="-1" aria-label="Menos um feitiço" ${(j.storm || 0) <= 0 ? "disabled" : ""}>${ic("remove")}</button><b>${j.storm || 0}</b><button class="ico-bt" data-st="1" aria-label="Mais um feitiço">${ic("add")}</button></div></div>
        ${MANAS.map(([k, n]) => `<div class="linha-cont"><span class="pip ${k === "C" ? "X" : k}">${k}</span><span>${n}</span><div class="q mp-q"><b>${m[k]}</b><button class="bt peq" data-mp="${k}" data-n="-1" ${m[k] <= 0 ? "disabled" : ""}>−1</button><button class="bt peq" data-mp="${k}" data-n="1">+1</button><button class="bt peq" data-mp="${k}" data-n="3">+3</button></div></div>`).join("")}`;
    };
    const f = folha(`<h2>Reserva e Mana Pool</h2><p class="muted">Mana flutuante de cada jogador e os feitiços do turno (Tempestade).</p>
      <div class="chips quebra mt" id="mp-jog">${chipsJogadores(V.jogo(), ativo, "jog")}</div>
      <div id="mp-corpo" class="mt">${corpo()}</div>
      <div class="dupla mt2"><button class="bt" data-mp="limpar">${ic("delete_sweep")}Esvaziar Mana Pool</button><button class="bt ouro" data-sv="fechar-folha">${ic("check_circle")}Concluído</button></div>`, { aoFechar: () => V.desenhar(el) });
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const j = V.jogo(), p = j.jogadores[ativo];
      if (b.dataset.jog !== undefined) { ativo = +b.dataset.jog; $$("#mp-jog .chip", f).forEach((x) => x.classList.toggle("on", x === b)); }
      else if (b.dataset.st) j.storm = Math.max(0, (j.storm || 0) + +b.dataset.st);
      else if (b.dataset.mp === "limpar") { const m = V.manaDe(p); Object.keys(m).forEach((k) => (m[k] = 0)); toast(`Mana de ${p.nome} esvaziada`, "delete_sweep"); }
      else if (b.dataset.mp) { const m = V.manaDe(p); m[b.dataset.mp] = Math.max(0, m[b.dataset.mp] + +b.dataset.n); }
      else return;
      V.salvar(j); $("#mp-corpo", f).innerHTML = corpo();
    });
  };

  // ---------- MONARCA ----------
  V.acoes["monarca-quem"] = (el) => {
    const j = V.jogo();
    const f = folha(`<h2>Coroa do monarca</h2><p class="muted">O monarca compra uma carta no fim do seu turno. Quem causar dano de combate nele fica com a coroa.</p>
      <div class="res-busca mt" style="max-height:none">${j.jogadores.map((p, k) => `<button data-m="${k}">${ic("crown", p.monarca ? "fill" : "")}<div><b>${esc(p.nome)}</b><small>${p.monarca ? "É o monarca agora (toque para tirar)" : "Dar a coroa"}</small></div></button>`).join("")}
        <button data-m="-1">${ic("block")}<div><b>Ninguém</b><small>Tirar a coroa de todos</small></div></button></div>`, { aoFechar: () => V.desenhar(el) });
    f.addEventListener("click", (e) => { const b = e.target.closest("[data-m]"); if (!b) return; V.definirMonarca(+b.dataset.m); fecharFolha(); });
  };

  // ---------- REGRAS DO COMANDANTE ----------
  function folhaRegras(c, p) {
    const f = folha(`<h2>${esc(c.pt ? c.pt.nome : c.nome)}</h2><p class="muted">${esc(c.tipo)}</p>
      <section class="resultado tomo mt"><img src="${esc(c.img)}" alt="${esc(c.nome)}"/><div style="min-width:0"><div class="fila">${SV.mana(c.custo)}</div><p class="mt">Identidade de cor: ${pips(c.identidade) || "incolor"}</p>${c.forca ? `<p class="num mt" style="font-size:20px">${esc(c.forca)}/${esc(c.resist)}</p>` : ""}<p class="dim mt" style="font-size:14px">${esc(c.setNome)} · #${esc(c.num)}</p></div></section>
      <div class="texto-regras mt">${esc(c.pt && c.pt.texto ? c.pt.texto : c.texto)}</div>
      <section class="tomo pad mt"><p class="rot">${ic("gavel")}Regra do imposto de comandante</p><p class="mt">${esc(IMPOSTO)}</p>${p ? `<p class="mt ouro">Imposto de ${esc(p.nome)} agora: <b>+${p.taxa}</b></p>` : ""}</section>
      <p class="rot mt2">${ic("menu_book")}Decisões oficiais (rulings)</p><div id="rg-rul" class="mt"><span class="carregando"></span></div>
      <div class="dupla mt2"><a class="bt" href="${esc(c.uri)}" target="_blank" rel="noopener">${ic("open_in_new")}Abrir no Scryfall</a><a class="bt" href="#ver-${esc(c.sf)}">${ic("menu_book")}Ficha completa</a></div>
      <button class="bt ouro cheio mt" data-sv="fechar-folha">${ic("check_circle")}Compreendido</button>`);
    SV.sf.rulings(c.sf).then((l) => {
      const box = f.querySelector("#rg-rul"); if (!box) return;
      box.innerHTML = l.length ? `<ul class="regras-of">${l.slice(0, 8).map((r) => `<li><time>${new Date(r.published_at + "T12:00:00").toLocaleDateString("pt-BR")}</time><p lang="en">${esc(r.comment)}</p></li>`).join("")}</ul><p class="dim" style="font-size:14px">Texto oficial, publicado só em inglês.</p>` : `<p class="muted">Esta carta não tem decisões oficiais publicadas.</p>`;
    }).catch(() => { const box = f.querySelector("#rg-rul"); if (box) box.innerHTML = `<p class="dim">Sem conexão com o Scryfall agora.</p>`; });
  }
  V.regrasCarta = folhaRegras;
  V.acoes.regras = async (el, i) => {
    const p = V.jogo().jogadores[i]; let c = p.cmdCarta;
    if (!c && p.comandante) { try { c = SV.sf.compacto(await SV.sf.porNome(p.comandante, true)); } catch { /* segue sem a carta */ } }
    if (!c) { toast("Defina um comandante primeiro.", "info"); return V.acoes.busca(el, i); }
    folhaRegras(c, p);
  };

  // ---------- BUSCA SCRYFALL (conjurar comandante) ----------
  let sugestoes = null;
  async function carregarSugestoes() {
    if (sugestoes) return sugestoes;
    try { sugestoes = (await SV.sf.pagina("is:commander game:paper", { order: "edhrec", multilingue: false })).itens.slice(0, 8); } catch { sugestoes = []; }
    return sugestoes;
  }
  V.acoes.busca = async (el, i) => {
    const j = V.jogo(); let alvo = i >= 0 && i != null ? i : j.eu, lista = [];
    const item = (c, k) => `<div class="res-item"><button class="res-main" data-pick="${k}"><img class="carta" src="${esc(c.imgPeq)}" alt="" loading="lazy"/><div><b>${esc(c.pt ? c.pt.nome : c.nome)}</b><small>${esc(c.tipo)}</small><span class="mana-id">${pips(c.identidade)}</span></div></button><button class="ico-bt" data-regras="${k}" aria-label="Regras de ${esc(c.nome)}">${ic("menu_book")}</button></div>`;
    const mostrar = (l, rot) => { lista = l; $("#bs-rot", f).textContent = rot; $("#bs-res", f).innerHTML = l.length ? l.map(item).join("") : `<p class="dim">Nenhum comandante encontrado.</p>`; };
    const f = folha(`<h2>Invocação arcana</h2><p class="muted">Procure o comandante no Scryfall e consagre-o na mesa. A arte vira o fundo do jogador.</p>
      <p class="rot mt">Destino na mesa</p><div class="chips quebra" id="bs-alvo">${chipsJogadores(j, alvo, "alvo")}</div>
      <form class="busca mt" id="bs-form">${ic("travel_explore")}<input id="bs-q" placeholder="Nome do comandante, em português ou inglês" autocomplete="off" autofocus/><button class="bt peq ouro">Buscar</button></form>
      <p class="rot mt2" id="bs-rot">Sugestões e comandantes mais jogados</p><div class="res-busca" id="bs-res" style="max-height:none"><p class="dim"><span class="carregando"></span> Carregando sugestões…</p></div>`, { aoFechar: () => V.desenhar(el) });
    const buscar = async () => {
      const q = $("#bs-q", f).value.trim();
      if (q.length < 2) { toast("Digite pelo menos 2 letras do nome.", "search"); return; }
      $("#bs-res", f).innerHTML = `<p class="dim"><span class="carregando"></span> Consultando o oráculo…</p>`;
      try {
        let r = await SV.sf.buscar(`${q} is:commander`, "&unique=cards&order=edhrec&include_multilingual=true");
        const a = q.toLowerCase(), peso = (c) => (c.nome.toLowerCase() === a || (c.pt && c.pt.nome.toLowerCase() === a) ? 0 : c.nome.toLowerCase().startsWith(a) ? 1 : 2);
        r = r.map((c, k) => [c, k]).sort((x, y) => peso(x[0]) - peso(y[0]) || x[1] - y[1]).map((x) => x[0]);
        mostrar(r.slice(0, 12), `${r.length} comandante(s) para “${q}”`);
      } catch { $("#bs-res", f).innerHTML = `<p class="dim">Sem conexão com o Scryfall agora.</p>`; }
    };
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.alvo !== undefined) { alvo = +b.dataset.alvo; $$("#bs-alvo .chip", f).forEach((x) => x.classList.toggle("on", x === b)); }
      else if (b.dataset.regras !== undefined) folhaRegras(lista[+b.dataset.regras], V.jogo().jogadores[alvo]);
      else if (b.dataset.pick !== undefined) {
        const c = lista[+b.dataset.pick], jj = V.jogo(), p = jj.jogadores[alvo];
        p.comandante = c.nome; p.cmdCarta = SV.sf.compacto(c); p.fundo = { tipo: "arte", arte: c.arte, artista: c.artista };
        const sub = V.triboPt(c.tipo); if (sub) p.tribo = sub;
        V.registrar(jj, `${p.nome} consagrou ${c.nome} como comandante.`); V.salvar(jj);
        toast(`${c.nome} consagrado para ${p.nome}`, "auto_awesome"); fecharFolha();
      }
    });
    $("#bs-form", f).addEventListener("submit", (e) => { e.preventDefault(); buscar(); });
    $("#bs-q", f).addEventListener("input", SV.debounce(() => { if ($("#bs-q", f).value.trim().length >= 3) buscar(); }, 450));
    carregarSugestoes().then((l) => { if (document.body.contains(f) && !$("#bs-q", f).value.trim()) mostrar(l, "Sugestões e comandantes mais jogados"); });
  };

  // ---------- TRONO DOS COMANDANTES ----------
  V.acoes.comandantes = (el) => {
    const corpo = () => {
      const j = V.jogo();
      return j.jogadores.map((p, k) => `<section class="tomo pad cmd-linha"><div class="fila"><span class="rot">Posto ${k + 1}${k === j.eu ? " · você" : ""}</span><span class="espaco"></span><span class="etiqueta">Imposto +${p.taxa}</span></div>
        <h3 style="margin:6px 0 2px;font:600 20px var(--fc)">${esc(p.comandante || "Sem comandante")}</h3>
        <p class="muted" style="font-size:15px">${esc(p.nome)}${p.tribo ? " · " + esc(p.tribo) : ""} ${p.cmdCarta ? pips(p.cmdCarta.identidade) : ""}</p>
        <div class="fila mt"><button class="bt peq" data-cm="regras" data-k="${k}" ${p.comandante ? "" : "disabled"}>${ic("menu_book")}Regras</button><button class="bt peq ouro" data-cm="busca" data-k="${k}">${ic("travel_explore")}${p.comandante ? "Trocar" : "Escolher"}</button><button class="bt peq sangue" data-cm="limpar" data-k="${k}" ${p.comandante ? "" : "disabled"}>${ic("delete")}Tirar</button></div></section>`).join("");
    };
    const f = folha(`<h2>Trono dos comandantes</h2><p class="muted">O general de cada posto da mesa.</p><div id="cm-corpo" class="mt" style="display:grid;gap:10px">${corpo()}</div>`, { aoFechar: () => V.desenhar(el) });
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cm]"); if (!b) return;
      const k = +b.dataset.k;
      if (b.dataset.cm === "regras") V.acoes.regras(el, k);
      else if (b.dataset.cm === "busca") V.acoes.busca(el, k);
      else if (b.dataset.cm === "limpar") { const j = V.jogo(), p = j.jogadores[k]; V.registrar(j, `${p.nome} dispensou ${p.comandante}.`); p.comandante = ""; p.cmdCarta = null; p.tribo = ""; if (p.fundo.tipo === "arte") p.fundo = { tipo: "cor", cor: "M" }; V.salvar(j); $("#cm-corpo", f).innerHTML = corpo(); }
    });
  };

  // ---------- COMBO! ----------
  V.acoes.combo = (el) => {
    const j = V.jogo(); let quem = j.eu;
    const f = folha(`<div class="combo-palco">${ic("bolt", "fill combo-raio")}<h2>Combo infinito!</h2><p class="muted">A pilha entrou em ciclo perfeito. Registre a vitória nas crônicas da partida.</p></div>
      <p class="rot mt">Quem concluiu o combo?</p><div class="chips quebra" id="cb-jog">${chipsJogadores(j, quem, "q")}</div>
      <button class="bt ouro cheio mt2" data-cb="gloria">${ic("auto_awesome")}Glória ao feiticeiro!</button>
      <button class="bt cheio mt" data-cb="oraculo">${ic("menu_book")}Oráculo do comandante</button>`, { aoFechar: () => V.desenhar(el) });
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.q !== undefined) { quem = +b.dataset.q; $$("#cb-jog .chip", f).forEach((x) => x.classList.toggle("on", x === b)); }
      else if (b.dataset.cb === "gloria") { const jj = V.jogo(); V.registrar(jj, `${jj.jogadores[quem].nome} concluiu um combo infinito!`); V.salvar(jj); toast(`${jj.jogadores[quem].nome} concluiu o combo!`, "bolt"); fecharFolha(); }
      else if (b.dataset.cb === "oraculo") V.acoes.regras(el, quem);
    });
  };
})();
