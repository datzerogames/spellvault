// SpellVault — ponte com a LigaMagic (https://www.ligamagic.com.br).
// A Liga não tem API aberta, os termos dela proíbem copiar o conteúdo sem autorização e o robots.txt pede
// 1 acesso a cada 6 minutos. Por isso o app NÃO busca preços lá: ele abre as páginas da Liga para o jogador
// e guarda neste aparelho só a cotação que o próprio jogador digitar.
(function () {
  const SV = (window.SV = window.SV || {});
  const { $, $$, esc, ic, brl, num2, dataBr, toast, folha, fecharFolha } = SV;
  const BASE = "https://www.ligamagic.com.br/";
  // a Liga escreve espaços como "+" e deixa as barras de "A // B" sem codificar
  const enc = (t) => encodeURIComponent(t).replace(/%20/g, "+").replace(/%2F/g, "/");

  const liga = {
    BASE,
    urlCarta: (nome) => `${BASE}?view=cards/card&card=${enc(nome)}`,
    urlBusca: (termo) => `${BASE}?view=cards/search&card=${enc(termo)}`,
    urlLista: `${BASE}?view=cards/lista`,
    urlEdicoes: `${BASE}?view=cards/edicoes`,
    urlReserved: `${BASE}?view=cards/search&card=reserved=1`,
    urlAlta: `${BASE}?view=cards/variacao&show=alta`,
    urlQueda: `${BASE}?view=cards/variacao&show=queda`,

    // "R$ 1.234,56", "2,08", "2.08" ou "1.234" → número
    numero(txt) {
      let t = String(txt ?? "").replace(/[R$\s]/g, "");
      if (!t) return 0;
      if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
      else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "");
      const n = parseFloat(t);
      return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    },

    // "1 Sol Ring" por linha (o formato de lista de compras que a maioria dos sites aceita)
    textoLista: (itens) => itens.map((i) => `${i.qtd || 1} ${i.nome}`).join("\n"),

    // bloco "Cotação LigaMagic" da ficha da carta
    bloco(c) {
      const q = (f) => SV.d.cotacaoLiga(c, f);
      const linha = (rot, f) => {
        const x = q(f); if (!x) return "";
        return `<p class="rot mt">${rot} · informada em ${dataBr(x.em)}</p>
          <div class="liga-q"><div><b>${x.menor ? num2(x.menor) : "—"}</b><span>menor</span></div><div><b>${x.medio ? num2(x.medio) : "—"}</b><span>médio</span></div><div><b>${x.maior ? num2(x.maior) : "—"}</b><span>maior</span></div></div>`;
      };
      const tem = q(false) || q(true);
      return `<section class="tomo cantos liga pad">
        <p class="rot">${ic("storefront")}Cotação LigaMagic</p>
        ${tem ? linha("Normal", false) + linha("Foil", true) : `<p class="muted mt">Você ainda não guardou a cotação desta edição.</p>`}
        <div class="dupla mt"><a class="bt ouro" href="${esc(liga.urlCarta(c.nome))}" target="_blank" rel="noopener" data-liga="abrir">${ic("open_in_new")}Ver na Liga</a><button class="bt" data-liga="cotacao">${ic("edit_note")}${tem ? "Atualizar" : "Informar"} cotação</button></div>
        <p class="dim mt" style="font-size:14px">A LigaMagic não libera os preços para outros apps. Abra a página dela, copie os valores da sua edição e guarde aqui.</p>
      </section>`;
    },

    // folha para digitar a cotação lida na Liga (menor, médio e maior), para o normal ou o foil
    folhaCotacao(c, depois, foilInicial = !!c.foil) {
      let foil = foilInicial;
      const f = folha(`<h2>Cotação na LigaMagic</h2><p class="muted">${esc(c.nome)} · ${esc(c.setNome)} · #${esc(c.num)}</p>
        <a class="bt cheio mt" href="${esc(liga.urlCarta(c.nome))}" target="_blank" rel="noopener">${ic("open_in_new")}Abrir a carta na LigaMagic</a>
        <p class="dim mt" style="font-size:14.5px">Na página da carta, ache a sua edição e copie os valores. Depois volte e digite aqui.</p>
        <form class="form mt" id="f-liga">
          <div class="seg" id="seg-foil"><button type="button" data-foil="0" class="${!foil ? "on" : ""}">Normal</button><button type="button" data-foil="1" class="${foil ? "on" : ""}">Foil</button></div>
          <div class="dupla"><div class="campo"><label for="lq-menor">Menor (R$)</label><input id="lq-menor" inputmode="decimal" placeholder="0,00" autocomplete="off"/></div><div class="campo"><label for="lq-medio">Médio (R$)</label><input id="lq-medio" inputmode="decimal" placeholder="0,00" autocomplete="off"/></div></div>
          <div class="campo"><label for="lq-maior">Maior (R$)</label><input id="lq-maior" inputmode="decimal" placeholder="0,00" autocomplete="off"/></div>
          <p class="dim" id="lq-dica" style="font-size:14px"></p>
          <button class="bt ouro cheio">${ic("save")}Salvar cotação</button>
          <button type="button" class="bt sangue cheio" id="lq-limpar">${ic("delete")}Remover esta cotação</button>
        </form>`);
      const preencher = () => {
        const x = SV.d.cotacaoLiga(c, foil);
        $("#lq-menor", f).value = x && x.menor ? num2(x.menor) : ""; $("#lq-medio", f).value = x && x.medio ? num2(x.medio) : ""; $("#lq-maior", f).value = x && x.maior ? num2(x.maior) : "";
        $("#lq-dica", f).textContent = x ? `Guardada em ${dataBr(x.em)}.` : "Ainda sem cotação guardada para este acabamento.";
        $("#lq-limpar", f).hidden = !x;
      };
      preencher();
      f.addEventListener("click", (e) => {
        const b = e.target.closest("[data-foil]");
        if (b) { foil = b.dataset.foil === "1"; $$("#seg-foil button", f).forEach((x) => x.classList.toggle("on", x === b)); preencher(); }
        if (e.target.closest("#lq-limpar")) { SV.d.removerLiga(c, foil); toast("Cotação removida", "delete"); fecharFolha(); depois && depois(); }
      });
      $("#f-liga", f).addEventListener("submit", (e) => {
        e.preventDefault();
        const q = { menor: liga.numero($("#lq-menor", f).value), medio: liga.numero($("#lq-medio", f).value), maior: liga.numero($("#lq-maior", f).value) };
        if (!q.menor && !q.medio && !q.maior) { toast("Digite pelo menos um valor.", "warning"); return; }
        if (q.menor && q.maior && q.menor > q.maior) { toast("O menor valor não pode passar do maior.", "warning"); return; }
        SV.d.salvarLiga(c, foil, q);
        toast(`Cotação ${foil ? "foil " : ""}guardada: ${brl(q.medio || q.menor || q.maior)}`, "storefront");
        fecharFolha(); depois && depois();
      });
    },
  };
  SV.liga = liga;
})();
