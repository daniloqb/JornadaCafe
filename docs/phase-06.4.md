# Fase 06.4 — Refinamento da Coleção e gerenciamento do histórico

Versão **0.6.4 / versionCode 14**, esquema **5**. Esta fase permite corrigir ou excluir experiências sem alterar a receita da biblioteca nem movimentar estoque. Não inclui backup/restauração, commit ou push.

## Coleção e componentes

As etiquetas de `CoffeeCard` passam de 13 px para **11 px em 100%**, com padding de 3 × 6 px e altura de linha 1,4. A regra usa `.coffee-area .coffee-card .coffee-tags > span`, mantém as cores, as bordas arredondadas e o intervalo de 6 px, permite múltiplas linhas e só quebra palavras como último recurso para conteúdo sem espaços. As etiquetas de outras telas mantêm seus tamanhos existentes.

O tamanho usa o token `--font-size-11`, respeitando a escala global: **9,35 / 11 / 12,65 px** em 85/100/115%. Conteúdo, filtros, estoque, avaliações comerciais e regras de cadastro são preservados.

`PreparationHistory` mantém sua estrutura e incorpora três componentes em `PreparationParameters.tsx`: `EditPreparationParameters`, `ParameterCorrectionHistory` e `DeletePreparation`. O formulário e a confirmação reutilizam `Dialog`, `Field`, `SelectField`, `Button`, `FormError` e `useFormAction`. Os títulos dos diálogos se acomodam em 320 px com texto em 115%. O foco inicial da confirmação está em **Manter preparação**; Escape também cancela.

## Campos e preservação histórica

| Campo | Correção permitida |
| --- | --- |
| Café associado | Seleção existente com pesquisa por nome. Atualiza `snapshot.coffee`, incluindo identidade e fotografia. É possível manter um café histórico removido da coleção ou retirar a associação. |
| Dose de café e água total | Gramas, números positivos e finitos, com vírgula decimal aceita pelo formulário. A proporção exibida usa os valores atuais. |
| Temperatura | Opcional, maior que 0 e até 100 °C, respeitando a validação existente. |
| Moagem | Texto livre, incluindo referências como `27/40`, sem limite universal por equipamento. |
| Moedor e filtro | Textos opcionais. |

Permanecem somente para leitura: identidade, família e versão da receita; método/técnica; tempo estimado e cronograma; despejos e pesos acumulados; passagens e tempos do timer; início/fim, duração e estado; pacote e consumo original; instruções da receita e observações originais do preparo. Eles documentam a origem ou o acompanhamento da execução; editá-los como simples parâmetros poderia contradizer os eventos registrados. A avaliação continua em seu formulário independente.

A estratégia atualiza apenas os campos permitidos do snapshot da preparação. `parameterCorrections.original` guarda **o primeiro valor de cada campo que efetivamente mudou**, e `updatedAt` registra a última correção. Campos opcionais originalmente ausentes usam `null` nesse pequeno registro de origem, para sobreviver à serialização JSON. O detalhe apresenta o primeiro valor e o valor atual. Não se duplica o snapshot inteiro nem se cria outra coleção de preparações. Não é um log de todas as revisões intermediárias.

A identidade e a versão da receita de origem, inclusive o `coffeeId` de referência da receita, são preservadas. O café da experiência continua sendo `snapshot.coffee`, já utilizado pelos seletores existentes. A receita atual da biblioteca não substitui dados históricos. O snapshot possui valores efetivos corrigidos, enquanto suas etapas permanecem originais; por isso o formulário e o detalhe explicam essa distinção. Corrigir água **não recalcula despejos nem cronograma** e não representa medição automática de água efetivamente consumida.

Salvar envia uma única mutação com uma lista explícita de campos permitidos; digitar não grava dados. Cancelar desmonta o formulário e descarta os valores locais. Atualizar a avaliação altera somente a avaliação, sem restaurar parâmetros; corrigir parâmetros mantém a avaliação, incluindo zero e campos ausentes.

Fotografias ainda referenciadas por preparos, sessões ou identidades originais corrigidas são preservadas quando o cadastro de origem troca ou remove sua fotografia. `photoIsReferenced` verifica esses vínculos antes da limpeza existente de mídia.

