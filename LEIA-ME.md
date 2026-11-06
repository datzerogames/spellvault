# SpellVault — companheiro de Magic com visual medieval

O SpellVault é o app das telas do Stitch (`stitch_magic_binder_companion`), funcionando. O visual é medieval dark fantasy: couro, ouro velho, brasas e uma barra de navegação de vidro fumê.

**Abrir:** https://datzerogames.github.io/spellvault/ (ou `index.html` no computador). Precisa de internet, porque cartas, imagens e preços vêm do Scryfall. A câmera do scanner só abre em endereço https; sem ela, use "Enviar foto".

## Abas (barra de vidro no rodapé)

| Aba | O que faz |
|---|---|
| **Vida** | Marcador de Commander para 2 a 6 jogadores. Veja "Aba Vida" abaixo. |
| **Scanner** | Lê o nome da carta pela câmera ou por foto e identifica em português ou inglês. Mostra o preço, mostra quantas cópias você já tem, deixa guardar no álbum, num deck ou como "para troca" e leva para a ficha completa. **Modo lote:** o botão "Lote" no visor faz cada carta lida ir direto para o destino (dá para desfazer pela lista da sessão). Também tem PT-BR/EN no texto da carta e botão de compartilhar. |
| **Consulta** | A busca de cartas, no estilo da LigaMagic. Veja abaixo. |
| **Coleção** | Seu cofre (busca com botão de limpar, filtros por cor, tipo, foil, "para troca" e álbum, valor em R$, e onde cada carta está guardada) e a lista de desejos. |
| **Álbuns** | Fichários, pastas, deck boxes e gaveteiros, com páginas e slots. O filtro **Livres (N)** mostra só o que tem espaço, o menu ⋮ tem as opções do fichário (editar, destino padrão do scanner, copiar a lista, retirar todas as cartas, remover) e cada carta tem o botão **Mover**. |
| **Grimório** | Perfil, usuário da LigaMagic, números do cofre, decks, ajustes e cópia de segurança. |

O dado **D20** e o botão de **perfil** do cabeçalho aparecem em todas as telas.

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
- Os preços do Scryfall são em dólar, convertidos pela cotação definida no Grimório. São uma estimativa, não o preço de uma loja.
- Projeto de fã, sem afiliação com a Wizards of the Coast nem com a LigaMagic. Magic: The Gathering é marca da Wizards of the Coast LLC.
