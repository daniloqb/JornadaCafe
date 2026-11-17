# Fase 06.1 — Meus Cafés e navegação

Revisão local **0.6.1 / versionCode 11**, concluída em 17/11/2026. Esquema de dados **5**, sem migração. As funcionalidades de Minhas Descobertas da [Fase 06](phase-06.md) permanecem disponíveis.

## Telas e comportamento

| Tela / rota | Resultado |
| --- | --- |
| Meus Cafés — `#/cafes` | Cabeçalho fotográfico, contagens reais de cafés, produtores e pacotes, três acessos às áreas e até três cafés recentes pela data de criação. |
| Coleção — `#/cafes/colecao` | Pesquisa, filtros, ordenação, favoritos e visualizações em grade/lista existentes. |
| Ficha — `#/cafes/:id` | Cabeçalho editorial, fotografia cadastrada, avaliação geral quando preenchida, características, produtor, pacotes, estoque e preparos relacionados. |
| Novo/editar café — `#/cafes/novo`, `#/cafes/:id/editar` | Fotografia, nome e produtor no primeiro painel; espécie, processo e torra em painéis próprios; informações adicionais expansíveis. Apenas o nome é obrigatório. |
| Produtores e origens — `#/cafes/origens` | Lista com fotografias e cafés associados; acesso aos registros de produtores, propriedades, origens e empresas torrefadoras. |
| Novo/editar produtor — `#/cafes/origens/novo?tipo=producer`, `#/cafes/origens/:id/editar` | Fotografia, nome, propriedade/origem de referência, localização e descrição; site e anotações em seção expansível. Criação contextual pelo cadastro de café preservada. |
| Pacotes — `#/cafes/pacotes` | Consulta daos pacotes existentes, saldo, data de torra, edição e correção de estoque pelos formulários atuais; acesso à ficha e ao histórico do café. |
| Configurações — `#/inicio/configuracoes` | Acesso pela engrenagem no Início. Aparência, avisos do preparo e unidades existentes. A rota antiga `#/preparar/configuracoes` continua funcionando. |

Contagens e cafés recentes usam a coleção local; não há valores de demonstração incorporados. Os recentes têm rolagem horizontal restrita à lista em telas pequenas. As fotografias genéricas dos cabeçalhos são decorativas, distintas das fotografias cadastradas nos cafés e produtores.

## Navegação, aparência e formulários

- Trocar de rota, voltar ou tocar novamente na área principal já aberta reposiciona a tela no topo. O reset atua no viewport e nos ancestrais que realmente rolam, preservando listas e outros componentes internos. Atualizações do cronômetro não acionam esse reset.
- As áreas de Cafés e Preparar mantêm a tela montada ao alternar para outra área, preservando o formulário ou a execução que estava aberta. Os filtros da coleção e da biblioteca continuam no componente existente.
- Os controles de aparência ficam em Configurações. A sincronização global permanece montada no aplicativo para que Automático responda ao sistema mesmo fora dessa tela. Escolhas explícitas e a persistência existente são mantidas.
- Campos inválidos dentro de seções recolhidas revelam seus ancestrais antes de receber foco. Altitude aceita números não negativos com ponto ou vírgula; o site usa validação de URL, e sua abertura continua limitada a HTTP/HTTPS pelo mecanismo existente.
- O Android declara `adjustResize` para o teclado virtual. Esse ajuste foi empacotado, mas ainda requer conferência no aparelho.

Os cadastros continuam usando os mesmos adaptadores, UUIDs, fotografias locais e relações. Torra textual, espécie legada, tags, avaliações opcionais e nota zero são preservadas. Editar um produtor não reescreve a propriedade ou origem dos cafés existentes. Pacotes usam as regras atuais de saldo e histórico; navegar não consome estoque.

Não foram criadas tabelas, duplicações de entidades ou migrações. O motor de preparo, os snapshots e a persistência de sessões continuam existentes.

## Referências e capturas

