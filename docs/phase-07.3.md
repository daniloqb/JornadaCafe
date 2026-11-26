# Fase 07.3 — Consolidação da biblioteca padrão

Implementação e consolidação em **25/11/2026**, aplicativo **0.7.3 / versionCode 18**, esquema do banco **5**, sem migração. **O snapshot aprovado pelo responsável agora é o catálogo padrão de Explorar Biblioteca.** Não houve commit, push, publicação, início da Fase 08 ou troca de chaves. A instalação principal foi atualizada posteriormente sob autorização explícita, conforme a seção final.

## Fonte oficial e catálogo ativo

O responsável forneceu explicitamente seu ZIP de exportação e solicitou substituir o catálogo anterior. Esse arquivo foi tratado como conteúdo técnico aprovado, validado pelos contratos existentes e consolidado em recursos locais do aplicativo. Durante a consolidação do catálogo, nenhum banco, fotografia ou backup da instalação principal Android foi acessado.

| Informação | Resultado |
| --- | --- |
| Origem | Snapshot compartilhável fornecido pelo responsável nesta conversa; gerado pelo aplicativo 0.7.2. |
| Formato | `library-share v2`, esquema de dados 5. |
| SHA-256 do ZIP | `85a0aaf04c77c4d8a460d1f8a82b49ffc681e0c18161441c82022e937c14ccc1` |
| Catálogo oficial | `jornada-cafe-reference`, versão **1**, estado `consolidated`. |
| Data de consolidação UTC | `2026-11-26T00:10:32.981Z` (25/11/2026 em São Paulo). |
| Contagens | **8 métodos, 6 técnicas, 8 famílias de receitas, 8 versões**. |
| Imagens recebidas / distribuídas | **6 / 0**. Sem origem/autorização de redistribuição confirmada, os bytes e vínculos de imagem foram omitidos; textos e links foram mantidos. |
| Fidelidade | Todos os demais campos técnicos são canonicamente idênticos ao ZIP aprovado. |

Métodos incluídos: Clever Dripper; V60; Melitta; Prensa francesa; Moka; AeroPress; Espresso; Chemex.

Técnicas incluídas: Imersão seguida de filtragem; Imersão total; Três despejos; 4:6 — Tetsu Kasuya; Cinco Despejos; Espresso tradicional.

Receitas incluídas, cada uma com sua versão 1:

- Alberto Café Gerações - três despejos 3x 7x 5x.
- Três despejos 3x +6x + 6x.
- Tetsu Kasuya V60 4:6 equilibrado.
- Alberto Café Gerações - três despejos iguais.
- Matt Winton - 5 despejos.
- Martin Wölfl Recipe.
- V60 4:6 com distribuição modificada.
- James Hoffman One Cup.

Os oito métodos e quatro técnicas têm conteúdo equivalente ao catálogo anterior. A técnica **Três despejos** tem conteúdo diferente e passa a usar exatamente a definição do snapshot; **Cinco Despejos** também integra o novo conjunto. As quatro variantes antigas de receitas deixam de ser apresentadas como referência: **V60 4:6 equilibrado**, **V60 4:6 com distribuição modificada**, **V60 três despejos iguais** e **V60 três despejos — referência Café Gerações**. O nome “V60 4:6 com distribuição modificada” também existe na fonte nova, mas seu fingerprint difere: a variante aprovada foi conservada sem presumir identidade pelo título.

O primeiro catálogo oficial atribuiu IDs públicos aos 8 métodos, 6 técnicas, 8 famílias e 8 versões. Não havia IDs oficiais anteriores a atualizar. O [relatório gerado](../src/reference/generated/report.json) registra as adições oficiais e as variantes legadas substituídas por comparação técnica. Cópias pessoais das variantes antigas continuam existentes; não há exclusão ou substituição dessas cópias.

Nomes, grafias e observações experimentais/ilustrativas já presentes no ZIP foram mantidos como aprovados, sem inventar ou completar registros. O código legado permanece isolado em `src/reference/legacy-catalog.ts` para compatibilidade e regressões; o carregador ativo usa os JSONs oficiais, não a lista anterior.

