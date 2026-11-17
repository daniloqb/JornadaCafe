# Fase 05 — Minha Jornada

Entrega local em 16/11/2026, versão **0.5.0**, esquema de dados **5**. Sem commit ou push.

## 1. Implementação

A aba principal **Minha Jornada** agora contém quatro seções com rotas internas: **Meu caminho**, **Minha evolução**, **Linha do tempo** e **Meu diário**. As cinco áreas principais foram mantidas.

Meu caminho reúne fotografia decorativa local, frase editorial, quatro indicadores e uma narrativa determinística. Os indicadores usam somente preparos concluídos. Cafés, métodos e técnicas são deduplicados por identificador dos snapshots históricos; uma receita cadastrada nunca conta como método experimentado. A narrativa informa datas e frequências verificáveis, inclusive empates, sem inferir preferências ou sentimentos.

Minha evolução apresenta avaliações de 0 a 10 e quantidade de características preenchidas em gráficos separados, com escalas fixas, médias mensais calculadas somente dos valores registrados e acesso aos valores individuais. Os segmentos retos ligam apenas meses consecutivos com dados; meses ausentes interrompem a série. Há seleção de todo o período, ano atual ou mês atual, quantidade de registros e tabelas de valores com acesso aos preparos. Campos ausentes não viram notas zero; uma nota zero registrada permanece válida. Os períodos sem avaliações têm mensagem própria. Os gráficos não suavizam os dados nem atribuem valores a meses sem observações.

Métodos mostram quantidade e percentual sobre os preparos concluídos com método identificável; registros sem método ficam explicitamente fora desse denominador. As percepções vêm exclusivamente das tags das avaliações dos preparos e permitem abrir os respectivos registros. A descrição comercial, as notas e as tags do cadastro do café não são usadas como avaliações de xícaras.

A linha do tempo reúne preparos concluídos, suas avaliações e reflexões. Os primeiros preparos, primeiros métodos e primeiros cafés são marcas calculadas dentro do cartão do preparo, sem eventos duplicados no banco. Os IDs derivam dos registros originais e a ordenação usa as datas dos acontecimentos. Reflexões têm precisão de dia; o meio-dia local é apenas uma chave interna de ordenação, sem exibir um horário que o usuário não informou. Há filtros e carregamento incremental de 20 acontecimentos.

O diário permite criar, ler, editar, excluir com confirmação e destacar uma reflexão. A mais recente aparece no destaque quando nenhuma foi selecionada. Data e texto são suficientes; título, categoria, associação e destaque são opcionais. O conteúdo completo fica no editor, os cartões trazem excertos e o destaque longo tem rolagem própria. O texto é preservado exatamente como escrito. A tela inicial passou a mostrar os três acontecimentos mais recentes.

## 2. Telas criadas ou modificadas

| Área | Mudança |
| --- | --- |
| Minha Jornada | Quatro seções, indicadores, narrativa, gráficos, métodos, tags, linha do tempo, filtros e diário. |
| Cadastro/edição de reflexão | Modal com campos essenciais, opções complementares recolhidas e confirmação de exclusão. |
| Detalhes do histórico | Avaliação opcional de cada preparo concluído: geral, acidez, doçura, corpo, intensidade e tags livres. |
| Início | Experiências recentes reais, incluindo reflexões. |
| Receitas, Revisão e Preparo Guiado | Correção das exceções que forçavam DM Sans nos títulos, mantendo a composição anterior e o cronômetro funcional. |
| Demais telas, navegação, campos e modais | Aplicação dos estilos globais, contraste e fonte funcional nos controles. |
| Android | Assets sincronizados, versão 0.5.0 / versionCode 9 e cores nativas de fundo alinhadas ao creme. |

**Diferença encontrada na base:** esta revisão possuía avaliações de cafés, mas não avaliações de preparos. Para alimentar a Jornada de maneira correta, foi acrescentado `evaluation?` ao payload já existente de `Preparation`, com uma ação própria nos detalhes do histórico. Nenhuma avaliação de produto foi copiada ou reinterpretada. O motor do preparo guiado e as regras de consumo de estoque não foram alterados.

## 3. Tipografia e componentes compartilhados

As fontes **Fraunces Variable** normal/itálica e **DM Sans Variable** normal já estavam instaladas e continuam empacotadas como WOFF2 locais, sem requisições a provedores externos. Licenças mantidas em `public/licenses/`.

