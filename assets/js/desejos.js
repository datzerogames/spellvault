// SpellVault — lista de desejos ("compra por lista"): as cartas que o jogador quer comprar, com a lista pronta
// para colar na Compra por Lista da LigaMagic. Fica salva só neste aparelho.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, brl, num2, toast, confirmar } = SV;

  SV.desejoDe = (nome) => SV.d.desejos().find((x) => x.nome === nome) || null;
  SV.desejar = (b) => {
    const l = SV.d.desejos();
    let x = l.find((i) => i.nome === b.nome);
    if (x) x.qtd += 1;
    else { x = Object.assign({ id: SV.d.uid(), qtd: 1, em: Date.now() }, SV.sf.compacto(b)); l.push(x); }
    SV.d.salvarDesejos(l);
    return x;
  };

  SV.desejos = {
    // desenha a lista dentro de "el"; "aoMudar" avisa a tela de fora para atualizar os contadores
    montar(el, aoMudar) {
      const l = SV.d.desejos().slice().sort((a, b) => b.em - a.em);
      const qtd = l.reduce((s, x) => s + x.qtd, 0), total = l.reduce((s, x) => s + SV.d.valor(x) * x.qtd, 0);
      el.innerHTML = l.length ? `
        <div class="resumo"><div class="tomo"><b class="num">${qtd}</b><span>cartas</span></div><div class="tomo"><b class="num">${num2(total)}</b><span>R$ estimado</span></div><div class="tomo"><b class="num">${l.length}</b><span>diferentes</span></div></div>
        <div class="dupla"><button class="bt ouro" data-w="copiar">${ic("content_copy")}Copiar lista</button><a class="bt" href="${esc(SV.liga.urlLista)}" target="_blank" rel="noopener">${ic("storefront")}Compra por Lista</a></div>
        <p class="dim mt" style="font-size:14.5px">Copie a lista e cole na Compra por Lista da LigaMagic para ver onde sai mais barato. O valor acima usa a cotação da Liga que você informou, quando existe, ou o Scryfall.</p>
        <ul class="desejos tomo pad mt">${l.map((x) => {
          const v = SV.d.valorInfo(x), nome = SV.nomeExibido(x);
          return `<li><a href="#ver-${x.sf}">${x.imgPeq ? `<img src="${esc(x.imgPeq)}" alt=""/>` : ""}</a>
            <div style="flex:1;min-width:0"><a href="#ver-${x.sf}"><b>${esc(nome)}</b></a><small class="dim" style="display:block">${esc(x.setNome)} · ${v.v ? brl(v.v) : "sem preço"}${v.fonte === "liga" ? " (Liga)" : ""}</small></div>
            <div class="q"><button class="ico-bt" data-w="menos" data-id="${x.id}" aria-label="Menos uma">${ic("remove")}</button><b>${x.qtd}</b><button class="ico-bt" data-w="mais" data-id="${x.id}" aria-label="Mais uma">${ic("add")}</button></div>
            <button class="ico-bt" data-w="comprei" data-id="${x.id}" aria-label="Comprei: guardar no cofre">${ic("shopping_bag")}</button></li>`;
        }).join("")}</ul>
        <button class="bt fantasma cheio mt" data-w="limpar">${ic("delete_sweep")}Esvaziar a lista</button>`
        : `<div class="vazio">${ic("favorite")}Sua lista de desejos está vazia.<br/>Na Consulta, abra uma carta e toque em “Lista de desejos”.<br/><a class="bt ouro mt" href="#consulta">${ic("travel_explore")}Consultar cartas</a></div>`;
      el.onclick = async (e) => {
        const b = e.target.closest("[data-w]"); if (!b) return;
        const w = b.dataset.w, todos = SV.d.desejos(), x = todos.find((i) => i.id === b.dataset.id);
        const atualizar = () => { SV.desejos.montar(el, aoMudar); aoMudar && aoMudar(); };
        if (w === "copiar") { await SV.copiar(SV.liga.textoLista(l)); toast("Lista copiada. Cole na Compra por Lista da LigaMagic.", "content_copy"); }
        else if (w === "mais" && x) { x.qtd += 1; SV.d.salvarDesejos(todos); atualizar(); }
        else if (w === "menos" && x) { if (x.qtd > 1) { x.qtd -= 1; SV.d.salvarDesejos(todos); atualizar(); } else if (await confirmar("Tirar da lista?", `${x.nome} sai da lista de desejos.`, "Tirar")) { SV.d.salvarDesejos(todos.filter((i) => i.id !== x.id)); atualizar(); } }
        else if (w === "comprei" && x) {
          SV.folhaDestino(SV.sf.compacto(x), { aoAdicionar: () => {
            const t = SV.d.desejos(), y = t.find((i) => i.id === x.id);
            if (y) { y.qtd > 1 ? (y.qtd -= 1) : t.splice(t.indexOf(y), 1); SV.d.salvarDesejos(t); }
            atualizar();
          } });
        }
        else if (w === "limpar") { if (await confirmar("Esvaziar a lista?", "Todas as cartas saem da lista de desejos.", "Esvaziar")) { SV.d.salvarDesejos([]); atualizar(); } }
      };
    },
  };
})();
