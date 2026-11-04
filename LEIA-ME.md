# SpellVault — companheiro de Magic com visual medieval

O SpellVault é o app das telas do Stitch (`stitch_magic_binder_companion`), agora funcionando. O visual é medieval dark fantasy: couro, ouro velho, brasas e uma barra de navegação de vidro fumê.

## Como abrir

- **No computador:** dê dois cliques em `index.html`. Precisa de internet, porque as cartas, os preços e as imagens vêm do Scryfall.
- **No celular, com câmera:** a câmera só abre em endereço seguro (https ou localhost). Para usar o scanner no celular, publique o app (GitHub Pages, por exemplo). Sem isso, o botão **Enviar foto** já funciona: tire a foto da carta e ela é lida do mesmo jeito.

## Abas (barra de vidro no rodapé)

| Aba | O que faz |
|---|---|
| **Vida** | Marcador de vida para Commander, de 2 a 6 jogadores, com 20, 25, 30 ou 40 de vida. Veja os detalhes abaixo. |
| **Scanner** | Lê o nome da carta pela câmera ou por foto e identifica no Scryfall, em português ou inglês. Mostra o preço e quantas cópias você já tem, e deixa escolher o álbum de destino. As cartas lidas formam um lote da sessão. Também dá para digitar o nome. |
| **Coleção** | Cartas com busca e filtros (cor, tipo, foil e ordenação) e valor total estimado em R$. Cada carta abre o seu detalhe, descrito abaixo. |
| **Álbuns** | Estante de álbuns 2x2, pastas 3x3 e 4x3, deck boxes e gaveteiros. Mostra as páginas com os slots, a ocupação de cada álbum e o botão "Escanear p/ slot #N". Tocar num slot vazio adiciona uma carta exatamente ali. |
| **Grimório** | Perfil com os números do cofre, cartas por cor, as mais valiosas e os decks. Nos ajustes: cotação do dólar, idioma dos nomes e álbum padrão. Também exporta e importa a cópia de segurança e atualiza os preços. |

### Aba Vida

- **Mudar a vida:** toque na metade de cima ou de baixo do painel, ou use os botões −5, −1, +1 e +5.
- **Marcadores:** veneno, taxa de comandante, energia, experiência e dano de comandante recebido de cada oponente.
- **Quem é eliminado:** a partida marca sozinha quem chegou a 0 de vida, a 10 de veneno ou a 21 de dano de um mesmo comandante.
- **Outros recursos:** monarca, dados (D4 a D20, moeda e quem começa), cronômetro e a crônica da partida.
- **Fundo do painel:** a arte do comandante, buscada no Scryfall.
- **Tela:** fica acesa enquanto a aba Vida está aberta.

### Detalhe da carta

- Carta em 3D: inclina com o dedo, tem brilho holográfico nas foils e vira (nas cartas de duas faces, mostra o verso).
- Texto em português ou inglês.
- **Onde está guardada?** Mostra álbum, página, slot e a posição na página, com o desenho da página e o slot aceso.
- Lista de todas as cópias.
- Botões para mover de slot ou de álbum (se o slot estiver ocupado, as duas cartas trocam de lugar), designar a um deck, mudar o estado e o foil, e desvincular.

## Onde ficam os dados

Tudo fica salvo no aparelho (localStorage): coleção, álbuns, decks e partida. No Grimório, use **Exportar** para guardar uma cópia e **Importar** para restaurar. Na primeira vez, o app monta uma coleção de exemplo com 3 álbuns e 20 cartas.

## Créditos

- Dados, preços e imagens das cartas: [Scryfall](https://scryfall.com).
- Leitura do nome: Tesseract.js, que roda no próprio aparelho.
- Os preços são do Scryfall, em dólar, convertidos pela cotação definida no Grimório. É uma estimativa, não o preço da LigaMagic.
- Projeto de fã, sem afiliação com a Wizards of the Coast. Magic: The Gathering é marca da Wizards of the Coast LLC.
