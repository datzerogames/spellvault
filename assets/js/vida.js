// SpellVault — marcador de vida para Commander: 2 a 6 jogadores, dano de comandante, veneno, taxa, energia,
// monarca, dados, cronômetro e crônica da partida. O estado fica salvo no aparelho.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, toast, folha, fecharFolha, confirmar } = SV;
  const LS = () => SV.d.LS;

  const FUNDOS = {
    W: "radial-gradient(90% 80% at 50% 20%, #8a7a52, #2a2213 70%)",
    U: "radial-gradient(90% 80% at 50% 20%, #1f4f7a, #0c1724 70%)",
    B: "radial-gradient(90% 80% at 50% 20%, #45304f, #120c15 70%)",
    R: "radial-gradient(90% 80% at 50% 20%, #7a2a1c, #1d0b07 70%)",
    G: "radial-gradient(90% 80% at 50% 20%, #24543a, #0a1a10 70%)",
    M: "radial-gradient(90% 80% at 50% 20%, #7a5d22, #1f1607 70%)",
  };
  // tipos de criatura mais comuns em português (os outros ficam como o Scryfall informa)
  const TRIBOS = { Vampire: "Vampiro", Elf: "Elfo", Goblin: "Goblin", Human: "Humano", Wizard: "Mago", Warrior: "Guerreiro", Knight: "Cavaleiro", Dragon: "Dragão", Zombie: "Zumbi", Angel: "Anjo", Demon: "Demônio", Faerie: "Fada", Merfolk: "Tritão", Soldier: "Soldado", Cleric: "Clérigo", Rogue: "Ladino", Shaman: "Xamã", Noble: "Nobre", Spirit: "Espírito", Beast: "Fera", Cat: "Gato", Bird: "Ave", Dinosaur: "Dinossauro", Hydra: "Hidra", Wolf: "Lobo", Werewolf: "Lobisomem", Skeleton: "Esqueleto", Druid: "Druida", Artificer: "Artífice", Assassin: "Assassino", Pirate: "Pirata", Dwarf: "Anão", Giant: "Gigante", Insect: "Inseto", Snake: "Serpente", Rat: "Rato", Phyrexian: "Phyrexiano", Squirrel: "Esquilo", Monk: "Monge", Archer: "Arqueiro", Scout: "Batedor", Advisor: "Conselheiro" };
  const triboPt = (tipo) => ((tipo || "").split("—")[1] || "").trim().split(/\s+/).filter(Boolean).map((w) => TRIBOS[w] || w).join(" ");
  const NOMES_PADRAO = ["Talion", "Prosper", "Lathril", "Kenrith", "Tasigur", "Yuriko"];
  const COR_PADRAO = ["U", "R", "G", "M", "W", "B"];

  function novoJogador(i, n) {
    return { id: "j" + i, nome: i === n - 1 ? SV.d.config().nome.split(" ")[0] || "Você" : NOMES_PADRAO[i], vida: 40, veneno: 0, energia: 0, taxa: 0, exp: 0, cmd: {}, monarca: false, fundo: { tipo: "cor", cor: COR_PADRAO[i] }, comandante: "", tribo: "", cmdCarta: null, mana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 } };
  }
  function novoJogo(n = 4, vida = 40, anterior) {
    // mantém nomes e estandartes da partida anterior; o lugar "você" fica sempre por último
    const antes = anterior ? anterior.jogadores.filter((_, k) => k !== anterior.eu).slice(0, n - 1).concat(anterior.jogadores[anterior.eu] || []) : [];
    const jogadores = Array.from({ length: n }, (_, i) => {
      const j = novoJogador(i, n); j.vida = vida;
      const a = i === n - 1 ? anterior && anterior.jogadores[anterior.eu] : antes[i] !== (anterior && anterior.jogadores[anterior.eu]) ? antes[i] : null;
      if (a) Object.assign(j, { nome: a.nome, fundo: a.fundo, comandante: a.comandante, tribo: a.tribo || "", cmdCarta: a.cmdCarta || null });
      return j;
    });
    return { n, vidaInicial: vida, jogadores, eu: n - 1, acumulado: 0, desde: Date.now(), rodando: true, storm: 0, hist: [{ t: Date.now(), txt: `O tomo foi consagrado com ${vida} de vida para ${n} jogadores.` }], reduzVida: true };
  }
  const jogo = () => LS().get("jogo", null) || salvar(novoJogo());
  function salvar(j) { LS().set("jogo", j); return j; }
  const tempo = (j) => j.acumulado + (j.rodando ? Date.now() - j.desde : 0);
  const fmtTempo = (ms) => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60; return (h ? h + ":" + String(m).padStart(2, "0") : String(m).padStart(2, "0")) + ":" + String(ss).padStart(2, "0"); };
  const morto = (p) => p.vida <= 0 || p.veneno >= 10 || Object.values(p.cmd).some((v) => v >= 21);
  const cmdTotal = (p) => Object.values(p.cmd).reduce((a, b) => a + b, 0);
  // partidas salvas antes destes campos existirem continuam funcionando
  const manaDe = (p) => p.mana || (p.mana = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });
  const manaTotal = (p) => Object.values(manaDe(p)).reduce((a, b) => a + b, 0);
  function registrar(j, txt) { j.hist.push({ t: Date.now(), txt }); if (j.hist.length > 300) j.hist.shift(); }

  // ---------- desenho ----------
  function painel(j, p, i) {
    const vira = (j.n === 2 && i === 0) || (j.n === 3 && i === 0) || (j.n >= 4 && i < 2);
    const fundo = p.fundo.tipo === "arte" ? "#120d09" : FUNDOS[p.fundo.cor] || FUNDOS.M;
    const alerta = (v, lim) => (v >= lim ? "alerta" : "");
    const maiorCmd = Math.max(0, ...Object.values(p.cmd));
    return `<section class="jog ${vira ? "vira" : ""} ${i === j.eu ? "eu" : ""} ${morto(p) ? "morto" : ""}" style="--fundo:${fundo}" data-i="${i}" aria-label="${esc(p.nome)}: ${p.vida} de vida">
      ${p.fundo.tipo === "arte" ? `<div class="arte" style="background-image:url('${esc(p.fundo.arte)}')"></div>` : ""}
      <button class="toque mais" data-v="mais" aria-label="Mais 1 de vida para ${esc(p.nome)}">${ic("add")}</button>
      <button class="toque menos" data-v="menos" aria-label="Menos 1 de vida para ${esc(p.nome)}">${ic("remove")}</button>
      <div class="cab">
        <button class="nome" data-v="marcadores">${esc(p.nome)}${p.comandante || p.tribo ? `<small>${esc([p.comandante, p.tribo].filter(Boolean).join(" · "))}</small>` : ""}</button>
        <div class="icos">
          ${p.comandante ? `<button class="mini" data-v="regras" aria-label="Regras do comandante de ${esc(p.nome)}">${ic("menu_book")}</button>` : ""}
          <button class="mini ${p.monarca ? "coroa" : ""}" data-v="monarca" aria-pressed="${!!p.monarca}" aria-label="${p.monarca ? "Tirar a coroa de " : "Dar a coroa a "}${esc(p.nome)}">${ic("crown", p.monarca ? "fill" : "")}</button>
          <button class="mini" data-v="fundo" aria-label="Mudar fundo">${ic("palette")}</button>
        </div>
      </div>
      <div class="vida"><b class="num">${p.vida}</b></div>
      <span class="delta" data-delta></span>
      ${p.fundo.tipo === "arte" && p.fundo.artista ? `<span class="credito">Arte: ${esc(p.fundo.artista)}</span>` : ""}
      <div class="base">
        <div class="contadores">
          <button class="cont veneno ${alerta(p.veneno, 10)}" data-v="marcadores" aria-label="Veneno">${ic("skull")}${p.veneno}</button>
          <button class="cont cmd ${alerta(maiorCmd, 21)}" data-v="marcadores" aria-label="Dano de comandante">${ic("swords")}${cmdTotal(p)}</button>
          <button class="cont taxa" data-v="taxa" aria-label="Taxa de comandante, toque para somar 2">${ic("gavel")}+${p.taxa}</button>
          ${p.energia ? `<button class="cont energia" data-v="marcadores" aria-label="Energia">${ic("bolt")}${p.energia}</button>` : ""}
          ${p.exp ? `<button class="cont exp" data-v="marcadores" aria-label="Experiência">${ic("science")}${p.exp}</button>` : ""}
        </div>
        <div class="passos"><button data-v="d" data-n="-5">−5</button><button data-v="d" data-n="-1">−1</button><button data-v="d" data-n="1">+1</button><button data-v="d" data-n="5">+5</button></div>
      </div>
      ${morto(p) ? `<div class="derrota"><div>${ic("skull", "fill")}Derrotado</div></div>` : ""}
    </section>`;
  }
  function desenhar(el) {
    const j = jogo();
    const ult = j.hist[j.hist.length - 1];
    el.innerHTML = `<div class="vida-topo">
        <div class="marca"><b>SpellVault</b><small>${j.n} jogadores · ${j.vidaInicial}</small></div>
        <span class="espaco"></span>
        <button class="relogio" data-v="relogio" aria-label="Pausar ou continuar o cronômetro">${ic(j.rodando ? "hourglass_top" : "pause")}<span id="tempo">${fmtTempo(tempo(j))}</span></button>
        <button class="ico-bt" data-v="dados" aria-label="Rolar dados">${ic("casino")}</button>
        <button class="ico-bt" data-v="nova" aria-label="Nova partida">${ic("restart_alt")}</button>
        <a class="ico-bt avatar-mini" href="#grimorio" aria-label="Perfil e configurações">${esc((SV.d.config().nome || "?").trim()[0] || "?")}</a>
      </div>
      <div class="chips barra-vida" role="toolbar" aria-label="Ferramentas da mesa">
        <button class="chip" data-v="monarca-quem" aria-label="Escolher o monarca">${ic("crown", j.jogadores.some((x) => x.monarca) ? "fill" : "")}${j.jogadores.some((x) => x.monarca) ? esc(j.jogadores.find((x) => x.monarca).nome) : "Monarca"}</button>
        <button class="chip" data-v="mana">${ic("blur_on")}Mana ${manaTotal(j.jogadores[j.eu])}</button>
        <button class="chip" data-v="busca">${ic("travel_explore")}Scryfall</button>
        <button class="chip" data-v="comandantes">${ic("shield_person")}Comandantes</button>
        <button class="chip" data-v="cronicas">${ic("history_edu")}Crônicas</button>
        <button class="chip combo" data-v="combo">${ic("bolt", "fill")}Combo!</button>
      </div>
      <div class="mesa j${j.n}">${j.jogadores.map((p, i) => painel(j, p, i)).join("")}</div>
      <div class="cronica">${ic("auto_awesome")}<b>Último feitiço:</b><span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ult ? ult.txt : "")}</span></div>`;
  }

  // ---------- mudanças de vida com acúmulo (+3 aparece junto e vira uma linha só na crônica) ----------
  const pend = {};
  function mudarVida(el, i, n) {
    const j = jogo(), p = j.jogadores[i];
    const antes = p.vida; p.vida += n; salvar(j);
    const sec = el.querySelector(`.jog[data-i="${i}"]`); if (!sec) return;
    sec.querySelector(".vida b").textContent = p.vida;
    sec.classList.toggle("morto", morto(p));
    const k = pend[i] || (pend[i] = { soma: 0, inicio: antes });
    k.soma += n;
    const dl = sec.querySelector("[data-delta]"); dl.textContent = (k.soma > 0 ? "+" : "") + k.soma; dl.classList.add("on"); dl.classList.toggle("neg", k.soma < 0);
    if (navigator.vibrate) navigator.vibrate(8);
    clearTimeout(k.t);
    k.t = setTimeout(() => {
      dl.classList.remove("on");
      const jj = jogo(), pp = jj.jogadores[i];
      if (k.soma) registrar(jj, `${pp.nome} ${k.soma > 0 ? "ganhou" : "perdeu"} ${Math.abs(k.soma)} (${k.inicio} → ${pp.vida}).`);
      if (morto(pp) && !morto({ ...pp, vida: k.inicio })) registrar(jj, `${pp.nome} caiu em batalha.`);
      salvar(jj); delete pend[i];
      const cr = el.querySelector(".cronica span:last-child"); if (cr) cr.textContent = jj.hist[jj.hist.length - 1].txt;
      if (morto(pp)) desenhar(el);
    }, 1600);
  }

  // a coroa é de uma pessoa só: tocar de novo na mesma tira a coroa
  function definirMonarca(i) {
    const j = jogo(), alvo = i >= 0 ? j.jogadores[i] : null, ja = alvo && alvo.monarca;
    j.jogadores.forEach((x) => (x.monarca = false));
    if (alvo && !ja) { alvo.monarca = true; registrar(j, `${alvo.nome} tornou-se o monarca.`); }
    else registrar(j, ja ? `${alvo.nome} perdeu a coroa de monarca.` : "Ninguém é monarca agora.");
    salvar(j);
  }

  // ---------- folhas ----------
  function folhaMarcadores(el, i) {
    const j = jogo(), p = j.jogadores[i];
    const linha = (k, nome, icone, cor, lim, passo = 1) => `<div class="linha-cont">${ic(icone)}<span style="color:${cor}">${nome}</span><div class="q"><button class="ico-bt" data-m="${k}" data-n="${-passo}" aria-label="Menos" ${p[k] <= 0 ? "disabled" : ""}>${ic("remove")}</button><b class="${p[k] >= lim ? "letal" : ""}">${p[k]}</b><button class="ico-bt" data-m="${k}" data-n="${passo}" aria-label="Mais">${ic("add")}</button></div></div>`;
    const f = folha(`<h2>${esc(p.nome)}</h2><p class="muted" style="margin-bottom:8px">${esc(p.comandante || "Sem comandante definido")}</p>
      <div class="dupla"><div class="campo"><label for="nome-jog">Nome</label><input id="nome-jog" value="${esc(p.nome)}" maxlength="20"/></div>
        <div class="campo"><label for="tribo-jog">Tribo do comandante</label><input id="tribo-jog" value="${esc(p.tribo || "")}" maxlength="30" placeholder="Ex.: Vampiros"/></div></div>
      <div class="dupla mt"><button class="bt" data-m="comandante">${ic("travel_explore")}${p.comandante ? "Trocar comandante" : "Buscar comandante"}</button><button class="bt" data-m="regras" ${p.comandante ? "" : "disabled"}>${ic("menu_book")}Regras dele</button></div>
      <div class="rubrica"><span>Marcadores</span></div>
      ${linha("veneno", "Veneno", "skull", "var(--veneno)", 10)}
      ${linha("taxa", "Taxa de comandante", "gavel", "var(--ouro2)", 999, 2)}
      ${linha("energia", "Energia", "bolt", "var(--gelo)", 999)}
      ${linha("exp", "Experiência", "science", "var(--arcano)", 999)}
      <div class="rubrica"><span>Dano de comandante recebido</span></div>
      ${j.jogadores.map((o, k) => (k === i ? "" : `<div class="linha-cont">${ic("swords")}<span>de ${esc(o.nome)}</span><div class="q"><button class="ico-bt" data-c="${o.id}" data-n="-1" aria-label="Menos" ${(p.cmd[o.id] || 0) <= 0 ? "disabled" : ""}>${ic("remove")}</button><b class="${(p.cmd[o.id] || 0) >= 21 ? "letal" : ""}">${p.cmd[o.id] || 0}</b><button class="ico-bt" data-c="${o.id}" data-n="1" aria-label="Mais">${ic("add")}</button></div></div>`)).join("")}
      <label class="check mt"><input type="checkbox" id="reduz" ${j.reduzVida ? "checked" : ""}/>Dano de comandante também tira vida</label>
      <div class="dupla mt2"><button class="bt" data-m="monarca">${ic("crown")}${p.monarca ? "Tirar monarca" : "Tornar monarca"}</button><button class="bt" data-m="eu">${ic("person")}${i === j.eu ? "Este é você" : "Sou eu"}</button></div>`, { aoFechar: () => desenhar(el) });
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const jj = jogo(), pp = jj.jogadores[i];
      if (b.dataset.m === "monarca") { definirMonarca(i); fecharFolha(); return; }
      if (b.dataset.m === "comandante") { fecharFolha(); SV.vida.acoes.busca(el, i); return; }
      if (b.dataset.m === "regras") { fecharFolha(); SV.vida.acoes.regras(el, i); return; }
      if (b.dataset.m === "eu") { jj.eu = i; salvar(jj); fecharFolha(); return; }
      const n = +b.dataset.n; if (!n) return;
      if (b.dataset.m) { pp[b.dataset.m] = Math.max(0, pp[b.dataset.m] + n); if (b.dataset.m === "taxa" && n > 0) registrar(jj, `${pp.nome} conjurou o comandante (taxa +${pp.taxa}).`); }
      if (b.dataset.c) {
        const atual = pp.cmd[b.dataset.c] || 0, novo = Math.max(0, atual + n), dif = novo - atual;
        pp.cmd[b.dataset.c] = novo;
        if (dif && jj.reduzVida) pp.vida -= dif;
        const de = jj.jogadores.find((x) => x.id === b.dataset.c);
        if (dif > 0) registrar(jj, `${de.nome} causou ${dif} de dano de comandante em ${pp.nome}.`);
      }
      salvar(jj);
      const bb = b.parentElement.querySelector("b"); const v = b.dataset.m ? pp[b.dataset.m] : pp.cmd[b.dataset.c];
      bb.textContent = v; bb.classList.toggle("letal", (b.dataset.m === "veneno" && v >= 10) || (!!b.dataset.c && v >= 21));
      const menos = b.parentElement.querySelector('[data-n^="-"]'); if (menos) menos.disabled = v <= 0;
    });
    f.querySelector("#nome-jog").addEventListener("change", (e) => { const jj = jogo(); jj.jogadores[i].nome = e.target.value.trim() || jj.jogadores[i].nome; salvar(jj); });
    f.querySelector("#tribo-jog").addEventListener("change", (e) => { const jj = jogo(); jj.jogadores[i].tribo = e.target.value.trim(); salvar(jj); });
    f.querySelector("#reduz").addEventListener("change", (e) => { const jj = jogo(); jj.reduzVida = e.target.checked; salvar(jj); });
  }

  const FILTROS_ARTE = [["", "Todos"], ["t:planeswalker", "Planeswalkers"], ["is:commander", "Comandantes"], ["t:legendary", "Lendárias"]];
  function folhaFundo(el, i) {
    const j = jogo(), p = j.jogadores[i]; let filtro = "is:commander", ultimos = [];
    const f = folha(`<h2>Estandarte de ${esc(p.nome)}</h2><p class="muted">Escolha uma cor de mana ou a arte de uma carta.</p>
      <div class="fundos">${Object.keys(FUNDOS).map((k) => `<button style="background:${FUNDOS[k]}" data-cor="${k}" class="${p.fundo.tipo === "cor" && p.fundo.cor === k ? "on" : ""}" aria-label="Cor ${k}"></button>`).join("")}</div>
      ${p.fundo.tipo === "arte" ? `<button class="bt cheio" data-rm="1">${ic("hide_image")}Remover arte</button>` : ""}
      <div class="rubrica"><span>Arte de uma carta</span></div>
      <div class="chips" id="fl-arte">${FILTROS_ARTE.map(([k, n]) => `<button class="chip ${k === filtro ? "on" : ""}" data-fl="${esc(k)}">${n}</button>`).join("")}</div>
      <div class="busca mt">${ic("travel_explore")}<input id="busca-cmd" placeholder="Nome da carta (ex.: Edgar Markov)" autocomplete="off" autofocus/></div>
      <div class="res-busca" id="res-cmd"><p class="dim" style="font-style:italic">As artes vêm do Scryfall.</p></div>`, { aoFechar: () => desenhar(el) });
    const res = f.querySelector("#res-cmd");
    const procurar = async () => {
      const q = f.querySelector("#busca-cmd").value.trim(); if (q.length < 2) { res.innerHTML = `<p class="dim" style="font-style:italic">Digite pelo menos 2 letras.</p>`; return; }
      res.innerHTML = `<p class="dim"><span class="carregando"></span> Consultando o oráculo…</p>`;
      try {
        let r = await SV.sf.buscar(`${q} ${filtro}`.trim(), "&unique=art&order=edhrec");
        if (!r.length) r = await SV.sf.multilingue(`${q} ${filtro}`.trim());
        // o nome digitado exato vem primeiro (ex.: "Edgar Markov" antes de "Edgar, Charmed Groom")
        const alvo = q.toLowerCase(), peso = (c) => (c.nome.toLowerCase() === alvo ? 0 : c.nome.toLowerCase().startsWith(alvo) ? 1 : 2);
        ultimos = r.map((c, k) => [c, k]).sort((x, y) => peso(x[0]) - peso(y[0]) || x[1] - y[1]).map((x) => x[0]).slice(0, 12);
        res.innerHTML = ultimos.length ? ultimos.map((c, k) => `<button data-arte="${k}"><img src="${esc(c.arte)}" alt="" loading="lazy"/><div><b>${esc(c.nome)}</b><small>${esc(c.setNome)} · arte de ${esc(c.artista)}</small></div></button>`).join("") : `<p class="dim">Nenhuma carta com esse nome neste filtro.</p>`;
      } catch { res.innerHTML = `<p class="dim">Sem conexão com o Scryfall agora.</p>`; }
    };
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const jj = jogo(), pp = jj.jogadores[i];
      if (b.dataset.cor) { pp.fundo = { tipo: "cor", cor: b.dataset.cor }; salvar(jj); fecharFolha(); }
      else if (b.dataset.rm) { pp.fundo = { tipo: "cor", cor: COR_PADRAO[i % COR_PADRAO.length] }; salvar(jj); toast("Arte removida", "hide_image"); fecharFolha(); }
      else if (b.dataset.fl !== undefined) { filtro = b.dataset.fl; $$("#fl-arte .chip", f).forEach((x) => x.classList.toggle("on", x === b)); if (f.querySelector("#busca-cmd").value.trim().length >= 2) procurar(); }
      else if (b.dataset.arte !== undefined) {
        const c = ultimos[+b.dataset.arte]; pp.fundo = { tipo: "arte", arte: c.arte, artista: c.artista };
        if (c.lendaria || /is:commander/.test(filtro)) { pp.comandante = c.nome; pp.cmdCarta = SV.sf.compacto(c); const sub = triboPt(c.tipo); if (sub && !pp.tribo) pp.tribo = sub; }
        registrar(jj, `${pp.nome} empunha ${c.nome}.`); salvar(jj); fecharFolha();
      }
    });
    f.querySelector("#busca-cmd").addEventListener("input", SV.debounce(procurar, 380));
  }

  function folhaDados() {
    const f = folha(`<h2>Oráculo</h2><p class="muted">Role os dados ou deixe o destino escolher quem começa.</p>
      <div class="resultado-dado" id="res-dado"><b>—</b><span class="muted" id="res-txt">Toque num dado</span></div>
      <div class="dados-grade">${[4, 6, 8, 10, 12, 20].map((n) => `<button class="dado-bt" data-dado="${n}">${ic(n === 20 ? "casino" : "hexagon")}D${n}</button>`).join("")}<button class="dado-bt" data-dado="moeda">${ic("toll")}Moeda</button><button class="dado-bt" data-dado="quem">${ic("crown")}Quem começa</button></div>`);
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-dado]"); if (!b) return;
      const j = jogo(), k = b.dataset.dado, out = f.querySelector("#res-dado b"), txt = f.querySelector("#res-txt");
      let r, msg;
      if (k === "moeda") { r = Math.random() < 0.5 ? "Cara" : "Coroa"; msg = `A moeda caiu: ${r}.`; }
      else if (k === "quem") { const p = j.jogadores[Math.floor(Math.random() * j.n)]; r = p.nome; msg = `O destino escolheu ${p.nome} para começar.`; }
      else { r = 1 + Math.floor(Math.random() * +k); msg = `D${k} rolado: ${r}.`; }
      let giros = 8; const anima = setInterval(() => { out.textContent = k === "moeda" ? (giros % 2 ? "Cara" : "Coroa") : k === "quem" ? j.jogadores[giros % j.n].nome : 1 + Math.floor(Math.random() * +k); if (--giros <= 0) { clearInterval(anima); out.textContent = r; txt.textContent = msg; } }, 60);
      registrar(j, msg); salvar(j);
    });
  }

  function folhaCronicas() {
    const j = jogo();
    folha(`<h2>Crônicas da partida</h2><p class="muted">${j.hist.length} registros · ${fmtTempo(tempo(j))} de jogo</p>
      <ul class="lista-hist mt">${j.hist.slice().reverse().map((h) => `<li><time>${new Date(h.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</time><span>${esc(h.txt)}</span></li>`).join("")}</ul>`);
  }

  function folhaNova(el) {
    const j = jogo(); let n = j.n, v = j.vidaInicial;
    const f = folha(`<h2>Nova partida</h2><p class="muted">Os nomes e estandartes de cada lugar são mantidos.</p>
      <div class="campo mt"><label>Jogadores</label><div class="seg" id="seg-n">${[2, 3, 4, 5, 6].map((x) => `<button data-n="${x}" class="${x === n ? "on" : ""}">${x}</button>`).join("")}</div></div>
      <div class="campo mt"><label>Vida inicial</label><div class="seg" id="seg-v">${[20, 25, 30, 40].map((x) => `<button data-v2="${x}" class="${x === v ? "on" : ""}">${x}</button>`).join("")}</div><small>Commander usa 40; duelo, 20.</small></div>
      <button class="bt ouro cheio mt2" id="comecar">${ic("swords")}Começar a batalha</button>`);
    f.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.n) { n = +b.dataset.n; $$("#seg-n button", f).forEach((x) => x.classList.toggle("on", x === b)); }
      if (b.dataset.v2) { v = +b.dataset.v2; $$("#seg-v button", f).forEach((x) => x.classList.toggle("on", x === b)); }
      if (b.id === "comecar") { salvar(novoJogo(n, v, jogo())); fecharFolha(); desenhar(el); toast("Que comece a batalha!", "swords"); }
    });
  }

  SV.vida = { jogo, salvar, registrar, desenhar, morto, tempo, fmtTempo, manaDe, manaTotal, definirMonarca, triboPt, FUNDOS, dados: folhaDados, acoes: {} };

  // ---------- tela ----------
  let relogio, travaTela;
  SV.telas = SV.telas || {};
  SV.telas.vida = {
    montar(el) {
      desenhar(el);
      relogio = setInterval(() => { const t = $("#tempo"); if (t) t.textContent = fmtTempo(tempo(jogo())); }, 1000);
      if ("wakeLock" in navigator) navigator.wakeLock.request("screen").then((w) => (travaTela = w)).catch(() => {});
      el.onclick = (e) => {
        const b = e.target.closest("[data-v]"); if (!b) return;
        const sec = b.closest(".jog"), i = sec ? +sec.dataset.i : -1, v = b.dataset.v;
        if (v === "mais") mudarVida(el, i, 1);
        else if (v === "menos") mudarVida(el, i, -1);
        else if (v === "d") mudarVida(el, i, +b.dataset.n);
        else if (v === "marcadores") folhaMarcadores(el, i);
        else if (v === "fundo") folhaFundo(el, i);
        else if (v === "monarca") { definirMonarca(i); desenhar(el); const q = jogo().jogadores[i]; toast(q.monarca ? `${q.nome} é o monarca` : "Coroa removida", "crown"); }
        else if (SV.vida.acoes && SV.vida.acoes[v]) SV.vida.acoes[v](el, i);
        else if (v === "taxa") { const j = jogo(); const p = j.jogadores[i]; p.taxa += 2; registrar(j, `${p.nome} conjurou o comandante (taxa +${p.taxa}).`); salvar(j); desenhar(el); toast(`Taxa de ${p.nome}: +${p.taxa}`, "gavel"); }
        else if (v === "relogio") { const j = jogo(); if (j.rodando) { j.acumulado += Date.now() - j.desde; j.rodando = false; } else { j.desde = Date.now(); j.rodando = true; } salvar(j); desenhar(el); }
        else if (v === "dados") folhaDados();
        else if (v === "cronicas") folhaCronicas();
        else if (v === "nova") confirmar("Nova partida?", "A vida de todos volta ao início e a crônica atual é encerrada.", "Nova partida", false).then((ok) => ok && folhaNova(el));
      };
    },
    desmontar(el) { clearInterval(relogio); el.onclick = null; if (travaTela) { travaTela.release().catch(() => {}); travaTela = null; } },
  };
})();
