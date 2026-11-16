# Fase 04.4 — Relatório visual

As três referências aprovadas orientam diretamente a implementação, incluindo composição, proporções, hierarquia, contraste, tipografia e espaçamento. Os dados das imagens são ilustrativos e não foram incorporados como receitas, tempos, estoque ou avaliações.

## Referências e implementação

| Referência aprovada | Correspondência implementada |
| --- | --- |
| [Revisão da receita](references/phase-04.4/revisao-receita.png) | Retorno e marca no cabeçalho, título editorial, fotografia ao lado da identificação, quatro parâmetros no mesmo grupo, moagem/filtro em superfícies areia, linha do tempo e confirmação verde ampla com legenda. |
| [Preparo guiado](references/phase-04.4/preparo-guiado.png) | Cabeçalho com receita, contador de etapas com pontos e barra, cartão espresso com instrução, círculo central com tempo decorrido e ação integrada, métricas em cartões separados, sequência vertical dentro do painel e navegação abaixo. |
| [Receitas e configurações](references/phase-04.4/biblioteca-configuracoes.png) | Marca em fundo espresso, histórico destacado, banner com café e livros, lista compacta de receitas, navegação inferior escura com seleção areia, acesso a Configurações e escolha visual de aparência. |

Confirmar a revisão cria uma sessão pausada em **00:00**. O tempo só começa com **Iniciar**, dentro do círculo. **Pausar/Retomar**, avanço manual, avanço por tempo definido, observação de condições e retorno confirmado continuam usando o mesmo motor de cronômetro. Sessões existentes continuam recuperáveis. O formato de persistência não mudou e não há migração de banco.

Capturas completas da implementação em 390 px, com dados de teste:

| Tela | Claro | Escuro |
| --- | --- | --- |
| Revisão | [Captura](previews/phase-04.4/revisao-claro.png) | [Captura](previews/phase-04.4/revisao-escuro.png) |
| Preparo guiado | [Captura](previews/phase-04.4/preparo-claro.png) | [Captura](previews/phase-04.4/preparo-escuro.png) |
| Biblioteca | [Captura](previews/phase-04.4/biblioteca-claro.png) | [Captura](previews/phase-04.4/biblioteca-escuro.png) |
| Configurações | [Captura](previews/phase-04.4/configuracoes-claro.png) | [Captura](previews/phase-04.4/configuracoes-escuro.png) |

## Adaptações preservando a intenção visual

- **Conteúdo real:** nome da receita, criador da técnica, versão, moagem, filtro, pesos e etapas vêm da biblioteca. Não se inventam a etiqueta “Familiar”, filtros, previsões ou os intervalos da imagem. A soma dos despejos continua sendo validada e o recálculo continua explícito.
- **Parâmetros editáveis:** o resumo reproduz o agrupamento da referência. Café/pacote, campos completos e editor de etapas ficam em **Ajustar esta xícara**; a seção abre automaticamente quando a validação nativa encontra um campo inválido. Notas extensas têm resumo visual e conteúdo completo na seção de notas. O cartão de moagem também mantém o valor completo no formulário.
- **Fotografias:** imagens cadastradas de técnica, método ou café têm prioridade. Para V60 sem fotografia cadastrada, usa-se uma imagem ilustrativa local, identificada como tal no texto alternativo. Outros métodos mantêm o substituto existente. A imagem da biblioteca é decorativa. Não se grava nenhuma imagem gerada como fotografia do café do usuário.
- **Cronômetro e balança:** o número principal conta o tempo decorrido da etapa. O arco e a duração de referência só aparecem quando existe uma duração definida. A meta acumulada mostra o peso esperado, sem simular uma leitura real da balança nem fixar 0 g como medição. Início e duração só geram um intervalo quando ambos estão registrados; uma etapa sem horários não recebe horários deduzidos.
- **Telas estreitas:** o chip da receita pode ocupar uma segunda linha no cabeçalho; textos longos quebram. Os quatro parâmetros permanecem juntos e seus ícones são ocultados em telas menores para preservar os números. Detalhes adicionais de cada etapa abrem pelo controle de expansão. As ações continuam com alvos de toque amplos.
- **Navegação:** revisão e preparo têm cabeçalho próprio e retorno, conforme as imagens; no celular, a navegação inferior e a barra secundária ficam recolhidas nessas telas. A biblioteca mantém as cinco áreas, acesso às abas de métodos/técnicas e pesquisa expansível, além de Configurações. No desktop, o menu lateral permanece disponível.
- **Configurações:** o modo **Automático** foi mantido junto de Claro/Escuro. Os controles da página e da barra superior sincronizam a seleção e a preferência persiste. Som e vibração reutilizam os controles funcionais. As unidades exibem as convenções atuais; não há seleção fictícia de unidades nem atalhos para integrações não implementadas.
- **Acessibilidade e tema escuro:** a versão escura preserva a mesma composição, com espresso/cacau e textos creme. A etapa atual tem `aria-current="step"`, além do destaque visual; a mudança de instrução é anunciada. O relógio usa números tabulares e não é anunciado a cada atualização. O foco permanece visível e os controles nativos de aparência são operáveis por teclado.

