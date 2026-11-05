# SpellVault — companheiro de Magic com visual medieval

O SpellVault é o app das telas do Stitch (`stitch_magic_binder_companion`), funcionando. O visual é medieval dark fantasy: couro, ouro velho, brasas e uma barra de navegação de vidro fumê.

**Abrir:** https://datzerogames.github.io/spellvault/ (ou `index.html` no computador). Precisa de internet, porque cartas, imagens e preços vêm do Scryfall. A câmera do scanner só abre em endereço https; sem ela, use "Enviar foto".

## Abas (barra de vidro no rodapé)

| Aba | O que faz |
|---|---|
| **Vida** | Marcador de Commander para 2 a 6 jogadores: dano de comandante, veneno, taxa, energia, monarca, dados, cronômetro e crônica. |
| **Scanner** | Lê o nome da carta pela câmera ou por foto e identifica em português ou inglês. Mostra o preço, mostra quantas cópias você já tem, deixa guardar no álbum e leva para a ficha completa. |
| **Consulta** | A busca de cartas, no estilo da LigaMagic. Veja abaixo. |
| **Coleção** | Seu cofre (busca, filtros, valor em R$) e a lista de desejos. |
| **Álbuns** | Fichários, pastas, deck boxes e gaveteiros, com páginas e slots. |
| **Grimório** | Perfil, números do cofre, decks, ajustes e cópia de segurança. |

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
- **Lista de desejos:** monte a lista de compras e use "Copiar lista" para colar na Compra por Lista da Liga. A mesma cópia existe para o cofre inteiro, no Grimório.

Se a LigaMagic autorizar o uso (parceria ou API), dá para ligar a cotação automática.

## Dados

Tudo fica salvo no aparelho (localStorage): coleção, álbuns, decks, cotações, desejos e partida. No Grimório, use **Exportar** e **Importar** para fazer cópia de segurança. Na primeira abertura, o app monta uma coleção de exemplo com 3 álbuns e 20 cartas.

## Créditos

- Dados, preços e imagens das cartas: [Scryfall](https://scryfall.com).
- Leitura do nome na câmera: Tesseract.js, rodando no próprio aparelho.
- Os preços do Scryfall são em dólar, convertidos pela cotação definida no Grimório. São uma estimativa, não o preço de uma loja.
- Projeto de fã, sem afiliação com a Wizards of the Coast nem com a LigaMagic. Magic: The Gathering é marca da Wizards of the Coast LLC.