| Uso semântico | Família e escala |
| --- | --- |
| Página | Fraunces 550, 30–42 px; dimensões específicas de Revisão/Preparo preservadas. |
| Seção | Fraunces 550, 25–32 px. |
| Cartão editorial | Fraunces 550, 23 px; listas compactas preservam sua escala. |
| Destaque/reflexão | Fraunces 450, 22–30 px; itálico pontual. |
| Corpo / secundário / legenda | DM Sans 400, 16 / 14 / 12 px nos novos estilos semânticos. |
| Botão / navegação | DM Sans 600 / 550; controles existentes preservam suas dimensões. |
| Valores / cronômetro | DM Sans, números tabulares; escala responsiva do relógio preservada. |
| Campos | DM Sans 16 px, inclusive selects e textareas, evitando zoom automático em campos pequenos. |

As exceções foram corrigidas no próprio `theme.css`, onde se concentram as famílias, escalas e tokens `--type-*`. Títulos de receitas, seções da revisão, instrução atual, etapas do preparo e Configurações passaram a Fraunces. Pesos editoriais 450/550 substituem o 700 funcional nessas áreas. Dose, água, proporção, estoque e relógio usam DM Sans.

`PageHeader`, `Card`, `Button`, `ActionLink`, `BackLink`, os campos compartilhados e `Dialog` recebem as correções globais. O modal reutilizado tem altura limitada ao viewport e rolagem interna; campos têm 46 px de altura mínima, ações e abas têm alvos amplos, e seleções incluem texto/sublinhado além da cor. Não foi adicionada biblioteca de gráficos ou uma terceira família.

## 4. Identidade e contraste

Os tokens centrais retomam os valores solicitados: espresso `#2B1D17`, creme `#F5EBDD`, cacau `#513629`, areia `#E6D1BC`, oliva de identidade `#829477` e terracota `#B66C58`. Oliva e terracota funcionais usam variantes mais escuras no tema claro para textos e dados. O tema escuro preserva seus tokens próprios.

Problemas medidos ao aplicar a superfície areia:

| Par anterior sobre #E6D1BC | Antes | Ajuste | Depois |
| --- | --- | --- | --- |
| Texto secundário #765A43 | 4,29:1 | #6E523D | 4,84:1 |
| Oliva funcional #486A36 | 4,19:1 | #41622F | 4,72:1 |
| Terracota funcional #8D513D | 4,21:1 | #854936 | 4,73:1 |

Campos, busca, seletores de aparência, botões secundários e retorno passaram a usar **`--color-control-border`**, em vez de depender da borda suave de cartões. A borda funcional tem pelo menos **3,19:1** nas superfícies claras verificadas e **4,27:1** nas escuras. Bordas de cartões e divisores continuam decorativos. O texto sobre o banner fotográfico recebeu uma camada espresso mais opaca, e suas cores foram centralizadas em tokens.

Foram calculados **74 pares sólidos globais**, incluindo textos principais/secundários, oliva, terracota, ações, edição, confirmação, cronômetro, navegação, instrução e bordas funcionais: todos atingiram o objetivo adotado. Os valores de cada par, cores e limiares estão em [contrast.json](previews/phase-05/contrast.json). A revisão com as referências acrescentou **42 pares** de papel, cartões, destaque, navegação oliva, terracota e chamadas dos gráficos, todos aprovados em [reference-contrast.json](previews/phase-05/reference-contrast.json). A varredura adicional do texto visível em **48 combinações de tela/tema**, incluindo reflexão em modal, não encontrou pares abaixo do objetivo em superfícies sólidas.

**Limites:** isso não constitui auditoria WCAG completa. Fotografias, gradientes, opacidade, estados desabilitados, controles nativos do sistema, foco em todas as combinações possíveis, leitores de tela e todas as condições de uso precisam de avaliação específica. A varredura de texto não mede pixels de imagens/gradientes nem comprova conformidade de todos os ícones. Gráficos apresentam escalas, valores e tabelas; informações não dependem exclusivamente de cor.

## 5. Persistência e migração

O único novo conjunto de registros é **`reflections`**:

```ts
interface Reflection {
  id: string;
  occurredOn: string;       // YYYY-MM-DD, data local do acontecimento
  createdAt: string;        // ISO, preservada ao editar
  updatedAt: string;        // ISO
  title?: string;
  text: string;            // obrigatório, conteúdo original preservado
  category?: string;
  association?: { kind: 'coffee' | 'preparation'; id: string };
  featured?: boolean;
}
```

As mutações validam data civil, texto obrigatório e novos vínculos. A exclusão do registro associado não apaga a reflexão. A associação histórica fica preservada no payload e a interface informa quando o registro não existe mais; o usuário pode editar, remover ou substituir esse vínculo. Um destaque explícito substitui o anterior na mesma transação.

