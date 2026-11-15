# Minha Jornada pelo Café

**Fase 03 — Métodos, Técnicas e Receitas**, preservando as Fases 01, 01.1 e 02. Uma coleção pessoal de cafés especiais e uma biblioteca de preparo com armazenamento local, estoque por pacote e temas claro, escuro e automático. Versão atual: **0.3.0**.

## Executar no navegador

Requisito: **Node.js 22.12 ou superior** e npm.

```bash
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://127.0.0.1:5173`. O IndexedDB requer uma origem válida, como localhost ou HTTPS; não abra o HTML pelo protocolo `file://`.

```bash
npm run typecheck   # TypeScript
npm test            # 14 verificações pontuais de persistência e domínio
npm run build       # TypeScript e bundle de produção em dist/
npm run preview     # Servir o build localmente
```

## Executar no Android

O projeto nativo já está em `android/`, com identificador `br.com.jornadacafe.app`. Requisitos: **JDK 21**, Android Studio compatível com Capacitor 8 e **Android SDK 36**. O aplicativo suporta Android 7 / API 24 ou superior.

Configure o SDK pelo Android Studio, por `ANDROID_HOME` ou em `android/local.properties` (arquivo local ignorado pelo Git):

```properties
sdk.dir=/caminho/para/Android/Sdk
```

```bash
npm run android:sync    # Build web e sincronização dos assets/plugins
npm run android:open    # Abrir o projeto no Android Studio
npm run android:run     # Sincronizar e executar em aparelho/emulador
```

Para gerar apenas o APK de desenvolvimento, depois de sincronizar:

```bash
cd android
./gradlew assembleDebug
```

No Windows, use `gradlew.bat assembleDebug`. O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Após alterações na interface, execute `npm run android:sync` antes de recompilar.

As barras do sistema usam ícones escuros no tema claro e claros no tema escuro. O Capacitor fornece os insets e o tema aplica áreas seguras no cabeçalho, nas laterais e na navegação inferior. O backup automático Android está desativado nesta fase local.

## Escopo entregue — Fase 03

A área **Preparar** abre nas receitas e oferece as perspectivas **Receitas**, **Métodos** e **Técnicas**, sem alterar as cinco áreas principais.

- Cadastro, consulta e edição de métodos, com descrição, observações e imagem opcional. Métodos e técnicas podem ser criados dentro do formulário de receita.
- Técnicas com método opcional, criador original, princípio, orientações e notas pessoais. Várias fontes podem registrar separadamente título, canal/autor/publicação, link e observações. O autor de uma fonte não é tratado como criador da técnica.
- Pesquisa sem distinção de acentos por nome, criador, canal ou fonte. As receitas também são encontradas pelas referências de suas técnicas. Fichas de métodos e técnicas mostram os registros associados.
- Receitas com método obrigatório, técnica e café de referência opcionais, dose e água em gramas, proporção calculada, temperatura, moagem, moedor, filtro, tempo estimado, instruções e fonte adicional. O café é uma sugestão e não exige estoque.
- O cálculo pela proporção desejada só altera a água quando o usuário escolhe **Aplicar cálculo à água total**. As etapas permanecem para conferência.
- Etapas ordenadas de despejo, espera, ação manual e finalização. Água adicionada e acumulada são distintas e recalculadas de forma consistente, inclusive após mover ou remover etapas. O acumulado final deve corresponder à água total para salvar.
- Início previsto em segundos **desde o início do preparo** e duração prevista **da etapa** são campos independentes e opcionais. O avanço pode ser manual, por duração definida ou por condição observável descrita pelo usuário. Tempos indicativos não implicam avanço por tempo.
- **Corrigir esta versão** mantém a identificação e o número. **Criar nova versão** preserva a anterior, com parâmetros e etapas próprios, número sequencial, relação com a versão-base e nota opcional. A biblioteca prioriza a versão mais recente; o histórico permite consultar e corrigir as anteriores.
- Exclusões confirmadas e protegidas: métodos e técnicas em uso não podem ser excluídos. Um café usado como referência também exige desvinculação nas receitas e suas versões. Uma versão que é base de versões posteriores deve ser mantida até remover suas descendentes.
- Links HTTP/HTTPS abrem somente pela ação **Abrir referência**. Não há integração com YouTube nem busca automática de informações.