As três referências estão em [references/phase-06.1](references/phase-06.1/): [Meus Cafés](references/phase-06.1/meus-cafes.png), [cadastro de café](references/phase-06.1/cadastro-cafe.png) e [cadastro de produtor](references/phase-06.1/cadastro-produtor.png).

| Tela | Claro 390 px | Escuro 390 px | Desktop claro |
| --- | --- | --- | --- |
| Meus Cafés | [Captura](previews/phase-06.1/meus-cafes-light-390.png) | [Captura](previews/phase-06.1/meus-cafes-dark-390.png) | [1440 px](previews/phase-06.1/meus-cafes-light-1440.png) |
| Cadastro de café | [Captura](previews/phase-06.1/cadastro-cafe-light-390.png) | [Captura](previews/phase-06.1/cadastro-cafe-dark-390.png) | [1440 px](previews/phase-06.1/cadastro-cafe-light-1440.png) |
| Cadastro de produtor | [Captura](previews/phase-06.1/cadastro-produtor-light-390.png) | [Captura](previews/phase-06.1/cadastro-produtor-dark-390.png) | [1440 px](previews/phase-06.1/cadastro-produtor-light-1440.png) |

O [índice de capturas](previews/phase-06.1/README.md) também reúne coleção, fichas, produtores, pacotes, Início e Configurações nos dois temas. As capturas e os resultados de navegador já estavam salvos ao retomar esta entrega. Usam dados de validação isolados e não constituem capturas físicas Android. A navegação fixa aparece na posição inicial nas imagens de página inteira.

Os cabeçalhos usam assets locais: `coffees-hero.png`, `coffee-form-hero.png` e `producer-form-hero.png`. O [registro dos assets](references/phase-06.1/assets.json) conserva a origem declarada e os prompts utilizados. As imagens não representam produtos, produtores ou propriedades cadastrados pelo usuário.

## Validação

| Verificação | Evidência |
| --- | --- |
| Testes reexecutados nesta retomada | **58 testes em 12 arquivos aprovados**, incluindo regressões de rolagem e aparência. |
| TypeScript e build web reexecutados | `npm run build` aprovado. |
| Layouts registrados | [80 combinações iniciais](previews/phase-06.1/validation.json) e [80 finais](previews/phase-06.1/final-layout.json): dez telas, dois temas e larguras 320, 390, 768 e 1440 px; sem overflow da página. |
| Fluxos registrados | Cadastro/edição e fotografias de café/produtor, validação em seção recolhida, relações, nota zero, filtros, pesquisa, grade/lista, retorno ao topo, tema Automático e recarga; sem erros de execução registrados. |
| Sessão registrada | [Cronômetro, navegação e estoque](previews/phase-06.1/session-validation.json) preservados. |
| Contraste registrado | [30 telas/temas](previews/phase-06.1/contrast.json), sem falhas no método utilizado. Exclui fotografias e gradientes; não é auditoria WCAG completa. |
| Sincronização Android reexecutada | `npx cap sync android` aprovado, após o build web. |

A validação de navegador não foi repetida integralmente nesta retomada. As duas capturas representativas de Meus Cafés claro e cadastro de café escuro foram inspecionadas novamente. Leitor de tela, foco em todos os fluxos e bibliotecas extensas ainda exigem verificação específica.

## Android

O APK de desenvolvimento fica em `android/app/build/outputs/apk/debug/app-debug.apk`, com pacote `br.com.jornadacafe.app`. A compilação e a inspeção do pacote desta retomada estão registradas em [build-validation.json](previews/phase-06.1/build-validation.json).

**Nenhum aparelho foi encontrado pelo ADB nesta retomada.** Não houve instalação ou teste físico da versão 0.6.1. Permanecem pendentes teclado virtual, áreas seguras, barras do sistema, navegação/Voltar e fluxos completos no WebView do aparelho. A instalação física documentada na Fase 06 corresponde à versão 0.6.0.

Os comandos para atualizar mantendo os dados estão no [README](../README.md#instalar-ou-atualizar-no-seu-smartphone). Não foram feitos commit ou push nesta retomada.
