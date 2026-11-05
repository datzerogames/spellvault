// SpellVault — scanner: câmera (ou foto) → leitura do nome da carta (Tesseract.js, no próprio aparelho)
// → identificação no Scryfall, com tradução PT/EN, preço e destino no álbum.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, esc, ic, brl, mana, toast } = SV;
  const TESSERACT = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  let fluxo = null, leitor = null, carregandoLeitor = null, atual = null, lote = [], destino = "", foil = false, ocupado = false;

  function carregarLeitor(status) {
    if (leitor) return Promise.resolve(leitor);
    if (carregandoLeitor) return carregandoLeitor;
    carregandoLeitor = new Promise((ok, erro) => {
      status("Preparando o leitor de runas (só na primeira vez)…");
      const s = document.createElement("script"); s.src = TESSERACT; s.async = true;
      s.onload = async () => { try { leitor = await Tesseract.createWorker("eng+por"); ok(leitor); } catch (e) { erro(e); } };
      s.onerror = () => erro(new Error("Não consegui baixar o leitor. Verifique a internet."));
      document.head.appendChild(s);
    }).catch((e) => { carregandoLeitor = null; throw e; });
    return carregandoLeitor;
  }

  // recorta a faixa do nome: da moldura (câmera) ou do terço de cima (foto enviada)
  function recortar(fonte, larg, alt, visor, daCamera) {
    let x, y, w, h;
    if (daCamera) {
      const vw = visor.clientWidth, vh = visor.clientHeight, esc2 = Math.max(vw / larg, vh / alt);
      const ox = (larg * esc2 - vw) / 2, oy = (alt * esc2 - vh) / 2;
      const mw = vw * 0.62, mh = mw * (88 / 63), mx = (vw - mw) / 2, my = (vh - mh) / 2;
      x = (mx + mw * 0.03 + ox) / esc2; y = (my + mh * 0.02 + oy) / esc2; w = (mw * 0.8) / esc2; h = (mh * 0.13) / esc2;
    } else { x = 0; y = 0; w = larg; h = alt * 0.3; }
    const k = Math.min(3, 1600 / w), cv = document.createElement("canvas");
    cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const g = cv.getContext("2d"); g.filter = "grayscale(1) contrast(1.6) brightness(1.08)";
    g.drawImage(fonte, x, y, w, h, 0, 0, cv.width, cv.height);
    return cv;
  }

  async function ler(el, fonte, larg, alt, daCamera) {
    if (ocupado) return; ocupado = true;
    const st = (t) => { const s = $("#scan-status", el); if (s) s.innerHTML = t; };
    $("#obt", el).classList.add("ocupado");
    try {
      const w = await carregarLeitor(st);
      st(`<span class="carregando"></span> Lendo o nome da carta…`);
      const { data } = await w.recognize(recortar(fonte, larg, alt, $(".visor", el), daCamera));
      const linhas = (data.lines && data.lines.length ? data.lines.map((l) => [l.text, l.confidence]) : data.text.split("\n").map((t) => [t, 50]))
        .map(([t, conf]) => [t.replace(/[|_~^*"“”«»]/g, " ").replace(/\s+/g, " ").trim(), conf])
        .filter(([t]) => (t.match(/\p{L}/gu) || []).length >= 3)
        .sort((a, b) => b[1] - a[1]).slice(0, 3);
      st(`<span class="carregando"></span> Consultando o oráculo do Scryfall…`);
      let achou = null, lido = linhas[0] ? linhas[0][0] : "";
      for (const [t] of linhas) { achou = await SV.sf.identificar(t).catch(() => null); if (achou) { lido = t; break; } }
      if (achou) { mostrar(el, achou, linhas.length ? linhas[0][1] : 0); lote.unshift({ c: achou, id: null }); desenharLote(el); st(`${ic("auto_awesome")} Reconhecida: “${esc(lido)}”`); }
      else { st(`${ic("help")} Não reconheci a carta.`); manual(el, lido); }
    } catch (e) { st(`${ic("error")} ${esc(e.message || "Falha na leitura.")}`); }
    finally { ocupado = false; const o = $("#obt", el); o && o.classList.remove("ocupado"); }
  }

  function manual(el, texto = "") {
    $("#resultado", el).innerHTML = `<form class="busca" id="f-manual">${ic("edit")}<input id="q-manual" value="${esc(texto)}" placeholder="Digite o nome (PT ou EN)" autocomplete="off"/><button class="bt peq ouro">Buscar</button></form>
      <p class="dim mt" style="font-size:14.5px">Dica: com boa luz e a carta preenchendo a moldura, a leitura acerta muito mais.</p>`;
    $("#q-manual", el).focus();
  }

  async function mostrar(el, c, conf) {
    atual = c;
    const cfg = SV.d.config(), copias = SV.d.copias(c.nome);
    if (destino === "") destino = cfg.albumPadrao || "";
    const albuns = SV.d.albuns(), a = SV.d.album(destino);
    $("#resultado", el).innerHTML = `<section class="tomo cantos resultado">
        <img src="${esc(c.img)}" alt="${esc(c.nome)}"/>
        <div style="min-width:0">
          <div class="fila"><span class="raridade ${esc(c.raridade)}">${esc(SV.nomeRaridade[c.raridade] || "")}</span>${conf ? `<span class="etiqueta">${Math.round(conf)}% de leitura</span>` : ""}<span class="espaco"></span>${mana(c.custo)}</div>
          <h3 id="nome-r">${esc(c.pt ? c.pt.nome : c.nome)}</h3><p class="dim" id="en-r" style="font-style:italic">${c.pt ? esc(c.nome) : ""}</p>
          <p style="font-size:15px;margin-top:6px">${esc(c.tipo)}</p>
          <p class="ouro" style="font:700 22px var(--ft);margin-top:6px">${SV.d.valorInfo(c).v ? brl(SV.d.valorInfo(c).v) : "Sem preço"}${SV.d.valorInfo(c).fonte === "liga" ? ' <i class="liga-tag">Liga</i>' : ""}</p>
          <p class="dim" style="font-size:13.5px">${esc(c.setNome)} · ${esc(c.set.toUpperCase())} #${esc(c.num)}</p>
        </div>
      </section>
      <div class="texto-regras mt" id="texto-r">${esc(c.pt && c.pt.texto ? c.pt.texto : c.texto)}</div>
      <section class="tomo pad mt"><p class="rot">${ic("layers")}No cofre</p><p class="mt">${copias.length ? `Você já possui ${copias.length} cópia(s) (${copias.filter((x) => x.foil).length} foil).` : "Primeira cópia desta carta."}</p>
        <p class="rot mt">Destino físico</p>
        <div class="chips mt">${albuns.map((x) => `<button class="chip ${x.id === destino ? "on" : ""}" data-dest="${x.id}">${ic(SV.d.TIPOS[x.tipo].icone)}${esc(x.nome)}</button>`).join("")}<button class="chip ${!a ? "on" : ""}" data-dest="-">${ic("inventory")}Só coleção</button></div>
        ${c.foilPossivel ? `<label class="check mt"><input type="checkbox" id="foil-s" ${foil ? "checked" : ""}/>Esta cópia é foil</label>` : ""}
      </section>
      <button class="bt ouro cheio mt quebra" data-s="add">${ic("bookmark_add")}<span>Adicionar à coleção${a ? `<small>${esc(a.nome)} · slot ${SV.d.proximoLivre(a.id) || "—"}</small>` : ""}</span></button>
      <div class="dupla mt"><a class="bt" href="#ver-${esc(c.sf)}">${ic("menu_book")}Ficha completa</a><a class="bt" href="${esc(SV.liga.urlCarta(c.nome))}" target="_blank" rel="noopener">${ic("storefront")}Ver na Liga</a></div>
      <div class="dupla mt"><button class="bt" data-s="mais">${ic("tune")}Mais opções</button><a class="bt fantasma" href="${esc(c.uri)}" target="_blank" rel="noopener">${ic("open_in_new")}Scryfall</a></div>`;
    if (!c.pt && cfg.idioma === "pt") {
      const pt = await SV.sf.emPortugues(c.set, c.num) || (await SV.sf.buscar(`!"${c.nome}" lang:pt`, "&include_multilingual=true").catch(() => []))[0]?.pt;
      if (pt && atual === c) { c.pt = pt; $("#nome-r", el).textContent = pt.nome; $("#en-r", el).textContent = c.nome; if (pt.texto) $("#texto-r", el).textContent = pt.texto; desenharLote(el); }
    }
  }

  function desenharLote(el) {
    const l = $("#lote", el); if (!l) return;
    $("#n-lote", el).textContent = lote.length;
    l.innerHTML = lote.length ? lote.map((x, i) => `<li><img src="${esc(x.c.imgPeq)}" alt=""/><span style="flex:1;min-width:0"><b style="font:600 15px var(--fc)">${esc(x.c.pt ? x.c.pt.nome : x.c.nome)}</b><br/><small class="dim">${esc(x.c.setNome)}</small></span>${x.id ? `<a class="etiqueta ouro" href="#carta-${x.id}">No cofre</a>` : `<button class="bt peq" data-lote="${i}">${ic("add")}</button>`}</li>`).join("") : `<li class="dim" style="font-style:italic">As cartas lidas nesta sessão aparecem aqui.</li>`;
  }

  function adicionar(el, c, i) {
    const a = SV.d.album(destino);
    if (a && !SV.d.proximoLivre(a.id)) { toast("Esse álbum está cheio.", "warning"); return; }
    const nova = SV.d.adicionar(c, { album: a ? a.id : "", foil: !!(($("#foil-s", el) || {}).checked) });
    const item = i != null ? lote[i] : lote.find((x) => x.c === c && !x.id); if (item) item.id = nova.id;
    desenharLote(el);
    toast(a ? `Guardada: ${a.nome}, slot ${nova.slot}` : "Adicionada à coleção", "bookmark_added");
    if (atual === c) mostrar(el, c);
  }

  async function ligarCamera(el) {
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
      const v = $("#video", el); v.srcObject = fluxo; await v.play();
      $("#inicio", el).hidden = true; $("#foto", el).hidden = true; v.hidden = false;
      $("#hud-estado", el).innerHTML = `<span class="vivo">●</span> Câmera ativa`;
      const trilha = fluxo.getVideoTracks()[0], cap = trilha.getCapabilities ? trilha.getCapabilities() : {};
      $("#flash", el).hidden = !cap.torch;
    } catch (e) {
      toast("Não consegui abrir a câmera. Use “Enviar foto”.", "no_photography");
      $("#scan-status", el).innerHTML = `${ic("no_photography")} Câmera indisponível: envie uma foto ou digite o nome.`;
    }
  }
  function desligarCamera() { if (fluxo) fluxo.getTracks().forEach((t) => t.stop()); fluxo = null; }

  SV.telas = SV.telas || {};
  SV.telas.scanner = {
    montar(el) {
      // pedido vindo de um álbum ("Escanear p/ slot #21"): usa esse álbum como destino
      const pedido = SV.destinoScanner; SV.destinoScanner = null;
      atual = null; destino = pedido ? pedido.album : ""; foil = false;
      el.innerHTML = `<div class="pagina">
        <header class="topo"><span class="selo">${ic("center_focus_strong")}</span><div class="marca"><b>SpellVault</b><small>Scanner · olho arcano</small></div>
          <div class="acoes"><button class="ico-bt" id="flash" data-s="flash" hidden aria-label="Lanterna">${ic("flashlight_on")}</button><button class="ico-bt" data-s="manual" aria-label="Digitar nome">${ic("keyboard")}</button></div></header>
        <div class="visor" data-s="visor">
          <video id="video" playsinline muted hidden></video><img id="foto" class="foto" alt="Foto enviada" hidden/>
          <div class="moldura"><i></i><i></i><i></i><i></i><span class="faixa-nome"></span><span class="linha-scan"></span></div>
          <div class="hud"><span id="hud-estado">${ic("visibility")} Pronto</span><span>${ic("photo_library")} Lote: <b id="n-lote">0</b></span></div>
          <div class="inicio" id="inicio">${ic("center_focus_strong", "grande")}<p style="font:600 18px var(--ft);color:var(--ouro2)">Aponte o olho arcano para a carta</p><p class="muted" style="max-width:300px">O nome é lido aqui no aparelho e a carta é identificada no Scryfall, em português ou inglês.</p><button class="bt ouro" data-s="camera">${ic("photo_camera")}Abrir a câmera</button></div>
          <p class="aviso">Encaixe a carta na moldura, com o nome na faixa roxa</p>
        </div>
        <p class="dim mt" id="scan-status" style="text-align:center;font-size:15px;min-height:22px"></p>
        <div class="scan-acoes"><label class="bt" style="cursor:pointer">${ic("upload")}Enviar foto<input type="file" accept="image/*" capture="environment" id="arquivo" hidden/></label>
          <button class="obturador" id="obt" data-s="capturar" aria-label="Ler a carta">${ic("auto_awesome")}</button>
          <button class="bt" data-s="manual">${ic("keyboard")}Digitar</button></div>
        <div id="resultado"></div>
        <h2 class="rubrica"><span>Lote desta sessão</span></h2>
        <ul class="lote tomo pad" id="lote"></ul>
      </div>`;
      desenharLote(el);
      if (pedido) { const a = SV.d.album(pedido.album); if (a) $("#scan-status", el).textContent = `Destino: ${a.nome}, próximo slot livre #${SV.d.proximoLivre(a.id)}.`; }
      $("#arquivo", el).addEventListener("change", (e) => {
        const arq = e.target.files[0]; if (!arq) return;
        const img = $("#foto", el); img.onload = () => { $("#inicio", el).hidden = true; img.hidden = false; $("#video", el).hidden = true; desligarCamera(); ler(el, img, img.naturalWidth, img.naturalHeight, false); };
        img.src = URL.createObjectURL(arq); e.target.value = "";
      });
      el.onclick = (e) => {
        const b = e.target.closest("[data-s],[data-dest],[data-lote]"); if (!b) return;
        if (b.dataset.dest) { destino = b.dataset.dest === "-" ? "-" : b.dataset.dest; if (atual) mostrar(el, atual); return; }
        if (b.dataset.lote) return adicionar(el, lote[+b.dataset.lote].c, +b.dataset.lote);
        const s = b.dataset.s;
        if (s === "camera") ligarCamera(el);
        else if (s === "capturar" || s === "visor") {
          const v = $("#video", el), img = $("#foto", el);
          if (fluxo && !v.hidden) ler(el, v, v.videoWidth, v.videoHeight, true);
          else if (!img.hidden && img.naturalWidth) ler(el, img, img.naturalWidth, img.naturalHeight, false);
          else if (s === "capturar") ligarCamera(el);
        }
        else if (s === "manual") manual(el);
        else if (s === "add" && atual) adicionar(el, atual);
        else if (s === "mais" && atual) SV.folhaDestino(atual, { album: SV.d.album(destino) ? destino : "", foil: !!(($("#foil-s", el) || {}).checked), aoAdicionar: (c) => { const it = lote.find((x) => x.c === atual && !x.id); if (it) it.id = c.id; desenharLote(el); } });
        else if (s === "flash" && fluxo) { const t = fluxo.getVideoTracks()[0]; b.classList.toggle("on"); t.applyConstraints({ advanced: [{ torch: b.classList.contains("on") }] }).catch(() => {}); }
      };
      el.onsubmit = async (e) => {
        if (e.target.id !== "f-manual") return; e.preventDefault();
        const q = $("#q-manual", el).value.trim(); if (!q) return;
        $("#scan-status", el).innerHTML = `<span class="carregando"></span> Consultando o oráculo…`;
        const c = await SV.sf.identificar(q).catch(() => null);
        if (c) { lote.unshift({ c, id: null }); desenharLote(el); $("#scan-status", el).textContent = ""; mostrar(el, c); } else $("#scan-status", el).innerHTML = `${ic("help")} Nenhuma carta com o nome “${esc(q)}”.`;
      };
    },
    desmontar(el) { desligarCamera(); el.onclick = null; el.onsubmit = null; },
  };
})();
