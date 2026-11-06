// SpellVault — rotas (#vida, #scanner, #consulta, #colecao, #albuns, #grimorio, #carta-id, #ver-id, #album-id), barra de vidro e brasas.
(function () {
  const SV = window.SV;
  const { $, ic, esc } = SV;
  const app = $("#app");
  const ABAS = [
    ["vida", "favorite", "Vida"],
    ["scanner", "center_focus_strong", "Scanner"],
    ["consulta", "travel_explore", "Consulta"],
    ["colecao", "style", "Coleção"],
    ["albuns", "collections_bookmark", "Álbuns"],
    ["grimorio", "menu_book", "Grimório"],
  ];
  let atual = null;

  function rota() {
    // a demo abre direto nos álbuns, que é o que ela existe para mostrar
    const h = location.hash.replace(/^#/, "") || (SV.modo.demo ? "albuns" : "vida");
    if (h.startsWith("carta-")) return { tela: "carta", arg: h.slice(6), aba: "colecao" };
    if (h.startsWith("ver-")) return { tela: "ver", arg: h.slice(4), aba: "consulta" };
    if (h.startsWith("album3d-")) return { tela: "album3d", arg: h.slice(8), aba: "albuns" };
    if (h.startsWith("album-")) return { tela: "album", arg: h.slice(6), aba: "albuns" };
    if (h === "forja" || h.startsWith("forja-")) return { tela: "forja", arg: h.slice(6), aba: "consulta" };
    const ok = ABAS.some((a) => a[0] === h);
    return { tela: ok ? h : "vida", aba: ok ? h : "vida" };
  }
  function nav(aba) {
    $("#nav").innerHTML = ABAS.map(([k, i, t]) => `<a href="#${k}" class="${k === aba ? "on" : ""}" ${k === aba ? 'aria-current="page"' : ""}>${ic(i)}<span>${t}</span></a>`).join("");
  }
  // os dois botões do cabeçalho do desenho original, em todas as telas: rolar o D20 e abrir o perfil
  function acoesGlobais(tela) {
    const topo = $(".topo", app); if (!topo) return; // a tela Vida já tem os dela
    let acoes = $(".acoes", topo);
    if (!acoes) { acoes = document.createElement("div"); acoes.className = "acoes"; topo.appendChild(acoes); }
    const nome = (SV.d.config().nome || "?").trim();
    acoes.insertAdjacentHTML("afterbegin", `<button class="ico-bt" data-sv="d20" aria-label="Rolar dados">${ic("casino")}</button>${tela === "grimorio" ? "" : `<a class="ico-bt avatar-mini" href="#grimorio" aria-label="Perfil e configurações">${esc(nome[0] || "?")}</a>`}`);
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-sv=d20]")) SV.vida.dados(); });

  function render() {
    SV.fecharFolha();
    if (atual && SV.telas[atual].desmontar) SV.telas[atual].desmontar(app);
    const r = rota();
    atual = r.tela;
    nav(r.aba);
    document.body.dataset.tela = r.tela;
    SV.telas[r.tela].montar(app, r.arg);
    acoesGlobais(r.tela);
    window.scrollTo(0, 0);
    const nomes = { vida: "Vida", scanner: "Scanner", consulta: "Consulta", colecao: "Coleção", albuns: "Álbuns", grimorio: "Grimório", carta: "Carta", ver: "Ficha da carta", album: "Álbum", album3d: "Álbum em 3D", forja: "Forja de decks" };
    document.title = `${nomes[r.tela]} · SpellVault${SV.modo.demo ? " DEMO" : ""}`;
  }
  // quantas telas o jogador já abriu aqui: o "Voltar" só usa o histórico do navegador se ele for do próprio app
  SV.navegou = 0;
  window.addEventListener("hashchange", () => { SV.navegou++; render(); });

  // brasas subindo ao fundo (desligadas com "reduzir movimento")
  function brasas() {
    const cv = $("#brasas"); if (!cv || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const g = cv.getContext("2d"); let W, H, ps = [];
    const tam = () => { W = cv.width = innerWidth * devicePixelRatio; H = cv.height = innerHeight * devicePixelRatio; };
    tam(); addEventListener("resize", tam);
    const n = innerWidth < 600 ? 22 : 40;
    const nova = (y) => ({ x: Math.random() * W, y: y ?? H + Math.random() * H * 0.3, r: (0.6 + Math.random() * 1.8) * devicePixelRatio, v: (0.25 + Math.random() * 0.6) * devicePixelRatio, o: Math.random() * Math.PI * 2, a: 0.25 + Math.random() * 0.55 });
    for (let i = 0; i < n; i++) ps.push(nova(Math.random() * H));
    (function passo() {
      if (!document.hidden) {
        g.clearRect(0, 0, W, H);
        for (const p of ps) {
          p.y -= p.v; p.o += 0.02; p.x += Math.sin(p.o) * 0.35 * devicePixelRatio;
          if (p.y < -10) Object.assign(p, nova());
          const vida = Math.min(1, p.y / H + 0.15);
          g.beginPath(); g.fillStyle = `rgba(255,${120 + Math.floor(vida * 80)},40,${p.a * vida})`; g.shadowColor = "rgba(255,130,40,.9)"; g.shadowBlur = 8 * devicePixelRatio;
          g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
        }
      }
      requestAnimationFrame(passo);
    })();
  }

  async function iniciar() {
    nav(rota().aba);
    if (!SV.d.LS.get("semeado", false)) {
      app.innerHTML = `<div class="pagina"><div class="vazio" style="padding-top:30vh">${ic("auto_stories")}<p style="font:600 18px var(--ft);color:var(--ouro2);font-style:normal">Abrindo o cofre…</p><p>Buscando as cartas de exemplo no Scryfall.</p><span class="carregando mt"></span></div></div>`;
      try { await SV.d.semear(); } catch { SV.toast("Sem internet: o cofre começa vazio por enquanto.", "cloud_off"); }
    }
    render();
    brasas();
  }
  iniciar();
})();