## Imagens de apoio

Geradas com a skill **imagegen**, pelo recurso integrado, e salvas no repositório. As imagens aprovadas não foram modificadas. Os prompts usados foram:

**[public/images/v60-method.png](../public/images/v60-method.png)**

> Create a single photorealistic editorial still-life photograph for a coffee recipe app. Square full-bleed image only, no UI, no text, no labels, no logos, no collage. One clear conical ribbed glass V60-style coffee dripper with an ivory paper filter and coffee grounds, sitting directly on a clear glass coffee server half filled with rich dark brewed coffee, on warm rustic wooden tabletop. Front three-quarter view at the height of the dripper. Entire brewer centered, visible from top of filter to base of server, filling almost the whole square with small breathing room. Warm soft amber side light, deep softly blurred espresso brown background, subtle steam, elegant intimate coffee photography. This is an illustrative method image, not a specific user's coffee package.

**[public/images/coffee-library.png](../public/images/coffee-library.png)**

> Create one wide landscape photorealistic editorial photograph for a coffee library banner. Full-bleed photograph only, no UI, no letters, no text, no logos. An ivory ceramic cup of steaming dark coffee on its saucer, on a polished dark wooden desk next to a small stack of old plain brown books, arranged on the right half. Left half is quiet blurred dark espresso brown background, suitable for overlaying cream text later in HTML. Warm amber soft light from the right, soft subtle steam, rich espresso and cocoa brown shadows, inviting intimate library atmosphere. 3:2 landscape composition.

## Validação

- Build web e verificação TypeScript aprovados.
- **32 testes em 7 arquivos aprovados**, incluindo um novo teste que mantém a sessão confirmada em 00:00 antes de Iniciar, inclusive após recuperação.
- Revisão, preparo guiado, biblioteca e Configurações verificados em Chrome isolado, nas larguras **320, 390, 768 e 1440 px**, nos temas claro e escuro: **32 combinações**, sem rolagem horizontal.
- Fluxos verificados no navegador: importação explícita do catálogo; revisão; recálculo da água; snapshot ajustado sem modificar a receita da biblioteca; espera em 00:00 antes de Iniciar; pausa/retomada; próxima etapa; retorno confirmado; recuperação após recarregar; conclusão sem pacote e sem consumo; sincronização da aparência; preferência após recarregar; modo automático seguindo o sistema claro/escuro. Nenhuma exceção de execução registrada.
- Checagem adicional da pesquisa expansível (sem resultados e limpeza do termo) e da validação de um campo obrigatório em seção recolhida: a seção abre, o campo recebe foco e a revisão não é confirmada até a correção.
- Os pares principais de texto, instrução, navegação e botões têm contraste calculado mínimo de **4,5:1** nos dois temas. Isso não substitui uma auditoria completa de acessibilidade com leitor de tela.
- Comparação visual feita entre capturas do navegador e as três referências aprovadas. As capturas são de dados locais de teste; nenhuma receita demonstrativa foi inserida na base do usuário.
- Em 16/11/2026, o build Android de desenvolvimento foi concluído com `./gradlew assembleDebug`. O APK foi instalado no smartphone conectado usando `adb install -r`, mantendo a instalação e os dados locais. A abertura de `br.com.jornadacafe.app/.MainActivity` retornou `Status: ok`, e uma captura confirmou o carregamento da tela inicial. Essa conferência de instalação e abertura não equivale a testar todos os fluxos em aparelho físico. O [README](../README.md#instalar-ou-atualizar-no-seu-smartphone) contém os comandos para repetir a instalação.
