# SpellVault — companheiro de Magic com visual medieval

O SpellVault é o app das telas do Stitch (`stitch_magic_binder_companion`), funcionando. O visual é medieval dark fantasy: couro, ouro velho, brasas e uma barra de navegação de vidro fumê.

**Abrir:** https://datzerogames.github.io/spellvault/ (ou `index.html` no computador). Precisa de internet, porque cartas, imagens e preços vêm do Scryfall. A câmera do scanner só abre em endereço https; sem ela, use "Enviar foto".

**Instalar no celular (Android):** https://datzerogames.github.io/spellvault/baixar.html — o QR code do app aponta para esse endereço e para `releases/latest/download/SpellVault.apk`, que não mudam quando sai uma versão nova.

**Versão demo:** `?demo=1` no endereço do app (https://datzerogames.github.io/spellvault/?demo=1) ou o app **SpellVault DEMO** (`SpellVault-DEMO.apk`). Abre com dois álbuns 4x4 de **Goblinóides** já montados e o fichário em 3D. Os dados da demo ficam à parte (prefixo `svdemo:`), sem tocar nos reais; o Grimório tem "Restaurar a demo".

## Abas (barra de vidro no rodapé)

| Aba | O que faz |
|---|---|
| **Vida** | Marcador de Commander para 2 a 6 jogadores. Veja "Aba Vida" abaixo. |
| **Scanner** | Lê o nome da carta pela câmera ou por foto e identifica em português ou inglês. Mostra o preço, mostra quantas cópias você já tem, deixa guardar no álbum, num deck ou como "para troca" e leva para a ficha completa. **Modo lote:** o botão "Lote" no visor faz cada carta lida ir direto para o destino (dá para desfazer pela lista da sessão). Também tem PT-BR/EN no texto da carta e botão de compartilhar. |
| **Consulta** | A busca de cartas, no estilo da LigaMagic. Veja abaixo. |
| **Coleção** | Seu cofre (busca com botão de limpar, filtros por cor, tipo, foil, "para troca" e álbum, valor em R$, e onde cada carta está guardada) e a lista de desejos. |
| **Álbuns** | Fichários, pastas (2x2, 3x3, 4x3, **4x4**), deck boxes e gaveteiros, com páginas e slots. O filtro **Livres (N)** mostra só o que tem espaço, o menu ⋮ tem as opções do fichário (editar, destino padrão do scanner, copiar a lista, retirar todas as cartas, remover) e cada carta tem o botão **Mover**. O botão **Ver em 3D** abre o fichário aberto (veja abaixo). |
| **Grimório** | Perfil, usuário da LigaMagic, números do cofre, decks, ajustes e cópia de segurança. |

O dado **D20** e o botão de **perfil** do cabeçalho aparecem em todas as telas.

## Álbum em 3D

Em qualquer fichário com páginas (2x2, 3x3, 4x3, 4x4), **Ver em 3D** mostra o álbum aberto: capa de couro, argolas de ouro e as cartas de verdade nos bolsos. O desenho vem das telas `three.js` do Stitch.

- **Arraste** para girar o fichário; os botões ‹ › viram as páginas (a folha vira de verdade).
- **Livro aberto** mostra as duas páginas; **Uma página** chega mais perto.
- **Destacar cor** apaga as cartas que não têm a cor escolhida.
- **Toque numa carta** para inspecionar: arraste para girar, **Virar** mostra o verso, **Foil** liga o brilho, **Ficha** abre a ficha completa.
- O motor 3D (three.js r149, licença MIT) vem junto em `assets/vendor/` e só é carregado nessa tela.

## Forja de decks (Consulta › Forja de decks)

Escreva o nome do comandante (em português ou inglês) e o app monta um deck de Commander de 100 cartas:

- **Condições de vitória:** o plano do deck em uma frase, as cartas que fecham o jogo (drenar, combate extra, bônus em massa, vitória direta…) e os **combos**.
- **Sinergia:** o app lê o texto do comandante e detecta o tema (tribal, fichas, marcadores +1/+1, sacrifício, feitiços, cemitério, artefatos, encantamentos, equipamentos, terrenos, piscar, ganho de vida, combate, tesouros, planeswalkers, veneno, wheel).
- **O básico:** aceleração (9), compra (8), remoção (6), varredura, terrenos de utilidade e básicos na proporção das cores usadas.
- **Opções:** orçamento por carta (livre, US$ 10, 3 ou 1) e preferência pelas cartas que você já tem. Cada carta tem **Trocar** (próxima sugestão da categoria) e **Tirar**.
- **Resultado:** curva de mana, preço estimado em R$, quantas cartas você já tem, **Copiar lista**, **Compartilhar**, **Salvar deck** (vai para o Grimório), **Faltantes → desejos** e **Copiar o que falta** para a Compra por Lista da Liga.
- **Já tem uma lista?** Cole o texto (EDHREC, Moxfield, Archidekt…) e o app mostra o que você tem, o preço, as cartas de vitória e os combos.

**De onde vêm as sugestões.** Scryfall (cartas, ordenadas pela popularidade `edhrec_rank`, filtradas por cor, formato e tema) e Commander Spellbook (combos). O **EDHREC não é consultado pelo app**: os termos de uso dele proíbem acesso automático e republicação. Há só atalhos que abrem o comandante e os combos no EDHREC para você comparar, e a análise da lista que você cola.

**Combos (Commander Spellbook):** o navegador bloqueia essa consulta (CORS), então os combos prontos na lista e os de "falta só uma carta" aparecem **no app Android**, onde a chamada sai pelo HTTP nativo. No navegador há o botão que abre o Spellbook.

## Aba Vida

- **Mudar a vida:** toque na metade de cima ou de baixo do painel, ou use −5, −1, +1 e +5.
- **Marcadores** (toque no nome do jogador): veneno, taxa de comandante, energia, experiência, dano de comandante recebido de cada oponente e a tribo do comandante. Quem chega a 21 de um mesmo comandante, a 10 de veneno ou a 0 de vida cai.
- **Barra de ferramentas da mesa:**
  - **Monarca:** escolhe quem tem a coroa (também há uma coroa em cada painel).
  - **Mana:** Mana Pool de cada jogador, por cor, mais o contador de Tempestade (storm).
  - **Scryfall:** procura o comandante, mostra os mais jogados e consagra o escolhido num jogador, com a arte como fundo.
  - **Comandantes:** o "trono" com o general de cada posto, com regras, troca e remoção.
  - **Crônicas:** o histórico da partida.
  - **Combo!:** registra um combo infinito nas crônicas e abre o oráculo do comandante.
- **Em cada painel:** o livro abre as regras oficiais do comandante, com o imposto e as decisões (rulings), e a paleta muda o fundo (cor de mana ou arte de uma carta, com filtro de planeswalkers, comandantes e lendárias, e a opção de remover a arte).
- Também tem dados (D4 a D20, moeda e "quem começa"), cronômetro e nova partida de 2 a 6 jogadores.

## Consulta de cartas

- **Busca por nome em português ou inglês** ("Anel Solar" acha o Sol Ring), com sugestões enquanto você digita.
- **Filtros:** cores (contém, exatamente ou identidade de comandante), tipo, custo de mana, raridade, edição (por nome ou código), legal no formato, texto de regras, preço máximo em R$, foil, Reserved List, uma carta por edição e ordenação (nome, preço, custo, lançamento, popularidade no EDHREC, raridade, cor).
- **Atalhos:** mais jogadas no Commander, mais caras, Reserved List, lançamentos, comandantes e terrenos.
- Quem sabe a sintaxe do Scryfall pode escrever direto, por exemplo `t:legendary c:dimir cmc<=3`.
- Cada resultado mostra preço em R$ e avisa "No cofre ×N" quando você já tem a carta. "Mostrar mais" carrega as páginas seguintes.

## Ficha completa da carta

Abre pela Consulta, pela Coleção, pelo Scanner ou pelo toque numa edição.

- Imagem em 3D que inclina com o dedo, com brilho holográfico nas foils e verso nas cartas de duas faces.
- **Idiomas:** um botão por idioma publicado (EN, PT, ES, FR, DE, IT, JA…), que troca nome, texto e imagem.
- Texto de regras, custo de mana, força/resistência, lealdade, texto de ambientação e palavras-chave.
- **Preços:** Scryfall em dólar, convertido em R$ (normal, foil e etched), euros e MTG Online.
- **Cotação da LigaMagic:** veja o item "LigaMagic" abaixo.
- **Onde está guardada:** álbum, página, slot e posição (só para cartas do cofre), com todas as cópias.
- **Legalidade** em 20 formatos, aviso de Reserved List e as **decisões oficiais (rulings)**, publicadas só em inglês.
- **Todas as edições** da carta, com o ícone e o preço de cada uma, e as cartas relacionadas e tokens.
- **Detalhes técnicos** (lançamento, artista, layout, moldura, acabamentos, ranking EDHREC) e ligações para Scryfall, Gatherer, EDHREC e LigaMagic.

## LigaMagic: o que o app faz e o que não faz

A LigaMagic **não tem API aberta**, o `robots.txt` dela pede no máximo um acesso a cada 6 minutos e os termos de uso proíbem reproduzir o conteúdo sem autorização expressa. Por isso o SpellVault **não puxa preços da Liga automaticamente**. O que ele faz:

- **Atalhos:** botões que abrem a carta, a busca, a Compra por Lista, as Edições, Cards em alta, Cards em queda e a Reserved List direto no site da Liga.
- **Cotação informada por você:** na ficha da carta, toque em "Informar cotação", copie da Liga o menor, o médio e o maior valor e guarde (normal e foil separados, com a data). Essa cotação passa a valer no valor da carta, no total da coleção e na lista de desejos, com a etiqueta "Liga". Fica só no seu aparelho. Nos ajustes dá para desligar o uso dela ou apagar todas.
- **Login:** a Liga só aceita login (usuário e senha) no site dela e não oferece "entrar com a Liga" para outros apps. Por isso o Grimório tem os botões "Entrar na Liga" e "Criar conta na Liga", que abrem o site dela, e guarda só o seu **usuário** para os atalhos (sem verificar). O SpellVault nunca pede nem guarda a sua senha da Liga.
- **Lista de desejos:** monte a lista de compras e use "Copiar lista" para colar na Compra por Lista da Liga. A mesma cópia existe para o cofre inteiro, no Grimório.

Se a LigaMagic autorizar o uso (parceria ou API), dá para ligar a cotação automática.

## Dados

Tudo fica salvo no aparelho (localStorage): coleção, álbuns, decks, cotações, desejos e partida. No Grimório, use **Exportar** e **Importar** para fazer cópia de segurança. Na primeira abertura, o app monta uma coleção de exemplo com 3 álbuns e 20 cartas.

## Créditos

- Dados, preços e imagens das cartas: [Scryfall](https://scryfall.com).
- Leitura do nome na câmera: Tesseract.js, rodando no próprio aparelho.
- Fichário em 3D: [three.js](https://threejs.org) r149 (MIT, em `assets/vendor/`).
- Combos: [Commander Spellbook](https://commanderspellbook.com).
- Os preços do Scryfall são em dólar, convertidos pela cotação definida no Grimório. São uma estimativa, não o preço de uma loja.
- Projeto de fã, sem afiliação com a Wizards of the Coast nem com a LigaMagic. Magic: The Gathering é marca da Wizards of the Coast LLC.
