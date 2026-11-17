# Fase 06.3 — Tipografia e controles do preparo guiado

Entrega local em **17/11/2026**, versão **0.6.3 / versionCode 13**, pacote **br.com.jornadacafe.app**. Esquema de dados **5**, sem migração. Sem commit, push ou início de outra fase.

## 1. Tipografia padrão refinada

Os cartões passaram a compartilhar títulos Fraunces de **18 px**, descrições DM Sans de **14 px** e metadados funcionais de **12–13 px**, considerando raiz padrão do navegador de 16 px e escala 100%. A altura acompanha o conteúdo, sem cortar textos longos para obter cartões menores.

| Componente / área | Antes no smartphone | Novo padrão em 100% |
| --- | --- | --- |
| Cartões do Início | Título 22 px, descrição 14 px | Título 18 px, descrição 14 px; ícones em áreas mais compactas. |
| Entradas de Meus Cafés | Título 26 px, descrição 16 px | Título 18 px, descrição 14 px. |
| Cartão de café | Título 25 px | Título 18 px; descrição 14 px. |
| Histórico de Preparações | Título 24 px, descrição 14 px | Título 18 px, descrição 14 px e metadados 12 px. |
| Métodos e cartões da biblioteca | Títulos de até 26 px | Título 18 px; os itens compactos de receitas que já usavam 18 px mantêm essa hierarquia. |
| Cartões de Minha Jornada | Token de cartão 23 px; cabeçalhos com exceções maiores | Token e cabeçalhos de cartão 18 px. |
| Entradas de Minhas Descobertas | Título 25 px | Título 18 px, descrição 14 px. |
| Seções de formulários e Configurações | Títulos geralmente 22–31 px | Títulos de cartão/seção expansível 18 px, descrição 14 px. |

Produtores, fichas de café, informações técnicas e painéis também reutilizam os tokens refinados. Os títulos editoriais das páginas mantêm seus tamanhos e Fraunces. Contadores, métricas e cronômetro continuam diferenciados dos textos explicativos. O tamanho reduzido dos cartões não foi aplicado indiscriminadamente aos números do preparo ou à instrução principal da etapa.

## 2. Configuração global de texto

A seção **Tamanho do texto** está em `#/inicio/configuracoes`, também disponível pela rota antiga de Configurações. Ela contém descrição, slider, percentual, prévia com título/descrição/metadado e a ação **Restaurar tamanho padrão**.

O range usa posições **0 a 4**, mapeadas exclusivamente a **85%, 90%, 100%, 110% e 115%**. Não oferece os valores intermediários 95% ou 105%. O valor acessível anuncia o percentual, com Menor/Padrão/Maior nos pontos correspondentes. O controle nativo funciona por toque e teclado.

A alteração é imediata. A prévia usa os mesmos tokens dos cartões reais. Restaurar volta a **100%**, que corresponde à tipografia refinada desta fase.

### Aplicação e persistência

- [typography.css](../src/theme/typography.css) centraliza os comprimentos de fonte, calculados com `rem` e `--user-font-scale`. A raiz HTML não recebe tamanho de fonte fixo nem zoom. Usar `rem` nos valores tipográficos conserva a relação com a preferência de fonte do navegador.
- [theme.css](../src/theme/theme.css) consome esses comprimentos e os tokens semânticos. Os títulos responsivos também multiplicam seu tamanho pela escala; fontes relativas em `em` herdam a escala uma única vez. Espaçamentos, fotografias, ícones, raios e dimensões de layout não são multiplicados pela preferência.
- [text-size.ts](../src/theme/text-size.ts) valida as cinco escolhas, aplica a variável global e persiste **somente** a chave `jornada-cafe:text-size` em `localStorage`, seguindo o mecanismo já usado pela aparência. Preferência ausente ou inválida resulta em **100%**.
- [index.html](../index.html) restaura a preferência antes de CSS/React, evitando a troca inicial de tamanho após carregar a tela. O teste permanente executa esse script real para conferir sua compatibilidade com as cinco escolhas.
- [App.tsx](../src/app/App.tsx) mantém a sincronização global, inclusive eventos `storage`. O controle pode ser desmontado ao sair de Configurações sem perder a preferência.
- Uma falha de gravação mantém a escolha na sessão e informa que ela não pôde ser salva. O tema usa sua chave e lógica existentes; mudar o tamanho não redefine Claro/Escuro/Automático, nem o inverso.

Não há `transform: scale()`, biblioteca de slider, bloqueio de ampliação do navegador ou alteração de `text-size-adjust`. Os cartões acomodam o texto por fluxo normal. A página não é reposicionada pelo mecanismo de navegação quando o usuário move o slider, digita ou acompanha o timer; o reflow natural do texto pode alterar as posições relativas na página.

## 3. Finalizar e Cancelar

Em [PreparationRun.tsx](../src/features/preparations/PreparationRun.tsx), os controles existentes ganharam rótulos visíveis **Finalizar** e **Cancelar**, ícones de confirmação/cancelamento e nomes acessíveis explicativos.

