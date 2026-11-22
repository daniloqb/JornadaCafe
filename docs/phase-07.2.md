# Fase 07.2 — Identidade visual e referências das receitas

Versão **0.7.2 / código 17**, esquema **5**. Implementação e validação em 22/11/2026. Sem commit ou push; Fase 08 não iniciada. Os arquivos e alterações das fases anteriores foram preservados.

## Modelo e persistência

O domínio real armazena versões de receita em payloads JSON, com `familyId`, sem tabela própria de famílias. Foi acrescentado `BrewRecipe.photoId`, opcional. As versões atuais de uma família compartilham uma identidade de fotografia; a edição propaga esse vínculo na mesma transação do cadastro. Criar uma versão herda a imagem. Trocar ou remover uma imagem não cria versões técnicas nem modifica seus parâmetros, IDs ou relações.

Foram reaproveitados **`source.author`** para “Apresentado por” e **`source.url`** para “Link da referência”. Título e observações da fonte continuam disponíveis. Como o domínio já oferece fontes por versão, essa capacidade foi preservada: uma versão nova parte da fonte anterior, podendo alterá-la independentemente. O apresentador da receita não altera `technique.creator`. Não foram criados campos duplicados, cadastro de apresentadores ou tabela adicional.

Não houve migração do banco: os adaptadores IndexedDB e SQLite já armazenam payloads compatíveis. O SQLite grava todas as versões afetadas pela troca de fotografia e permite preencher uma fotografia ausente na importação sem reinserir a receita. Snapshots, preparações, avaliações, cronômetros e movimentos de estoque não são reescritos.

`src/data/media-mutation.ts` prepara arquivos sob UUIDs novos, valida o formato, grava e relê seus hashes antes de publicar referências. Em falhas, verifica os vínculos atuais antes de remover os arquivos preparados. `photoIsReferenced` e `requiredPhotoIds` passaram a percorrer receitas e snapshots de receitas, além dos registros anteriores. Imagens atuais e históricas ainda utilizadas permanecem protegidas.

O seletor existente prepara JPEG de até 1.600 px. A validação usa bytes e decodificação, além do MIME informado; aceita JPG, PNG e WebP, até 15 MiB e 40 megapixels. A seleção fica em memória até salvar; cancelar o formulário não grava a fotografia. A importação mantém os bytes recebidos.

## Interface

- **Cadastro e edição:** seção “Imagem e referência da receita”, próxima da identificação, com prévia, escolha/substituição, remoção, apresentador e URL opcionais. Campos técnicos, etapas e fontes complementares foram preservados. URL inválida mantém o formulário disponível para correção.
- **Cartões:** `RecipeImage` reutiliza o armazenamento local e exibe miniatura de 52–56 px, com `object-fit: cover`; ausência ou falha de leitura usa o ícone de filtro. `RecipeCards` aplica a mesma identidade nas listagens e nos detalhes de métodos/técnicas, sem mudar seus próprios cartões. O apresentador aparece discretamente; método, técnica, dose, água e proporção permanecem legíveis.
- **Detalhes:** imagem editorial moderada e seção “Referência da receita”; não cria um espaço vazio quando não há imagem ou fonte. As versões continuam acessíveis no histórico.
- **Revisão de preparo:** a imagem própria da receita tem prioridade no cabeçalho; motor, tempos e estoque permanecem nos fluxos existentes.
- **Links:** `ExternalReference` valida HTTP/HTTPS ao renderizar e no clique. Na web usa navegação externa com `noopener noreferrer`; no Android, `ReferenceLinksPlugin` valida novamente esquema/host e abre `ACTION_VIEW`, tratando falhas. A inspeção física motivou essa abertura explícita: depender somente de `target=_blank` não confirmou a saída no WebView utilizado. Não há incorporação de páginas nem downloads automáticos.

## Backup e compatibilidade

O aplicativo agora exporta **`personal-full v2`**. A versão foi elevada porque o validador anterior não conhece `recipe.photoId`: o envelope v2 permite uma recusa explícita em aplicativos antigos. Os backups v1 já emitidos continuam sendo lidos pelo aplicativo novo, sem exigir campos opcionais novos.

O backup pessoal sempre inclui fotografias atuais e históricas de receitas, fontes, famílias e versões. Mantém a deduplicação por SHA-256 e todos os vínculos lógicos. Fotografias necessárias ausentes impedem apresentar o arquivo como íntegro.

