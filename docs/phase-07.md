# Fase 07 — Backup pessoal e compartilhamento de biblioteca

Versão **0.7.0 / versionCode 15**. Esquema **5**, sem migração. Formatos **personal-full v1** e **library-share v1**, com versões independentes. As operações funcionam localmente em Configurações, sem novas entradas na navegação inferior. Não houve commit ou push.

## Backup pessoal

O ZIP inclui os nove conjuntos persistidos: cafés; registros de produtores, propriedades, origens, torrefadores, espécies e notas sensoriais; pacotes; métodos; técnicas; todas as versões de receitas; preparações; sessões; reflexões. Preserva identidades, datas, relações, estoques e ajustes completos, avaliações zero ou ausentes, snapshots, execução, consumo e correções históricas da Fase 06.4. Não reconstrói movimentações a partir do histórico.

As fotografias necessárias incluem cadastros atuais, snapshots de preparações/sessões e identidades originais de cafés corrigidos. Os bytes são mantidos; arquivos com conteúdo igual aparecem uma única vez, com mapa de suas identidades lógicas. Falta de fotografia impede gerar um backup considerado íntegro. Assets embarcados e arquivos órfãos são excluídos. São portadas aparência, tamanho de texto e avisos. As unidades continuam fixas no aplicativo, sem preferência persistente a copiar.

Criar backup apresenta contagens reais, gera manifesto e SHA-256 e relê o ZIP antes de disponibilizá-lo. Restaurar valida todo o arquivo antes do resumo, oferece salvar a coleção atual e exige uma segunda confirmação. O foco inicial fica em **Manter coleção atual**. Cancelar não altera registros. A substituição recusa uma sessão existente no destino; criar backup e importar biblioteca podem ocorrer sem encerrá-la. Checkpoints recebidos conservam snapshot, etapa e tempo, recuperados pausados e exigindo retomada explícita.

Jornada e Descobertas são derivadas dos mesmos registros persistidos e continuam usando os seletores existentes. Reflexões/conhecimentos são transportados em `reflections`; não existe tabela separada de hipóteses, médias ou observações calculadas. Após a restauração, a aplicação recarrega a coleção e recalcula esses indicadores. Não são transportados caches de comparação ou indicadores antigos.

### Proteção contra falhas

IndexedDB substitui tabelas, fotografias e marcador de preferências em uma transação. SQLite prepara uma geração nova de fotografias e verifica sua releitura por SHA antes da transação. A substituição de linhas e do ponteiro da geração ocorre em um único commit SQL. A geração antiga permanece disponível até uma inicialização posterior bem-sucedida. Uma interrupção deixa o ponteiro comprometido apontando para uma geração completa; arquivos temporários abandonados não se tornam fotos ativas. A leitura do ponteiro também reconhece uma resposta perdida depois de commit concluído.

Preferências são registradas no mesmo commit e aplicadas por um marcador retomável na inicialização, removido somente após aplicação completa. Isso trata a separação entre banco, filesystem e localStorage sem assumir atomicidade inexistente entre eles. Falhas de preparação de mídia e de gravação não apagam a coleção anterior. Limpeza posterior é conservadora e sua falha apenas mantém arquivos sem uso.

## Biblioteca compartilhável

O formulário permite marcar métodos, técnicas, famílias de receitas, selecionar todos e limpar. A seleção não pode ser vazia. Uma receita inclui todas as versões de sua família e os métodos/técnicas necessários. Dependências e versões adicionais aparecem no resumo; voltar à seleção preserva as escolhas.

A projeção usa uma lista explícita de campos técnicos. Métodos transferem nome, descrição e notas. Técnicas incluem criador, referências, princípio e orientação. Receitas incluem parâmetros, instruções, fonte, etapas, cronograma e relações de versão. Fotografias, café de referência pessoal, IDs locais, `referenceKey`, datas de uso, estoque, preparações, avaliações, reflexões e preferências não são projetados. Os textos técnicos escolhidos são incluídos como escritos e precisam ser revisados antes de compartilhar.

O arquivo contém apenas `manifest.json` e `data/library.json`. Identidades determinísticas usam SHA-256 dos campos canônicos; a assinatura das famílias inclui os vínculos entre versões. IDs de etapas e fontes também são normalizados, evitando transferir UUIDs pessoais. Os testes inspecionam todo o ZIP descompactado, manifesto e nomes, buscando sentinelas pessoais e IDs da instalação de origem.

