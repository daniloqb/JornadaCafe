# Fase 06 — Minhas Descobertas

Entrega local em 16/11/2026. Código e APK de desenvolvimento **0.6.0 / versionCode 10**. Esquema de dados **5**, sem migração. Sem commit, push ou início de outra fase.

## 1. Telas e comportamento

A quinta aba existente ganhou quatro áreas, mantendo a navegação principal:

| Tela / rota | Implementação |
| --- | --- |
| Abertura — `#/descobertas` | Fotografia editorial local, título Fraunces e quatro cartões funcionais. |
| Meu perfil de café — `#/descobertas/perfil` | Médias sensoriais, contagens individuais, valores textuais, sensações recorrentes e associações descritivas com evidências. |
| Comparando experiências — `#/descobertas/comparar` | Café com histórico, seleção de dois ou três preparos, comparação de snapshots em tabela ou cartões, notas ausentes explícitas, acesso aos originais. |
| O que venho descobrindo — `#/descobertas/observacoes` | Observações determinísticas, critérios consultáveis e hipótese possível quando há evidência mínima. Filtro por café. |
| Meu conhecimento — `#/descobertas/conhecimento` | Reflexões existentes, filtros por categoria, café e período; leitura/edição no mesmo formulário de Minha Jornada. |

A revisão inicial encontrou as dependências das Fases 04.5 e 05 implementadas: preparos concluídos com snapshots, avaliações opcionais por preparo, reflexões, armazenamento local e editor compartilhado. O fluxo de revisão cria uma sessão aguardando início e o motor existente controla estoque e cronômetro. Não foram criados substitutos para essas estruturas.

Estados vazios não exibem valores fictícios. Um café com apenas um preparo continua consultável, mas não permite comparação de dois registros. Preparos sem avaliação podem ser comparados. Grupos de cafés excluídos continuam disponíveis pelo identificador e nome históricos quando há preparos preservados.

## 2. Dados reutilizados e integridade

Os cálculos usam `CollectionData`, `Preparation`, `Preparation.snapshot`, `Preparation.evaluation` e `Reflection`. Métodos, técnicas, receitas e versões vêm dos snapshots; os dados atuais da receita não substituem o histórico. Nome/foto atuais do café podem identificar o seletor, sem modificar os parâmetros da comparação.

A comparação apresenta método, técnica, receita e versão, dose, água, proporção, moagem e moedor, temperatura, tempo efetivamente acompanhado, avaliação geral, acidez, doçura, corpo, intensidade, tags e observações. Informações ausentes permanecem identificadas como ausentes. Moagem conserva o texto e a escala registrados, sem converter equipamentos ou inferir granulometria equivalente.

Comparar, filtrar ou abrir evidências não escreve nos preparos, receitas, estoque ou sessões. Links levam aos registros originais. Reflexões sem café ou com associação indisponível continuam preservadas e visíveis sem filtros. Associações por preparo também permitem filtrar pelo café histórico.

## 3. Regras de cálculo

As funções puras estão em [discoveries.ts](../src/domain/discoveries.ts).

| Informação | Regra |
| --- | --- |
| Registros elegíveis | Somente preparos com estado `completed`. Preparos interrompidos não alimentam o perfil ou as comparações. |
| Nota válida | Número finito entre 0 e 10, incluindo zero. Ausência, `null`, valores fora do intervalo e não numéricos não recebem nota substituta. |
| Média sensorial | Soma dos valores válidos do campo dividida pelo número de registros daquele campo. Cada indicador mostra seu próprio denominador e as evidências. |
| Sensações | Tags da avaliação do preparo. Normalização de espaços, caixa e acentos para agrupar equivalências simples; uma ocorrência por preparo. Frequência não significa preferência. |
| Comparação | Dois ou três IDs distintos, concluídos, vinculados ao mesmo ID de café. Notas não são obrigatórias. |
| Maior nota | Ao menos dois preparos com avaliação geral válida do mesmo café. Todos os empates são destacados, sem troféu ou ranking de pessoas. |
| Proporções distintas | Água/dose positivas e finitas do snapshot; razão arredondada a quatro casas para agrupar doses equivalentes. |
| Tempos distintos | Mesmo café e mesmo método histórico; pelo menos dois tempos acompanhados finitos, não negativos e diferentes. Não se deduz a causa. |
| Associações no perfil | Grupo com nota geral ≥ 8 versus grupo com nota geral < 8. Exigem-se pelo menos três avaliações preenchidas em cada grupo para cada característica. São mostradas apenas médias diferentes no arredondamento a duas casas. |