## Exclusão, relacionamentos e estoque

O detalhe oferece **Excluir preparação** em uma área secundária de gerenciamento. O diálogo usa a mensagem solicitada sobre Histórico, Jornada, Descobertas e estoque, oferece **Manter preparação** primeiro e exige confirmação explícita para excluir. A ação destrutiva usa os tokens terracota existentes nos dois temas.

`deletePreparation` remove o registro e desvincula todas as reflexões cujo vínculo seja exatamente aquela preparação, dentro da mesma transação. Texto, título, data pessoal, categoria, destaque e identidade das reflexões são mantidos. Outras reflexões e entidades não são alteradas. A data técnica de atualização das reflexões desvinculadas é atualizada.

A avaliação está embutida na preparação; não existe tabela dependente para remover. Associações das reflexões ficam nos payloads e não têm cascade SQL. As referências utilizadas nas comparações são seleções temporárias, saneadas conforme os registros disponíveis. Ao terminar, `location.replace` troca a rota de detalhe pelo Histórico. Uma tentativa repetida de excluir um registro já removido é idempotente. `useFormAction` também usa uma trava imediata por referência para impedir duas chamadas antes de o React atualizar o estado dos botões.

**Editar e excluir não alteram `packages`, seus saldos, seus ajustes nem `consumedGrams`.** O pacote do snapshot continua identificado como **Pacote original do consumo**, inclusive se o café associado for corrigido. A dose corrigida descreve a experiência; não reescreve a dose anteriormente descontada.

Os lançamentos de consumo vivem dentro de `CoffeePackage.adjustments`. O `id` originalmente igual ao UUID da preparação é a identidade do evento de estoque, sem chave estrangeira, navegação ou relacionamento obrigatório com `preparations`. A justificativa textual conserva a origem daquele consumo, mesmo após remover o registro do histórico. Esses eventos são preservados integralmente para manter o saldo e a rastreabilidade; não há devolução automática, nova baixa nem transferência para outro pacote. Correções de saldo continuam disponíveis no fluxo próprio de estoque.

Se houver uma sessão ativa com o mesmo ID, o domínio recusa edição e exclusão e a interface desabilita as ações. Uma sessão diferente pode continuar existente durante a manutenção do histórico, sem ter seu snapshot alterado. O motor do timer e seus fluxos permanecem os existentes.

## Jornada, Descobertas e persistência

O `CollectionProvider.mutate` existente aguarda o commit e recarrega a coleção compartilhada. Todos os consumidores recebem o snapshot corrigido ou a coleção sem a preparação removida. Jornada e Descobertas mantêm seus seletores puros e seus cálculos em memória; não foi criado cache persistente de indicadores.

Isso atualiza filtros e contagens do Histórico, preparações na ficha do café, linha do tempo, marcos, variedade de cafés, avaliações por período, perfil sensorial, frequências, grupos por café, observações, hipóteses e evidências. Reflexões associadas a uma preparação passam a acompanhar o café corrigido; depois da exclusão, continuam como textos pessoais sem associação inválida.

`ExperienceComparison` remove IDs excluídos ou reatribuídos da seleção e resolve a ausência de um grupo de café. Se restar menos de dois preparos, apresenta o seletor existente. O rótulo da moagem passa a **Moagem registrada**, pois pode representar uma correção posterior. As regras analíticas permanecem as da Fase 06: zero válido, ausência distinta de zero, número de evidências explícito, limiares mínimos e ausência de inferência causal.

As mutações compartilhadas são aplicadas dentro das transações dos adaptadores. IndexedDB já grava as diferenças em todas as tabelas de uma única transação. SQLite inclui as duas novas operações no caminho transacional de `collectionChanges`. As preparações e reflexões usam payload JSON, portanto o campo opcional de proveniência **não exige mudança de esquema nem migração**. Os testes exercitam os adaptadores reais: fake IndexedDB e o adaptador SQLite conectado ao SQLite em memória do Node, substituindo somente a ponte nativa.

## Arquivos modificados