## Inspeção e arquitetura

A navegação continua em **Preparar → Explorar Biblioteca**, com abas de métodos, técnicas e receitas, sem nova opção na navegação inferior. A implementação anterior tinha dados TypeScript, uma versão por receita, importação por IDs fixos e contagens escritas na interface. Métodos pessoais têm nome, descrição e notas; técnicas já oferecem criador, princípio, orientações e fontes. Receitas têm `familyId`, versões, encadeamento, etapas, apresentador e URL em `source`, com imagem opcional por família. As famílias são representadas pelas próprias versões, sem tabela adicional.

Os contratos `library-share v1/v2` usam identidades técnicas canônicas por SHA-256, referências portáveis e seleção com dependências. O v2 pode incluir fotografias de receitas, mas não imagens de métodos ou técnicas. A consolidação reutiliza `parseArchive`, `validateSharedLibrary`, `verifySharedIdentities`, `buildLibrary`, `planLibraryImport` e `applyLibraryImport`. Não há novo importador de domínio, formato de transferência ou tabela de banco.

O carregador `src/reference/catalog.ts` agora seleciona os JSONs aprovados; o ramo legado só se aplica ao estado anterior de espera, quando `library` era nulo. A materialização adapta apenas identidades e vínculos; textos, quantidades, cronogramas, fontes, notas e numeração de versões vêm do snapshot. Todas as versões permanecem na família; a listagem mostra a mais recente e o detalhe permite consultar as demais.

## Atualização reproduzível

Use uma exportação revisada como snapshot oficial, fora de `public/` e do código-fonte. A inclusão no comando indica que o conteúdo técnico foi aprovado; o comando não pode determinar direitos legais de uma fotografia.

```bash
# Prévia: valida e relata, sem substituir o catálogo.
npm run library:refresh -- /caminho/snapshot-aprovado.zip --check

# Consolida os dados aprovados; imagens são omitidas por padrão.
npm run library:refresh -- /caminho/snapshot-aprovado.zip

# Se houver imagens com autorização pública documentada:
npm run library:refresh -- /caminho/snapshot-aprovado.zip \
  --rights autorizacoes.json

# Confere exclusivamente os recursos já congelados no projeto.
npm run library:check
```

O gerador valida tipo de arquivo, manifesto, versão, limites ZIP, CRC, hashes, contagens, identidades canônicas, referências HTTP/HTTPS, relações, famílias, versões e imagens. Arquivos incompatíveis são recusados com erro; não há correção silenciosa. O resultado é preparado em memória antes da escrita. Os JSONs são preparados em diretório temporário e as substituições tentam restaurar os originais em falhas de escrita. Assets são endereçados pelo conteúdo e gravados antes dos vínculos. Não há promessa de transação de filesystem resistente à queda de energia durante a troca dos JSONs: `library:check`, executado pelo build, detecta inconsistências.

São gerados:

- `src/reference/generated/catalog.json`: dados aprovados, mapas de identidade e imagens permitidas.
- `src/reference/generated/manifest.json`: identificador, versão, data UTC, origem genérica aprovada, versão do ZIP, SHA-256 do ZIP, contagens e compatibilidade.
- `src/reference/generated/report.json`: nomes, famílias/versões, adicionados/modificados/removidos, alterações de apresentação, imagens incluídas/omitidas e, na primeira consolidação, referências antigas que deixarão de ser apresentadas.
- `public/images/reference-library/<sha256>.<ext>`: somente bytes explicitamente autorizados.

Nenhum nome original de arquivo, caminho privado, UUID pessoal, café, produtor, estoque ou histórico é acrescentado ao manifesto. A projeção compartilhável existente continua sendo a lista explícita de campos. Os textos técnicos selecionados são conservados como aprovados, inclusive notas e créditos que já façam parte deles. O ZIP de origem não é copiado para o projeto ou para o build. Assets anteriormente declarados e removidos do catálogo são retirados de `public/`; arquivos arbitrários não são apagados.