Os grupos do perfil podem reunir cafés e condições diferentes. A interface informa o critério, as médias, os tamanhos das amostras e os preparos considerados, sem afirmar preferência definitiva ou significância estatística. Características comerciais e avaliações gerais do cadastro de café não entram no perfil sensorial dos preparos.

## 4. Hipóteses e evidências

Uma hipótese de configuração aparece apenas com **dois ou mais preparos concluídos e avaliados do mesmo café**, notas gerais válidas e uma **maior nota sem empate**. A interface mostra café, parâmetros históricos, quantidade avaliada/considerada, notas por meio dos links de evidência, critério e limitações.

A hipótese propõe revisitar uma experiência para investigar se o resultado se mantém. Não atribui a nota a um único parâmetro. Escalas de moagem não são convertidas e método, técnica, equipamento e demais condições podem variar juntos. Empates mantêm a observação da maior nota, sem escolher arbitrariamente uma configuração para a hipótese.

Cada observação tem IDs de preparos associados. As listas de evidência podem ser expandidas e carregadas em partes. Observação automática, hipótese e reflexão pessoal são identificadas separadamente; nenhuma hipótese é gravada como aprendizado do usuário.

**Ação adotada: “Ver preparo”.** O fluxo de criação de sessão depende da receita e versão disponíveis na biblioteca e não oferece uma repetição direta que garanta preservar todas as condições históricas. Foi usado o fallback previsto no pedido, sem criar outro motor, alterar receitas, consumir estoque ou substituir sessões.

## 5. Componentes, identidade e responsividade

Criados: `SensoryProfile`, `ExperienceComparison`, `ObservedDiscoveries`, `PersonalKnowledge` e os componentes de evidência/hipótese em `shared.tsx`. A antiga abertura provisória foi substituída por `DiscoveriesPage` com rotas internas.

Reutilizados: `CollectionContext`, `ReflectionForm`, `Card`, `Button`, `ActionLink`, `BackLink`, campos, controle de aparência e composição editorial da Jornada. A edição atualiza o mesmo registro e aparece nas duas áreas. A criação continua acessível por Minha Jornada.

Fraunces permanece nos títulos; DM Sans nos textos, controles e valores. As duas famílias e suas licenças são locais. Os estilos novos ficam no escopo de Descobertas e reutilizam os tokens de papel, cartão, oliva e terracota já aprovados. Claro, Escuro e Automático continuam disponíveis.

Foram usadas **barras com valores e contagens**, alternativa permitida ao radar, sem adicionar biblioteca gráfica ou uma dimensão sensorial fictícia. No desktop, a comparação automática usa colunas; no smartphone usa cartões empilhados. O usuário também pode escolher a tabela com rolagem horizontal restrita ao seu contêiner. Os rótulos acompanham os valores. Seleção e maior nota possuem texto, além de cor.

Agregações são memoizadas por dados/filtros. Seletores de preparos e reflexões carregam 12 itens por vez, grupos de observações oito por vez e evidências carregam incrementalmente. Não há pré-processamento complexo ou estatísticas persistidas.

## 6. Persistência

**Nenhuma tabela, entidade duplicada ou migração nova.** IndexedDB e SQLite permanecem no esquema 5. Perfil, frequências, comparações, observações e hipóteses são derivados em memória. As preferências de aparência usam o mecanismo existente; seleção e modo de comparação são estados da tela.

A única escrita disponibilizada nesta área é pelo editor compartilhado de reflexões. Os adaptadores existentes persistem o mesmo registro. Não há IA em execução, autenticação, nuvem, rede necessária para esses recursos, recursos sociais ou gamificação.