Importar apresenta itens recebidos, indicação individual de **Novo** ou **Já existente · idêntico**, totais e nomes com conteúdo diferente. A confirmação adiciona os registros em uma transação. Conteúdo comprovadamente idêntico é reutilizado; mesmo nome com diferenças mantém registros independentes. UUIDs locais novos e mapas reconstroem métodos, técnicas, famílias, versões, fontes e etapas. Se a biblioteca mudar depois da pré-visualização, o plano precisa ser atualizado. Nenhum registro existente é sobrescrito.

A família completa é a unidade de identidade das versões. Uma família alterada posteriormente pode entrar como família independente em vez de mesclar versões por título ou número. Os conteúdos importados usam os formulários e o preparo guiado existentes e podem ser personalizados/versionados normalmente. A importação não modifica sessão, fotografia, pacote, consumo, avaliação ou reflexão do destinatário.

## Formatos e integração nativa

O [contrato dos formatos v1](transfer-formats-v1.md) descreve manifesto, JSON, campos permitidos, limites, validação, identidades e armazenamento. Ambos verificam `application`, tipo, versão própria e esquema, sem confiar no nome do arquivo. Um tipo não é aceito no fluxo do outro. Versões futuras são recusadas.

A proteção inclui estrutura ZIP32, CRC, SHA-256, caminhos permitidos, duplicatas, dependências, números finitos e limites de ZIP/expansão/entradas/entidades. A descompressão incremental mede também a expansão real quando cabeçalhos declaram tamanhos falsos. Textos importados são tratados como dados React e referências usam HTTP/HTTPS. O ZIP pessoal é privado e não criptografado; hashes verificam integridade, sem autenticar o remetente.

Na web, escolha de arquivo e download usam recursos do navegador; Web Share é usado quando disponível, com fallback para download. No Android, `DataFiles` usa o seletor nativo SAF para ler/salvar e FileProvider para abrir o compartilhamento. Nenhuma permissão ampla de armazenamento foi adicionada. Salvar só confirma sucesso depois da escrita; abrir o menu de compartilhamento não é apresentado como envio concluído. O destino externo é escolhido pelo usuário.

## Implementação

| Arquivo | Responsabilidade |
| --- | --- |
| `src/transfer/core.ts`, `validation.ts` | Versões independentes, limites, tipos portáveis, hashes, fotos necessárias, validação completa e recuperação pausada. |
| `src/transfer/archive.ts` | ZIP, manifesto, conteúdo pessoal/compartilhável, deduplicação de mídia, CRC/SHA e proteção de descompressão. |
| `src/transfer/library.ts` | Projeção permitida, seleção, fechamento de dependências, versões, fingerprints, plano e aplicação aditiva. |
| `src/transfer/preferences.ts`, `platform.ts` | Preferências retomáveis e arquivo/download/compartilhamento conforme a plataforma. |
| `src/domain/local-storage.ts`, `collection.ts` | Contratos de leitura/restauração de estado e mutação aditiva. |
| `src/data/indexeddb-storage.ts`, `sqlite-storage.ts`, `storage.ts` | Snapshot, transações, geração segura de mídia, persistência do plano e aplicação das preferências. |
| `src/features/settings/DataManagement.tsx` | Dois blocos e quatro fluxos completos em Configurações, resumos, seleção, erros e confirmações. |
| `src/features/prepare/PreparationSettings.tsx`, `src/components/forms.tsx` | Integração no design existente e limpeza de erro ao abrir outro fluxo. |
| `src/theme/theme.css` | Cartões, contagens, seleção, mensagens e adaptação do título de Configurações em 320 px/115%. |
| `android/.../DataFilesPlugin.java`, `MainActivity.java`, `AndroidManifest.xml` | Integração SAF/FileProvider e registro do plugin. |
| `android/app/build.gradle`, `package.json`, `package-lock.json` | Versão e pacote opcional de teste separado. |
| `src/transfer/*.test.ts`, `src/data/transfer.test.ts` | Segurança, privacidade, persistência e portabilidade entre adaptadores. |
| `README.md`, `docs/transfer-formats-v1.md`, este relatório e previews | Manual, contrato e evidências. |

