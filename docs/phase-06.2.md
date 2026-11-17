# Fase 06.2 — Início e Histórico de Preparações

Entrega local em **17/11/2026**, versão **0.6.2 / versionCode 12**, pacote Android **br.com.jornadacafe.app**. Esquema de dados **5**, sem migração. Sem commit ou push.

## Implementação

O Início apresenta a proposta **Conhecer → Preparar → Registrar → Aprender** pelo título, subtítulo e quatro cartões da referência. A engrenagem permanece no canto superior direito e abre `#/inicio/configuracoes`. Os cartões inteiros abrem Meus Cafés, Preparar, Minha Jornada e Minhas Descobertas; abrir Preparar não inicia uma sessão.

Os resumos de estoque/coleção, estante e atividade recente do Início anterior deram lugar aos quatro caminhos. A coleção, seus indicadores e os cafés recentes continuam em Meus Cafés; experiências e reflexões continuam em Minha Jornada. Os recursos de cadastro e consulta permanecem acessíveis nessas áreas. A tela inicial não calcula conclusões, exibe estatísticas ilustrativas ou presume aprendizados.

O Histórico mantém **`#/preparar/historico`** e o detalhe **`#/preparar/historico/:id`**. O novo cabeçalho usa Voltar, identificação da tela, fotografia de café filtrado, título **Minhas Preparações** e o subtítulo solicitado. A superfície arredondada integra filtros, contagem, ordenação e cartões.

Cada cartão apresenta nome histórico do café, método e receita, data local da experiência, avaliação do preparo quando válida e acesso ao detalhe. A ausência de café, fotografia ou avaliação tem apresentação neutra. Preparos interrompidos continuam na lista, identificados por texto. A nota **0/10** é exibida; ausência não vira zero, e a avaliação comercial do café não substitui a do preparo.

O detalhe existente conserva parâmetros, versão da receita, moagem, execução e edição da avaliação. Os cartões usados nas fichas de café por `PreparationCards` permanecem existentes; a nova composição se limita à listagem principal do Histórico. Não foram adicionadas ações de repetição ou exclusão que não existiam.

### Componentes e arquivos

| Arquivo | Alteração nesta fase |
| --- | --- |
| [HomePage.tsx](../src/features/home/HomePage.tsx) | Nova composição de apresentação e quatro cartões de navegação. |
| [CollectionHeading.tsx](../src/features/coffees/CollectionHeading.tsx) | Cabeçalho existente ampliado com ações no topo, classe de composição, rótulo com quebra de linha e retorno pelo histórico, opcionais. |
| [ui.tsx](../src/components/ui.tsx) | `BackLink` aceita classe adicional, mantendo seu comportamento anterior. |
| [PreparationHistoryList.tsx](../src/features/preparations/PreparationHistoryList.tsx) | Listagem editorial, filtros, contagem, ordenação, estados vazios e carregamento incremental. |
| [PreparationHistory.tsx](../src/features/preparations/PreparationHistory.tsx) | Integra a nova lista e mantém seu estado ao abrir/fechar detalhes; detalhamento preservado. |
| [history-view.ts](../src/features/preparations/history-view.ts) | Seletores puros de apresentação, datas locais, opções históricas e validação da nota pelo critério existente. |
| [history-view.test.ts](../src/features/preparations/history-view.test.ts) | Cinco testes de filtros, ordem, datas, snapshots, integridade e avaliações. |
| [App.tsx](../src/app/App.tsx) | Classe de composição para as duas telas, sem substituir o mecanismo de navegação ou de rolagem. |
| [theme.css](../src/theme/theme.css) | Estilos específicos, superfícies e componentes existentes, gradientes, responsividade e foco. |
| [package.json](../package.json), [package-lock.json](../package-lock.json), [build.gradle](../android/app/build.gradle) | Versão 0.6.2 e código Android 12. |

São reutilizados `CollectionHeading`, o padrão `collection-entry-link`, `CoffeePhoto`, `Card`, `Button`, `ActionLink`, `BackLink`, `Field` e `EmptyState`. Fraunces, DM Sans, cores semânticas, sombras e navegação continuam no design system existente. Não há biblioteca visual, fonte ou dependência nova.

## Filtros, ordenação e datas

A inspeção inicial encontrou uma listagem sem pesquisa, filtros ou seletor de ordenação. O comportamento existente era ordenar por `startedAt`, do mais recente para o mais antigo. Essa ordem permanece padrão.

| Controle | Comportamento |
| --- | --- |
| Período | Todos, últimos 7/30/90 dias ou intervalo personalizado, com campos de data nativos. Os períodos rápidos incluem o dia local atual; os limites são inclusivos. |
| Método | Identidades dos métodos nos preparos, sem confundir método com técnica ou receita. |
| Café | Identidades dos cafés presentes nos preparos. Cafés históricos continuam filtráveis mesmo após a exclusão do cadastro original. |
| Contagem | Total após combinar os filtros; não apenas os primeiros itens renderizados. |
| Ordenação | Mais recentes e Mais antigas, usando a data do preparo e desempate estável por ID. |
| Limpar filtros | Disponível com critérios ativos e no estado sem resultados. Não altera a ordenação escolhida. |
| Mostrar mais | Renderiza 24 itens inicialmente e acrescenta 24 por ação, sem biblioteca de virtualização. |