Nenhum exemplo é inserido automaticamente. Os modelos permitem cadastrar os cinco despejos de 60 g, os despejos de 75/175/125 g e os três de 125 g, sem impor tempos, temperaturas ou moagem. A referência ambígua de 1:40 pode ficar nas observações até ser esclarecida.

Não há cronômetro, execução guiada, registro de preparos, desconto de estoque ou avaliação sensorial. A estrutura ordenada de etapas e os parâmetros de cada versão ficam disponíveis para uma futura cópia no registro de preparo da Fase 04. Nenhuma dependência foi adicionada nesta fase.

## Escopo entregue — Fase 02

- Cadastro e edição progressivos: somente o nome do café é obrigatório. Fotografia, torrefação, descrição, produção, origem e características são opcionais.
- Registros locais reutilizáveis de produtor, propriedade, origem e torrefação, criados ou selecionados dentro do formulário. A perspectiva **Produtores e Origens** permite consultar, editar e excluir registros sem uso e abrir os cafés associados.
- Sugestão não bloqueante de possível duplicidade por nome e torrefação, sem tratar nomes como identificadores únicos.
- Ficha do café com origem, características comerciais, fotografias, pacotes e ações independentes de favorito e **Já experimentei**.
- **Conheço** decorre da presença na coleção. **Tenho em casa** deriva do estoque e **Já tive** da existência de pacotes, inclusive esgotados. As situações podem coexistir.
- Vários pacotes por café, com pesos inicial/restante, datas, lote, preço, local de compra e observações. Correções explícitas guardam os valores e o motivo opcional; marcar esgotado mantém o pacote no histórico.
- Coleção em grade/lista, pesquisa sem distinção de acentos por café, torrefação, produtor, propriedade e origem; filtros Todos/Já experimentei/Com estoque/Sem estoque; ordenação por nome ou inclusão recente.
- Pesquisa, filtros, ordenação e visualização permanecem durante a navegação. O retorno à coleção restaura sua posição de rolagem na mesma sessão, quando possível.
- Início com contagens reais e estante horizontal, priorizando favoritos e depois cafés adicionados ou adquiridos recentemente. Favoritos não dependem de estoque.
- Exclusão de café exige confirmação e informa a remoção de pacotes, histórico e fotografia. Referências de produção/origem em uso não podem ser excluídas: primeiro é necessário desvincular ou substituir nos cafés.
- As cinco áreas principais, a identidade editorial, as fontes e os três modos de aparência foram preservados. A barra nativa de título Android continua removida.

Receitas foram acrescentadas na Fase 03. Preparações realizadas, cronômetro, avaliações sensoriais, descobertas e experiências da jornada permanecem para fases futuras. Não há autenticação, nuvem, mapas, pesquisa externa nem dados demonstrativos inseridos no aplicativo.

## Aparência — Fase 01.1

O seletor **Aparência**, no cabeçalho das cinco áreas, oferece **Claro**, **Escuro** e **Automático (sistema)**. Automático é o padrão inicial e acompanha `prefers-color-scheme`, inclusive quando o sistema muda durante o uso.

- A escolha fica no `localStorage`, na chave `jornada-cafe:appearance`, sem tabelas, migrações ou dependências adicionais. Ela é restaurada pelo script inicial do HTML antes de renderizar a aplicação.
- A troca aplica imediatamente os tokens de `src/theme/theme.css`, o `color-scheme` e a cor do navegador. Também preserva a área, a pesquisa e o estado da coleção. Abas da mesma origem acompanham alterações da preferência.
- Se o navegador bloquear o armazenamento da preferência, o tema funciona na sessão atual e o seletor mostra um aviso acessível.
- O modo escuro usa fundo café, superfícies marrons, texto creme, cobre nas ações e verde suave nos detalhes. As fontes, os layouts e as cinco áreas foram preservados. O texto secundário claro recebeu um pequeno ajuste de contraste.
- A ilustração SVG original foi convertida no componente `src/assets/CoffeeRitual.tsx`, mantendo o desenho e permitindo herdar os tokens dos dois temas.
- No Android, o `SystemBars` acompanha o tema ativo. Uma ponte local mínima (`AppearancePlugin`) ajusta apenas o fundo nativo atrás dos insets, inclusive em WebViews antigas. A janela e o splash iniciais acompanham a aparência do sistema; a preferência explícita passa a valer quando a interface inicializa. A ponte não salva preferências nem acessa o banco.