**`library-share v2`** acrescenta referências portáveis por hash e entradas `images/<sha256>.<ext>`. A opção **“Incluir imagens das receitas”** começa desmarcada. Sem ela, não lê nem exporta bytes, nomes, UUIDs ou caminhos de fotografias. Quando marcada, lê somente as imagens das famílias selecionadas, com deduplicação; não inclui fotos de cafés, produtores ou dependências por associação indireta. A prévia mostra opção, miniaturas, contagens, versões, dependências e textos técnicos para revisão. A seleção permanece ao voltar.

A lista explícita de campos continua excluindo dados pessoais, preferências, vínculos com cafés, estoque e histórico. Os metadados de referência são compartilhados pelos campos já existentes. A interface apresenta o aviso de autorização de uso das imagens solicitado.

Imagens ficam fora da identidade técnica, que mantém compatibilidade com o v1. Uma receita idêntica sem foto pode receber a fotografia sob confirmação; uma fotografia existente é mantida e isso aparece na prévia. Fontes ou parâmetros diferentes mantêm registros independentes, mesmo com nomes iguais. Reimportar não duplica receitas nem fotografias. O [contrato v2](transfer-formats-v2.md) documenta a regra, incluindo famílias técnicas idênticas com apresentações diferentes.

O transporte da Fase 07.1 foi preservado: blocos de até **192 KiB**, temporário privado, opções curtas da Activity, gravação nativa, contagem de bytes, fechamento, hash quando disponível, cancelamento e limpeza segura. `src/transfer/platform.ts` e `DataFilesPlugin.java` não precisaram de alterações nesta fase.

## Qualidade e evidências

| Verificação | Resultado |
| --- | --- |
| TypeScript | Aprovado. |
| Testes automatizados | **172 testes em 21 arquivos**, incluindo persistência nos dois adaptadores, família/histórico, mídias, falhas, URLs, sentinelas, formatos v1/v2 e reimportação. |
| Compatibilidade antiga | Fixtures sintéticas v1 emitidas pelo código anterior, lidas sem regeneração pelo novo exportador. |
| Integridade | Comparações canônicas de todos os campos e hashes; testes verificam estoque, snapshots, correções, sessões e dados pessoais do destinatário. |
| Interface web | **72 combinações**: listagem, detalhe e formulário × Claro/Escuro × 85/100/115% × 320/390/768/1440 px. Sem rolagem horizontal no espaço útil; captura móvel com barras sobrepostas. |
| Fluxos web | Arquivo selecionado pelo campo real, cancelar, salvar, remover, recarregar, URL inválida/válida, link externo, checkbox padrão, seleção preservada, prévia e importação pela interface. |
| Build web e Capacitor | Aprovados; chunk principal **586,40 kB / 173,18 kB gzip**. Permanece o aviso conhecido acima de 500 kB. |
| Android | APK normal, APK isolado e instrumentação compilados offline com JDK 21. **22 arquivos web** do APK normal idênticos ao `dist`. |
| Instrumentação no aparelho | **1 teste aprovado**, cobrindo cancelamento, escrita parcial, corrupção na releitura, exclusão do documento incompleto, nova tentativa de 524.288 bytes e seis URLs inválidas. |
| Backup físico pessoal | ZIP SAF **487.244 bytes**, 10 vínculos lógicos e 3 arquivos de imagem. Validador completo, restauração em IndexedDB isolado, reabertura e comparação integral aprovados. |
| Biblioteca física | ZIPs SAF de **1.534 bytes sem fotos** e **484.935 bytes com três imagens**, quatro famílias e seis versões. Projeção técnica idêntica, hashes válidos, sentinelas pessoais e identificadores locais ausentes. |
| Importação física | ZIP escolhido no seletor Android; duas versões novas e uma fotografia gravadas na sandbox. Todas as linhas anteriores e hashes preservados; imagem exibida no detalhe e na revisão do preparo, sem iniciar preparação ou consumir estoque. |
| Referência externa física | Toque manual abriu o Firefox; `ActivityTaskManager` confirmou `ACTION_VIEW` com `CATEGORY_BROWSABLE`. Seis URLs inseguras ou incompletas recusadas pelo plugin real. |
| Coleção principal | Todas as linhas, metadados, preferências e hashes das **16 fotografias** idênticos antes/depois; `integrity_check=ok`, nenhuma violação de chave estrangeira. |

O usuário selecionou a fotografia e o ZIP recebido nos seletores Android reais, confirmou os três salvamentos pelo SAF e tocou no botão da referência externa. CDP foi utilizado para preparar dados fictícios e acionar controles React; a gravação nativa não foi substituída por handler JavaScript. A receita com fotografia foi salva no SQLite, o processo sandbox foi encerrado/reaberto, e todas as linhas e hashes permaneceram iguais.

