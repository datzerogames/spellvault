// Gera assets/js/demo-dados.js: os dois álbuns 4x4 "Goblinóides" da versão demo, com as cartas já resolvidas no Scryfall
// (a demo abre sem precisar buscar nada). Uso: node tools/gerar-demo.js
// O Scryfall exige um User-Agent próprio e no máximo ~10 pedidos por segundo.
const fs = require("fs"), path = require("path"), vm = require("vm");
const w = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { Accept: "application/json", "User-Agent": "SpellVault/1.0 (https://datzerogames.github.io/spellvault/)" };

// reaproveita o mesmo "resumo" do app, para a demo guardar as cartas no mesmo formato da coleção
const ctx = { window: {}, console, setTimeout, Date, Promise, fetch };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", "js", "scryfall.js"), "utf8"), ctx);
const sf = ctx.window.SV.sf;

async function buscar(q, quantas) {
  const out = [];
  let url = "https://api.scryfall.com/cards/search?q=" + encodeURIComponent(q) + "&order=edhrec&unique=cards";
  while (url && out.length < quantas) {
    await w(150);
    const r = await fetch(url, { headers: UA }); const j = await r.json();
    if (!r.ok) throw new Error(j.details);
    out.push(...j.data); url = j.has_more ? j.next_page : "";
  }
  return out.slice(0, quantas);
}

(async () => {
  const base = "game:paper f:commander -is:funny";
  const lendas = await buscar(`t:goblin t:legendary ${base}`, 44);
  const horda = await buscar(`otag:typal-goblin -t:legendary ${base}`, 56);
  const nomesLendas = new Set(lendas.map((c) => c.name));
  const horda2 = horda.filter((c) => !nomesLendas.has(c.name));

  const COND = ["NM", "NM", "NM", "LP", "NM", "SP", "NM", "NM", "LP", "NM"];
  const montar = (lista, album, pulos) => {
    const cartas = []; let slot = 0;
    lista.forEach((c, i) => {
      slot++; while (pulos.includes(slot)) slot++; // bolsos deixados vazios, como num fichário de verdade
      const foilOk = (c.finishes || []).includes("foil");
      cartas.push(Object.assign({ album, slot, foil: foilOk && i % 5 === 2, condicao: COND[i % COND.length], idioma: "EN" }, sf.compacto(sf.resumo(c))));
    });
    return cartas;
  };
  const dados = {
    gerado: new Date().toISOString().slice(0, 10),
    albuns: [
      { nome: "Goblinóides · Tomo I", nota: "Reis e lendas da horda", tipo: "4x4", paginas: 4, sleeve: "Sleeve Dragon Shield Matte Vermelho", capa: "#3d1b1c" },
      { nome: "Goblinóides · Tomo II", nota: "A horda: lordes, fichas e explosões", tipo: "4x4", paginas: 4, sleeve: "Sleeve KMC Black", capa: "#24361f" },
    ],
    cartas: [...montar(lendas, 0, [7, 22, 31]), ...montar(horda2, 1, [4, 19, 36, 50])],
    decks: [{ nome: "Krenko, Mob Boss — horda goblin", comandante: "Krenko, Mob Boss" }],
  };
  const alvo = path.join(__dirname, "..", "assets", "js", "demo-dados.js");
  fs.writeFileSync(alvo, "// Gerado por tools/gerar-demo.js — cartas de exemplo da versão demo (dados do Scryfall).\n(window.SV = window.SV || {}).demoDados = " + JSON.stringify(dados) + ";\n");
  console.log("cartas:", dados.cartas.length, "· tomo I:", dados.cartas.filter((c) => c.album === 0).length, "· tomo II:", dados.cartas.filter((c) => c.album === 1).length, "·", (fs.statSync(alvo).size / 1024).toFixed(0), "KB");
  console.log("lendas:", lendas.slice(0, 8).map((c) => c.name).join(" | "));
  console.log("horda:", horda2.slice(0, 8).map((c) => c.name).join(" | "));
})();