Para experimentar no navegador, execute `npm run dev` e altere o seletor do cabeçalho. Para testar a atualização Android, execute `npm run android:run` ou sincronize e recompile o APK conforme as instruções acima.

## Organização

```text
src/
  app/          Estrutura principal e navegação
  components/   Interface compartilhada, formulários, diálogo e fotografia
  features/     home, coffees, prepare, journey, discoveries
  domain/       Coleção, biblioteca de preparo, etapas, versões e regras de integridade
  data/         Adaptadores, migrações, coleção/biblioteca compartilhadas e fotografias
  theme/        Tokens, tipografia e layout responsivo
  assets/       Ilustração SVG como componente React
android/        Projeto nativo Capacitor
public/         Favicon e licenças das fontes
```

### Entidades e persistência

As telas usam `CollectionContext`, sem conhecer SQL, object stores ou caminhos nativos. O contrato `LocalStorage` oferece operações de coleção, metadados e fotografias. As regras compartilhadas em `src/domain/collection.ts` são aplicadas dentro das transações de cada adaptador.

- **Café:** identidade do produto, com UUID, datas de criação/atualização, campos opcionais, referências relacionadas, favorito e indicação de já experimentado. Pode existir sem pacote.
- **Pacote:** UUID e referência obrigatória ao café, pesos, dados da compra e histórico de correções. O estoque é sempre calculado pela soma dos pesos restantes; não há indicador independente nem desconto automático.
- **Registros relacionados:** produtores, propriedades, origens e torrefações têm UUIDs próprios e um tipo explícito, nome, geografia e observações opcionais. São persistidos no conjunto `records`, mantendo relações distintas no café.
- **Navegador:** IndexedDB `minha-jornada-pelo-cafe`, versão física **3**, com `metadata`, `coffees`, `packages`, `records`, `photos`, `methods`, `techniques` e `recipes`. Fotografias são Blobs separados dos registros de domínio. Escritas e exclusões relacionadas aguardam o commit da transação.
- **Android:** SQLite `minha_jornada_pelo_cafe`, `user_version` **3**, com `metadata`, `coffees`, `packages`, `records`, `methods`, `techniques` e `recipes`. As colunas relacionais têm chaves estrangeiras e os pesos têm restrições SQL. Os atributos opcionais e o histórico de correção ficam no payload JSON de cada registro, sem imagens embutidas. Operações de coleção são serializadas e transacionais.

#### Migrações da Fase 02

O IndexedDB evolui de 1 para 2 por `onupgradeneeded`, acrescentando os object stores na transação de atualização. O SQLite usa `addUpgradeStatement` do plugin nativo para evoluir seu próprio `user_version`; novas instalações também recebem o esquema completo. Os mecanismos são independentes, embora ambos tenham chegado ao número 2 naquela entrega.

Na Fase 02, a chave lógica `metadata.schema-version` passou de `1` para `2`. Os demais metadados são preservados. Bancos existentes não são apagados nem recriados. Versões não suportadas são recusadas; falhas mostram aviso e nova tentativa. Não há fallback em memória. A preferência `jornada-cafe:appearance` permanece no `localStorage` e não participa da migração do banco.

#### Migração e entidades da Fase 03

O IndexedDB evolui de **2 para 3**, acrescentando `methods`, `techniques` e `recipes` na transação de atualização. O SQLite recebe as três tabelas pelo upgrade nativo para `user_version = 3`, com chaves estrangeiras para método, técnica, café de referência e versão-base. O par família/versão é único. A chave lógica `metadata.schema-version` passa a `3`; os dados e metadados anteriores permanecem. Instalações da Fase 01 também podem migrar diretamente, e novas instalações recebem o esquema completo.