A repetição do mesmo ZIP com as mesmas autorizações e continuidade conserva IDs, versão e data. Builds posteriores usam exclusivamente os recursos congelados e não consultam telefone, serviços externos ou a biblioteca pessoal. O script usa o Vite já instalado para carregar os módulos TypeScript, sem dependência adicional, servidor HTTP ou download obrigatório.

## Identidade e continuidade

Há três identidades diferentes:

1. **Identidade pública oficial:** `official-<uuid>`, criada no projeto, para método, técnica, família e versão.
2. **Fingerprint compartilhável:** representa conteúdo técnico, com a estratégia da Fase 07; é verificado contra o conteúdo.
3. **UUID pessoal:** alocado pelo importador para a cópia editável; não é o ID do catálogo nem o UUID do telefone de origem.

Conteúdo idêntico conserva a identidade pública automaticamente. Quando descrições, parâmetros, fontes ou dependências mudarem, forneça um mapa revisado de **novo fingerprint → identidade pública anterior** por grupo. Não se deduz continuidade pelo título. Uma correção de método também pode mudar fingerprints de técnicas e famílias dependentes; revise o grafo completo, incluindo versões.

A estrutura de `continuidade.json` é um objeto com os grupos opcionais `methods`, `techniques`, `families` e `versions`; cada grupo é um objeto de correspondências. Os fingerprints vêm da prévia e os IDs anteriores do catálogo versionado. IDs desconhecidos, correspondências duplicadas, entradas sem item recebido ou substituição da identidade de um fingerprint já reconhecido são recusados.

```bash
npm run library:refresh -- /caminho/novo-snapshot.zip --check
npm run library:refresh -- /caminho/novo-snapshot.zip \
  --continuity continuidade.json --rights autorizacoes.json
```

Se identidades oficiais anteriores desaparecerem sem continuidade, a gravação é bloqueada após apresentar a prévia. Assim, uma descrição corrigida não perde a identidade por omissão do mapa. Para **remoções reais revisadas**, use explicitamente `--allow-removals`, junto da continuidade dos demais itens. Na primeira consolidação, o relatório compara o catálogo legado por conteúdo comprovado; ele não usa os exemplos anteriores para completar o snapshot novo.

## Imagens e referências

`autorizacoes.json` é um array. Cada entrada tem `sha256`, `origin` e `permission` como textos obrigatórios, e `credit` opcional. Use o hash indicado na prévia, uma origem pública e uma declaração revisada de autorização para acompanhar o aplicativo publicado. Não coloque caminhos locais ou dados privados nesses textos. Somente hashes presentes no ZIP podem receber autorização; duplicatas são recusadas.

Sem essa entrada, os bytes não são embarcados e o vínculo de imagem é omitido, mantendo os demais campos. Inclusão na exportação pessoal não equivale a autorização de redistribuição. O catálogo exibe créditos quando fornecidos. As permissões devem acompanhar cada nova consolidação; não são inferidas de autorizações antigas. Não foram baixadas imagens de vídeos/páginas nem copiadas fotos de cafés/produtores. Imagens de técnicas/métodos não foram acrescentadas ao formato; eventuais assets separados dependerão de fornecimento e autorização explícitos.

Os cartões e detalhes reutilizam `RecipeImage`, com URL local para o catálogo e fallback existente para ausência/falha. URLs externas usam `ExternalReference`; o criador permanece na técnica e o apresentador na fonte da versão da receita. Links são opcionais para consulta e execução. Parâmetros, etapas, condições observáveis, tempos, notas e fontes de versões anteriores ficam disponíveis no detalhe da família.

## Importação e preservação

`selectReference` seleciona todas as versões da família e inclui os métodos e técnicas exigidos por cada versão. A importação usa o planejador compartilhável existente, o caminho de mídias verificado e a transação dos adaptadores. O plano resolve fingerprints para UUIDs pessoais e acrescenta `referenceKey` somente aos novos registros.