Foi adicionada apenas **fflate 0.8.3**, para ZIP/Deflate local, com suporte à descompressão incremental. Não há novo plugin de terceiros Android; `DataFiles` integra APIs nativas e os dois plugins Capacitor existentes permanecem. A auditoria das dependências de produção informou **zero vulnerabilidades**.

## Qualidade

| Verificação | Resultado |
| --- | --- |
| TypeScript | Aprovado. |
| Testes | **120 testes em 18 arquivos**, sendo 36 novos nesta fase. |
| Segurança de arquivo | Tipos trocados, versão futura, ZIP inválido/truncado, JSON inválido, CRC/SHA, metadados inconsistentes, caminhos e entradas inesperadas, IDs/referências, URLs ativas e expansão falsa recusados. |
| Persistência | IndexedDB real em fake IndexedDB; adaptador SQLite real ligado ao SQLite em memória do Node, substituindo apenas a ponte nativa e filesystem. |
| Restauração | Comparação de todos os registros e hashes das fotos, fechamento/reabertura e substituição completa. |
| Falhas | Rollback de importação e restauração em ambos os bancos; falha/corrupção ao preparar fotos; diretório abandonado; resposta de commit perdida e preferências interrompidas. |
| Biblioteca | Dependências, famílias, remapeamento, mesmo nome com diferença, reimportação sem duplicar, privacidade e preservação integral dos dados pessoais. |
| Portabilidade entre adaptadores | SQLite → IndexedDB e IndexedDB → SQLite, comparando coleção completa e fotografias. |
| Navegador | Duas origens isoladas A/B: exportação selecionada pela UI, importação no destino diferente, cancelamento, comparação integral dos dados pessoais, restauração e checkpoints recebidos pausados em 45 s. |
| Matriz visual | **384 verificações**, 16 estados × 24 combinações, sem overflow horizontal nos elementos medidos. |
| Capturas | **96 imagens web + 4 Android**, fictícias, com inspeção visual de diálogos estreitos e resumos. |
| Preparo recebido | Receita importada consultada, iniciada, pausada e salva pela interface web e Android; estoque anterior idêntico. |
| Build web / Capacitor | Aprovados. Chunk principal: **567,53 kB** minificado / **167,85 kB** gzip; permanece o aviso acima de 500 kB. |
| Build Android | **BUILD SUCCESSFUL** offline, pacote normal 0.7.0 / 15 e pacote isolado. Avisos existentes de `flatDir`. |
| APK | **22 arquivos web idênticos a `dist/`**, identidade e versão verificadas com aapt. |
| `git diff --check` | Aprovado. |

A matriz percorre 320/390/768/1440 px, Claro/Escuro e escalas 85/100/115%. Inclui Configurações, criação/arquivo pronto, escolha, erro de arquivo, resumo/confirmação/sucesso da restauração, seleção/resumo/arquivo pronto da biblioteca e escolha/prévia/confirmação/resultado/duplicatas da importação. Mede página, diálogos, títulos, botões, summaries, checkboxes e contagens. Isso verifica dimensões relevantes e não constitui auditoria completa de acessibilidade.

Evidências: [matriz e fluxos](previews/phase-07/validation.json), [preparo com receita importada](previews/phase-07/guided-validation.json), [portabilidade real Android/web](previews/phase-07/cross-platform-validation.json), [validação física](previews/phase-07/android-validation.json), [build/APK](previews/phase-07/build-validation.json) e [índice de capturas](previews/phase-07/README.md). Os roteiros de validação ficaram em `/tmp/jornada07-*`, sem dependências de automação adicionadas ao projeto.

## Android e entrega

O projeto oferece build isolado com `./gradlew assembleDebug --offline -PjornadaTestApp`: pacote `br.com.jornadacafe.sandbox`, rótulo **Jornada Café — Teste**. O build normal mantém `br.com.jornadacafe.app`. Os testes destrutivos usam exclusivamente dados fictícios no pacote separado.

A validação física foi realizada em um Redmi 22101316G, exclusivamente no pacote separado, com dados fictícios ORIGEM/DESTINO. Foram comparados registros completos: restauração web → Android, backup gerado no Android → Android e → web, persistência após reinício do app, preferências, fotografias atuais/históricas, importação aditiva e repetida, conflitos, execução e salvamento de receita recebida sem consumo de estoque. O arquivo técnico gerado no Android também foi importado pela interface web e inspecionado integralmente contra sentinelas pessoais. Seis identidades de fotografias compartilharam um único conteúdo, com bytes idênticos à origem. A restauração inicial usou a rede da WebView bloqueada, sem servidor de desenvolvimento.