As opções conservam o nome do snapshot mais recente para cada identidade. Os cartões continuam exibindo o nome de cada experiência; nenhuma receita ou método atual é usado para reconstruí-los.

A data é `startedAt`, como antes, formatada em `pt-BR` no fuso local do ambiente. `updatedAt` e a data da avaliação não substituem a data da experiência. Os testes web emularam **America/Sao_Paulo**. Filtros, ordenação e limite são estados da interface, sem estatísticas ou preferências persistidas novas.

## Integridade e navegação

**Nenhuma alteração nos modelos, UUIDs, tabelas, esquema SQLite/IndexedDB ou regras de negócio.** Preparos, snapshots, receitas e versões, pacotes, saldo, histórico de estoque, sessões, reflexões e descobertas mantêm os mecanismos existentes.

A lista lê `Preparation.snapshot` e `Preparation.evaluation`. A imagem utiliza o identificador de fotografia guardado no snapshot do café; se a imagem não estiver disponível, `CoffeePhoto` mantém a apresentação neutra. Não é usada fotografia genérica como se fosse um preparo real do usuário.

O teste de navegador alterou o nome atual do café, o método e a receita da fixture, inclusive versão/moagem, mantendo os snapshots antigos distintos. A lista e o detalhe continuaram mostrando os dados históricos. A comparação integral da coleção antes/depois de navegar e filtrar foi idêntica; a recarga também preservou os registros.

O motor de preparo e o consumo de estoque não foram modificados. Uma sessão isolada recuperada com **45 segundos** manteve ID, etapa e snapshot ao navegar; ao retomar, o timer avançou, preservou a rolagem e voltou a pausar sem alterar estoque.

O reset de rolagem da Fase 06.1 continua único. Abertura de telas, retorno e seleção repetida da área principal abrem no topo. Filtrar, ordenar e atualizar o timer não acionam outro reset. O estado dos filtros do Histórico é mantido ao abrir um detalhe e voltar. A barra principal conserva cinco áreas e o estilo aprovado; o Histórico não ganhou uma sexta entrada.

A aparência permanece exclusivamente em Configurações. A sincronização global de Automático continua ativa fora dessa tela. O teste confirmou a mudança do sistema para escuro após sair das Configurações.

## Referência visual e responsividade

A imagem recebida contém as duas telas lado a lado e foi preservada em [references/phase-06.2/inicio-historico.png](references/phase-06.2/inicio-historico.png), sem alteração. Textos, cafés, receitas, datas, notas e contagens ilustrativos não foram incorporados à coleção real.

A implementação acompanha o cabeçalho espresso com fotografia à direita, título editorial à esquerda, traço terracota no Início, conteúdo creme sobreposto ao cabeçalho, cartões arredondados, ícones com fundo suave e filtros em cápsulas. Os dois temas mantêm a hierarquia, com as superfícies escuras existentes.

Adaptações funcionais à referência:

- A navegação conserva o estilo já aprovado na Fase 06.1.
- Em 320 px, os filtros são empilhados para manter texto e alvos de toque legíveis; nas demais larguras ficam em três colunas.
- No desktop, os caminhos do Início ficam em duas colunas e a lista do Histórico tem largura máxima de 920 px. As fotografias ficam contidas à direita para preservar o assunto completo.
- Os estados Concluído/Interrompido permanecem em texto. A nota usa o token terracota funcional, mais escuro no tema claro para contraste.
- Gradientes mais fortes protegem a leitura quando a foto se aproxima do texto; as fotografias são decorativas, com `alt` vazio.
- A página pode rolar verticalmente em smartphones. Foi conferido que o último cartão pode ficar completamente acima da navegação fixa ao rolar.

### Assets locais

O Início reutiliza [discoveries-hero.png](../public/images/discoveries-hero.png), da Fase 06. Para o Histórico foi gerado [preparations-hero.png](../public/images/preparations-hero.png) com a skill [imagegen](/home/user/.codex/skills/.system/imagegen/SKILL.md), pelo recurso integrado `image_gen`. A fotografia representa uma cena genérica de café filtrado; foi inspecionada e salva no projeto para funcionamento offline.

O [registro de assets](references/phase-06.2/assets.json) guarda os caminhos, a reutilização da xícara e o prompt completo da nova fotografia. Não há geração de imagens em tempo de execução.