A indicação **Já está na minha biblioteca** vem da equivalência técnica calculada pelos contratos existentes; nome igual não basta. Conteúdo anteriormente importado pelo compartilhamento também pode ser reconhecido. Imagens ficam fora da identidade técnica, como no v2. Imagens pessoais existentes são preservadas; uma imagem autorizada pode preencher uma família idêntica sem fotografia pelo fluxo de importação já existente.

Uma família pessoal alterada tem conteúdo independente e não é sobrescrita para acompanhar o catálogo. Importar novamente o original pode criar outra família, preservando a adaptação. Atualizar o catálogo não dispara importação, exclusão, reescrita de snapshots, migração ou limpeza da coleção. Cópias antigas continuam no armazenamento mesmo quando sua origem deixa de aparecer em Explorar Biblioteca.

Cafés, produtores, pacotes, estoque, preparações, avaliações, reflexões, Jornada, Descobertas e checkpoints não recebem mutações pela consolidação. Backups incluem apenas a coleção pessoal e suas imagens referenciadas; não incluem automaticamente todo o catálogo. Restaurar um backup não troca os assets do aplicativo; exportar a coleção continua respeitando a seleção. O transporte Android em blocos, arquivos privados, SAF, integridade e cancelamentos não foi alterado; `platform.ts` e `DataFilesPlugin.java` permanecem sem mudanças.

## Arquivos modificados

| Área | Arquivos |
| --- | --- |
| Catálogo e identidade | `src/reference/catalog.ts`, `legacy-catalog.ts`, `model.ts`, `generated/catalog.json`, `generated/manifest.json` |
| Geração e verificação | `src/reference/consolidate.ts`, `verify.ts`, `scripts/library-refresh.mjs`, scripts npm de `package.json` |
| Importação | `src/reference/import-official.ts`, `import-reference.ts`, mapa resolvido em `src/transfer/library.ts` |
| Interface | `src/features/prepare/ReferenceLibrary.tsx`, `src/components/RecipeImage.tsx`, espaçamento de fontes em `src/theme/theme.css` |
| Testes | `src/reference/consolidate.test.ts`, `src/data/reference.test.ts`, `src/data/transfer.test.ts` |
| Versão | `package.json`, `package-lock.json`, `src/transfer/core.ts`, `android/app/build.gradle` |
| Documentação e artefatos | `README.md`, este relatório, `docs/previews/phase-07.3/`, exclusão de temporários em `.gitignore` |

## Validação

| Verificação | Resultado |
| --- | --- |
| TypeScript | Aprovado. |
| Testes | **182 em 22 arquivos**, incluindo novos casos e as regressões existentes. |
| Catálogo v1/v2 | ZIP oficial v2 comparado integralmente ao catálogo, além da fixture histórica v1 e dos testes sintéticos v2. Contagens, relações, fontes e versões preservadas. |
| Continuidade | Repetição conserva IDs/versão; mudança exige mapa ou remoções explícitas; colisões e mapas desconhecidos recusados. |
| Imagens | Omissão sem permissão, autorização, créditos, hashes, importação, reabertura e não duplicação verificados. |
| IndexedDB e SQLite | Importação oficial sintética com dependências, versões e foto; registros anteriores e dados pessoais preservados. SQLite real do host com ponte Capacitor simulada. |
| Preparo guiado | Todas as oito receitas oficiais aceitas pelo construtor de sessão; cópia importada aberta na revisão pela interface, sem iniciar preparo ou consumir estoque. |
| CLI | Geração v1, repetição sem mudanças, verificação sem ZIP, bloqueio de remoções sem continuidade e geração v2 autorizada em projeto temporário. |
| Interface | Catálogo aprovado: **144 combinações** = 6 vistas × 2 temas × 3 escalas × 4 larguras, sem transbordamento ou exceções. A preparação anterior cobriu outras 168 combinações sintéticas. |
| Fluxo web | Botão React real de importação, indicação de equivalência, cópia pessoal com versões e reabertura. |
| Build web / Capacitor | Aprovados; catálogo congelado verificado antes do build. |
| Android | APK normal e sandbox compilados offline com JDK 21; arquivos web do APK normal conferidos byte a byte. |
| Android físico | Somente `br.com.jornadacafe.sandbox`, versão 0.7.3 / 18; consulta offline do catálogo oficial e preservação da instalação principal. |