- **Método:** UUID, datas, nome e detalhes opcionais, com imagem pelo mesmo armazenamento local usado para fotografias.
- **Técnica:** UUID, datas, método opcional e fontes incorporadas ao seu payload, cada uma com UUID estável. Criador e apresentador são campos separados.
- **Receita:** um registro por versão, com UUID próprio, `familyId`, número de versão e `previousVersionId`. Os parâmetros, a fonte adicional e as etapas estruturadas ficam no payload de cada versão. Cada etapa tem UUID, ordem, pesos, tempos e condição de avanço; não há tabelas de execução de preparos.

As validações de referências, versões e etapas são compartilhadas pelos adaptadores e executadas dentro de suas transações. O SQLite também aplica as restrições relacionais em suas colunas. A aparência continua no `localStorage`, fora da migração. Fotografias existentes e pesos de pacotes não são modificados pela biblioteca.

#### Fotografias locais

A seleção usa arquivo do dispositivo, sem câmera integrada. Aceita JPG/PNG/WebP de até 15 MB; antes de salvar, converte para JPEG com lado máximo de 1600 px. O café guarda somente o UUID da fotografia.

Na web, o Blob fica em `photos` no IndexedDB. No Android, o plugin oficial Filesystem grava em `Directory.Data/photos/<uuid>.jpg`, diretório privado persistente da instalação, e a imagem é exibida pela referência local do Capacitor. Uma fotografia ausente usa o placeholder do tema. Trocas e exclusões removem o arquivo antigo após o commit; eventual falha de limpeza é informada sem desfazer o registro já salvo.

Um backup futuro precisará incluir os Blobs/arquivos referenciados junto ao banco; backup/exportação não são implementados nesta fase. Limpar os dados do site, limpar os dados do aplicativo ou desinstalá-lo remove o armazenamento correspondente. Na web, cada origem tem sua própria coleção.

## Dependências

Produção: React/React DOM 19, Capacitor Core/Android 8, SQLite Community 8, Lucide React, DM Sans/Fraunces e **`@capacitor/filesystem` 8.1.5**, dependência direta adicionada na Fase 02 para as fotografias nativas. A Fase 03 não acrescentou dependências.

Desenvolvimento: TypeScript 5.9, Vite 8, Tailwind CSS 4, Capacitor CLI, Vitest 5 e fake-indexeddb. O teste pontual das instruções SQL utiliza `node:sqlite`, incluído no Node.js. As versões resolvidas ficam em `package-lock.json`. Playwright é usado apenas em uma pasta temporária de validação, sem dependência ou suíte adicional no projeto.

As fontes são distribuídas sob OFL-1.1; suas licenças estão em `public/licenses/`.

## Verificações da entrega — Fase 03

Executadas em 15/11/2026, com dados temporários em um perfil isolado do Chrome:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados |
| Vitest | 14 testes aprovados no total; cinco novos testes pontuais para cálculos, integridade, versões e migrações |
| Métodos e técnicas | Cadastro dentro da receita, edição de método, criador distinto do canal, fonte com link e proteção de método em uso aprovados |
| Receitas e etapas | Três distribuições de referência cadastradas manualmente; proporção, edição por acumulado, condições observáveis e etapas sem água aprovadas |
| Edição e versões | Correção mantém versão 1; nova versão preserva a anterior e seus pesos, com histórico acessível |
| Persistência no navegador | Métodos, técnicas, fontes, receitas e etapas recuperados após recarga; pesquisa por canal e criador aprovada; sem erros de execução |
| Migração IndexedDB | 1 → 3 e 2 → 3 verificadas; café, pacote, foto e metadados anteriores preservados; preferência escura mantida |
| Migração SQLite | Instruções SQL 2 → 3 verificadas com SQLite local: preservação de estoque, referências e unicidade de versões |
| Temas e responsividade | Listagens, fichas e editor em claro/escuro, em 390 e 1440 px; editor também em 320 px, sem rolagem horizontal |
| Android 0.3.0 | Sincronização, `assembleDebug` e instalação como atualização aprovados (`adb install -r`: `Success`) |
| Migração SQLite no aparelho | Plugin confirmou 2 → 3; metadados e preferência de aparência preservados. A base do aparelho estava sem cafés/pacotes antes da atualização |
| Cadastro Android | Método com imagem privada, técnica com criador distinto do canal, fonte com link, receita de 25 g / 375 g e etapas de 75/175/125 g aprovados |
| Versões e reabertura Android | Versões 1 e 2 recuperadas após encerrar e reabrir; distribuição original e alterada preservadas, imagem recuperada e proteção de exclusão de método em uso confirmada |
| Limpeza da validação nativa | Somente receitas, técnica, método e imagem temporários removidos; estado anterior e aparência mantidos |