| Arquivo | Responsabilidade |
| --- | --- |
| `src/domain/preparation.ts` | Tipos de correção, valores originais, validações, edição e exclusão seguras. |
| `src/domain/photo-references.ts` | Verificação de referências atuais e históricas de fotografias. |
| `src/data/sqlite-storage.ts` | Persistência transacional das novas operações. |
| `src/data/CollectionContext.tsx` | Proteção da mídia histórica na limpeza de fotos. |
| `src/data/preparation-history.test.ts` | Casos novos de persistência, análises, estoque, sessões e falhas transacionais. |
| `src/components/forms.tsx` | Trava imediata contra operações duplicadas e foco inicial configurável de diálogos. |
| `src/features/preparations/PreparationParameters.tsx` | Formulário, proveniência e confirmação de exclusão. |
| `src/features/preparations/PreparationHistory.tsx` | Integração das ações e identificação explícita do pacote original. |
| `src/features/discoveries/ExperienceComparison.tsx` | Saneamento de seleções e apresentação da moagem corrigida. |
| `src/theme/theme.css` | Tags menores, espaçamentos das ações e títulos de diálogos estreitos. |
| `package.json`, `package-lock.json`, `android/app/build.gradle` | Versão 0.6.4 / código 14, sem novas dependências. |
| `README.md`, `docs/phase-06.4.md`, `docs/previews/phase-06.4/` | Documentação e evidências desta fase. |

## Validação e builds

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | Aprovado. |
| `npm test` | **84 testes em 15 arquivos aprovados**, incluindo 16 casos novos. |
| `npm run build` | Bundle de produção aprovado. Aviso de chunk principal acima de 500 kB: 507,20 kB minificado, 146,97 kB gzip. |
| Matriz visual | **192 combinações**, sem overflow horizontal da página ou dos diálogos e sem cortes dimensionais nos elementos verificados. |
| Fluxos pelo navegador | Cancelar edição, corrigir café/dose/água/moagem/temperatura/moedor/filtro, proporção imediata, rejeitar água infinita e temperatura inválida, avaliação independente com zero, filtros por café, comparação atualizada e seleção saneada. |
| Exclusão pelo navegador | Cancelar mantém o registro; foco inicial em Manter preparação; dois acionamentos da confirmação excluem uma vez, retornam ao Histórico e preservam estoque/reflexão. Remoção mantida após recarga completa. |
| Validação complementar | Edição reaberta após recarga mantém a água corrigida; Escape mantém o registro; digitação preserva rolagem e rota; editar/excluir outro histórico preserva sessão pausada com checkpoint de 45 s, snapshot e execução. |
| Jornada e Descobertas | Linha do tempo, contagens, grupos, evidências, médias por campo, frequências e invalidação de hipóteses/associações sem amostras suficientes verificados. Zero e ausência permanecem distintos. |
| Atomicidade | Falhas simuladas ao gravar a reflexão revertem toda a exclusão em **IndexedDB e SQLite**. Dados inválidos não causam gravações parciais. |
| `npx cap sync android` | Aprovado, com os dois plugins existentes. |
| `./gradlew assembleDebug --offline` | **BUILD SUCCESSFUL**. Avisos de `flatDir`; a primeira execução também informou diferença entre versões de XML do SDK. |
| Inspeção do APK | Pacote `br.com.jornadacafe.app`, **0.6.4 / código 14**, com **22 arquivos web idênticos ao `dist/`**. |
| `git diff --check` | Aprovado. |

Os testes novos usam bancos isolados e fixtures com cafés diferentes, avaliações zero e ausentes, pacote com consumo, reflexões e sessões. Cobrem preservação dos primeiros valores e de campos estruturais, correções sucessivas, persistência após reabrir ambos os adaptadores, exclusão idempotente, falhas transacionais e ausência de ressurreição por avaliação/finalização tardia. Os critérios analíticos existentes não foram alterados.

A matriz percorre **Coleção, detalhe corrigido, Editar parâmetros, Excluir preparação, Histórico após exclusão, linha do tempo após exclusão, observações e perfil sensorial após exclusão** nas larguras 320/390/768/1440, temas Claro/Escuro e escalas 85/100/115%. A checagem automatizada mede página, diálogos e overflow de títulos, botões, etiquetas, summaries e controles de formulário; seletores nativos conservam sua apresentação existente. Capturas foram inspecionadas visualmente, incluindo o título completo do formulário em 320 px/115%.