A etapa de preparação gerou evidências sintéticas separadas, que continuam identificadas como testes. Após receber o snapshot, as listas e detalhes foram novamente conferidos com o **catálogo real aprovado**, incluindo importação, reconhecimento e reabertura. As imagens do catálogo oficial usam o ícone padrão; a imagem sintética de 1 px das capturas anteriores não foi distribuída.

As evidências atuais estão em [capturas e relatórios](previews/phase-07.3/README.md), incluindo a [comparação integral com a fonte](previews/phase-07.3/official-source-validation.json). Permanecem os avisos conhecidos de chunk web acima de 500 kB, `flatDir` e versão de XML do SDK; não impediram os builds. Até a autorização posterior de instalação, o aplicativo principal não havia sido aberto, lido, atualizado ou limpo nesta fase. A indisponibilidade de rede é simulada exclusivamente no WebView sandbox, sem mudar a conectividade do dispositivo.

## Pendências e versionamento

O catálogo técnico aprovado já substitui o anterior no aplicativo e está congelado em arquivos locais. A única pendência de conteúdo são as **seis imagens**, que exigem origem e autorização explícita para redistribuição antes de serem embarcadas. Isso não impede consultar, importar ou executar as receitas offline. A inclusão posterior de imagens ou alterações do conteúdo exige uma atualização explícita do catálogo.

Aplicativo **0.7.3**, Android **18**, banco **5**, esquema do catálogo **1**, catálogo oficial ativo **1/consolidado**. A futura **1.0.0 deverá usar versionCode 19 ou superior** e distribuir este catálogo, salvo novas alterações aprovadas. A publicação no Google Play permanece fora desta fase. O APK normal foi gerado para revisão e posteriormente instalado, conforme autorização registrada abaixo.

## Atualização principal autorizada

Em **25/11/2026**, o responsável solicitou instalar a nova versão mantendo os dados atuais. O pacote principal **`br.com.jornadacafe.app`** foi atualizado de **0.7.2 / 17 para 0.7.3 / 18** com `adb install -r`, sem desinstalação ou limpeza. Antes, a assinatura foi comparada com a instalação existente e uma cópia privada consistente dos dados foi guardada fora do repositório, em diretório restrito de `/tmp`. O APK anterior também foi preservado nessa cópia privada.

A comparação imediatamente após instalar e novamente depois de abrir o aplicativo confirmou **todas as linhas e os metadados iguais**: 19 registros de referência pessoal, 5 cafés, 4 pacotes, 8 métodos, 6 técnicas, 8 receitas, 12 preparações e 4 reflexões; nenhuma sessão estava em andamento. Estoque, snapshots, avaliações e histórico estão incluídos nessa comparação integral. Os hashes das **27 fotografias** permaneceram iguais. O esquema continuou em **5**, `integrity_check=ok`, sem violações de chaves estrangeiras.

As preferências pessoais foram preservadas: os arquivos de dados do LocalStorage permaneceram idênticos, e as únicas mudanças de SharedPreferences foram os marcadores Capacitor `lastBinaryVersionName` e `lastBinaryVersionCode`. Logs e caches do WebView mudaram durante a inicialização. O armazenamento iniciou normalmente e o catálogo oficial exibiu as oito receitas, reconhecendo suas equivalências com a biblioteca pessoal existente. Nenhuma receita foi importada, editada ou executada na conferência; nenhum estoque foi consumido.

Evidência sanitizada: [atualização com preservação dos dados](previews/phase-07.3/main-update-validation.json). A cópia privada não foi incluída no Git nem nos assets distribuídos. Não houve commit ou push.