O seletor nativo de documentos abriu e o compartilhamento real via FileProvider abriu o menu do sistema, sem enviar nada. O Android recusou toques ADB com `INJECT_EVENTS`; por isso os ZIPs fictícios foram fornecidos por CDP ao handler comum de arquivo do formulário para validar domínio, SQLite e filesystem físicos. **A escolha de um arquivo pelo seletor SAF e a conclusão de salvamento externo nesse seletor permanecem pendentes de interação manual ou liberação dos toques.** A validação não afirma que esses dois passos foram completados no aparelho. Outros provedores de documentos e envio a destinatários também não foram exercitados.

O aplicativo principal **permaneceu 0.6.4 / código 14**, sem atualização: as **16 fotografias** conservaram os mesmos hashes antes/depois. O hash do banco principal apresentou diferença: a cópia somente leitura passou em `integrity_check`, sem violações de chaves estrangeiras ou sentinelas de teste; a última atualização de entidade antecede a coleta inicial. Sem snapshot inicial das linhas, não se declara igualdade completa desse banco. Foi guardada uma cópia técnica local do estado atual, com banco e fotos verificados, fora dos artefatos do projeto. O aplicativo **Jornada Café — Teste** ficou instalado na versão final 0.7.0 / 15 para conferências adicionais. O build normal foi novamente gerado ao final, portanto [app-debug.apk](../android/app/build/outputs/apk/debug/app-debug.apk) corresponde a `br.com.jornadacafe.app`, 0.7.0 / 15, e não ao pacote de teste.

## Atualização autorizada do aplicativo principal

Em **21/11/2026**, após a validação isolada descrita acima, o usuário solicitou atualizar a instalação principal mantendo a base existente. O APK normal **0.7.0 / código 15** foi conferido, sua assinatura comparada à instalação 0.6.4 e aplicado por `adb install -r`, sem desinstalação ou limpeza de dados. A data original da instalação foi preservada.

Antes da atualização foi guardada uma cópia técnica local verificada de banco, arquivos, preferências e dados da WebView. Banco e **16 fotos** conservaram os hashes antes da primeira abertura. Após inicializar o aplicativo atualizado, **todas as linhas das nove tabelas persistentes e dos metadados foram comparadas integralmente e permaneceram idênticas**, assim como os hashes das fotos. `integrity_check` retornou `ok`, sem violações de chaves estrangeiras; o armazenamento iniciou normalmente. Essa comparação usa um novo snapshot imediatamente anterior à atualização, independente da ressalva de hash dos testes anteriores.

O aplicativo principal agora está na **0.7.0 / código 15**, com esquema **5** e a base existente preservada. A cópia técnica está em diretório privado de `/tmp`, fora do projeto, e não é o ZIP portável do fluxo de backup pessoal. Evidência: [instalação e preservação dos dados](previews/phase-07/install-validation.json).

## Limites

Não há mesclagem de backups pessoais, criptografia de arquivo, autenticação de remetente, sincronização ou conta. Campos técnicos livres podem conter informações digitadas pelo usuário e exigem revisão antes da exportação. Provedores externos e Web Share dependem do suporte do sistema/navegador. Backups que excedem os limites são recusados explicitamente; nenhum arquivo parcial é tratado como íntegro. Falhas de energia e de armazenamento são simuladas nos testes; não se provoca perda de energia no smartphone.

## Complemento — limpeza independente dos dados

A versão **0.7.1 / código 16** acrescenta **Limpar dados pessoais** e **Limpar receitas e métodos** nos respectivos blocos de Configurações. O [relatório do complemento](phase-07-data-clear.md) registra o escopo de cada ação, confirmação, fotos, testes, capturas e atualização do smartphone mantendo os dados. Esquema e formatos permanecem nas versões existentes.

## Correção crítica da exportação pessoal no Android

A [Fase 07.1](phase-07.1.md) documenta a causa comprovada (`TransactionTooLargeException` ao salvar o estado da Activity), o transporte em partes para arquivo privado, a verificação da escrita SAF e os testes físicos com arquivos completos. Mantém 0.7.1 / código 16, esquema 5 e ambos os formatos v1.