A conferência de navegador utilizou Playwright apenas em `/tmp`, sem adicionar dependências nem testes de componentes ao projeto. Os exemplos ficaram somente no perfil de validação, sem popular a instalação do usuário. Os avisos Gradle de `flatDir` não impediram a compilação.

O APK da Fase 03 foi instalado e executado no aparelho conectado em 15/11/2026. A validação ocorreu no próprio WebView e usou os plugins SQLite e Filesystem nativos. Também foi exercitada a troca Claro/Escuro, restaurando a preferência anterior ao concluir.

**Pendências manuais Android:** conferir o seletor visual de imagens com arquivos reais, a abertura de referências no navegador/YouTube e barras/recortes em outros aparelhos. O arquivo de teste foi fornecido ao campo de seleção durante a validação; isso confirma otimização, gravação e recuperação da imagem, sem exercitar a interface da galeria do sistema.

Para executar no navegador, use `npm run dev` e abra a URL indicada, normalmente `http://127.0.0.1:5173`. Para instalar e abrir no Android, com o aparelho conectado, use `npm run android:run`. O APK de desenvolvimento fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

Não houve commits, pushes ou início da Fase 04.

## Verificações da entrega — Fase 02

Executadas em 15/11/2026, usando dados temporários apenas nos ambientes de validação:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados |
| Vitest | 9 testes aprovados: metadados, indisponibilidade, migração, edição, foto, múltiplos pacotes, estoque, exclusões e SQL nativo |
| Chrome — fluxo completo | Cadastro e edição, reutilização das quatro referências, duplicidade não bloqueante, dois pacotes, correção e esgotamento, pesquisa/filtros/ordenação e exclusões aprovados; sem erros de execução |
| Persistência web | Café, referências, foto e estoque recuperados após recarga; metadado anterior preservado na migração 1 → 2 |
| Estante | Contagens reais e favorito anterior a café mais recente confirmados |
| Temas e responsividade | Coleção, ficha e Início nos dois temas, em 390 e 1440 px; coleção também em 320 px, sem rolagem horizontal |
| Fotografias | Upload, otimização, recuperação e remoção do Blob com a exclusão do café aprovados no navegador |
| APK Android 0.2.0 | Sincronizado, compilado com `assembleDebug` e instalado como atualização, preservando os dados |
| Migração SQLite no aparelho | Esquema 1 → 2 confirmado pelo plugin nativo; preferência escura preservada |
| Cadastro nativo | Café, produtor, fotografia privada e correção de estoque executados pelo próprio WebView |
| Reabertura Android | Após encerrar e reabrir o aplicativo, fotografia e peso corrigido recuperados; registros e arquivo temporários removidos ao concluir, com aparência escura mantida |

O APK atualizado fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Para validar por conta própria:

1. Em **Meus Cafés**, adicione um café apenas com o nome e salve; nenhum pacote é exigido.
2. Edite-o para escolher uma foto e criar/selecionar produtor, propriedade, origem e torrefação.
3. Adicione dois pacotes, corrija o peso de um e marque o outro como esgotado. Confira o total e o histórico.
4. Marque **Já experimentei** e **Favorito da estante**; confira os filtros e o Início.
5. Feche e reabra para conferir dados e foto. Verifique Claro/Escuro/Automático.
6. Confira a confirmação de exclusão e a proteção dos registros relacionados em uso.

Na entrega da Fase 02, ainda não haviam sido adicionadas as funcionalidades da Fase 03. Não foram executados commits ou pushes.

**Pendências de validação manual:** testar o seletor visual da galeria Android com fotografias reais e diferentes formatos, além de barras/recortes e splash em outros aparelhos ou WebViews. A validação automatizada nativa forneceu o arquivo de teste ao campo de seleção e confirmou sua gravação/recuperação no diretório privado. Backup e APK de produção assinado não fazem parte desta fase.