O contêiner usa duas colunas iguais, `repeat(2, minmax(0, 1fr))`, com espaçamento de 12 px. Os botões preenchem as colunas, têm a mesma altura, raio de 14 px e área mínima de 50 px. Finalizar utiliza os tokens de confirmação oliva; Cancelar utiliza terracota funcional e cores de texto apropriadas a cada tema.

Os callbacks continuam sendo **`openDialog('complete')`** e **`openDialog('interrupt')`**. O componente apenas abre os mesmos fluxos após pausar a sessão:

| Ação | Comportamento preservado e verificado |
| --- | --- |
| Finalizar antes da última etapa | Confirma a conclusão, avisa que as demais etapas não serão marcadas como acompanhadas, preserva snapshot/execução real e desconta uma única dose ao salvar com pacote. |
| Cancelar | Abre a confirmação de interrupção. Salvar sem consumo não altera o saldo; consumir exige o checkbox explícito. Não cria avaliação automática. |
| Descartar sem registro | Mantém a confirmação adicional; remove a sessão sem criar preparo e sem descontar estoque. |
| Última etapa | O par antecipado não é duplicado: permanece **Finalizar preparo** no grupo principal e apenas **Cancelar** no grupo secundário. A conclusão registra as passagens efetivamente acompanhadas. |

Dois acionamentos rápidos da confirmação também foram testados: houve um único registro e um único consumo. Nenhuma lógica de finalização, idempotência, cronômetro ou estoque foi alterada.

## 4. Arquivos modificados e integridade

| Arquivo | Responsabilidade |
| --- | --- |
| [TextSizeControl.tsx](../src/theme/TextSizeControl.tsx) | Nova seção em Configurações, slider, prévia, percentual e restauração. Reutiliza `Card` e `Button`. |
| [text-size.ts](../src/theme/text-size.ts) | Preferência visual e sincronização. |
| [text-size.test.ts](../src/theme/text-size.test.ts) | Cinco testes novos de normalização, inicialização, persistência, restauração e falha de armazenamento. |
| [typography.css](../src/theme/typography.css) e [theme.css](../src/theme/theme.css) | Tokens de tamanho, escala, refinamento dos cartões e layout dos controles. |
| [PreparationSettings.tsx](../src/features/prepare/PreparationSettings.tsx) | Integração da seção de texto, preservando aparência e avisos. |
| [App.tsx](../src/app/App.tsx) e [index.html](../index.html) | Sincronização global e restauração antes do primeiro render. |
| [PreparationRun.tsx](../src/features/preparations/PreparationRun.tsx) | Rótulos, ícones e classes dos dois controles; callbacks preservados. |
| [package.json](../package.json), [package-lock.json](../package-lock.json), [build.gradle](../android/app/build.gradle) | Versão 0.6.3 / código 13. Dependências permanecem iguais. |

**Esquema 5 preservado.** Não houve alteração nos adaptadores, modelos de domínio, UUIDs, fotografias, cafés, produtores, pacotes, receitas/versões, snapshots, avaliações, reflexões ou descobertas. `BrewContext`, o motor de tempo e o mecanismo de reset de rolagem permanecem sem alterações.

A comparação integral da coleção antes/depois de percorrer as telas e alterar preferências foi idêntica. As verificações que finalizam ou interrompem sessões usaram apenas fixtures de perfis de navegador isolados, com os descontos esperados conferidos a cada ação. Nenhum dado real foi usado como exemplo ou alterado.

## 5. Testes e builds

| Verificação executada | Resultado |
| --- | --- |
| `npm test` | **68 testes em 14 arquivos aprovados**, incluindo os 63 anteriores e cinco novos. |
| `npm run build` | TypeScript e bundle de produção aprovados. |
| Matriz das telas | **456 combinações**: 19 telas, dois temas, escalas 85/100/115% e larguras 320/390/768/1440 px. Sem overflow horizontal ou cortes detectados nos títulos/botões/seções verificados. |
| Cinco posições do slider | Verificadas por teclado; prévia e percentual imediatos. |
| Preferência e temas | 90% preservados após navegar/recarregar; Automático reagiu a claro e escuro e continuou independente do tamanho. Restauração a 100% e evento `storage` conferidos. |
| Escala sem zoom | Raiz permaneceu em 16 px; ícones e padding não mudaram entre 90% e 115%. Simulação de raiz do navegador em 20 px ampliou proporcionalmente o texto. |
| Controles do preparo | **24 combinações**: dois temas, três escalas e quatro larguras. Mesma linha, larguras/alturas equivalentes, textos completos e alvos maiores que 44 px. |
| Sessões | Navegação manteve 45 s e a etapa. Em 115%, retomar avançou o timer sem reinício ou reset de rolagem; pausa preservou ID/snapshot/estoque. |
| Finalização/cancelamento | Antecipada, interrupção com/sem consumo, descarte e conclusão na última etapa aprovados. Dois acionamentos rápidos não duplicaram registro/consumo. |
| Formulário | Digitar não acionou reset de rolagem. Cadastro de café e produtor verificados na matriz, inclusive 115%. |
| Contraste dos novos botões | Mínimo **5,87:1** entre texto e fundo no estado normal, nos dois temas. |
| `npx cap sync android` | Aprovado. |
| `./gradlew assembleDebug --offline` | **BUILD SUCCESSFUL**. Avisos de `flatDir` não impediram o build. |
| Inspeção do APK | Pacote principal, **0.6.3 / código 13**, com **22 arquivos web idênticos ao `dist/`**. |
| `git diff --check` | Aprovado. |