Evidências: [matriz e fluxos](previews/phase-06.4/validation.json), [validação complementar](previews/phase-06.4/extra-validation.json) e [build/APK](previews/phase-06.4/build-validation.json). Os roteiros pontuais ficaram em `/tmp/jornada064-cdp.mjs`, `/tmp/jornada064-browser.mjs`, `/tmp/jornada064-extra.mjs` e `/tmp/jornada064-artifacts.py`, sem adicionar dependências ao projeto.

## Capturas e APK

São **48 capturas**, com dados fictícios e assets locais já existentes: [índice completo](previews/phase-06.4/README.md).

| Tela | Claro · 390 px / 100% | Escuro · 320 px / 115% |
| --- | --- | --- |
| Coleção | [Captura](previews/phase-06.4/colecao-light-100-390.png) | [Captura](previews/phase-06.4/colecao-dark-115-320.png) |
| Detalhe | [Captura](previews/phase-06.4/detalhe-light-100-390.png) | [Captura](previews/phase-06.4/detalhe-dark-115-320.png) |
| Editar parâmetros | [Captura](previews/phase-06.4/editar-parametros-light-100-390.png) | [Captura](previews/phase-06.4/editar-parametros-dark-115-320.png) |
| Excluir preparação | [Captura](previews/phase-06.4/excluir-preparacao-light-100-390.png) | [Captura](previews/phase-06.4/excluir-preparacao-dark-115-320.png) |
| Histórico após exclusão | [Captura](previews/phase-06.4/historico-apos-excluir-light-100-390.png) | [Captura](previews/phase-06.4/historico-apos-excluir-dark-115-320.png) |
| Jornada após exclusão | [Captura](previews/phase-06.4/jornada-apos-excluir-light-100-390.png) | [Captura](previews/phase-06.4/jornada-apos-excluir-dark-115-320.png) |
| Descobertas após exclusão | [Captura](previews/phase-06.4/descobertas-apos-excluir-light-100-390.png) | [Captura](previews/phase-06.4/descobertas-apos-excluir-dark-115-320.png) |

Os diálogos usam capturas do viewport; o formulário continua acessível por rolagem. Nas capturas de página inteira, a navegação fixa aparece na posição do viewport inicial, como nas fases anteriores.

APK de desenvolvimento: [app-debug.apk](../android/app/build/outputs/apk/debug/app-debug.apk).

## Pendências e limites

Na entrega inicial não houve instalação no aparelho. A atualização posterior solicitada pelo usuário está registrada abaixo. Permanecem para conferência física os fluxos de edição/exclusão, teclado virtual, leitor de tela, preferências do Android, áreas seguras e persistência após reiniciar o aparelho. O teste SQLite no host valida o adaptador e as transações, sem substituir os testes funcionais completos da ponte nativa no Android.

A proveniência conserva o primeiro valor por campo e o estado corrigido atual; não registra cada edição intermediária. Etapas, execução e estoque continuam somente para leitura neste formulário, conforme as razões descritas acima. Os testes visuais automatizados verificam dimensões e elementos relevantes; não constituem auditoria completa de acessibilidade.

## Atualização da instalação principal

Em **21/11/2026, às 10:54 (America/Sao_Paulo)**, a pedido do usuário, o APK foi gerado novamente e instalado no smartphone **22101316G** com `adb install -r`, que retornou **Success**. O pacote `br.com.jornadacafe.app` foi atualizado de **0.6.3 / código 13** para **0.6.4 / código 14**, sem desinstalação ou limpeza de dados.

A comparação SHA-256 realizada com o aplicativo parado, imediatamente antes e depois da instalação e antes da primeira abertura, confirmou que **o banco SQLite e as 16 fotografias permaneceram idênticos**. A data original de instalação também foi preservada. Nenhum conteúdo pessoal foi copiado para o repositório.

A abertura a frio retornou **Status: ok**, e uma captura temporária confirmou o Início carregado no aparelho. O aplicativo ficou aberto nessa tela, sem edição de registros. A captura permaneceu em `/tmp`, fora do repositório. Esta conferência comprova a instalação e a preservação dos arquivos durante a atualização, sem substituir os testes físicos das funcionalidades listados nas pendências. Evidência: [validação da instalação](previews/phase-06.4/install-validation.json).
