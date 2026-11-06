// SpellVault — modo de uso: completo ou demonstração.
// A demo abre com dois álbuns 4x4 "Goblinóides" prontos e guarda tudo à parte (prefixo "svdemo:"), sem tocar nos dados reais.
// Na web: acrescente ?demo=1 ao endereço. No Android: o pacote "SpellVault DEMO" (versao.js trocado).
(function () {
  const SV = (window.SV = window.SV || {});
  let demo = window.SV_DEMO === true;
  try { const q = new URLSearchParams(location.search).get("demo"); if (q === "1") demo = true; else if (q === "0") demo = false; } catch {}
  let carregando = null;
  SV.modo = {
    demo,
    pref: demo ? "svdemo:" : "sv:",
    // endereço da versão completa: na web é a mesma página sem ?demo; no app demo, a página de download
    urlCompleta: () => (window.SV_DEMO === true ? "https://datzerogames.github.io/spellvault/baixar.html" : location.pathname),
    // os dados de exemplo ficam num arquivo à parte, carregado só na demo
    carregarDados() {
      if (SV.demoDados) return Promise.resolve(SV.demoDados);
      if (!carregando) carregando = new Promise((ok, falha) => {
        const s = document.createElement("script");
        s.src = "assets/js/demo-dados.js"; s.onload = () => ok(SV.demoDados); s.onerror = () => falha(new Error("Não achei os dados da demo."));
        document.head.appendChild(s);
      });
      return carregando;
    },
  };
  if (demo) document.documentElement.dataset.modo = "demo";
})();