## 7. Testes executados

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados. |
| Vitest | **53 testes aprovados em 10 arquivos**, incluindo os 42 anteriores e 11 novos. |
| Novos testes de domínio | Médias por campo; zero/ausência/null; tags deduplicadas; grupos históricos e café excluído; seleção 2–3 e rejeições; snapshots preservados; empates; hipóteses, critérios e evidências; proporções equivalentes; amostras insuficientes; filtros/reflexões originais; ausência de mutação. |
| Navegador isolado | **80 combinações**: cinco telas, dois temas, quatro larguras e estados vazio/preenchido. Sem exceções de execução ou rolagem horizontal da página. |
| Revisão final de layout | **40 combinações adicionais** nas larguras 320, 390, 768 e 1440 px, após os ajustes visuais. |
| Fluxos web | Seleção real de dois/três preparos, limite de três, troca de café, tabela local em 320 px, evidências, originais, reflexão compartilhada, filtros, recarga e tema Automático reagindo ao sistema. |
| Integridade | Coleção inalterada ao navegar/comparar; após editar reflexão, preparos, receitas, estoque e sessões permanecem iguais. Receita atual alterada no teste não substitui snapshots. |
| Sincronização Capacitor | `npm run android:sync` aprovado; fotografia e WOFF2 presentes no APK. |
| APK | `./gradlew assembleDebug --offline` aprovado; pacote final `br.com.jornadacafe.app`, versão 0.6.0, código 10. |
| Formatação de alterações | `git diff --check` aprovado. |

Resultados: [fluxos e 80 layouts](previews/phase-06/validation.json), [40 layouts finais](previews/phase-06/final-layout.json), [contraste](previews/phase-06/contrast.json) e [Android nativo](previews/phase-06/android-validation.json).

As verificações de navegador usaram Chrome com perfil separado e fixtures identificadas como validação, sem dados demonstrativos na biblioteca real. Scripts de automação pontual ficaram em `/tmp`, sem dependência nova no projeto. Os testes de domínio permanentes estão em [discoveries.test.ts](../src/data/discoveries.test.ts).

A varredura de texto em superfícies sólidas verificou **12 combinações de tela/tema**, incluindo o editor compartilhado, sem falhas após corrigir a cor das datas nos cabeçalhos coloridos da comparação. A regra herdada de `time` foi substituída pela cor clara do cabeçalho. Controles reutilizam os tokens funcionais de contraste da Fase 05.

**Limite de contraste/acessibilidade:** a varredura não mede fotografias, gradientes, estados com opacidade nem todos os controles nativos. Não constitui auditoria WCAG completa; leitores de tela, foco em todas as situações e inspeção de todos os ícones/estados ainda exigem conferência específica.

## 8. Capturas e referências

As quatro imagens efetivamente fornecidas estão em [references/phase-06](references/phase-06/). A quinta orientação do pedido corresponde à integração com a linguagem da Fase 05, preservada nos componentes e tokens compartilhados.

| Tela | Referência | Claro 390 px | Escuro 390 px | Desktop claro |
| --- | --- | --- | --- | --- |
| Abertura | [Imagem](references/phase-06/abertura.png) | [Captura](previews/phase-06/abertura-light-390.png) | [Captura](previews/phase-06/abertura-dark-390.png) | [1440 px](previews/phase-06/abertura-light-1440.png) |
| Perfil | [Imagem](references/phase-06/perfil.png) | [Captura](previews/phase-06/perfil-light-390.png) | [Captura](previews/phase-06/perfil-dark-390.png) | [1440 px](previews/phase-06/perfil-light-1440.png) |
| Comparação | [Imagem](references/phase-06/comparacao.png) | [Captura](previews/phase-06/comparar-light-390.png) | [Captura](previews/phase-06/comparar-dark-390.png) | [1440 px](previews/phase-06/comparar-light-1440.png) |
| Descobertas | [Imagem](references/phase-06/hipoteses.png) | [Captura](previews/phase-06/observacoes-light-390.png) | [Captura](previews/phase-06/observacoes-dark-390.png) | [1440 px](previews/phase-06/observacoes-light-1440.png) |
| Conhecimento | Integração com o diário existente | [Captura](previews/phase-06/conhecimento-light-390.png) | [Captura](previews/phase-06/conhecimento-dark-390.png) | [1440 px](previews/phase-06/conhecimento-light-1440.png) |

