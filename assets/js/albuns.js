// SpellVault — álbuns físicos: estante de fichários, páginas com os slots e caixas numeradas.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, toast, folha, fecharFolha, confirmar } = SV;
  const paginaAtual = {};

  function livro(a) {
    const cap = SV.d.capacidade(a), oc = Object.keys(SV.d.ocupacao(a.id)).length, pct = Math.round((oc / cap) * 100);
    return `<a class="livro ${SV.d.config().albumPadrao === a.id ? "ativo" : ""}" href="#album-${a.id}" style="--capa:${esc(a.capa || "#3a2617")}">
      ${ic(SV.d.TIPOS[a.tipo].icone)}<b>${esc(a.nome)}</b><small>${esc(SV.d.TIPOS[a.tipo].nome)} · ${oc}/${cap}</small>
      <div class="barra"><i style="width:${pct}%"></i></div></a>`;
  }

  SV.telas = SV.telas || {};
  SV.telas.albuns = {
    montar(el) {
      const l = SV.d.albuns();
      const total = l.reduce((s, a) => s + SV.d.capacidade(a), 0), usados = l.reduce((s, a) => s + Object.keys(SV.d.ocupacao(a.id)).length, 0);
      const semLugar = SV.d.cartas().filter((c) => !c.album).length;
      el.innerHTML = `<div class="pagina">
        <header class="topo"><span class="selo">${ic("collections_bookmark")}</span><div class="marca"><b>SpellVault</b><small>Álbuns · a estante</small></div>
          <div class="acoes"><button class="ico-bt" data-a="novo" aria-label="Novo álbum">${ic("library_add")}</button></div></header>
        <div class="resumo"><div class="tomo"><b class="num">${l.length}</b><span>álbuns</span></div><div class="tomo"><b class="num">${usados}</b><span>slots usados</span></div><div class="tomo"><b class="num">${total - usados}</b><span>slots livres</span></div></div>
        <h2 class="rubrica"><span>Estrutura de armazenamento</span></h2>
        <div class="estante">${l.map(livro).join("")}<button class="livro" data-a="novo" style="--capa:#1a140f;border-style:dashed">${ic("add_box")}<b>Novo físico</b><small>Álbum, pasta, deck box ou gaveteiro</small></button></div>
        ${semLugar ? `<p class="tomo pad mt2" style="display:flex;gap:12px;align-items:center">${ic("inventory")}<span style="flex:1">${semLugar} carta(s) da coleção ainda sem lugar físico.</span><a class="bt peq" href="#colecao">Ver</a></p>` : ""}
      </div>`;
      el.onclick = (e) => { if (e.target.closest("[data-a=novo]")) folhaAlbum(null, (a) => (location.hash = "#album-" + a.id)); };
    },
    desmontar(el) { el.onclick = null; },
  };

  SV.telas.album = {
    montar(el, id) {
      const a = SV.d.album(id);
      if (!a) { el.innerHTML = `<div class="pagina"><div class="vazio">${ic("help")}Álbum não encontrado.<br/><a class="bt mt" href="#albuns">Voltar à estante</a></div></div>`; return; }
      const caixa = SV.d.ehCaixa(a), cap = SV.d.capacidade(a), oc = SV.d.ocupacao(a.id), usados = Object.keys(oc).length, pct = Math.round((usados / cap) * 100);
      const pp = SV.d.porPagina(a), nPag = caixa ? 1 : a.paginas;
      let pag = Math.min(nPag, paginaAtual[id] || 1);
      const prox = SV.d.proximoLivre(a.id);
      const t = SV.d.TIPOS[a.tipo];
      el.innerHTML = `<div class="pagina">
        <header class="topo"><a class="ico-bt" href="#albuns" aria-label="Voltar">${ic("arrow_back")}</a><div class="marca"><b style="font-size:19px">${esc(a.nome)}</b><small>${esc(t.nome)}</small></div>
          <div class="acoes"><button class="ico-bt" data-a="editar" aria-label="Editar álbum">${ic("edit")}</button></div></header>
        <section class="tomo cantos pad">
          <p class="rot">${ic("folder_special")}Fichário arcano${SV.d.config().albumPadrao === a.id ? " · padrão" : ""}</p>
          <h2 style="font:600 24px var(--fc);margin-top:6px">${esc(a.nome)}${a.nota ? ` · <span class="muted">${esc(a.nota)}</span>` : ""}</h2>
          <p class="muted">${esc(a.sleeve || "")}</p>
          <div class="fila mt"><span class="rot">${usados}/${cap} slots ocupados</span><span class="espaco"></span><span class="rot ouro">${pct}% cheio</span></div>
          <div class="barra"><i style="width:${pct}%"></i></div>
        </section>
        ${caixa ? `<ul class="lista-caixa tomo pad mt">${Object.keys(oc).map(Number).sort((x, y) => x - y).map((s) => { const c = oc[s]; return `<li><span class="pos">#${s}</span>${c.imgPeq ? `<img src="${esc(c.imgPeq)}" alt=""/>` : ""}<a href="#carta-${c.id}" style="flex:1;min-width:0"><b style="font:600 16px var(--fc)">${esc(SV.nomeExibido(c))}</b><br/><small class="dim">${esc(c.setNome)} · ${esc(c.condicao)}${c.foil ? " · Foil" : ""}</small></a></li>`; }).join("") || `<li class="dim">Caixa vazia.</li>`}</ul>`
        : `<div class="paginador"><button class="ico-bt" data-a="ant" aria-label="Página anterior" ${pag <= 1 ? "disabled" : ""}>${ic("chevron_left")}</button>
            <div class="info"><b>${ic("layers")} Página ${pag} de ${nPag}</b><small>Slots #${(pag - 1) * pp + 1} — #${pag * pp}</small></div>
            <button class="ico-bt" data-a="prox" aria-label="Próxima página" ${pag >= nPag ? "disabled" : ""}>${ic("chevron_right")}</button></div>
          <div class="folha-album" style="grid-template-columns:repeat(${t.cols},minmax(0,1fr))">${Array.from({ length: pp }, (_, i) => { const s = (pag - 1) * pp + i + 1, c = oc[s]; return c ? `<a class="slot cheio" href="#carta-${c.id}"><span class="n">#${s}</span>${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.nome)}" loading="lazy"/>` : ""}${c.foil ? `<span class="selo-foil">Foil</span><span class="foil-brilho"></span>` : ""}<span class="legenda">${esc(SV.nomeExibido(c))}<small>${esc(SV.nomeRaridade[c.raridade] || "")} · ${esc(c.condicao)}</small></span></a>` : `<button class="slot" data-slot="${s}" aria-label="Slot ${s} vazio, adicionar carta"><span class="n">#${s}</span><span class="vazio-slot">${ic("add_circle")}Vazio</span></button>`; }).join("")}</div>
          <div class="chips mt" aria-label="Ir para página">${Array.from({ length: nPag }, (_, i) => { const ini = i * pp + 1, cheios = Array.from({ length: pp }, (_, k) => oc[ini + k]).filter(Boolean).length; return `<button class="chip ${i + 1 === pag ? "on" : ""}" data-pag="${i + 1}">${i + 1}<span class="n">${cheios}/${pp}</span></button>`; }).join("")}</div>`}
        <div class="fila mt2"><a class="bt ouro" style="flex:1" href="#scanner" data-a="escanear" ${prox ? "" : "aria-disabled=true"}>${ic("document_scanner")}${prox ? `Escanear p/ slot #${prox}` : "Álbum cheio"}</a><button class="ico-bt" data-a="adicionar" aria-label="Adicionar carta pelo nome" style="width:52px;height:52px">${ic("add")}</button></div>
      </div>`;
      el.onclick = async (e) => {
        const b = e.target.closest("[data-a],[data-slot],[data-pag]"); if (!b) return;
        if (b.dataset.slot) return SV.abrirAdicionar({ album: a.id, slot: +b.dataset.slot, aoAdicionar: () => SV.telas.album.montar(el, id) });
        if (b.dataset.pag) { paginaAtual[id] = +b.dataset.pag; return SV.telas.album.montar(el, id); }
        const acao = b.dataset.a;
        if (acao === "ant" || acao === "prox") { paginaAtual[id] = pag + (acao === "prox" ? 1 : -1); SV.telas.album.montar(el, id); }
        else if (acao === "adicionar") SV.abrirAdicionar({ album: a.id, slot: prox, aoAdicionar: () => SV.telas.album.montar(el, id) });
        else if (acao === "escanear") { SV.destinoScanner = { album: a.id }; }
        else if (acao === "editar") folhaAlbum(a, () => SV.telas.album.montar(el, id));
      };
    },
    desmontar(el) { el.onclick = null; },
  };

  function folhaAlbum(a, depois) {
    const novo = !a;
    a = a || { id: SV.d.uid(), nome: "", nota: "", tipo: "2x2", paginas: 25, capacidade: 100, sleeve: "", capa: SV.d.CORES_CAPA[0] };
    let tipo = a.tipo, capa = a.capa;
    const f = folha(`<h2>${novo ? "Novo álbum físico" : "Editar álbum"}</h2><p class="muted">Registre como suas cartas ficam guardadas de verdade.</p>
      <form class="form mt" id="f-alb">
        <div class="campo"><label for="nome-a">Nome</label><input id="nome-a" required value="${esc(a.nome)}" placeholder="Ex.: Álbum 2x2 Verde"/></div>
        <div class="campo"><label>Tipo</label><div class="tipos-album">${Object.entries(SV.d.TIPOS).map(([k, t]) => `<button type="button" data-tipo="${k}" class="${k === tipo ? "on" : ""}">${ic(t.icone)}${t.nome}</button>`).join("")}</div></div>
        <div class="dupla"><div class="campo" id="campo-pag"><label for="pag-a">Páginas</label><input id="pag-a" type="number" min="1" max="200" value="${a.paginas || 25}"/></div><div class="campo" id="campo-cap"><label for="cap-a">Capacidade</label><input id="cap-a" type="number" min="1" max="5000" value="${a.capacidade || 100}"/></div></div>
        <div class="campo"><label for="nota-a">Para que serve</label><input id="nota-a" value="${esc(a.nota || "")}" placeholder="Ex.: raras e comandantes"/></div>
        <div class="campo"><label for="sleeve-a">Proteção (sleeve)</label><input id="sleeve-a" value="${esc(a.sleeve || "")}" placeholder="Ex.: Dragon Shield Matte"/></div>
        <div class="campo"><label>Cor da capa</label><div class="cores-album">${SV.d.CORES_CAPA.map((c) => `<button type="button" data-capa="${c}" style="background:${c}" class="${c === capa ? "on" : ""}" aria-label="Capa ${c}"></button>`).join("")}</div></div>
        <label class="check"><input type="checkbox" id="padrao-a" ${SV.d.config().albumPadrao === a.id ? "checked" : ""}/>Usar como destino padrão do scanner</label>
        <button class="bt ouro cheio">${ic("save")}${novo ? "Criar álbum" : "Salvar"}</button>
        ${novo ? "" : `<button type="button" class="bt sangue cheio" data-x="remover">${ic("delete")}Remover álbum</button>`}
      </form>`);
    const mostra = () => { const cx = !SV.d.TIPOS[tipo].rows; $("#campo-pag", f).hidden = cx; $("#campo-cap", f).hidden = !cx; };
    mostra();
    f.addEventListener("click", async (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.tipo) { tipo = b.dataset.tipo; $$("[data-tipo]", f).forEach((x) => x.classList.toggle("on", x === b)); mostra(); }
      if (b.dataset.capa) { capa = b.dataset.capa; $$("[data-capa]", f).forEach((x) => x.classList.toggle("on", x === b)); }
      if (b.dataset.x === "remover") {
        const n = Object.keys(SV.d.ocupacao(a.id)).length;
        if (await confirmar("Remover este álbum?", n ? `As ${n} cartas continuam na coleção, mas ficam sem lugar físico.` : "O álbum está vazio.", "Remover")) { SV.d.removerAlbum(a.id); toast("Álbum removido", "delete"); location.hash = "#albuns"; }
      }
    });
    $("#f-alb", f).addEventListener("submit", (e) => {
      e.preventDefault();
      const novoA = Object.assign({}, a, { nome: $("#nome-a", f).value.trim(), tipo, capa, nota: $("#nota-a", f).value.trim(), sleeve: $("#sleeve-a", f).value.trim(), paginas: Math.max(1, +$("#pag-a", f).value || 1), capacidade: Math.max(1, +$("#cap-a", f).value || 1) });
      const maiorSlot = Math.max(0, ...Object.keys(SV.d.ocupacao(a.id)).map(Number));
      if (!novo && SV.d.capacidade(novoA) < maiorSlot) { toast(`Há carta no slot ${maiorSlot}: o álbum não pode ficar menor que isso.`, "warning"); return; }
      SV.d.salvarAlbum(novoA);
      if ($("#padrao-a", f).checked) SV.d.salvarConfig({ albumPadrao: novoA.id });
      toast(novo ? "Álbum criado" : "Álbum salvo", "collections_bookmark"); fecharFolha(); depois && depois(novoA);
    });
  }
})();
