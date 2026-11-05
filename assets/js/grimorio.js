// SpellVault — grimório (perfil): números do cofre, decks, ajustes, cópia de segurança e créditos.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, esc, ic, brl, toast, confirmar } = SV;
  const NOME_COR = { W: "Branco", U: "Azul", B: "Preto", R: "Vermelho", G: "Verde", M: "Multicolor", C: "Incolor" };
  const corDe = (c) => (c.cores && c.cores.length > 1 ? "M" : c.cores && c.cores.length ? c.cores[0] : "C");

  SV.telas = SV.telas || {};
  SV.telas.grimorio = {
    montar(el) {
      const cfg = SV.d.config(), cartas = SV.d.cartas(), decks = SV.d.decks(), albuns = SV.d.albuns();
      const total = cartas.reduce((s, c) => s + SV.d.valor(c, cfg), 0);
      const porCor = {}; cartas.forEach((c) => (porCor[corDe(c)] = (porCor[corDe(c)] || 0) + 1));
      const maxCor = Math.max(1, ...Object.values(porCor));
      const top = cartas.slice().sort((a, b) => SV.d.valor(b, cfg) - SV.d.valor(a, cfg)).slice(0, 5);
      el.innerHTML = `<div class="pagina">
        <header class="topo"><span class="selo">${ic("menu_book")}</span><div class="marca"><b>SpellVault</b><small>Grimório do planeswalker</small></div></header>
        <section class="tomo cantos perfil"><span class="selo">${ic("shield_person", "fill")}</span><div style="flex:1;min-width:0"><p class="rot">Planeswalker</p><h2 id="nome-p">${esc(cfg.nome)}</h2><p class="muted">${cartas.length} cartas · ${albuns.length} álbuns · ${decks.length} decks</p></div><button class="ico-bt" data-g="nome" aria-label="Mudar nome">${ic("edit")}</button></section>

        <h2 class="rubrica"><span>Tesouro</span></h2>
        <div class="resumo"><div class="tomo"><b class="num">${brl(total).replace("R$ ", "")}</b><span>R$ estimado</span></div><div class="tomo"><b class="num">${cartas.filter((c) => c.foil).length}</b><span>foils</span></div><div class="tomo"><b class="num">${cartas.filter((c) => c.raridade === "mythic").length}</b><span>míticas</span></div></div>
        <section class="tomo pad"><p class="rot">${ic("palette")}Cartas por cor</p>
          <div class="barras-cor mt">${Object.keys(NOME_COR).map((k) => `<div><span>${NOME_COR[k]}</span><span class="trilho"><i style="width:${((porCor[k] || 0) / maxCor) * 100}%;background:var(--${k === "M" ? "M" : k})"></i></span><b>${porCor[k] || 0}</b></div>`).join("")}</div></section>
        <section class="tomo pad mt"><p class="rot">${ic("diamond")}As mais valiosas</p>
          <ul class="copias">${top.map((c) => `<li>${c.imgPeq ? `<img src="${esc(c.imgPeq)}" alt="" style="width:36px;height:50px;border-radius:4px;object-fit:cover"/>` : ic("style")}<a href="#carta-${c.id}" style="flex:1;min-width:0"><b>${esc(SV.nomeExibido(c))}</b><small>${esc(c.setNome)}${c.foil ? " · Foil" : ""}</small></a><b class="ouro num" style="font-size:15px">${brl(SV.d.valor(c, cfg))}</b></li>`).join("") || `<li class="dim">Nenhuma carta ainda.</li>`}</ul></section>

        <h2 class="rubrica"><span>Decks</span></h2>
        <section class="tomo pad"><ul class="decks">${decks.map((d) => `<li>${ic("swords")}<div style="flex:1;min-width:0"><b>${esc(d.nome)}</b><br/><small class="dim">${cartas.filter((c) => c.deck === d.id).length} cartas designadas${d.comandante ? " · " + esc(d.comandante) : ""}</small></div><button class="ico-bt" data-g="del-deck" data-id="${d.id}" aria-label="Apagar deck">${ic("delete")}</button></li>`).join("") || `<li class="dim">Nenhum deck. Crie um abaixo ou pela página de uma carta.</li>`}</ul>
          <form class="fila mt" id="f-deck"><div class="campo" style="flex:1"><input id="novo-deck" placeholder="Nome do novo deck" aria-label="Nome do novo deck"/></div><button class="bt ouro">${ic("add")}Criar</button></form></section>

        <h2 class="rubrica"><span>Ajustes</span></h2>
        <section class="tomo pad form">
          <div class="campo"><label for="cot">Cotação do dólar (R$)</label><input id="cot" type="number" step="0.01" min="1" value="${cfg.cotacao}"/><small>Os preços vêm do Scryfall em dólar e são convertidos com este valor.</small></div>
          <div class="campo"><label>Nomes das cartas</label><div class="seg"><button data-g="idioma" data-v="pt" class="${cfg.idioma === "pt" ? "on" : ""}">Português</button><button data-g="idioma" data-v="en" class="${cfg.idioma === "en" ? "on" : ""}">Inglês</button></div></div>
          <div class="campo"><label for="alb-pad">Álbum padrão do scanner</label><select id="alb-pad"><option value="">Nenhum (só coleção)</option>${albuns.map((a) => `<option value="${a.id}" ${a.id === cfg.albumPadrao ? "selected" : ""}>${esc(a.nome)}</option>`).join("")}</select></div>
          <label class="check"><input type="checkbox" id="usar-liga" ${cfg.usarLiga !== false ? "checked" : ""}/>Usar a cotação da LigaMagic que eu informei no valor estimado</label>
          <p class="dim" style="font-size:14px;margin-top:-6px">Hoje: ${Object.keys(SV.d.liga()).length} cotação(ões) guardada(s). A Liga não libera os preços para outros apps, então elas são digitadas por você na ficha de cada carta.</p>
          <button class="bt" data-g="precos">${ic("currency_exchange")}Atualizar preços no Scryfall</button>
          <button class="bt" data-g="lista-cofre">${ic("content_copy")}Copiar a lista do cofre (texto)</button>
          ${Object.keys(SV.d.liga()).length ? `<button class="bt sangue" data-g="limpar-liga">${ic("delete")}Apagar as cotações da Liga</button>` : ""}
        </section>

        <h2 class="rubrica"><span>Cópia de segurança</span></h2>
        <section class="tomo pad"><p class="muted">Tudo fica salvo só neste aparelho. Guarde uma cópia para trocar de celular sem perder o cofre.</p>
          <div class="dupla mt"><button class="bt" data-g="exportar">${ic("download")}Exportar</button><label class="bt" style="cursor:pointer">${ic("upload")}Importar<input type="file" accept="application/json,.json" id="imp" hidden/></label></div>
          <button class="bt sangue cheio mt" data-g="apagar">${ic("delete_forever")}Apagar tudo deste aparelho</button></section>

        <p class="creditos">Dados, preços e imagens das cartas: <a href="https://scryfall.com" target="_blank" rel="noopener">Scryfall</a>. Os atalhos para a <a href="https://www.ligamagic.com.br" target="_blank" rel="noopener">LigaMagic</a> só abrem o site dela; o SpellVault não tem relação com a Liga. Leitura do nome: Tesseract.js, no próprio aparelho.<br/>SpellVault é um projeto de fã e não é afiliado à Wizards of the Coast. Magic: The Gathering é marca da Wizards of the Coast LLC.</p>
      </div>`;
      $("#cot", el).addEventListener("change", (e) => { const v = +e.target.value; if (v > 0) { SV.d.salvarConfig({ cotacao: v }); toast("Cotação atualizada", "currency_exchange"); } });
      $("#usar-liga", el).addEventListener("change", (e) => { SV.d.salvarConfig({ usarLiga: e.target.checked }); toast(e.target.checked ? "Valor estimado usa a cotação da Liga" : "Valor estimado usa só o Scryfall", "storefront"); });
      $("#alb-pad", el).addEventListener("change", (e) => { SV.d.salvarConfig({ albumPadrao: e.target.value }); toast("Álbum padrão salvo", "collections_bookmark"); });
      $("#f-deck", el).addEventListener("submit", (e) => { e.preventDefault(); const n = $("#novo-deck", el).value.trim(); if (!n) return; SV.d.salvarDecks(SV.d.decks().concat({ id: SV.d.uid(), nome: n, comandante: "" })); toast("Deck criado", "swords"); SV.telas.grimorio.montar(el); });
      $("#imp", el).addEventListener("change", async (e) => {
        const arq = e.target.files[0]; if (!arq) return;
        try { const txt = await arq.text(); if (await confirmar("Importar cópia de segurança?", "O cofre atual deste aparelho será substituído pelo do arquivo.", "Importar", false)) { SV.d.importar(txt); toast("Cofre restaurado", "restore"); SV.telas.grimorio.montar(el); } }
        catch (err) { toast(err.message || "Arquivo inválido.", "error"); }
        e.target.value = "";
      });
      el.onclick = async (e) => {
        const b = e.target.closest("[data-g]"); if (!b) return;
        const g = b.dataset.g;
        if (g === "nome") { SV.folha(`<h2>Seu nome de planeswalker</h2><form class="form mt" id="f-nome"><div class="campo"><input id="nome-in" value="${esc(SV.d.config().nome)}" maxlength="30" autofocus/></div><button class="bt ouro cheio">Salvar</button></form>`); $("#f-nome").addEventListener("submit", (ev) => { ev.preventDefault(); SV.d.salvarConfig({ nome: $("#nome-in").value.trim() || "Planeswalker" }); SV.fecharFolha(); SV.telas.grimorio.montar(el); }); }
        else if (g === "idioma") { SV.d.salvarConfig({ idioma: b.dataset.v }); SV.telas.grimorio.montar(el); }
        else if (g === "del-deck") { if (await confirmar("Apagar este deck?", "As cartas continuam na coleção, só perdem a marcação de deck.", "Apagar")) { SV.d.salvarDecks(SV.d.decks().filter((d) => d.id !== b.dataset.id)); SV.d.salvarCartas(SV.d.cartas().map((c) => (c.deck === b.dataset.id ? Object.assign(c, { deck: "" }) : c))); SV.telas.grimorio.montar(el); } }
        else if (g === "lista-cofre") {
          const por = {}; SV.d.cartas().forEach((c) => (por[c.nome] = (por[c.nome] || 0) + 1));
          const l = Object.entries(por).sort((a, b) => a[0].localeCompare(b[0])).map(([nome, qtd]) => ({ nome, qtd }));
          if (!l.length) return toast("O cofre está vazio.", "info");
          await SV.copiar(SV.liga.textoLista(l)); toast(`${l.length} cartas diferentes copiadas`, "content_copy");
        }
        else if (g === "limpar-liga") { if (await confirmar("Apagar as cotações da Liga?", "As cotações que você digitou são apagadas e o valor volta a usar o Scryfall.", "Apagar")) { SV.d.LS.del("liga"); toast("Cotações apagadas", "delete"); SV.telas.grimorio.montar(el); } }
        else if (g === "exportar") { const blob = new Blob([SV.d.exportar()], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `spellvault-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("Cópia de segurança baixada", "download"); }
        else if (g === "apagar") { if (await confirmar("Apagar tudo?", "Coleção, álbuns, decks e partida deste aparelho serão apagados. Exporte uma cópia antes se quiser guardar.", "Apagar tudo")) { SV.d.apagarTudo(); toast("Cofre esvaziado", "delete"); location.hash = "#vida"; location.reload(); } }
        else if (g === "precos") {
          const l = SV.d.cartas(); if (!l.length) return;
          b.disabled = true; b.innerHTML = `<span class="carregando"></span> Atualizando ${l.length} cartas…`;
          try {
            const novos = await SV.sf.lote([...new Set(l.map((c) => c.sf))].map((id) => ({ id })));
            const por = Object.fromEntries(novos.map((n) => [n.sf, n]));
            SV.d.salvarCartas(SV.d.cartas().map((c) => (por[c.sf] ? Object.assign(c, { usd: por[c.sf].usd, usdFoil: por[c.sf].usdFoil }) : c)));
            toast("Preços atualizados", "currency_exchange"); SV.telas.grimorio.montar(el);
          } catch { toast("Sem conexão com o Scryfall.", "cloud_off"); b.disabled = false; b.innerHTML = `${ic("currency_exchange")}Atualizar preços no Scryfall`; }
        }
      };
    },
    desmontar(el) { el.onclick = null; },
  };
})();
