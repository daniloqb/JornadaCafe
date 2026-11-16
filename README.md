# Minha Jornada pelo Café

**Fase 04.4 — Revisão visual da receita e do preparo guiado**, preservando a coleção, a biblioteca e o cadastro de cafés, características e produtores da Fase 04.2. Dados locais, estoque por pacote, histórico e temas claro, escuro e automático. Versão atual: **0.4.4**.

## Executar no navegador

Requisito: **Node.js 22.12 ou superior** e npm.

```bash
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://127.0.0.1:5173`. O IndexedDB requer uma origem válida, como localhost ou HTTPS; não abra o HTML pelo protocolo `file://`.

```bash
npm run typecheck   # TypeScript
npm test            # 31 verificações pontuais de persistência, domínio, cronômetro, referências e navegação
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

### Instalar ou atualizar no seu smartphone

Com o cabo USB conectado, habilite **Depuração USB** nas **Opções do desenvolvedor** do Android e aceite a autorização deste computador na tela do aparelho. Na pasta do projeto, confira a conexão:

```bash
adb devices -l
```

O aparelho deve aparecer com o estado `device`. Se aparecer `unauthorized`, desbloqueie a tela e aceite a autorização. Para gerar, sincronizar, instalar e abrir a versão atual, execute:

```bash
npm run android:run
```

Se houver mais de um aparelho ou emulador conectado, escolha o smartphone quando solicitado. Repita esse comando depois de alterar o código para levar as mudanças ao celular. O aplicativo instalado inclui os arquivos web e pode ser aberto pelo ícone **Minha Jornada pelo Café**, sem manter o servidor Vite ligado.

Para instalar um APK já gerado, sem recompilar, use:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n br.com.jornadacafe.app/.MainActivity
```

A opção `-r` atualiza a instalação mantendo os dados locais, desde que a assinatura do APK seja compatível com a instalação existente. Com vários aparelhos, acrescente `-s SERIAL` depois de `adb`, usando o identificador mostrado por `adb devices -l`.

As barras do sistema usam ícones escuros no tema claro e claros no tema escuro. O Capacitor fornece os insets e o tema aplica áreas seguras no cabeçalho, nas laterais e na navegação inferior. O backup automático Android está desativado nesta fase local.

## Fase 04.4 — Fidelidade às referências aprovadas

As três imagens fornecidas pelo usuário estão preservadas em `docs/references/phase-04.4/`. Elas orientam a composição, proporções, hierarquia, contraste, espaçamentos e componentes. O [relatório visual](docs/phase-04.4.md) registra as adaptações, os assets e a validação.

- **Revisão:** cabeçalho com retorno e marca, título editorial, identificação com fotografia, quatro parâmetros lado a lado, moagem e filtro em superfícies areia, etapas em linha do tempo vertical e botão verde amplo **Confirmar revisão**. A confirmação cria uma sessão **pausada, em 00:00**, e abre o preparo guiado sem iniciar o timer.
- **Preparo guiado:** cabeçalho compacto com identificação da receita, progresso por etapa, instrução em cartão espresso, cronômetro circular contando para cima com **Iniciar/Pausar/Retomar dentro do círculo**, cartões separados de tempo total e meta acumulada, linha do tempo e botões Anterior/Próxima etapa após o painel.
- **Biblioteca e configurações:** cartão de histórico, banner fotográfico da Biblioteca do Café, receitas em linhas compactas e acesso a Configurações. A aparência oferece Escuro, Claro e Automático, com persistência e sincronização entre os controles; som e vibração reutilizam os avisos existentes.
- **Identidade global:** creme, areia e espresso no tema claro; espresso profundo, cacau e textos creme no escuro. Oliva sálvia e terracota aparecem nos destaques. A navegação usa fundo espresso e seleção areia, mantendo as cinco áreas. Os componentes compartilhados, cadastros, favicon e cores nativas acompanham a paleta.
- **Dados e ações:** nomes, quantidades, durações, condições, proporções e etapas vêm dos registros. Recalcular despejos continua sendo uma ação explícita. Retorno confirmado, recuperação, salvamento e consumo de estoque preservam as regras existentes; confirmar a revisão não consome estoque nem contabiliza tempo de preparo.

Os formulários completos ficam em seções expansíveis para preservar a composição de revisão. Sem duração informada, o relógio mostra apenas o tempo acompanhado, sem prazo ou porcentagem inventados. A meta é o peso **esperado** na balança, pois não há integração de medição. Unidades são informativas; recursos futuros da imagem não se tornam ações fictícias. Não há migração de banco nem substituição dos dados existentes.

## Escopo entregue — Fase 04.2

O formulário segue a ordem **Nome → Fotografia → Torra → Descrição / Observações → Características → Produtor**. Só o nome é obrigatório. Os pacotes continuam sendo gerenciados na ficha após salvar.

