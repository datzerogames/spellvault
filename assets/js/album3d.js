// SpellVault — álbum em 3D: o fichário aberto sobre a mesa, com capa de couro, argolas de ouro, páginas de bolsos
// (2x2, 3x3, 4x3, 4x4…) e as cartas de verdade. Arraste para girar; toque numa carta para inspecionar (virar, foil).
// Desenho baseado nas telas three.js do Stitch. O three.js (r149, MIT) vem junto em assets/vendor e só é carregado aqui.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, esc, ic, brl } = SV;
  SV.telas = SV.telas || {};

  const PW = 1.4, PH = 2.0, GAP = 0.04, PCX = PW / 2 + GAP, MARG = 0.07, RAZAO = 63 / 88;
  let X = null;      // cena em uso (só existe uma por vez)
  let montagens = 0; // descarta montagens que terminaram depois de o jogador já ter saído da tela

  function carregarThree() {
    if (window.THREE) return Promise.resolve();
    return new Promise((ok, falha) => {
      const s = document.createElement("script"); s.src = "assets/vendor/three.min.js";
      s.onload = ok; s.onerror = () => falha(new Error("three.js")); document.head.appendChild(s);
    });
  }
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  const suave = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  function vazioHtml(msg, a) {
    return `<div class="pagina"><header class="topo"><a class="ico-bt" href="#albuns" aria-label="Voltar">${ic("arrow_back")}</a><div class="marca"><b>Álbum em 3D</b></div></header>
      <div class="vazio">${ic("view_in_ar")}${msg}<br/>${a ? `<a class="bt mt" href="#album-${a.id}">Ver o álbum em lista</a>` : `<a class="bt mt" href="#albuns">Voltar à estante</a>`}</div></div>`;
  }

  SV.telas.album3d = {
    async montar(el, id) {
      const token = ++montagens;
      limpar(); SV.album3d = null;
      const a = SV.d.album(id);
      if (!a) { el.innerHTML = vazioHtml("Álbum não encontrado."); return; }
      if (SV.d.ehCaixa(a)) { el.innerHTML = vazioHtml("Deck box e gaveteiro não têm páginas para folhear em 3D.", a); return; }
      const t = SV.d.TIPOS[a.tipo], nPag = a.paginas, oc = SV.d.ocupacao(a.id);
      const usados = Object.keys(oc).length, cap = SV.d.capacidade(a);
      el.innerHTML = `<div class="pagina pagina-3d">
        <header class="topo"><a class="ico-bt" href="#album-${a.id}" aria-label="Voltar ao álbum">${ic("arrow_back")}</a><div class="marca"><b style="font-size:19px">${esc(a.nome)}</b><small>${esc(t.nome)} · ${usados}/${cap} cartas · 3D</small></div>
          <div class="acoes"><a class="ico-bt" href="#album-${a.id}" aria-label="Ver em lista">${ic("view_list")}</a></div></header>
        <section class="palco-album" id="palco3d" aria-label="Fichário em 3D"><div class="carregando-3d">${ic("auto_stories")}<span class="carregando"></span><p>Abrindo o fichário…</p></div></section>
        <div class="ctrl-album3d">
          <div class="paginador"><button class="ico-bt" data-z3="ant" aria-label="Página anterior">${ic("chevron_left")}</button>
            <div class="info"><b id="p3-titulo">Páginas</b><small id="p3-sub">&nbsp;</small></div>
            <button class="ico-bt" data-z3="prox" aria-label="Próxima página">${ic("chevron_right")}</button></div>
          <div class="seg" role="group" aria-label="Enquadramento"><button data-z3="modo" data-v="livro">${ic("auto_stories")} Livro aberto</button><button data-z3="modo" data-v="pagina">${ic("crop_portrait")} Uma página</button></div>
          <p class="rot mt">${ic("palette")}Destacar cor</p>
          <div class="chips" id="f3-cores">${[["T", "Todas"], ["W", "Branco"], ["U", "Azul"], ["B", "Preto"], ["R", "Vermelho"], ["G", "Verde"], ["C", "Incolor"]].map(([k, n]) => `<button class="chip ${k === "T" ? "on" : ""}" data-z3="cor" data-v="${k}">${k === "T" || k === "C" ? "" : `<i class="gota" style="background:var(--${k})"></i>`}${n}</button>`).join("")}</div>
        </div></div>`;
      const palco = $("#palco3d", el);
      try { await carregarThree(); } catch { if (token === montagens) palco.innerHTML = `<div class="vazio">${ic("cloud_off")}Não consegui carregar o motor 3D.<br/><a class="bt mt" href="#album-${a.id}">Ver em lista</a></div>`; return; }
      if (token !== montagens) return;
      try { iniciar(el, a, palco, oc, t, nPag); }
      catch (e) { console.warn(e); palco.innerHTML = `<div class="vazio">${ic("hide_image")}Este aparelho não conseguiu abrir o 3D.<br/><a class="bt mt" href="#album-${a.id}">Ver em lista</a></div>`; }
    },
    desmontar(el) { ++montagens; limpar(); el.onclick = null; },
  };

  function limpar() {
    if (!X) return;
    const x = X; X = null;
    cancelAnimationFrame(x.raf); x.ro.disconnect();
    document.removeEventListener("keydown", x.teclas);
    x.descartar();
  }

  function iniciar(el, a, palco, oc, tipo, nPag) {
    const T = THREE;
    const cols = tipo.cols, rows = tipo.rows, pp = cols * rows;
    const cellW = (PW - 2 * MARG) / cols, cellH = (PH - 2 * MARG) / rows;
    let cw = cellW * 0.9, ch = cw / RAZAO;
    if (ch > cellH * 0.92) { ch = cellH * 0.92; cw = ch * RAZAO; }

    const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement; canvas.className = "cena3d";
    const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    palco.innerHTML = ""; palco.appendChild(canvas);
    palco.insertAdjacentHTML("beforeend", `<p class="dica3d" id="dica3d">${ic("swipe")} Arraste para girar · toque numa carta</p>
      <div class="zoom3d" id="zoom3d" hidden></div>`);
    setTimeout(() => { const d = $("#dica3d", palco); if (d) d.classList.add("some"); }, 4500);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(40, 1, 0.1, 60); scene.add(camera);
    const vh = Math.tan((camera.fov * Math.PI) / 360);
    scene.add(new T.AmbientLight(0xfff0d6, 0.5));
    const sol = new T.DirectionalLight(0xffe0b0, 0.75); sol.position.set(2.5, 4, 5); scene.add(sol);
    const luzFoil = new T.PointLight(0x7ab8ff, 0.45, 12); luzFoil.position.set(0, 1.5, 3.5); scene.add(luzFoil);
    const luzBrasa = new T.PointLight(0xe2722f, 0.45, 10); luzBrasa.position.set(-2.6, -1, 3); scene.add(luzBrasa);

    // ---------- materiais e geometrias compartilhados ----------
    const capa = new T.Color(a.capa || "#3a2617");
    const couro = new T.MeshPhongMaterial({ color: capa.clone().multiplyScalar(1.5), specular: 0x6a5328, shininess: 28 });
    const couroEscuro = new T.MeshPhongMaterial({ color: capa.clone().multiplyScalar(0.95), specular: 0x4a3a1c, shininess: 24 });
    const ouro = new T.MeshPhongMaterial({ color: 0x9a7a2e, specular: 0x6a5c3a, shininess: 60 });
    const matPapel = new T.MeshPhongMaterial({ color: 0x1d1610, specular: 0x222222, shininess: 8 });
    const matBorda = new T.MeshPhongMaterial({ color: 0x8a7e62, shininess: 4 });
    const matCelula = new T.MeshBasicMaterial({ color: 0x0c0806 });
    const matSleeve = new T.MeshPhongMaterial({ color: 0xffffff, specular: 0xffffff, shininess: 120, transparent: true, opacity: 0.09, depthWrite: false });
    const matAnel = new T.MeshBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0.5 });
    const geoPapel = new T.PlaneGeometry(PW, PH), geoCelula = new T.PlaneGeometry(cellW * 0.97, cellH * 0.97), geoCarta = new T.PlaneGeometry(cw, ch);
    const geoAnel = new T.RingGeometry(Math.min(cellW, cellH) * 0.1, Math.min(cellW, cellH) * 0.13, 28);
    const liberar = [couro, couroEscuro, ouro, matPapel, matBorda, matCelula, matSleeve, matAnel, geoPapel, geoCelula, geoCarta, geoAnel];

    // brilho foil: duas faixas (arco-íris e reflexo) que correm pela carta
    const cvBrilho = (arco) => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 256; const g = c.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 256, 256);
      if (arco) { ["#ff5d8f", "#ffb347", "#f6ff6a", "#5dffb1", "#5db8ff", "#b48bff"].forEach((cor, i, l) => gr.addColorStop(i / (l.length - 1), cor)); }
      else { gr.addColorStop(0.3, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.95)"); gr.addColorStop(0.7, "rgba(255,255,255,0)"); }
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
    };
    const texArco = cvBrilho(true), texReflexo = cvBrilho(false); texReflexo.wrapS = texReflexo.wrapT = T.ClampToEdgeWrapping;
    texArco.repeat.set(1.4, 1.4);
    const matArco = new T.MeshBasicMaterial({ map: texArco, transparent: true, opacity: 0.2, blending: T.AdditiveBlending, depthWrite: false });
    const matReflexo = new T.MeshBasicMaterial({ map: texReflexo, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
    liberar.push(matArco, matReflexo, texArco, texReflexo);

    // ---------- imagens das cartas ----------
    const loader = new T.TextureLoader().setCrossOrigin("anonymous");
    const cacheTex = new Map();
    const baixar = (url) => {
      if (!url) return Promise.resolve(null);
      if (!cacheTex.has(url)) cacheTex.set(url, new Promise((ok) => loader.load(url, (t) => { t.anisotropy = aniso; ok(t); }, undefined, () => ok(null))));
      return cacheTex.get(url);
    };
    // enquanto a imagem não chega (ou se estiver sem internet), a carta aparece com o nome
    const texNomes = new Map();
    const texNome = (c) => {
      if (texNomes.has(c.id)) return texNomes.get(c.id);
      const cv = document.createElement("canvas"); cv.width = 244; cv.height = 340; const g = cv.getContext("2d");
      const gr = g.createLinearGradient(0, 0, 0, 340); gr.addColorStop(0, "#33261a"); gr.addColorStop(1, "#140e09"); g.fillStyle = gr; g.fillRect(0, 0, 244, 340);
      g.strokeStyle = "#c9a24a"; g.lineWidth = 6; g.strokeRect(9, 9, 226, 322);
      g.fillStyle = "#ebcf86"; g.textAlign = "center"; g.font = "600 25px Georgia, serif";
      const palavras = SV.nomeExibido(c).split(" "); let lin = "", y = 120; const linhas = [];
      palavras.forEach((p) => { if (g.measureText(lin + " " + p).width > 190 && lin) { linhas.push(lin); lin = p; } else lin = lin ? lin + " " + p : p; }); linhas.push(lin);
      linhas.slice(0, 4).forEach((l) => { g.fillText(l, 122, y); y += 30; });
      g.fillStyle = "#b8a888"; g.font = "italic 17px Georgia, serif"; g.fillText((c.tipo || "").split(" — ")[0].slice(0, 28), 122, 300);
      const t = new T.CanvasTexture(cv); texNomes.set(c.id, t); liberar.push(t); return t;
    };
    const texVerso = (() => {
      const cv = document.createElement("canvas"); cv.width = 488; cv.height = 680; const g = cv.getContext("2d");
      const gr = g.createRadialGradient(244, 340, 20, 244, 340, 420); gr.addColorStop(0, "#4a3220"); gr.addColorStop(1, "#150e08"); g.fillStyle = gr; g.fillRect(0, 0, 488, 680);
      g.strokeStyle = "#c9a24a"; g.lineWidth = 10; g.strokeRect(18, 18, 452, 644); g.lineWidth = 3; g.strokeRect(34, 34, 420, 612);
      g.strokeStyle = "#c9a24a"; g.lineWidth = 8; g.beginPath(); g.arc(244, 340, 120, 0, 7); g.stroke();
      g.fillStyle = "#ebcf86"; g.beginPath();
      for (let i = 0; i < 8; i++) { const ang = (i * Math.PI) / 4 - Math.PI / 2, r = i % 2 ? 40 : 100; g.lineTo(244 + Math.cos(ang) * r, 340 + Math.sin(ang) * r); }
      g.closePath(); g.fill();
      g.font = "700 34px Georgia, serif"; g.textAlign = "center"; g.fillText("SpellVault", 244, 560);
      const t = new T.CanvasTexture(cv); liberar.push(t); return t;
    })();

    // ---------- o fichário ----------
    const raiz = new T.Group(); scene.add(raiz);
    const coverW = PW + 0.14, coverH = PH + 0.16;
    [-1, 1].forEach((s) => {
      const c = new T.Mesh(new T.BoxGeometry(coverW, coverH, 0.06), couro); c.position.set(s * PCX, 0, -0.03); raiz.add(c); liberar.push(c.geometry);
      [-1, 1].forEach((v) => { const q = new T.Mesh(new T.BoxGeometry(0.14, 0.14, 0.07), ouro); q.position.set(s * (PCX + coverW / 2 - 0.05), v * (coverH / 2 - 0.05), -0.03); raiz.add(q); liberar.push(q.geometry); });
    });
    const lombada = new T.Mesh(new T.BoxGeometry(0.15, coverH, 0.07), couroEscuro); lombada.position.set(0, 0, -0.03); raiz.add(lombada); liberar.push(lombada.geometry);
    const geoAro = new T.TorusGeometry(0.11, 0.016, 10, 28); liberar.push(geoAro);
    [-0.7, 0, 0.7].forEach((y) => { const r = new T.Mesh(geoAro, ouro); r.rotation.y = Math.PI / 2; r.position.set(0, y, 0.13); raiz.add(r); const base = new T.Mesh(new T.BoxGeometry(0.06, 0.1, 0.05), ouro); base.position.set(0, y, 0.02); raiz.add(base); liberar.push(base.geometry); });
    const geoPilha = new T.BoxGeometry(PW, PH, 1); liberar.push(geoPilha);
    const pilhaE = new T.Mesh(geoPilha, matBorda), pilhaD = new T.Mesh(geoPilha, matBorda); raiz.add(pilhaE, pilhaD);

    // ---------- estado ----------
    const maxS = Math.max(1, Math.ceil(nPag / 2) - 1);
    const est = { foco: 0, s: 0, modo: palco.clientWidth / Math.max(1, palco.clientHeight) >= 1.15 ? "livro" : "pagina", cor: "T", anim: null, zoom: null };
    let esq = null, dir = null;
    const espessura = (lado) => 0.016 + 0.06 * (lado === "e" ? est.s / maxS : (maxS - est.s) / maxS);
    const combina = (c) => est.cor === "T" || (est.cor === "C" ? !(c.identidade || c.cores || []).length : (c.identidade || c.cores || []).includes(est.cor));

    function pilhas() {
      const te = espessura("e"), td = espessura("d");
      pilhaE.scale.z = te; pilhaE.position.set(-PCX, 0, te / 2); pilhaD.scale.z = td; pilhaD.position.set(PCX, 0, td / 2);
      // as páginas que estão assentadas sobem ou descem junto com a pilha de folhas
      if (esq && esq.parent === raiz) esq.position.z = te + 0.003;
      if (dir && dir.parent === raiz) dir.position.z = td + 0.003;
      return [te, td];
    }
    function colocar(g, lado) { g.position.set(lado === "e" ? -PCX : PCX, 0, espessura(lado) + 0.003); g.rotation.set(0, 0, 0); }

    function construirPagina(i) {
      const g = new T.Group(), cartas = [], mats = [];
      g.add(new T.Mesh(geoPapel, matPapel));
      if (i < nPag) {
        for (let k = 0; k < pp; k++) {
          const slot = i * pp + k + 1, col = k % cols, lin = Math.floor(k / cols);
          const x = -PW / 2 + MARG + cellW * (col + 0.5), y = PH / 2 - MARG - cellH * (lin + 0.5);
          const cel = new T.Mesh(geoCelula, matCelula); cel.position.set(x, y, 0.002); g.add(cel);
          const c = oc[slot];
          if (c) {
            const mat = new T.MeshBasicMaterial({ map: texNome(c) }); mats.push(mat);
            const m = new T.Mesh(geoCarta, mat); m.position.set(x, y, 0.006); m.userData = { carta: c, slot, mat }; g.add(m); cartas.push(m);
            mat.color.setScalar(combina(c) ? 1 : 0.18);
            baixar(c.imgPeq || c.img).then((t) => { if (t && X === est.cena && mat.map !== t) { mat.map = t; mat.needsUpdate = true; } });
            if (c.foil) { const b = new T.Mesh(geoCarta, matArco); b.position.set(x, y, 0.0075); g.add(b); const r = new T.Mesh(geoCarta, matReflexo); r.position.set(x, y, 0.0085); g.add(r); }
            const sl = new T.Mesh(geoCelula, matSleeve); sl.position.set(x, y, 0.011); g.add(sl);
          } else { const an = new T.Mesh(geoAnel, matAnel); an.position.set(x, y, 0.004); g.add(an); }
        }
      }
      g.userData = { cartas, mats };
      return g;
    }
    function descartar(g) { if (!g) return; g.parent && g.parent.remove(g); (g.userData.mats || []).forEach((m) => m.dispose()); }

    // folha que vira (a dobradiça fica na lombada)
    const dobradica = new T.Group(); dobradica.visible = false; raiz.add(dobradica);
    function virar(dirV, novoS) {
      if (est.anim) terminarVirada();
      est.s = novoS;
      let frente, verso;
      if (dirV > 0) {
        frente = dir; frente.parent.remove(frente);
        verso = construirPagina(novoS * 2); // novo lado esquerdo, que aparece no verso da folha
        dir = construirPagina(novoS * 2 + 1); colocar(dir, "d"); raiz.add(dir);
      } else {
        verso = esq; verso.parent.remove(verso);
        frente = construirPagina(novoS * 2 + 1); // novo lado direito, no começo coberto pela folha
        esq = construirPagina(novoS * 2); colocar(esq, "e"); raiz.add(esq);
      }
      frente.position.set(PCX, 0, 0); frente.rotation.set(0, 0, 0);
      verso.position.set(PCX, 0, 0); verso.rotation.set(0, Math.PI, 0);
      dobradica.add(frente, verso); dobradica.visible = true; pilhas();
      est.anim = { t0: performance.now(), dur: 720, dir: dirV, frente, verso, de: dirV > 0 ? 0 : -Math.PI, para: dirV > 0 ? -Math.PI : 0 };
      dobradica.rotation.y = est.anim.de;
    }
    function terminarVirada() {
      const an = est.anim; if (!an) return; est.anim = null;
      dobradica.visible = false; dobradica.rotation.y = 0; dobradica.position.z = 0;
      if (an.dir > 0) { descartar(esq); descartar(an.frente); esq = an.verso; colocar(esq, "e"); raiz.add(esq); }
      else { descartar(dir); descartar(an.verso); dir = an.frente; colocar(dir, "d"); raiz.add(dir); }
      pilhas(); ui();
    }
    function irPara(novoFoco) {
      novoFoco = limitar(novoFoco, 0, nPag - 1); if (novoFoco === est.foco) return;
      fecharZoom();
      const novoS = novoFoco >> 1; est.foco = novoFoco;
      if (novoS !== est.s) virar(novoS > est.s ? 1 : -1, novoS);
      enquadrar(); ui();
    }

    // ---------- câmera ----------
    let camX = 0, camD = 6, alvoX = 0, alvoD = 6, aspecto = 1;
    function enquadrar(ja) {
      const livro = est.modo === "livro";
      const dLivro = Math.max((PH / 2 + 0.2) / vh, (PCX + coverW / 2 + 0.08) / (vh * aspecto)) * 1.06;
      const dPag = Math.max((PH / 2 + 0.12) / vh, (PW / 2 + 0.1) / (vh * aspecto)) * 1.05;
      alvoD = livro ? dLivro : dPag; alvoX = livro ? 0 : (est.foco % 2 === 0 ? -PCX : PCX);
      if (ja) { camX = alvoX; camD = alvoD; }
    }
    function medir() {
      const w = palco.clientWidth, h = palco.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h); aspecto = w / h; camera.aspect = aspecto; camera.updateProjectionMatrix(); enquadrar(!X || !est.ok); est.ok = true;
    }

    // ---------- inspeção da carta ----------
    const zoomG = new T.Group(); zoomG.visible = false; camera.add(zoomG);
    const veu = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshBasicMaterial({ color: 0x050302, transparent: true, opacity: 0, depthTest: false, depthWrite: false })); veu.position.z = -2.3; veu.renderOrder = 10; veu.visible = false; camera.add(veu);
    const pivo = new T.Group(); zoomG.add(pivo);
    // "transparent" aqui só serve para entrar na fila de desenho depois do véu escuro (a carta continua opaca)
    const matFrenteZ = new T.MeshBasicMaterial({ map: texVerso, depthTest: false, transparent: true }), matVersoZ = new T.MeshBasicMaterial({ map: texVerso, depthTest: false, transparent: true });
    const geoZ = new T.PlaneGeometry(RAZAO, 1);
    const faceF = new T.Mesh(geoZ, matFrenteZ), faceV = new T.Mesh(geoZ, matVersoZ); faceF.renderOrder = 11; faceV.renderOrder = 11; faceF.position.z = 0.002; faceV.position.z = -0.002; faceV.rotation.y = Math.PI;
    const matArcoZ = new T.MeshBasicMaterial({ map: texArco, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthTest: false, depthWrite: false });
    const matReflexoZ = new T.MeshBasicMaterial({ map: texReflexo, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthTest: false, depthWrite: false });
    const brArco = new T.Mesh(geoZ, matArcoZ), brRef = new T.Mesh(geoZ, matReflexoZ); brArco.renderOrder = 12; brRef.renderOrder = 13; brArco.position.z = 0.004; brRef.position.z = 0.005;
    pivo.add(faceF, faceV, brArco, brRef); liberar.push(geoZ, matFrenteZ, matVersoZ, matArcoZ, matReflexoZ, veu.geometry, veu.material);
    const zst = { prog: 0, alvo: 0, flip: false, foil: false, giraY: 0, giraX: 0 };

    function abrirZoom(m) {
      const c = m.userData.carta; est.zoom = c; zst.alvo = 1; zst.flip = false; zst.foil = !!c.foil; pivo.rotation.set(0, 0, 0);
      matFrenteZ.map = texNome(c); matFrenteZ.needsUpdate = true; matVersoZ.map = texVerso; matVersoZ.needsUpdate = true;
      const pronta = m.userData.mat.map; if (pronta && pronta !== texNomes.get(c.id)) { matFrenteZ.map = pronta; }
      baixar(c.img || c.imgPeq).then((t) => { if (t && est.zoom === c) { matFrenteZ.map = t; matFrenteZ.needsUpdate = true; } });
      if (c.verso) baixar(c.verso).then((t) => { if (t && est.zoom === c) { matVersoZ.map = t; matVersoZ.needsUpdate = true; } });
      zoomG.visible = true; veu.visible = true;
      const v = SV.d.valorInfo(c);
      const z = $("#zoom3d", palco);
      z.innerHTML = `<div class="tomo pad"><div class="fila" style="align-items:flex-start;gap:10px">
          <div style="flex:1;min-width:0"><h3 class="z3-nome">${esc(SV.nomeExibido(c))}</h3>
            <p class="muted z3-sub">${esc(c.setNome || "")} · slot #${m.userData.slot} · ${esc(c.condicao || "NM")}${c.foil ? " · foil" : ""} · <b class="ouro">${v.v ? brl(v.v) : "—"}</b></p></div>
          <button class="ico-bt peq" data-z3="fechar" aria-label="Fechar">${ic("close")}</button></div>
        <div class="fila mt" style="gap:8px"><button class="bt peq" data-z3="virar">${ic("flip")}Virar</button><button class="bt peq" data-z3="foil" aria-pressed="${zst.foil}">${ic("auto_awesome")}Foil</button><a class="bt peq ouro" style="margin-left:auto" href="#carta-${c.id}">${ic("open_in_new")}Ficha</a></div></div>`;
      z.hidden = false; zst.painel = z.offsetHeight;
    }
    function fecharZoom() { if (!est.zoom) return; est.zoom = null; zst.alvo = 0; const z = $("#zoom3d", palco); if (z) z.hidden = true; }

    // ---------- interface (rótulos e botões) ----------
    function ui() {
      const e1 = est.s * 2 + 1, e2 = Math.min(nPag, est.s * 2 + 2);
      $("#p3-titulo", el).textContent = est.modo === "livro" ? (e1 === e2 ? `Página ${e1} de ${nPag}` : `Páginas ${e1}–${e2} de ${nPag}`) : `Página ${est.foco + 1} de ${nPag}`;
      const cheios = (p) => { let n = 0; for (let k = 1; k <= pp; k++) if (oc[p * pp + k]) n++; return n; };
      $("#p3-sub", el).textContent = est.modo === "livro" ? `${cheios(est.s * 2) + (est.s * 2 + 1 < nPag ? cheios(est.s * 2 + 1) : 0)} cartas nestas páginas` : `${cheios(est.foco)} de ${pp} bolsos ocupados`;
      const passo = est.modo === "livro" ? 2 : 1, ant = el.querySelector("[data-z3=ant]"), prox = el.querySelector("[data-z3=prox]");
      ant.disabled = est.modo === "livro" ? est.s <= 0 : est.foco <= 0; prox.disabled = est.modo === "livro" ? est.s * 2 + 2 >= nPag : est.foco >= nPag - 1;
      palco.dataset.modo = est.modo;
      el.querySelectorAll("[data-z3=modo]").forEach((b) => b.classList.toggle("on", b.dataset.v === est.modo));
      el.querySelectorAll("[data-z3=cor]").forEach((b) => b.classList.toggle("on", b.dataset.v === est.cor));
      est.passo = passo;
    }
    el.onclick = (e) => {
      const b = e.target.closest("[data-z3]"); if (!b) return;
      const z = b.dataset.z3;
      if (z === "ant") irPara(est.modo === "livro" ? (est.s - 1) * 2 : est.foco - 1);
      else if (z === "prox") irPara(est.modo === "livro" ? (est.s + 1) * 2 : est.foco + 1);
      else if (z === "modo") { est.modo = b.dataset.v; if (est.modo === "livro") est.foco = est.s * 2; fecharZoom(); enquadrar(); ui(); }
      else if (z === "cor") { est.cor = b.dataset.v; [esq, dir].forEach((g) => g && g.userData.cartas.forEach((m) => m.userData.mat.color.setScalar(combina(m.userData.carta) ? 1 : 0.18))); ui(); }
      else if (z === "fechar") fecharZoom();
      else if (z === "virar") zst.flip = !zst.flip;
      else if (z === "foil") { zst.foil = !zst.foil; b.setAttribute("aria-pressed", zst.foil); }
    };
    const teclas = (e) => {
      if (e.key === "Escape") fecharZoom();
      else if (e.key === "ArrowRight") el.querySelector("[data-z3=prox]").click();
      else if (e.key === "ArrowLeft") el.querySelector("[data-z3=ant]").click();
    };
    document.addEventListener("keydown", teclas);

    // ---------- toque e arrasto ----------
    let rotY = 0, rotX = 0.3, balanco = 1, arr = null;
    canvas.addEventListener("pointerdown", (e) => { canvas.setPointerCapture(e.pointerId); arr = { x: e.clientX, y: e.clientY, d: 0 }; });
    canvas.addEventListener("pointermove", (e) => {
      if (!arr) return; const dx = e.clientX - arr.x, dy = e.clientY - arr.y; arr.x = e.clientX; arr.y = e.clientY; arr.d += Math.abs(dx) + Math.abs(dy);
      if (est.zoom) { zst.giraY += dx * 0.011; zst.giraX = limitar(zst.giraX + dy * 0.01, -0.7, 0.7); }
      else { rotY = limitar(rotY + dx * 0.006, -0.85, 0.85); rotX = limitar(rotX - dy * 0.005, 0.02, 0.8); }
    });
    canvas.addEventListener("pointerup", (e) => {
      const foiToque = arr && arr.d < 8; arr = null; if (!foiToque) return;
      if (est.zoom) { fecharZoom(); return; }
      if (est.anim) return;
      const r = canvas.getBoundingClientRect();
      const rc = new T.Raycaster(); rc.setFromCamera(new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const alvos = [...(esq ? esq.userData.cartas : []), ...(dir ? dir.userData.cartas : [])];
      const hit = rc.intersectObjects(alvos, false)[0]; if (hit) abrirZoom(hit.object);
    });
    canvas.addEventListener("pointercancel", () => { arr = null; });

    // ---------- laço de animação ----------
    let ultimo = performance.now();
    function quadro(agora) {
      X.raf = requestAnimationFrame(quadro);
      if (document.hidden) return;
      const t = agora / 1000; ultimo = agora;
      camX += (alvoX - camX) * 0.12; camD += (alvoD - camD) * 0.12;
      camera.position.set(camX, 0, camD); camera.lookAt(camX, 0, 0);
      balanco += ((arr || est.zoom ? 0 : 1) - balanco) * 0.05;
      raiz.rotation.set(-(rotX + Math.sin(t * 0.8) * 0.014 * balanco), rotY + Math.sin(t * 0.6) * 0.05 * balanco, 0); // topo do fichário inclinado para trás
      raiz.position.y = Math.sin(t * 1.1) * 0.015 * balanco;

      if (est.anim) {
        const an = est.anim, p = est.fixo != null ? est.fixo : limitar((agora - an.t0) / an.dur, 0, 1); // "fixo" só serve para os testes
        dobradica.rotation.y = an.de + (an.para - an.de) * suave(p);
        dobradica.position.z = Math.max(...pilhas()) + 0.02 + Math.sin(p * Math.PI) * 0.09;
        if (p >= 1) terminarVirada();
      }
      // brilho foil da prateleira
      texArco.offset.set(t * 0.12 % 1, t * 0.07 % 1); matArco.opacity = 0.14 + Math.sin(t * 2.2) * 0.07;
      texReflexo.offset.x = Math.sin(t * 1.4) * 0.9; luzFoil.position.x = Math.sin(t * 0.9) * 2.2;

      // inspeção: aproxima a carta da câmera, escurece o fundo e acompanha a inclinação
      zst.prog += (zst.alvo - zst.prog) * 0.15;
      if (zst.prog < 0.005 && !zst.alvo) { zoomG.visible = false; veu.visible = false; zst.prog = 0; }
      if (zoomG.visible) {
        // a carta ocupa a área livre acima do painel de informações
        const zd = 2.4, visH = 2 * zd * vh, visW = visH * aspecto, ph = palco.clientHeight || 1;
        const livre = Math.max(120, ph - (zst.painel || 160) - 22);
        const H = Math.min(((livre * 0.97) / ph) * visH, (visW * 0.9) / RAZAO) * (0.55 + 0.45 * zst.prog);
        zoomG.position.set(0, ((ph / 2 - (11 + livre / 2)) / ph) * visH, -zd); zoomG.scale.setScalar(H);
        veu.material.opacity = 0.78 * zst.prog;
        if (!arr) {
          const base = zst.flip ? Math.PI : 0, alvoY = base + Math.round((pivo.rotation.y - base) / (2 * Math.PI)) * 2 * Math.PI;
          pivo.rotation.y += (alvoY + 0 - pivo.rotation.y) * 0.14; pivo.rotation.x += (0 - pivo.rotation.x) * 0.14; zst.giraY = 0; zst.giraX = 0;
        } else { pivo.rotation.y += zst.giraY; pivo.rotation.x = zst.giraX; zst.giraY = 0; }
        const fr = Math.cos(pivo.rotation.y) > 0;
        brArco.visible = brRef.visible = zst.foil && fr;
        texReflexo.offset.x = Math.sin(t * 1.6 + pivo.rotation.y * 2) * 0.9;
        matArcoZ.opacity = 0.18 + Math.abs(Math.sin(t * 1.8 + pivo.rotation.y)) * 0.2;
      }
      renderer.render(scene, camera);
    }

    // ---------- monta tudo ----------
    const ro = new ResizeObserver(medir);
    X = est.cena = {
      raf: 0, ro, teclas,
      descartar() {
        liberar.forEach((o) => o && o.dispose && o.dispose());
        cacheTex.forEach((p) => p.then((t) => t && t.dispose()));
        [esq, dir].forEach(descartar); renderer.dispose(); try { renderer.forceContextLoss(); } catch {} canvas.remove();
      },
    };
    esq = construirPagina(0); dir = construirPagina(1); colocar(esq, "e"); colocar(dir, "d"); raiz.add(esq, dir); pilhas();
    medir(); enquadrar(true); ui(); ro.observe(palco);
    X.raf = requestAnimationFrame(quadro);
    // ganchos usados pelos testes automáticos: posição (em pixels da tela) do centro de uma carta visível
    SV.album3d = {
      est,
      projetar(i) {
        const m = [...esq.userData.cartas, ...dir.userData.cartas][i]; if (!m) return null;
        const v = new T.Vector3(); m.getWorldPosition(v); v.project(camera); const r = canvas.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  }
})();
