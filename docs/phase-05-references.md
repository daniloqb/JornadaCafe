# Fase 05 — Ajustes às referências aprovadas

As três imagens fornecidas foram comparadas diretamente com a interface. Os originais estão em [docs/references/phase-05](references/phase-05/). Esta revisão substitui a pendência de comparação visual registrada na primeira entrega.

| Referência | Ajustes implementados | Capturas para comparar |
| --- | --- | --- |
| [Meu caminho](references/phase-05/meu-caminho.png) | Fotografia de diário, caneta, xícara e V60; título creme em fundo espresso; traço terracota; indicadores sobrepostos em cacau, oliva e terracota; história com ícone botânico; cartão “Continuar minha jornada”. | [Claro 390 px](previews/phase-05/caminho-light-390.png) · [Escuro 390 px](previews/phase-05/caminho-dark-390.png) · [Desktop](previews/phase-05/caminho-light-1440.png) |
| [Minha evolução](references/phase-05/minha-evolucao.png) | Abas com ícones e seleção oliva; xícara sobre linho no cabeçalho; dois gráficos largos e independentes, em terracota e oliva; médias mensais com pontos, área discreta e valor mais recente; cartões de métodos e percepções. | [Claro 390 px](previews/phase-05/evolucao-light-390.png) · [Escuro 390 px](previews/phase-05/evolucao-dark-390.png) · [Desktop](previews/phase-05/evolucao-light-1440.png) |
| [Memórias e reflexões](references/phase-05/memorias-reflexoes.png) | Abertura com botânica; reflexão real em superfície oliva clara, aspas e filete vertical; cronologia com linha terracota e ícones circulares; cartões de experiências e ação terracota “Registrar uma reflexão”. Destaque também aplicado ao diário. | [Memórias, início da tela](previews/phase-05/memorias-viewport-light.png) · [Linha do tempo](previews/phase-05/tempo-light-390.png) · [Diário claro](previews/phase-05/diario-light-390.png) · [Diário escuro](previews/phase-05/diario-dark-390.png) |

As capturas usam registros de validação de um perfil isolado do Chrome, distribuídos ao longo de vários meses. Nenhum número, data, método, sabor ou relato ilustrativo das referências foi inserido no aplicativo como dado do usuário. Fotografias e botânica são assets decorativos locais, não fotos dos cafés cadastrados.

## Adaptações de conteúdo e acessibilidade

- Mantidos quatro indicadores reais, incluindo técnicas, com duas colunas em smartphones. Valores numéricos continuam em DM Sans tabular; títulos e destaques usam Fraunces.
- As cinco áreas da navegação principal permanecem. A Jornada tem cabeçalho próprio com retorno e aparência; as quatro seções internas usam ícones, texto e sublinhado na seleção.
- Em larguras estreitas, métodos e percepções ficam empilhados. Campos e botões conservam seus alvos de toque; formulários continuam em modais com rolagem interna.
- Os gráficos mostram médias por mês com quantidade de avaliações e acesso aos valores individuais. Nota zero participa do cálculo; nota ausente não participa. Meses ausentes não recebem valores e não são ligados pela curva. Os segmentos são retos, sem suavização.
- “Características registradas” mede o preenchimento de campos, sem atribuir habilidade ou conhecimento. A redação subjetiva da imagem de evolução não foi adotada como afirmação sobre o usuário.
- O destaque e os cartões exibem somente palavras de reflexões existentes. Sem reflexões, há estado vazio e ação de cadastro; o relato ilustrativo sobre acidez não foi copiado.
- A linha do tempo preserva filtros, marcos verificáveis, paginação e links para os registros originais.

## Validação desta revisão