Evidências: [validação principal](previews/phase-06.3/validation.json), [matriz de layouts](previews/phase-06.3/layout-validation.json), [Automático/timer/confirmação duplicada](previews/phase-06.3/extra-validation.json), [contraste dos botões](previews/phase-06.3/contrast.json) e [build/APK](previews/phase-06.3/build-validation.json).

As 19 telas abrangem Início, Meus Cafés, coleção, ficha/cadastro de café, produtores/cadastro de produtor, Preparar, métodos, receita/revisão, histórico, Jornada/evolução/diário, Descobertas/perfil/comparação e Configurações. O preparo guiado tem sua matriz adicional de 24 combinações.

A checagem de cortes verifica dimensões e overflow em títulos, botões e seções expansíveis visíveis. Não é uma auditoria de todos os glifos ou estados. Seletores nativos e resumos deliberadamente limitados mantêm seu comportamento existente. O contraste medido nesta fase se concentra nos novos botões; não constitui auditoria WCAG completa nem nova medição de todas as fotografias.

## 6. Capturas

As **26 capturas** estão em [previews/phase-06.3](previews/phase-06.3/README.md), usando Chrome com perfil temporário, origem localhost isolada e fuso America/Sao_Paulo.

| Situação | Claro 390 px | Escuro 390 px |
| --- | --- | --- |
| Início — 85% | [Captura](previews/phase-06.3/inicio-light-85-390.png) | [Captura](previews/phase-06.3/inicio-dark-85-390.png) |
| Início — 100% | [Captura](previews/phase-06.3/inicio-light-100-390.png) | [Captura](previews/phase-06.3/inicio-dark-100-390.png) |
| Início — 115% | [Captura](previews/phase-06.3/inicio-light-115-390.png) | [Captura](previews/phase-06.3/inicio-dark-115-390.png) |
| Histórico — 115% | [Captura](previews/phase-06.3/historico-light-115-390.png) | [Captura](previews/phase-06.3/historico-dark-115-390.png) |
| Configurações — 100% | [Captura](previews/phase-06.3/configuracoes-light-100-390.png) | [Captura](previews/phase-06.3/configuracoes-dark-100-390.png) |
| Formulário — 115% | [Captura](previews/phase-06.3/cadastro-cafe-light-115-390.png) | [Captura](previews/phase-06.3/cadastro-cafe-dark-115-390.png) |
| Preparo — 115% | [Captura](previews/phase-06.3/preparo-light-115-390.png) | [Captura](previews/phase-06.3/preparo-dark-115-390.png) |

O índice inclui Histórico em 90%, preparo em 320 px/100%/115%, exemplos desktop de 1440 px e evolução. As fotografias existentes foram reutilizadas; não há asset novo nesta fase. A navegação fixa aparece na posição do viewport inicial nas capturas de página inteira, como nas fases anteriores.

Os scripts pontuais ficaram em `/tmp/jornada-phase063-browser.mjs` e `/tmp/jornada-phase063-extra.mjs`, sem dependência nova no projeto.

## 7. Android e pendências

APK de desenvolvimento: [android/app/build/outputs/apk/debug/app-debug.apk](../android/app/build/outputs/apk/debug/app-debug.apk).

Na entrega inicial, o ADB detectou o aparelho **22101316G**, e a versão 0.6.3 ainda não havia sido instalada. A atualização posterior solicitada pelo usuário está registrada abaixo. A instalação anterior da 0.6.2 está documentada na [Fase 06.2](phase-06.2.md#atualização-da-instalação-principal).

Permanecem pendentes: escala e slider no WebView físico, preservação após reiniciar o smartphone, preferências de tamanho do Android, teclado virtual, leitor de tela, áreas seguras em todas as situações e uso prolongado. A implementação reutiliza a persistência local da aparência, mas os testes web e o build não comprovam esses cenários físicos. Nenhum registro real do aparelho foi alterado.

### Atualização da instalação principal

Em **17/11/2026, às 20:47 (America/Sao_Paulo)**, a pedido do usuário, o pacote principal foi atualizado com `adb install -r`, que retornou **Success**. O Android confirmou **versionName 0.6.3 / versionCode 13**, substituindo a 0.6.2 sem desinstalação ou limpeza de armazenamento.

A abertura a frio retornou **Status: ok**. Uma captura temporária confirmou a tela inicial carregada no tema claro, com a tipografia refinada e a navegação. O aplicativo ficou aberto no Início. Não foram editados registros nem executados preparos; a captura permaneceu em `/tmp`. Esta conferência valida instalação e abertura, sem substituir os testes físicos específicos do slider, persistência após reinício e demais pendências acima.