## Histórico de verificação — Fase 01

Executadas em 15/11/2026:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados |
| Vitest | 3 testes aprovados: persistência ao reabrir, versão incompatível e ausência de IndexedDB |
| Chrome local | Inicialização e cinco áreas aprovadas, sem erros de execução |
| Navegação | CTA de preparo, área ativa, histórico, recarga e preservação de pesquisa/visualização aprovados |
| Responsividade | Cinco áreas verificadas em 320, 390, 768 e 1440 px, sem rolagem horizontal |
| IndexedDB real no Chrome | Base apenas com metadados; versão 1 confirmada após recarga |
| Falha de inicialização e nova tentativa | Verificadas no Chrome com falha controlada |
| SVG e XML Android | Sintaxe validada |
| Capacitor Android | Plataforma adicionada e sincronização concluída |
| APK de desenvolvimento | `assembleDebug` aprovado com JDK 21 / SDK 36 |
| Instalação no aparelho conectado | Aprovada: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` retornou `Success` |
| Execução no aparelho | Pendente: inicialização do aplicativo e do SQLite nativo, navegação e áreas seguras ainda não verificadas |

A instalação da Fase 01 foi concluída em uma nova tentativa, após os bloqueios iniciais com `INSTALL_FAILED_USER_RESTRICTED`. Essa confirmação corresponde ao APK anterior à atualização de aparência.

Na entrega da Fase 01, a verificação da execução nativa estava pendente. A inicialização e as operações SQLite foram posteriormente verificadas na Fase 02, conforme o relatório acima. O build apresentou avisos do template/dependências sobre `flatDir`, ferramentas do SDK e stripping da biblioteca SQLCipher, sem impedir a compilação. A versão de produção assinada não faz parte desta fase.

### Verificações da Fase 01.1

Executadas em 15/11/2026 no build de produção:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build | Aprovados |
| Temas claro e escuro | Cinco áreas revisadas visualmente em 390 px (smartphone) e 1440 px (desktop), sem rolagem horizontal |
| Controle de aparência | Rótulo acessível, foco visível, área de toque de 44 px e verificação adicional em 320 px |
| Preferência local | Preservada após recarga; troca de tema mantém a área e a pesquisa |
| Automático | Padrão inicial, reação à mudança do sistema e restauração após recarga confirmados |
| Inicialização sem tema incorreto | Tema escuro salvo e fundo correto confirmados com o bundle React temporariamente retido |
| Armazenamento bloqueado e múltiplas abas | Troca na sessão com aviso acessível e sincronização entre abas confirmadas |
| Contraste e avisos | Amostras de texto, navegação e botões acima de 4,5:1 nos dois temas; aviso de armazenamento revisado visualmente |
| Capacitor e APK atualizado | Sincronização e `assembleDebug` aprovados |
| Atualização no aparelho conectado | Aprovada: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` retornou `Success`, preservando os dados do aplicativo |
| Correção da faixa de título Android | Temas sem barra de título e inicialização do splash corrigidos; APK recompilado, instalado e aberto a frio no aparelho. Hierarquia nativa confirma o WebView ocupando a janela sem barra de título |

A verificação de navegador foi pontual, em uma pasta temporária, sem adicionar uma suíte de testes ao projeto. Não houve alterações no banco, nos modelos de domínio ou nas dependências.

O APK da Fase 01.1 foi instalado com sucesso no aparelho conectado em 15/11/2026, como atualização da instalação existente.

Na Fase 01.1, compilação, instalação e abertura a frio foram validadas após remover a faixa de título. Na Fase 02, a preferência existente foi preservada e a troca Claro/Escuro foi exercitada no WebView Android. A inspeção manual de barras, recortes e splash quando a escolha explícita difere do sistema permanece recomendada em diferentes dispositivos.

Documentação de referência: [Capacitor Android](https://capacitorjs.com/docs/android), [System Bars e áreas seguras](https://capacitorjs.com/docs/apis/system-bars), [SQLite Community](https://github.com/capacitor-community/sqlite) e [Tailwind com Vite](https://tailwindcss.com/docs/installation/using-vite).