O [índice completo](previews/phase-06/README.md) inclui desktop escuro, estados vazios e tabela local de 320 px. São capturas do navegador com dados isolados, não da biblioteca do usuário nem da tela física Android. A navegação fixa aparece na posição do viewport inicial nas imagens de página inteira.

A comparação visual preserva cabeçalho espresso, fotografia com espaço editorial, traço terracota, cartões claros arredondados e ícones oliva/terracota/espresso. Adaptações funcionais: barras acessíveis em lugar do radar; cartões de comparação no smartphone; critérios/evidências expansíveis; controle real de aparência em lugar do marcador ilustrativo sem função; textos e contagens calculados a partir dos registros. Valores, marcas e conclusões ilustrativas não foram copiados para a base do usuário.

### Fotografia decorativa

Gerada com o recurso integrado `image_gen`, seguindo a skill [imagegen](/home/user/.codex/skills/.system/imagegen/SKILL.md), como fotografia editorial genérica, sem produto ou marca. Asset final: [public/images/discoveries-hero.png](../public/images/discoveries-hero.png). A imagem foi inspecionada e empacotada localmente; não há geração em tempo de execução.

Prompt utilizado:

> Use case: photorealistic-natural. Asset type: wide editorial hero photograph for a personal coffee discoveries app. A handmade speckled oatmeal ceramic cup of dark coffee on a rustic wooden saucer on the right half of a polished warm brown wooden table. A few glossy roasted coffee beans scattered near the cup and in the lower-right foreground. Subtle steam, a natural leafy coffee plant softly blurred behind the cup. Warm amber side lighting, deep espresso shadows and a rich brown background. The left half and top-left are dark quiet negative space for HTML headline text. Horizontal 3:2 full-bleed photograph, restrained realistic cozy artisanal atmosphere. No journal, no writing, no typography, no UI, no logos, no product packaging, no watermark. This image is decorative and must not depict a particular brand or user's coffee.

## 9. Android: evidência e pendências

Na validação inicial houve teste em **aparelho físico modelo 22101316G**, usando temporariamente o pacote separado `br.com.jornadacafe.phase06qa` na versão 0.6.0. Os dados de validação ficaram apenas nesse pacote, removido ao terminar. Naquele momento, a instalação principal permanecia na versão 0.5.0; a atualização posterior está registrada abaixo.

No WebView real, foram verificadas navegação pelas cinco telas, famílias locais, troca Claro/Escuro, ausência de overflow da página, comparação de três snapshots, edição pelo formulário compartilhado e atualização em Minha Jornada. O plugin nativo confirmou SQLite no esquema 5; consultas antes/depois confirmaram preparos inalterados. Após encerrar o processo e reabrir o pacote, a reflexão editada continuou persistida.

Esses testes validam o WebView e o armazenamento nativos. **Não validam visualmente a composição em primeiro plano no aparelho.** Não são fornecidas capturas da tela física. Permanecem pendentes: inspeção manual com teclado virtual, recortes e todas as combinações das barras do sistema, leitor de tela, desempenho prolongado e bibliotecas extensas. Não há benchmark de desempenho ou comprovação de todas as combinações de aparelhos/WebViews.

O APK principal de desenvolvimento está em `android/app/build/outputs/apk/debug/app-debug.apk`; a assinatura de produção não faz parte desta entrega.

### Atualização da instalação principal

Em 16/11/2026, às 21:33 (horário do aparelho), a pedido do usuário, o pacote principal `br.com.jornadacafe.app` foi atualizado com `adb install -r`, que retornou `Success`. O Android confirmou **versão 0.6.0 / versionCode 10**. A atualização manteve os dados existentes, sem desinstalar ou limpar o armazenamento.

O aplicativo abriu a frio com `Status: ok`. No WebView do pacote principal, foram confirmadas a abertura e as quatro áreas: Meu perfil de café, Comparando experiências, O que venho descobrindo e Meu conhecimento. A verificação apenas navegou entre telas, sem editar registros ou inserir exemplos. Ao concluir, o app ficou aberto em **Minhas Descobertas**. As pendências de inspeção visual manual descritas acima permanecem.