## Qualidade e evidências

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | **63 testes em 13 arquivos aprovados**; os 58 anteriores e cinco novos. |
| `npm run build` | TypeScript e bundle de produção aprovados. |
| Navegador isolado | **16 combinações**: duas telas, dois temas e larguras **320, 390, 768 e 1440 px**, sem overflow horizontal da página ou exceções de execução. |
| Início | Quatro cartões/destinos, cinco áreas, Configurações, ausência de seletor de aparência, Automático global e retorno ao topo aprovados. |
| Histórico | Contagem, ordem crescente/decrescente, filtros combinados, intervalo personalizado, limpeza, detalhe e retorno com filtros aprovados. Notas 9/10, 0/10 e ausência conferidas. |
| Estados vazios | Ausência de preparos e nenhum resultado filtrado conferidos como estados distintos, com ações funcionais. |
| Histórico maior | **63 registros isolados**, contagem correta e carregamento de 24 para 48 cartões. Não constitui benchmark de bibliotecas extensas. |
| Integridade | Coleção idêntica após navegação/filtros e recarga; sessão pausada e timer retomado preservados; estoque inalterado. |
| Teclado | Ativação de cartão por Enter, sequência por Tab e foco visível conferidos. |
| Contraste | Sem falhas na amostragem das superfícies sólidas. Nos cabeçalhos, mínimo de **6,08:1** nas áreas de texto amostradas sobre as fotografias. |
| `npx cap sync android` | Aprovado após o build final. |
| `./gradlew assembleDebug --offline` | **BUILD SUCCESSFUL**. Avisos de `flatDir` do projeto/dependências não impediram a compilação. |
| Inspeção do APK | Pacote principal, versão **0.6.2 / código 12** e **22 arquivos web idênticos ao `dist/`**, incluindo fotografia e fontes locais. |
| `git diff --check` | Aprovado. |

Resultados: [fluxos e layouts](previews/phase-06.2/validation.json), [contraste](previews/phase-06.2/contrast.json) e [build/APK](previews/phase-06.2/build-validation.json).

As verificações web usaram Chrome headless com perfil temporário e origem localhost isolada. As fixtures são identificadas como validação e não foram inseridas na biblioteca real do usuário. O script pontual de automação ficou em `/tmp/jornada-phase062-browser.mjs`, sem dependência nova no projeto.

A medição de contraste usou cores computadas para textos em superfícies sólidas e amostras a cada três pixels atrás das áreas de texto dos cabeçalhos, ocultando temporariamente a tipografia sem alterar o layout. É uma verificação automatizada localizada; não representa auditoria WCAG completa, teste de leitor de tela ou cobertura de todos os controles/estados nativos.

### Capturas

| Tela | Claro 390 px | Escuro 390 px | Claro 1440 px |
| --- | --- | --- | --- |
| Início | [Captura](previews/phase-06.2/inicio-light-390.png) | [Captura](previews/phase-06.2/inicio-dark-390.png) | [Captura](previews/phase-06.2/inicio-light-1440.png) |
| Histórico | [Captura](previews/phase-06.2/historico-light-390.png) | [Captura](previews/phase-06.2/historico-dark-390.png) | [Captura](previews/phase-06.2/historico-light-1440.png) |
| Filtros aplicados | [Captura](previews/phase-06.2/historico-filtrado-light-390.png) | [Captura](previews/phase-06.2/historico-filtrado-dark-390.png) | — |
| Sem preparos | [Captura](previews/phase-06.2/historico-vazio-light-390.png) | [Captura](previews/phase-06.2/historico-vazio-dark-390.png) | — |

O [índice de capturas](previews/phase-06.2/README.md) inclui desktop escuro e nenhum resultado filtrado. São capturas de página inteira do navegador; a navegação fixa aparece na posição do viewport inicial, mesmo quando a imagem inclui conteúdo abaixo dele. Isso não representa conteúdo permanentemente inacessível na tela: a rolagem e o espaço final foram verificados.

## Android e pendências

APK de desenvolvimento: [android/app/build/outputs/apk/debug/app-debug.apk](../android/app/build/outputs/apk/debug/app-debug.apk). A assinatura de produção está fora desta entrega.

Na entrega inicial, o ADB detectou um aparelho modelo **22101316G** e uma consulta de leitura confirmou a versão **0.6.0 / código 10**. A atualização posterior, solicitada pelo usuário, está registrada abaixo. Nenhuma fixture foi inserida na biblioteca do aparelho.

Permanecem pendentes os fluxos completos no WebView Android, áreas seguras e barras do sistema em todas as situações, teclado virtual nos filtros, Voltar nativo, leitor de tela e uso prolongado. A conferência de instalação e abertura abaixo não substitui essa validação completa. Os comandos de atualização estão no [README](../README.md#instalar-ou-atualizar-no-seu-smartphone).

### Atualização da instalação principal

Em **17/11/2026, às 20:22 (America/Sao_Paulo)**, a pedido do usuário, foi executado `adb install -r` com o APK da Fase 06.2. O retorno foi **Success**. O Android confirmou **versionName 0.6.2 / versionCode 12**, mantendo o pacote `br.com.jornadacafe.app`. A atualização usou a instalação existente, sem desinstalação ou limpeza de dados.

A abertura a frio retornou **Status: ok**. Uma captura temporária confirmou a nova tela inicial no tema escuro, com fotografia, título, cartões e navegação carregados. O aplicativo ficou aberto no Início. A captura ficou apenas em `/tmp`, sem dados de validação na biblioteca do usuário. Não foram editados registros nem executados preparos nesta conferência.