O MIUI recusou o lançamento da Activity em segundo plano nas tentativas iniciais de instrumentação. O roteiro final registra o observador de ciclo de vida e abre a sandbox pelo shell do próprio runner, sem alterar configurações de segurança do aparelho. A execução final foi aprovada; esse ajuste pertence somente ao APK de testes.

Evidências: [layouts e fluxos web](previews/phase-07.2/web-validation.json), [backup físico e restauração](previews/phase-07.2/android-personal-validation.json), [bibliotecas físicas](previews/phase-07.2/android-library-validation.json), [importação física](previews/phase-07.2/android-import-validation.json), [link externo](previews/phase-07.2/android-link-validation.json), [preservação principal](previews/phase-07.2/main-preservation.json), [builds](previews/phase-07.2/build-validation.json) e [índice de capturas](previews/phase-07.2/README.md).

## Arquivos principais

| Área | Arquivos |
| --- | --- |
| Domínio e vínculos | `src/domain/brewing.ts`, `src/domain/photo-references.ts`, `src/transfer/core.ts`, `src/transfer/validation.ts` |
| Persistência de mídia | `src/data/media-mutation.ts`, `src/data/photo-validation.ts`, `src/data/photos.ts`, `src/data/sqlite-storage.ts`, `src/data/CollectionContext.tsx` |
| Interface | `src/components/RecipeImage.tsx`, `ExternalReference.tsx`, `LocalPhotoPicker.tsx`, `src/features/prepare/RecipeForm.tsx`, `LibraryDetails.tsx`, `src/features/preparations/PreparationReview.tsx`, `src/theme/theme.css` |
| Referência externa Android | `src/features/prepare/reference-links.ts`, `android/.../ReferenceLinksPlugin.java`, registro em `MainActivity.java` e teste instrumentado |
| Transferência | `src/transfer/archive.ts`, `library.ts`, `src/features/settings/DataManagement.tsx`, `LibraryPreview.tsx` |
| Regressões | `src/transfer/recipe-images.test.ts`, `archive.test.ts`, `platform.test.ts`, `src/data/transfer.test.ts`, `src/features/prepare/reference-links.test.ts`, fixtures v1 |
| Versão e documentação | `package.json`, `package-lock.json`, `android/app/build.gradle`, `README.md`, este relatório e `transfer-formats-v2.md` |

## Limites e escopo

Morte deliberada do processo durante um commit de importação, falta física de espaço e falha de energia não foram exercitadas. Testes de falha usam os adaptadores com SQLite real no host e o provedor Android de instrumentação. Orfandade de arquivo antes de publicar uma referência continua sendo uma possibilidade conservadora em interrupções abruptas; não há alegação de transação conjunta de banco e filesystem. Outros aparelhos e provedores de documentos não foram exercitados nesta fase. A abertura do navegador foi comprovada, sem afirmar disponibilidade do conteúdo remoto ou conectividade.

Os testes físicos usam somente **`br.com.jornadacafe.sandbox`**. A validação inicial preservou a instalação principal em 0.7.1; a atualização posterior, expressamente autorizada pelo usuário, está registrada abaixo. Não há nuvem, login, dependências novas, cadastro independente de apresentadores ou início da Fase 08.

## Atualização principal autorizada

Em 22/11/2026, após aprovar os testes, o usuário solicitou instalar a versão mantendo os dados existentes. O pacote principal **`br.com.jornadacafe.app`** foi atualizado de **0.7.1 / 16 para 0.7.2 / 17** com `adb install -r`, sem desinstalação ou limpeza. Antes, foi guardada uma cópia privada consistente e conferida a correspondência da assinatura do APK com a instalação anterior.

Imediatamente após instalar, todas as linhas, metadados, arquivos e preferências eram idênticos. Após abrir o aplicativo, todas as linhas, metadados, preferências pessoais e hashes das **16 fotografias** continuaram iguais. O armazenamento local iniciou normalmente; `integrity_check` retornou `ok`, sem violações de chaves estrangeiras. Somente o marcador Android `profileInstalled` e os marcadores Capacitor da versão instalada mudaram durante a inicialização. As preferências do LocalStorage foram comparadas pelo conteúdo lógico, sem exigir igualdade dos arquivos de log do WebView.

Evidência sanitizada: [atualização com preservação dos dados](previews/phase-07.2/main-update-validation.json). A cópia privada permanece em `/tmp/jornada072-install`, fora do repositório. Não houve commit ou push.