IndexedDB sobe de **4 para 5**, acrescentando somente o object store de reflexões. SQLite registra o upgrade **5**, cria `reflections(id, payload)` e atualiza o metadado de versão. As migrações anteriores continuam registradas. Os payloads de cafés, fotos, pacotes, receitas, versões, preparos e sessões anteriores não são reescritos pela migração. A avaliação opcional ocupa o payload já existente do preparo, sem nova tabela.

Leitura, escrita e mudanças incrementais reutilizam os adaptadores atuais. As regras do diário e da avaliação são compartilhadas, com transação IndexedDB ou SQLite. Não foram introduzidos autenticação, nuvem, sincronização, geração de textos por IA ou novas regras de estoque.

## 6. Testes executados

- `npm run typecheck` e `npm run build`: aprovados.
- `npm test`: **42 testes aprovados em 9 arquivos**; os 32 testes anteriores foram mantidos, atualizando somente expectativas da versão de armazenamento quando necessário.
- Novos testes: indicadores; métodos distintos e denominador; nota zero e notas ausentes; características separadas de notas/tags comerciais; períodos sem dados e médias mensais com contagem e nota zero; linha do tempo e marcos determinísticos; datas locais; CRUD, destaque, conteúdo original e vínculos opcionais/órfãos; migração e reabertura IndexedDB; fotos, todas as tabelas anteriores e metadados preservados; migração SQLite idempotente; adaptador SQLite com motor SQLite real no host, transações e rollback de edição inválida.
- Navegador Chrome isolado: **232 combinações** de tela/formulário, tema e largura, sem rolagem horizontal e sem exceções de execução. Larguras: **320, 390, 768 e 1440 px**. Temas foram persistidos e conferidos durante a navegação.
- Fluxos de navegador: criar/editar/excluir reflexão; cancelar exclusão; conteúdo e criação preservados; paginação 20 → 25 acontecimentos; avaliação zero e tags pelo histórico; confirmação de revisão mantém sessão pausada em 00:00; Fraunces em títulos editoriais e DM Sans no relógio.
- `git diff --check`: aprovado.

Os registros das capturas foram criados **somente em um perfil isolado do navegador**, identificado como dados de validação. Não foram inseridos no banco do usuário, nem incorporados ao aplicativo como exemplos automáticos. [Resultados por combinação](previews/phase-05/validation.json).

## 7. Capturas e comparação visual

As três imagens foram fornecidas após a primeira entrega e agora estão preservadas em `docs/references/phase-05/`. A composição foi revisada diretamente com esses materiais: abertura fotográfica com diário e preparo, indicadores sobrepostos, cabeçalho espresso, navegação interna oliva com ícones, gráficos amplos, detalhes terracota, botânica, destaque de reflexão e linha vertical de memórias.

| Referência aprovada | Implementação comparada |
| --- | --- |
| [Meu caminho](references/phase-05/meu-caminho.png) | [Mobile](previews/phase-05/caminho-light-390.png) · [Desktop](previews/phase-05/caminho-light-1440.png) |
| [Minha evolução](references/phase-05/minha-evolucao.png) | [Mobile](previews/phase-05/evolucao-light-390.png) · [Desktop](previews/phase-05/evolucao-light-1440.png) |
| [Memórias e reflexões](references/phase-05/memorias-reflexoes.png) | [Memórias](previews/phase-05/memorias-viewport-light.png) · [Diário](previews/phase-05/diario-light-390.png) |

A comparação direta foi realizada. Adaptações: quatro indicadores preservam a contagem de técnicas e ocupam duas colunas no smartphone; cartões inferiores empilham quando necessário; seleção usa ícones e sublinhado além de cor; a navegação principal mantém cinco áreas. Os números usam DM Sans tabular conforme o sistema obrigatório. Textos subjetivos e relatos das referências não foram copiados para os registros, e os gráficos só apresentam dados efetivamente avaliados. Em vez de sugerir maior habilidade pelo número de campos preenchidos, a descrição permanece neutra.

Há **32 verificações finais adicionais** das quatro seções nas larguras 320/390/768/1440 e nos dois temas, com imagens carregadas e coordenadas dos gráficos adequadas à largura real. Resultados em [reference-validation.json](previews/phase-05/reference-validation.json). Assets gerados, prompts e correspondências detalhadas estão em [Ajustes às referências](phase-05-references.md).

Capturas representativas em 390 px:

| Tela | Claro | Escuro |
| --- | --- | --- |
| Meu caminho | [Captura](previews/phase-05/caminho-light-390.png) | [Captura](previews/phase-05/caminho-dark-390.png) |
| Minha evolução | [Captura](previews/phase-05/evolucao-light-390.png) | [Captura](previews/phase-05/evolucao-dark-390.png) |
| Linha do tempo | [Captura](previews/phase-05/tempo-light-390.png) | [Captura](previews/phase-05/tempo-dark-390.png) |
| Meu diário | [Captura](previews/phase-05/diario-light-390.png) | [Captura](previews/phase-05/diario-dark-390.png) |
| Cadastro de reflexão | [Captura](previews/phase-05/reflexao-light.png) | [Captura](previews/phase-05/reflexao-dark.png) |
| Opções de associação e destaque | [Captura](previews/phase-05/reflexao-opcoes-light.png) | [Captura](previews/phase-05/reflexao-opcoes-dark.png) |
| Jornada sem registros | [Captura](previews/phase-05/vazio-light.png) | [Captura](previews/phase-05/vazio-dark.png) |

As quatro seções também possuem capturas em **1440 px** no mesmo diretório. As outras larguras constam da validação geométrica. Capturas completas podem mostrar a navegação fixa na altura do viewport original; ela acompanha a rolagem normal do aplicativo.

Comparação com a implementação anterior em 390 px:

| Tela | Antes (Fase 04.4) | Depois (Fase 05) |
| --- | --- | --- |
| Revisão clara | [Antes](previews/phase-04.4/revisao-claro.png) | [Depois](previews/phase-05/revisao-light.png) |
| Revisão escura | [Antes](previews/phase-04.4/revisao-escuro.png) | [Depois](previews/phase-05/revisao-dark.png) |
| Preparo claro | [Antes](previews/phase-04.4/preparo-claro.png) | [Depois](previews/phase-05/preparo-light.png) |
| Preparo escuro | [Antes](previews/phase-04.4/preparo-escuro.png) | [Depois](previews/phase-05/preparo-dark.png) |
| Receitas | [Antes](previews/phase-04.4/biblioteca-claro.png) | [Depois](previews/phase-05/receitas-light.png) |
| Configurações | [Antes](previews/phase-04.4/configuracoes-claro.png) | [Depois](previews/phase-05/configuracoes-light.png) |

A comparação preserva os grupos de parâmetros, fotos, cartões, relógio circular, sequência de preparo e ações. A diferença editorial está nas famílias e pesos dos títulos; dados e quebras variam com a biblioteca de teste.

A revisão global também inclui capturas claras/escuras de Início, coleção, cadastro/edição e detalhes de café, produtores/lista/detalhes/formulário, pacote, métodos, técnicas, receitas e detalhes/formulário, histórico, avaliação e seu formulário, Configurações e o estado atual de Minhas Descobertas. [Índice das capturas](previews/phase-05/README.md).

## 8. Android e pendências

`npm run android:sync` concluiu a sincronização dos assets e dos plugins. `./gradlew assembleDebug --offline` gerou o APK de desenvolvimento principal em `android/app/build/outputs/apk/debug/app-debug.apk`. As três fontes WOFF2 locais estão incluídas no build web. Os avisos Gradle existentes sobre `flatDir` não impediram a compilação.

Um smartphone **22101316G** estava conectado. Foi gerado um pacote separado de teste, `br.com.jornadacafe.phase05qa`, para não migrar ou alterar o banco da instalação principal. A instalação foi recusada pelo aparelho com **`INSTALL_FAILED_USER_RESTRICTED: Install canceled by user`**. Não foi repetida nem contornada a restrição. Nenhum emulador Android estava configurado.

Após nova solicitação explícita do usuário, a instalação principal foi atualizada em 16/11/2026 com `adb install -r`: **Success**. O Android confirmou **versionName 0.5.0 / versionCode 9**; a abertura de `br.com.jornadacafe.app/.MainActivity` retornou **Status: ok**. Uma captura confirmou a interface de Minha Jornada carregada com um preparo anterior visível. A atualização não utilizou limpeza de dados ou desinstalação.

Esta é uma conferência física de instalação e abertura, não uma validação completa de todos os fluxos. Os testes automatizados de SQLite/migração foram executados no motor do host e pelo adaptador com ponte simulada. Permanecem pendentes no Android: renderização real das fontes/gráficos e temas, teclado virtual, áreas seguras, navegação/voltar, CRUD e migração SQLite via plugin, recuperação após encerrar o processo e desempenho em uso prolongado. A verificação web e a compilação não substituem esses testes.

A implementação está entregue; a comparação visual com as três referências foi realizada. A validação física completa dos fluxos Android permanece aberta; instalação e abertura da versão 0.5.0 foram confirmadas. A Fase 06 não foi iniciada.