- **Torra descritiva:** reutiliza o texto `coffee.roast`, sem conversão para número. O campo antigo de Torrefação era uma relação com empresa: `roasterId` foi preservado e continua acessível como **Empresa torrefadora** em Informações complementares.
- **Espécie:** seleção pesquisável com teclado e **+ Novo**, reutilizável em outros cafés. As opções offline iniciais são Arábica — Coffea arabica, Canephora — Coffea canephora (Robusta/Conilon) e Libérica — Coffea liberica. A normalização impede duplicatas simples e reconhece essas denominações conhecidas sem criar uma taxonomia extensa.
- **Características:** Variedade / Cultivar e Processo de pós-colheita continuam textuais. Torra, Acidez, Doçura e Intensidade usam estrelas e seleção acessível de inteiros entre 0 e 10. **Sem avaliação** é diferente de 0, e Limpar remove o valor. Dez ícones representam a nota; o seletor nativo evita alvos de toque pequenos.
- **Notas sensoriais:** tags pesquisáveis, seleção múltipla, remoção e criação com **+ Novo**. Chocolate, Caramelo, Baunilha, Cacau, Castanhas, Floral, Frutas vermelhas, Cítrico e Mel são opções iniciais; nenhuma é atribuída a um café sem seleção.
- **Avaliação geral do café:** escala independente de 0 a 10 dentro da seção opcional. Aparece separadamente na ficha e não é calculada a partir das características nem alterada ao preparar.
- **Produtor:** seleção principal única com criação contextual. Seu cadastro reúne nome, foto otimizada, propriedade, origem, geografia, descrição, site HTTP/HTTPS e notas complementares. O site só abre pela ação explícita. A ficha do produtor mostra os cafés e os locais individuais associados.
- **Locais distintos:** novos cafés podem incorporar o local de referência do produtor selecionado. Cada café guarda seu próprio vínculo. Alterar o produtor não reescreve as propriedades/origens dos cafés existentes. A seção recolhida **Local específico deste café** preserva e permite ajustar vínculos individuais, inclusive quando um produtor trabalha com várias propriedades.
- **Consulta:** a ficha mostra torra, características, tags, avaliação geral, produtor, estoque e preparações relacionadas. A pesquisa inclui tags, espécie, produtor, propriedade e geografia, mantendo filtros, ordenação, favoritos, Já experimentei, Tenho em casa e Já tive.

### Compatibilidade e persistência da Fase 04.2

Não foi necessária migração física: IndexedDB, SQLite e `metadata.schema-version` continuam em **4**. Nenhuma base é apagada, recriada ou regravada em massa. Os upgrades anteriores permanecem.

O payload do café acrescenta `speciesId`, `sensoryTagIds` e `ratings` (torra, acidez, doçura, intensidade e geral). Os registros relacionados em `records` aceitam os tipos `species` e `sensoryTag`; produtores acrescentam `photoId`, `website`, `propertyId` e `originId`. As referências novas são verificadas nas transações dos adaptadores. Opções padrão só se tornam registros persistidos quando selecionadas e salvas com o café; opções criadas com **+ Novo** já ficam disponíveis para reutilização.

UUIDs, imagens, empresas torrefadoras, vínculos individuais de propriedade/origem, pesos, correções de estoque, receitas, sessões e histórico permanecem intactos. Espécies antigas são apresentadas pelo texto original; correspondências conhecidas podem aparecer selecionadas no formulário e são incorporadas ao salvar. Textos desconhecidos são preservados. Notas sensoriais antigas permanecem em **Notas anteriores — texto preservado**, editáveis sem separação automática em tags. Nenhuma torra textual é transformada em pontuação e cafés anteriores não recebem avaliações.

As fotografias dos produtores usam o mesmo IndexedDB/Filesystem privado e a otimização existente. A imagem antiga só é removida após o commit; falhas na gravação do registro limpam apenas a nova imagem. Registros relacionados em uso por café ou produtor têm exclusão protegida.

## Escopo entregue — Fase 04.1

Em **Preparar → Biblioteca de referência**, o catálogo local oferece explicações e originais imutáveis. **Minha biblioteca** reúne somente os registros criados ou incorporados pela pessoa. A navegação principal continua com cinco áreas.

- **8 métodos:** V60, Melitta, Prensa francesa, AeroPress, Moka, Espresso, Chemex e Clever Dripper, com descrição, princípio, características e fontes.
- **5 técnicas:** 4:6 — Tetsu Kasuya, Três despejos, Imersão total, Imersão seguida de filtragem e Espresso tradicional. Pour-over com pré-infusão e despejos sucessivos é uma orientação geral, sem duplicar técnicas.
- **4 receitas V60:** 4:6 equilibrado (20/300 g; 60/60/60/60/60 g), 4:6 com distribuição modificada (20/300 g; 50/70/60/60/60 g), três despejos iguais (25/375 g; 125/125/125 g) e referência Café Gerações (25/375 g; 75/175/125 g). Todas têm proporção 1:15.
- Os 93 °C e a moagem 27/40 aparecem somente como referência experimental do usuário na receita equilibrada. A distribuição modificada é ilustrativa, sem atribuição de receita oficial. Não foram inventados intervalos, parâmetros de outras receitas ou links.
- Na referência de Alberto/Café Gerações, a pré-infusão tem 40 segundos indicativos e avanço manual. Uma espera observável precede o terceiro despejo. O tempo ambíguo de 1min40s permanece nas notas, sem definir início nem duração de etapa.
- **Adicionar catálogo à minha biblioteca** (versão 0.4.2) salva os 8 métodos, 5 técnicas e 4 receitas de uma vez como registros pessoais editáveis. No Android, ficam nas tabelas principais `methods`, `techniques` e `recipes` do SQLite; na web, nos object stores correspondentes do IndexedDB. A gravação é atômica e usa as mesmas regras dos cadastros manuais. Repetir a ação não duplica nem substitui edições existentes.
- **Adicionar à minha biblioteca** importa uma cópia editável e as dependências necessárias em uma única transação. Método e técnica também podem ser adicionados individualmente. Cópias existentes são reutilizadas por identidade, sem comparação por nome nem substituição de edições pessoais. A ficha pessoal permite consultar o original; receitas incorporadas usam o preparo guiado existente.
- Nenhum item é persistido apenas por abrir ou atualizar o aplicativo. O catálogo não cria cafés, pacotes, estoques, sessões ou preparações realizadas. A biblioteca educativa funciona sem conexão; abrir fontes externas exige acesso à internet e uma ação explícita.