- TypeScript e build web aprovados; **42 testes em 9 arquivos**, incluindo um novo teste das médias mensais, contagens, nota zero, ordem dos dados e meses sem observações.
- Reexecutadas **232 combinações** de tela, tema e largura em 320, 390, 768 e 1440 px, sem rolagem horizontal nem exceções de execução. Fluxos de CRUD, destaque, histórico e sessão pausada preservados.
- Conferência final adicional de **32 combinações** das quatro seções, com fontes, imagens carregadas e coordenadas dos gráficos ajustadas à largura real. [Resultados](previews/phase-05/reference-validation.json).
- **42 pares adicionais** de contraste medidos nas novas superfícies, indicadores e chamadas dos gráficos: todos passaram nos limiares adotados. [Valores, cores e objetivos](previews/phase-05/reference-contrast.json). A varredura de texto nas 48 combinações de tela/tema também não apontou pares abaixo do objetivo em superfícies sólidas. Esses resultados não constituem auditoria WCAG completa.
- Assets sincronizados com Capacitor e APK Android de desenvolvimento recompilado. Após solicitação posterior do usuário, a atualização principal 0.5.0 foi instalada com sucesso e sua abertura foi confirmada no aparelho, sem limpeza de dados. A validação física completa dos fluxos continua pendente; veja o [relatório principal](phase-05.md#8-android-e-pendências).
- Sem alteração da migração, do motor de preparo ou das regras de estoque. Sem commit ou push.

## Assets gerados e prompts

Gerados com a skill **imagegen**, usando o recurso integrado `image_gen` e salvos no repositório. As referências originais não foram modificadas. Transparência preservada nos dois recortes.

**[public/images/journey-ritual.png](../public/images/journey-ritual.png)** — fotografia da abertura:

```text
Use case: photorealistic-natural. Create a brand new editorial photograph asset for a coffee journal app. Reference image: /home/user/Downloads/Minha Jornada pelo Café-1.png is a composition and mood reference only; do not reproduce its UI or text. A warmly lit rustic wooden table holds an open cream paper journal with loose abstract handwriting and a simple unlabelled coffee dripper sketch, a fountain pen resting diagonally across its pages, one speckled oat ceramic cup of dark coffee near the center-right, and a clear glass V60 style dripper with a paper filter on a glass server on the right side. A few coffee leaves at bottom-left. Deep espresso brown softly blurred background, warm amber sidelight, cozy artisanal photographic realism. Wide 3:2 frame. The top-left 50 percent of the frame is mostly dark quiet background providing room for heading text to be overlaid in HTML, all physical objects mainly in lower half and right. No UI, no typography, no legible letters, no labels, no watermark. Full bleed image.
```

**[public/images/journey-botanical.png](../public/images/journey-botanical.png)** — botânica com fundo transparente:

```text
Use case: illustration-story. Create a single delicate vintage botanical watercolor illustration for an editorial coffee diary app. One natural Coffea arabica branch with slender brown stems, seven or eight elongated olive and sage green leaves with fine veins, and a small cluster of deep terracotta red coffee cherries. Elegant antique botanical plate style, light watercolor with realistic organic details, soft warm tones. The branch enters from the top-right corner and curves diagonally toward lower-left, suitable for decorating the right corner of a cream page header. No paper backdrop, no rectangular scene, no text, no labels, no frame, no UI. Isolated cutout with genuinely transparent background.
```

**[public/images/journey-cup.png](../public/images/journey-cup.png)** — xícara e linho com fundo transparente:

```text
Use case: photorealistic-natural. Asset type: isolated still-life photograph for the right side of a cream editorial coffee app banner. Create one speckled oat-beige ceramic coffee cup filled with black coffee, handle to the right, resting on a loosely folded piece of warm oatmeal linen. Two understated natural coffee leaves rise behind it. Three-quarter camera angle slightly above the cup so the dark coffee surface is visible, warm soft side light, realistic artisanal textures, restrained cozy editorial feel. Show the whole cup and folded linen with modest breathing room. No table, no backdrop, no rectangle of paper, no UI, no text or letters, no logos. The objects are an isolated photographic cutout with genuine transparency and a soft natural contact shadow only under the linen.
```