Consultar referências e salvar registros pessoais são ações distintas. Para editar ou usar no preparo, escolha **Adicionar catálogo à minha biblioteca** e depois **Abrir minha biblioteca**. Os registros permanecem após encerrar e reabrir. A abertura do app não reinsere itens excluídos; uma nova incorporação exige sua ação explícita.

O catálogo versão **1** fica em `src/reference/catalog.ts`, incluído no build e congelado em memória. A importação em `src/reference/import-reference.ts` usa as validações e os adaptadores atuais. Identificações estáveis e o campo opcional `referenceKey` no payload mantêm a origem das cópias e suas versões. **IndexedDB, SQLite e metadado continuam na versão 4**, sem migração, novas tabelas ou dependências. Estoque e histórico só mudam pelas ações normais de preparação existentes.

As descrições usam fontes dos fabricantes e documentação de preparo: [HARIO V60](https://www.hario-europe.com/pages/the-v60-dripper), [entrevista com Kasuya](https://www.hario-europe.com/blogs/hario-community/v60-ambassadors-tetsu-kasuya), [Melitta](https://shoponline.melitta.com/products/1-cup-pour-over-coffee-brew-cone-black), [Bodum](https://www.bodum.com/us/en/10938-01b-brazil), [AeroPress](https://aeropress.com/pages/how-it-works), [Bialetti](https://bialettiafrica.com/blogs/news/how-the-moka-works-lift-the-lid-and-discover-all-its-secrets), [Chemex](https://chemexcoffeemaker.com/pages/how-to-brew-with-chemex), [Clever / Sweet Maria’s](https://library.sweetmarias.com/clever-coffee-dripper-a-full-immersion-brewing-method/) e [La Marzocco](https://www.lamarzocco.com/ca/en/beginners-guide-to-espresso/). As fontes específicas também aparecem nas fichas. Os parâmetros das quatro receitas vieram da referência fornecida pelo usuário; a biblioteca não apresenta resultados de degustação nem avaliações inventadas.

## Escopo entregue — Fase 04

Na ficha de uma receita, **Preparar** abre a revisão daquela versão. Café e pacote são opcionais. Confira a dose, a água, a proporção, a temperatura, a moagem, o moedor, o filtro e as etapas antes de iniciar.

- Ajustes valem apenas para o preparo atual. Alterar a água não muda os despejos: **Recalcular despejos para a água total** faz a redistribuição proporcional por ação explícita; também é possível editar as etapas manualmente. A soma e o estoque do pacote são validados ao iniciar.
- Execução com destaque para instrução, água adicionada, peso acumulado esperado, tempo total, tempo da etapa e próxima ação. Os parâmetros ficam recolhidos. O cabeçalho é compacto no smartphone, preservando navegação e controle de aparência.
- Cronômetro por referências monotônicas, com intervalo apenas para atualização da interface. Pausa, retomada, avanço e retorno confirmado à etapa anterior preservam os tempos acompanhados. Voltar não desfaz água fisicamente adicionada.
- Somente etapas com avanço por **Tempo definido** avançam automaticamente. Duração indicativa, confirmação manual e condição observável aguardam o usuário. Um retorno após suspensão ou atraso significativo da interface não dispara uma sequência de despejos: etapas temporizadas vencidas pedem confirmação.
- Checkpoint a cada cinco segundos e nas ações, mudanças de visibilidade e saída da tela. Após recarga ou encerramento, a recuperação abre pausada, mantém a etapa e pede revisão antes de retomar. Navegar pela biblioteca mantém a sessão e mostra um acesso para voltar ao preparo.
- Avisos opcionais com sons locais nos cinco segundos finais e sinal distinto ao mudar de etapa. Som e vibração começam desativados; **Testar avisos** ajuda a conferir o suporte. As escolhas ficam em `localStorage`, chave `jornada-cafe:brew-alerts`, com aviso se não puderem ser salvas.
- Durante a execução visível, tenta manter a tela ligada. No navegador usa Screen Wake Lock; no Android, a ponte local `PreparationPlugin` usa a janela da Activity, oferece feedback tátil e intercepta Voltar na execução para permitir guardar a sessão pausada. Não foram adicionados plugins, permissões ou serviços de segundo plano.
- Finalizar ou cancelar abre confirmação com observação opcional. É possível salvar concluído, salvar interrompido ou descartar sem registro. Ao interromper com pacote, um consumo da dose só ocorre com a confirmação explícita do usuário.
- O salvamento de um concluído com pacote desconta a dose configurada exatamente uma vez. Registro, saldo, entrada no histórico de estoque e remoção do checkpoint são gravados na mesma transação. O saldo é conferido novamente ao salvar; falha ou confirmação repetida não cria desconto sem registro nem estoque negativo.
- **Histórico de preparações**, dentro de Preparar, mostra os registros e suas fichas. A ficha do café reúne preparações relacionadas. Cada registro mantém as cópias de receita, versão, método, técnica, café, pacote, parâmetros e etapas, além dos tempos de cada passagem acompanhada, mesmo se os cadastros forem alterados depois.

Os valores de água são previstos; o aplicativo não mede nem comprova despejos físicos. Avaliações sensoriais, gráficos, comparações, balanças e nuvem continuam fora desta fase. Nenhuma dependência foi acrescentada.

### Limites de execução e recuperação

Não há promessa de JavaScript, áudio ou vibração contínuos com tela bloqueada ou aplicativo em segundo plano. A tela ligada é uma tentativa sujeita à plataforma, e seu recurso é liberado ao pausar, sair da execução ou terminar a sessão. Consulte [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) e [controle da tela no Android](https://developer.android.com/develop/background-work/background-tasks/awake/screen-on).

Enquanto ativo, o cronômetro usa `performance.now()`. Ao retornar de suspensão ou recuperar o app, também usa a referência de data do checkpoint, pois o relógio monotônico pode parar durante suspensão em algumas plataformas; mudanças no relógio do sistema podem afetar essa estimativa. Uma morte abrupta do processo pode perder a ação mais recente ainda não persistida, por isso a recuperação pede conferência da etapa. Referência: [Performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now).

Há uma sessão ativa por origem/instalação; o acompanhamento foi pensado para uma aba/instância por vez. O checkpoint não é um serviço de segundo plano. A gravação do histórico continua atômica e protegida contra confirmação duplicada.

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

Na Fase 03, a biblioteca ainda não executava preparos. A Fase 04 acrescenta o acompanhamento e copia os parâmetros e as etapas ao iniciar, sem alterar a biblioteca. Avaliações sensoriais continuam para fases futuras.

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

Receitas foram acrescentadas na Fase 03 e o preparo guiado na Fase 04. Avaliações sensoriais, descobertas e experiências da jornada permanecem para fases futuras. Não há autenticação, nuvem, mapas, pesquisa externa nem dados demonstrativos inseridos no aplicativo.

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
  features/     home, coffees, prepare, preparations, journey, discoveries
  domain/       Coleção, biblioteca, sessão, cronômetro e regras de estoque/integridade
  data/         Adaptadores, migrações, coleção/biblioteca compartilhadas e fotografias
  theme/        Tokens, tipografia e layout responsivo
  reference/    Catálogo educativo estático e importação explícita
  assets/       Ilustração SVG como componente React
android/        Projeto nativo Capacitor
public/         Favicon e licenças das fontes
```

### Entidades e persistência

As telas usam `CollectionContext`, sem conhecer SQL, object stores ou caminhos nativos. O `BrewContext` mantém o cronômetro e a sessão durante a navegação. O contrato `LocalStorage` oferece operações de coleção, metadados e fotografias. As regras compartilhadas em `src/domain/collection.ts` são aplicadas dentro das transações de cada adaptador.

- **Café:** identidade do produto, com UUID, datas de criação/atualização, campos opcionais, referências relacionadas, favorito e indicação de já experimentado. Pode existir sem pacote.
- **Pacote:** UUID e referência obrigatória ao café, pesos, dados da compra e histórico de correções. O estoque é sempre calculado pela soma dos pesos restantes; não há indicador independente. A Fase 04 desconta a dose apenas ao salvar um preparo com consumo confirmado.
- **Registros relacionados:** produtores, propriedades, origens, empresas torrefadoras, espécies e tags sensoriais têm UUIDs e tipos explícitos no conjunto `records`. Produtores possuem fotografia, site e locais de referência opcionais; cafés preservam seus vínculos individuais.
- **Navegador:** IndexedDB `minha-jornada-pelo-cafe`, versão física **4**, com `metadata`, `coffees`, `packages`, `records`, `photos`, `methods`, `techniques`, `recipes`, `preparations` e `sessions`. Fotografias são Blobs separados dos registros de domínio. Escritas e exclusões relacionadas aguardam o commit da transação.
- **Android:** SQLite `minha_jornada_pelo_cafe`, `user_version` **4**, com `metadata`, `coffees`, `packages`, `records`, `methods`, `techniques`, `recipes`, `preparations` e `sessions`. As colunas relacionais têm chaves estrangeiras e os pesos têm restrições SQL. Os atributos opcionais e o histórico de correção ficam no payload JSON de cada registro, sem imagens embutidas. Operações de coleção são serializadas e transacionais.

#### Migrações da Fase 02

O IndexedDB evolui de 1 para 2 por `onupgradeneeded`, acrescentando os object stores na transação de atualização. O SQLite usa `addUpgradeStatement` do plugin nativo para evoluir seu próprio `user_version`; novas instalações também recebem o esquema completo. Os mecanismos são independentes, embora ambos tenham chegado ao número 2 naquela entrega.

Na Fase 02, a chave lógica `metadata.schema-version` passou de `1` para `2`. Os demais metadados são preservados. Bancos existentes não são apagados nem recriados. Versões não suportadas são recusadas; falhas mostram aviso e nova tentativa. Não há fallback em memória. A preferência `jornada-cafe:appearance` permanece no `localStorage` e não participa da migração do banco.

#### Migração e entidades da Fase 03

O IndexedDB evolui de **2 para 3**, acrescentando `methods`, `techniques` e `recipes` na transação de atualização. O SQLite recebe as três tabelas pelo upgrade nativo para `user_version = 3`, com chaves estrangeiras para método, técnica, café de referência e versão-base. O par família/versão é único. A chave lógica `metadata.schema-version` passa a `3`; os dados e metadados anteriores permanecem. Instalações da Fase 01 também podem migrar diretamente, e novas instalações recebem o esquema completo.

- **Método:** UUID, datas, nome e detalhes opcionais, com imagem pelo mesmo armazenamento local usado para fotografias.
- **Técnica:** UUID, datas, método opcional e fontes incorporadas ao seu payload, cada uma com UUID estável. Criador e apresentador são campos separados.
- **Receita:** um registro por versão, com UUID próprio, `familyId`, número de versão e `previousVersionId`. Os parâmetros, a fonte adicional e as etapas estruturadas ficam no payload de cada versão. Cada etapa tem UUID, ordem, pesos, tempos e condição de avanço; nessa fase ainda não havia entidades de execução de preparos.

As validações de referências, versões e etapas são compartilhadas pelos adaptadores e executadas dentro de suas transações. O SQLite também aplica as restrições relacionais em suas colunas. A aparência continua no `localStorage`, fora da migração. Fotografias existentes e pesos de pacotes não são modificados pela biblioteca.

#### Migração e entidades da Fase 04

IndexedDB e SQLite passam de **3 para 4**; `metadata.schema-version` passa a `4`. São acrescentados somente `preparations` e `sessions`. Upgrades anteriores continuam registrados e novas instalações recebem o esquema completo, sem recriar ou apagar as bases existentes.

- **Preparação:** UUID igual ao da sessão, datas inicial/final, estado concluído/interrompido, observação, dose consumida, cópia integral dos dados configurados e passagens pelas etapas, com tempos em milissegundos. As identificações da receita, método, técnica, café e pacote são proveniência histórica dentro da cópia; a apresentação não depende dos cadastros atuais. Editar ou excluir um cadastro não reescreve o histórico.
- **Sessão ativa:** UUID, cópia dos parâmetros, etapa, estado ativo/pausado, tempo acumulado, início relativo da etapa, passagens, necessidade de confirmação e data do checkpoint. O SQLite também limita `sessions` a uma linha por uma coluna única de posição fixa.
- Preferências de avisos ficam em `localStorage`; não foram criadas tabelas para preferências.

As regras em `src/domain/preparation.ts` são executadas dentro das transações dos dois adaptadores. O primeiro salvamento de um UUID grava o histórico, atualiza o pacote e remove a sessão. Tentativas posteriores com o mesmo UUID não alteram o registro nem o saldo. Checkpoints atrasados de sessões já encerradas são ignorados. Um café selecionado em sessão ativa não pode ser excluído antes de encerrá-la.

#### Fotografias locais

A seleção usa arquivo do dispositivo, sem câmera integrada. Aceita JPG/PNG/WebP de até 15 MB; antes de salvar, converte para JPEG com lado máximo de 1600 px. O café guarda somente o UUID da fotografia.

Na web, o Blob fica em `photos` no IndexedDB. No Android, o plugin oficial Filesystem grava em `Directory.Data/photos/<uuid>.jpg`, diretório privado persistente da instalação, e a imagem é exibida pela referência local do Capacitor. Uma fotografia ausente usa o placeholder do tema. Trocas e exclusões removem o arquivo antigo após o commit; eventual falha de limpeza é informada sem desfazer o registro já salvo.

Um backup futuro precisará incluir os Blobs/arquivos referenciados junto ao banco; backup/exportação não são implementados nesta fase. Limpar os dados do site, limpar os dados do aplicativo ou desinstalá-lo remove o armazenamento correspondente. Na web, cada origem tem sua própria coleção.

## Dependências

Produção: React/React DOM 19, Capacitor Core/Android 8, SQLite Community 8, Lucide React, DM Sans/Fraunces e **`@capacitor/filesystem` 8.1.5**, dependência direta adicionada na Fase 02 para as fotografias nativas. As Fases 03, 04, 04.1 e 04.2 não acrescentaram dependências.

Desenvolvimento: TypeScript 5.9, Vite 8, Tailwind CSS 4, Capacitor CLI, Vitest 5 e fake-indexeddb. O teste pontual das instruções SQL utiliza `node:sqlite`, incluído no Node.js. As versões resolvidas ficam em `package-lock.json`. Playwright é usado apenas em uma pasta temporária de validação, sem dependência ou suíte adicional no projeto.

As fontes são distribuídas sob OFL-1.1; suas licenças estão em `public/licenses/`.

## Atualização 0.4.4 — Contraste e navegação da biblioteca

- Edição e escolha de imagem usam verde da paleta; exclusões e remoção de imagem usam terracota avermelhada, com cores próprias para os dois temas. Os controles Voltar ganharam texto de 15 px, superfície preenchida e altura mínima de 48 px. Os links de texto compartilhados também ficaram maiores.
- Preparar reúne título, descrição, criação e acessos à biblioteca de referência e ao histórico em um cartão. Receitas, Métodos e Técnicas têm opções maiores com seleção preenchida; cartões de receita usam verde suave e os detalhes usam uma superfície café/areia distinta.
- Na ficha da receita, Preparar ocupa toda a primeira linha. Corrigir esta versão e Criar nova versão dividem igualmente a segunda linha, sem setas nos três botões.
- Técnicas aceitam imagem opcional, seguindo o mesmo seletor, otimização, persistência e limpeza dos métodos. A identificação `photoId` fica no payload existente; o Blob usa IndexedDB na web e o arquivo privado usa Filesystem no Android. Não há migração: os bancos permanecem na versão 4.
- A navegação marca as entradas do histórico desta aplicação, inclusive após recarga. Os controles de retorno percorrem as telas visitadas e têm destino de apoio para acessos diretos. No Android, a ponte local encaminha Voltar para fechar primeiro um diálogo, respeitar a confirmação do preparo e então voltar uma tela. Somente no primeiro ponto do histórico a Activity é encerrada. A tela ligada continua independente desse controle.

Verificações em 15/11/2026:

| Verificação | Resultado |
| --- | --- |
| TypeScript, build e Vitest | Aprovados; 31 testes, incluindo três verificações de histórico, retorno inicial e prioridade de diálogo/preparo |
| Biblioteca nos dois temas | Lista, fichas de receita/método/técnica e editores de método/técnica conferidos em 320, 390 e 1440 px, sem rolagem horizontal; revisão visual em smartphone e desktop |
| Cinco áreas | Conferidas nos dois temas em 320, 390 e 1440 px após ampliar os links |
| Imagem da técnica no Chrome | Cadastro, troca, remoção, exclusão do registro e recuperação após recarga aprovados; arquivos anteriores removidos |
| Contraste | Amostras finais de texto dos controles, links e painéis acima de 4,5:1 nos dois temas |
| Ações da receita | Largura integral na primeira linha, divisão igual na segunda e ausência de setas confirmadas |
| Histórico web | Retorno pelos controles, voltar/avançar do navegador, novo caminho após retorno e recarga aprovados |
| Proteção do preparo | Confirmação, cancelamento da saída e retorno à revisão com checkpoint pausado conferidos no navegador |
| APK 0.4.4 | Sincronização, `assembleDebug` e instalação como atualização aprovados (`adb install -r`: `Success`); abertura a frio confirmada |
| Controles no WebView Android | Botões preenchidos, layout integral/metades da receita e retorno entre lista, ficha e editor conferidos |
| Técnica com imagem no Android | Técnica e arquivo privado salvos; imagem recuperada após encerrar/reabrir; exclusão pela interface removeu o registro e o arquivo temporários |
| Dados anteriores | Registros SQLite, metadados, estoque, biblioteca, preparações e aparência comparados antes/depois e preservados; esquema permaneceu em 4 |
| Voltar físico/gesto Android | Confirmado manualmente pelo usuário: ficha do método → Métodos → Preparar → Início; saiu do app somente ao voltar no ponto inicial |

A conferência de interface utilizou um perfil isolado do Chrome e scripts temporários, sem adicionar dependências. Os mecanismos de execução do preparo, consumo de estoque e cálculo de etapas permanecem os existentes. Não houve commits ou pushes.

A versão **0.4.4 foi instalada no aparelho conectado em 15/11/2026**, preservando os dados existentes. A conferência usou o WebView, SQLite e Filesystem reais. Somente a técnica e a imagem temporárias criadas para este teste foram removidas. O APK está em `android/app/build/outputs/apk/debug/app-debug.apk`.

**Voltar confirmado no aparelho:** o usuário percorreu manualmente ficha do método → Métodos → Preparar → Início e confirmou que a saída ocorreu somente no ponto inicial. O aparelho bloqueia a simulação desse botão por ADB (`INJECT_EVENTS`), por isso a confirmação física foi feita pelo usuário.

**Pendências manuais Android:** conferir também o botão físico/gesto Voltar com diálogos abertos e durante um preparo protegido. A prioridade do diálogo e a confirmação/pausa do preparo foram verificadas nos testes e no navegador, mas esses cenários físicos ainda não foram confirmados. As demais pendências manuais de galeria, som, vibração e recortes em outros aparelhos continuam aplicáveis.

## Verificações da entrega — Fase 04.2

Executadas em 15/11/2026, na versão **0.4.3** (o número 0.4.2 já identificava a atualização anterior de importação):

| Verificação | Resultado |
| --- | --- |
| TypeScript, build e Vitest | Aprovados; 28 testes, com quatro novos testes de integridade, opções, produtor e compatibilidade de payloads |
| Cadastro e opções | Café apenas com nome; seleção e criação de espécie/tag; duplicatas de caixa/acentos rejeitadas; múltiplas tags e remoção aprovadas |
| Escalas | Valores 0 e 10, ausência e limpeza conferidos; avaliação geral independente e persistência após recarga aprovadas |
| Produtor | Cadastro contextual com propriedade/origem, foto e site; edição de nome, site e imagem; Blob antigo removido após salvar |
| Pesquisa e ficha | Busca por produtor e tag; etiquetas, escalas e links explícitos; cafés associados e navegação de fichas aprovados |
| Compatibilidade | Payloads anteriores, UUIDs, foto, torrefador, textos, locais distintos do mesmo produtor, pacote, biblioteca, histórico e sessão preservados; sem atribuir notas |
| Temas e responsividade | Formulário, ficha e produtor nos dois temas a 390 e 1440 px; formulário também a 320 px, sem rolagem horizontal |
| Android 0.4.3 | APK compilado, instalado como atualização e aberto a frio; base original conferida antes e depois |
| SQLite e Filesystem reais | Café com espécie, tags, escalas 0/10, produtor, propriedade/origem e foto privada salvos pelo WebView; dados e imagem recuperados após encerrar/reabrir |
| Limpeza da validação | Somente café, opções, produtor, propriedade/origem e fotografia temporários removidos; dados, estoque, 17 itens da biblioteca, histórico e aparência anteriores preservados |

Os testes de interface foram pontuais em `/tmp`, sem nova suíte ou dependências do projeto. O APK final fica em `android/app/build/outputs/apk/debug/app-debug.apk`. A atualização mantém os dados já presentes no aparelho; não adiciona cafés ou avaliações de demonstração.

**Pendências manuais:** experimentar a galeria Android com fotografias reais de diferentes formatos, abertura do site em navegador externo e leitura por TalkBack/VoiceOver. A seleção automatizada de arquivo confirmou otimização e persistência; não exercitou a tela da galeria do sistema. Permanecem as verificações manuais anteriores de som, vibração, botão físico Voltar, tela ligada e recortes em outros aparelhos.

Não houve migração física, novas dependências, commits, pushes ou início da Fase 05. A avaliação geral implementada pertence ao produto café; avaliações de preparações continuam fora desta fase.

## Atualização 0.4.2 — Biblioteca pessoal persistente

A consulta do catálogo educativo, por si só, não criava registros pessoais. A ação **Adicionar catálogo à minha biblioteca** agora incorpora todos os métodos, técnicas e receitas em uma única transação, reutilizando as cópias existentes. O conteúdo pode ser editado pelos mesmos formulários do cadastro manual.

Verificações executadas em 15/11/2026:

| Verificação | Resultado |
| --- | --- |
| TypeScript, build e Vitest | Aprovados; 24 testes, incluindo importação completa, repetição concorrente, edições, exclusões e rollback de lote com erro |
| Navegador | Oito métodos, cinco técnicas e quatro receitas gravados; edições dos três tipos preservadas após recarga e nova importação |
| Interface | Novo controle conferido em claro/escuro a 320 e 1440 px, sem rolagem horizontal ou erros de execução |
| APK 0.4.2 | Compilado e instalado como atualização com `adb install -r`: `Success` |
| SQLite real | Catálogo incorporado pela interface nas tabelas principais: 8 métodos, 5 técnicas e 4 receitas; nova importação não duplicou nem sobrescreveu edições |
| Encerrar e reabrir | Edições de método, técnica e receita recuperadas após encerramento do processo; conferência final após nova abertura |
| Dados anteriores | Café, pacote, registros relacionados, saldo, histórico, sessão e aparência preservados; esquema mantido na versão 4 |

**Os 17 registros foram mantidos na biblioteca pessoal do aparelho, conforme solicitado.** Apenas as alterações temporárias de nomes usadas para testar a edição foram revertidas. Nenhum café, pacote ou preparo de exemplo foi adicionado. Uma exclusão feita pela pessoa não é desfeita ao abrir o aplicativo; uma nova incorporação depende de ação explícita.

A versão 0.4.2 não acrescenta dependências nem migrações. As pendências educativas e verificações manuais Android documentadas abaixo continuam aplicáveis. Não houve commits ou pushes.

## Verificações da entrega — Fase 04.1

Executadas em 15/11/2026, com dados temporários em ambientes de validação:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados; versão 0.4.1 |
| Vitest | 23 testes aprovados; três novos testes pontuais para catálogo, dependências/idempotência/edições e persistência concorrente |
| Consulta educativa | Oito métodos, cinco técnicas e quatro receitas acessíveis; nenhuma gravação automática nem requisição externa ao consultar as 17 fichas |
| Consulta sem conexão | Navegação no catálogo já carregado aprovada com o Chrome em modo offline; não há instalação PWA nem promessa de recarregar o site sem servidor |
| Importação | Receita com método e técnica, método isolado e técnica com método aprovados; reimportação não duplica nem sobrescreve edições; nomes iguais não são mesclados |
| Cópia e original | Nome pessoal corrigido e recuperado após recarga; referência original preservada e identificada separadamente |
| Preparo guiado | Receita Café Gerações importada, pausa/retomada, espera observável antes do terceiro despejo e conclusão sem pacote aprovadas; histórico recuperado após recarga |
| Temas e responsividade | Listagens, orientação geral, método e receita revisados em claro/escuro, a 390 e 1440 px; receita também em 320 px, sem rolagem horizontal ou erros de execução |
| Android 0.4.1 | Sincronização, `assembleDebug` e atualização com `adb install -r` aprovados; abertura a frio confirmada |
| Biblioteca e preparo nativos | Catálogo consultado, receita com dependências importada pelo WebView/SQLite, cópia editada e preparo iniciado/pausado |
| Reabertura Android | Cópia editada e sessão recuperadas após encerrar/reabrir; preparo concluído sem pacote nem desconto; SQLite permaneceu na versão 4 |
| Preservação e limpeza | Metadados, aparência e dados anteriores conferidos; somente método, técnica, receita e preparo temporários da validação nativa removidos |

A verificação de navegador usou perfil isolado e scripts em `/tmp`, sem nova infraestrutura ou dependências. A base do aparelho foi registrada antes da atualização e comparada novamente após a limpeza. O APK final está em `android/app/build/outputs/apk/debug/app-debug.apk`.

**Pendências:** confirmar a fonte/link e o significado de 1min40s da referência Café Gerações antes de acrescentar instruções temporais. A inspeção manual de barras/recortes em outros aparelhos e as pendências de som, vibração e botão físico Voltar da Fase 04 continuam aplicáveis; esta fase não altera esses recursos. Não houve migração de banco, commits, pushes ou início da Fase 05.

## Verificações da entrega — Fase 04

Executadas em 15/11/2026, com dados temporários e sem acrescentar infraestrutura de testes:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados |
| Vitest | 20 testes no total; seis novos testes pontuais para relógio, transições, suspensão/recuperação, recálculo, integridade e transações |
| Revisão e receita original | Dose/água e moagem ajustadas somente no preparo; recálculo explícito de despejos e receita original preservada |
| Cronômetro no Chrome | Pausa/retomada, avanço por tempo, espera manual e condição observável aprovados; troca de tema preserva o relógio |
| Avisos no Chrome | Botão de teste gerou dois osciladores Web Audio; preferência de som recuperada após recarga |
| Suspensão e recuperação web | Etapa vencida aguarda confirmação após retorno; recarga recupera a etapa pausada, sem conclusão automática |
| Conclusão, interrupção e descarte | Concluído com dose descontada; interrompido sem consumo; interrompido com consumo explícito; descarte sem registro nem desconto aprovados |
| Integridade de estoque | Confirmações concorrentes descontam uma única dose; saldo alterado/insuficiente não grava preparo nem desconto parcial; SQL testa rollback após falha de gravação |
| Histórico web | Registro, cópia da receita e tempos recuperados após recarga; edição posterior da receita mantém o nome histórico; preparos relacionados aparecem na ficha do café |
| Migração | IndexedDB 3 → 4 e SQL SQLite 3 → 4 preservam os dados anteriores; upgrades de versões anteriores continuam cobertos pelos testes existentes |
| Temas e responsividade | Execução e ficha em claro/escuro, 390 e 1440 px; histórico também em 320 px, sem rolagem horizontal. Controles principais conferidos no smartphone |
| APK Android 0.4.0 | Sincronização, compilação e instalação como atualização aprovadas (`adb install -r`: `Success`) |
| Migração nativa | Plugin confirmou 3 → 4, preservando receita e pacote temporários inseridos antes da atualização e os registros originais |
| Preparo nativo | Revisão 25 g / 375 g, pausa/retomada, avanço temporizado e espera observável aprovados no WebView |
| Recuperação e salvamento nativos | Após encerrar e reabrir, sessão recuperada; conclusão gerou um registro e saldo de 125 g → 100 g; receita original permaneceu com dose de 20 g |
| Reabertura e limpeza Android | Registro e saldo confirmados após nova abertura; somente os registros temporários identificados foram removidos, mantendo os dados anteriores e a aparência atual |

A validação web usou um perfil isolado do Chrome e scripts em `/tmp`, sem suíte de componentes nem dependências no projeto. O Android foi verificado pelo WebView e plugin SQLite reais. Os registros de estudo não são inseridos automaticamente no aplicativo.

**Pendências manuais:** ouvir os sinais no aparelho, sentir a vibração conforme suas configurações e conferir tela ligada/bloqueio prolongado, barras e recortes em outros aparelhos. A proteção do botão Voltar foi implementada e compilada, mas o dispositivo recusou a simulação por ADB com `INJECT_EVENTS`; falta exercitar o botão físico manualmente. A troca de tema e a geração de avisos foram exercitadas no navegador, sem prometer saída audível em todo ambiente.

Para executar na web, use `npm run dev` e abra a URL indicada, normalmente `http://127.0.0.1:5173`. No Android, abra uma receita, escolha **Preparar**, revise os parâmetros e inicie. O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`; atualizações podem ser executadas com `npm run android:run`.

Não foram executados commits ou pushes, nem iniciada a Fase 05.

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

Na entrega da Fase 03, não houve commits, pushes ou início da Fase 04.

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
