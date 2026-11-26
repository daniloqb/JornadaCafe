# Fase 08 — preparação da versão 1.0.0

Estado em 25/11/2026: **preparação implementada; release assinada e publicação pendentes**. O responsável optou por criar a chave própria e executar o build no seu terminal. Nenhuma chave foi criada nesta fase. Não há APK/AAB de produção validado nem fingerprint de produção a informar ainda.

## Aplicativo e auditoria

| Item | Resultado |
| --- | --- |
| Versão / código | 1.0.0 / 19, centralizados em config/release.json |
| Histórico | Último local distribuído 18; responsável confirmou primeira submissão ao Play Console |
| Pacote de produção | br.com.jornadacafe.app, preservado |
| SDK mínimo / alvo / compilação | 24 / 36 / 36 |
| Ferramentas | JDK 21, Gradle 8.14.3, AGP 8.13.0, Capacitor 8.6.2 |
| Biblioteca oficial | Preservada: 8 métodos, 6 técnicas, 8 receitas/famílias, 8 versões, sem imagens embarcadas do ZIP não autorizadas |
| Permissões no APK sandbox final | INTERNET e permissão de assinatura interna do AndroidX |
| Backup Android | allowBackup=false; regras de extração excluem os dados privados |
| Armazenamento | SQLite Android sem criptografia própria habilitada; IndexedDB web; arquivos/preferências locais |
| Rede | Sem SDK de anúncios/analytics/Firebase/sync identificado; capacidades opcionais de download dos plugins não são invocadas nos fluxos auditados |
| Identidade visual | Ícone/splash existentes preservados; fontes locais e licenças já utilizadas |

Foram removidas USE_BIOMETRIC/USE_FINGERPRINT herdadas de AndroidX, pois o app não usa autenticação biométrica. Removido scaffolding Gradle de Google Services sem uso. FileProvider passou de raízes amplas para apenas `cache/data-sharing/`. O protocolo de transferência em blocos e a correção da Fase 07.1 foram preservados; nenhum ZIP passou a ser transportado no estado salvo da Activity.

A exigência de API 36 foi conferida na [política oficial](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) em 25/11/2026. Os critérios de [16 KB](https://developer.android.com/guide/practices/page-sizes) exigem separar alinhamento de arquivo e teste de execução.

## Assinatura e script

`scripts/build_release_artifacts.sh` chama o orquestrador Python. Exige explicitamente versão/código, quatro variáveis de assinatura e bundletool oficial; rejeita chave dentro do repo, alias/certificado debug e chave BookNook. Gradle também bloqueia release sem credenciais e valida o certificado. Não há geração automática de chave, fallback debug, instalação, upload, commit ou push.

O build executa typecheck, 182 testes existentes, testes de segurança da automação, biblioteca oficial, build web, preparação da política e sincronização Capacitor. APK/AAB só vão para release/ após validações de assinatura, identidade, versões, SDK, manifesto, integridade, ELF e ZIPalign, incluindo todos os APKs derivados do AAB. Manifesto final registra tamanhos, hashes e fingerprint público. As saídas e keystores são ignoradas pelo Git.

O teste negativo real do script parou em ANDROID_KEYSTORE_PATH ausente, antes de alterar versões ou compilar. A chamada direta `:app:assembleRelease` também foi bloqueada pelo Gradle por ausência das quatro variáveis, sem gerar release debug. Em dry-run com o certificado debug real já existente, o Gradle também rejeitou a identidade antes de executar tarefas de produção. Não há resultado positivo da cadeia de produção: depende da chave a ser criada pelo responsável.

## Política e materiais

- `public/politica-de-privacidade.html`: identificação Danilo Queiroz Barbosa, daniloqb@gmail.com, vigência/atualização 25/11/2026; dados locais, exportação pessoal e biblioteca, fotos opcionais, links/terceiros, permissões, retenção/exclusão, segurança e limites, direitos LGPD e contato.
- Configurações → Política de Privacidade: mesmo HTML local em iframe com título e sem scripts permitidos; acesso comprovado sem rede na WebView Android. Nenhuma URL fictícia: publicUrl/publicUrlVerifiedAt continuam null.
- `npm run privacy:site`: sincroniza a fonte local em `docs/politica-de-privacidade.html`, com duas fontes e licenças por lista explícita. `docs/index.html` apresenta o aplicativo e aponta para a política. Publicação preparada por **main /docs**, sem workflow no projeto; `docs/_config.yml` exclui relatórios/previews/referências do site. Verificar com `npm run privacy:check`.
- `docs/play-store/`: Data Safety, checklist de privacidade, instruções Pages e textos/checklist da loja. Revisão editorial/jurídica apropriada e decisões do Console continuam com o responsável.

Nenhum dado pessoal foi adicionado à distribuição pública além do nome e e-mail que o próprio responsável escolheu para identificação e suporte. Assets de public/ e lista de publicação foram inspecionados. Evidências privadas de fases anteriores não foram copiadas para o repositório ou o site.

## Validação realizada

| Verificação | Resultado e limite |
| --- | --- |
| Regressão existente | 182 testes / 22 arquivos passaram; coleção, estoque, receitas, preparo/histórico, jornada, descobertas, preferências e transferência pessoal/biblioteca/fotos/v1/v2 |
| Segurança da automação | 7 testes passaram: ausência de credenciais, chave no repo/debug, certificado debug, ELF inválido/4 KB/desalinhado, componente AAB exportado inesperado e redação de segredo em erro |
| TypeScript / build web | Passaram; alerta de chunk >500 KB permanece informativo, sem alteração de arquitetura nesta fase |
| Biblioteca oficial | library:check passou; catálogo da Fase 07.3 preservado |
| HTML | UTF-8, IDs únicos/âncoras existentes, sem scripts/assets remotos; parse e renderização no Chromium |
| Responsividade | 320×740, 390×844 e 1440×1000, sem overflow horizontal; fontes locais carregadas; contato/datas corretos |
| Integração web | Configurações abre a política local; nenhum erro de execução ou pedido externo nas telas percorridas |
| Android sandbox | assembleDebug/assembleDebugAndroidTest/bundleDebug passaram, pacote separado br.com.jornadacafe.sandbox |
| Testes físicos instrumentados | 2 passaram: falha/cancelamento/repetição com provedor de documentos instrumentado e ActivityResult simulado, referências inválidas e FileProvider restrito (incluindo tentativa de escape por ../); não substitui a conferência manual do seletor SAF de produção |
| Política no aparelho | Android API 34, viewport 392 px, sem overflow; WebView em modo de rede offline abriu o HTML, nome e fontes locais; sem pedido externo ou erro de execução no cenário |
| APK de teste 16 KB | zipalign -c -P 16 passou; quatro libsqlcipher.so (arm64-v8a/armeabi-v7a/x86/x86_64) com todos PT_LOAD alinhados a 16384 |
| Bundle de teste | bundletool 1.18.3 validate passou; PAGE_ALIGNMENT_16K confirmado; 87 APKs derivados verificados (assinatura, ZIPalign 16 KB e ELF) |
| Transporte de senha para bundletool | Pipes anônimos exercitados com a identidade debug de teste já existente; nenhum segredo de produção usado/criado |
| JAR strict | Verificado no AAB sandbox confiando explicitamente no certificado de teste (exit 0). JDK avisou sobre ordem de entradas no JarInputStream; bundletool validate passou. Reexaminar qualquer aviso no AAB de produção; não equivale a validar o certificado de upload futuro |
| Instalação principal | Continua 0.7.3 / 18; nenhum uninstall, restauração ou substituição executado; testes restritos à sandbox |

As verificações de bundle/debug exercitam as ferramentas e a configuração nativa; **não são os artefatos de produção**. O construtor release rejeita essa identidade de teste. O aparelho usa páginas de 4096 bytes; execução em dispositivo/emulador 16 KB permanece pendente. O rastreamento de requisições da aplicação não captura todo o tráfego do sistema operacional/serviços externos nem demonstra ausência universal de transmissão.

Evidências temporárias de QA foram mantidas fora do Git em /tmp/jornada08/ (capturas da política e relatórios de teste). O bundletool oficial 1.18.3 foi baixado do repositório google/bundletool para essa pasta; não está versionado. A disponibilização temporária local não substitui uma URL pública da política.

## Pendências objetivas

1. Responsável cria/protege a chave própria fora do Git, conforme docs/RELEASE_ANDROID.md, e executa o build com credenciais no terminal. Não enviar senhas ao chat.
2. Conferir os artefatos assinados resultantes, release-manifest.json, SHA256SUMS e fingerprint público; arquivar as evidências. Ainda não há tamanhos/hashes/certificado de produção para relatar.
3. Revisar política e materiais e concluir o novo commit/push com as alterações já preparadas (instruções em docs/play-store/PRIVACIDADE_E_GITHUB_PAGES.md). O histórico local foi preparado com backup e reset --soft; main aponta para c5fde63, sem workflow no conjunto pendente. Após commit/push autorizado, configurar Pages em Deploy from a branch → main → /docs. Verificar HTTPS/200/HTML/celular/anônimo e registrar URL real em config/privacy.json. Os dois destinos esperados retornaram 404 na correção; a URL continua pendente. Recompilar para o botão online.
4. Completar screenshots/feature graphic reais com dados fictícios na sandbox e decisões de público-alvo/IARC/declarações; não inventar classificação indicativa aprovada.
5. Testar o pacote final via Play interno, API 36 e versão mínima suportada, teclado/áreas seguras/voltar, preparo/timer/persistência, fotos, SAF/share e referências. Regressão automatizada passou; não declarar toda essa matriz física concluída nesta fase.
6. Executar em dispositivo/emulador 16 KB; conferir Console para exigências da conta/teste fechado. Não houve submissão nem aprovação no Google Play.
7. Antes de migrar debug → produção, duas cópias válidas do backup pessoal fora do app, conferência de certificados e plano autorizado. Não desinstalar a instalação atual automaticamente.

Nenhum commit, push, deploy remoto, envio ao Google Play ou geração de keystore foi executado. O responsável escolheu cuidar da criação e build no terminal; a fase deve permanecer identificada como preparação até a validação dos pacotes assinados.

## Correção da publicação estática

A estratégia anterior foi substituída a pedido do responsável: removidos `.github/workflows/privacy-pages.yml` e `scripts/prepare-privacy-site.mjs`; o novo sincronizador local não depende de workflows nem muda o texto da política. Criados docs/index.html, docs/politica-de-privacidade.html, duas fontes/licenças em docs/assets/ e docs/_config.yml para excluir do site os documentos técnicos/previews/referências.

Não houve alteração de versão, assinatura Android, esquema ou dados. A cópia local da política e o componente offline permaneceram byte a byte iguais. O remoto foi consultado e continua em c5fde63. O commit local 91b69fa foi preservado na branch backup/fase08-antes-pages-docs-91b69fa; aplicado reset --soft, mantendo no índice as alterações legítimas da Fase 08 e desta correção. Main agora aponta para c5fde63, sem workflow no conjunto a enviar. Nenhum commit/push foi executado.

Verificações pontuais: estrutura HTML/UTF-8, um h1 por página, IDs/âncoras e caminhos relativos válidos; equivalência integral da política exceto caminhos de fontes; fontes/licenças idênticas às locais; renderização e clique real do link da inicial com JavaScript desativado, sob /JornadaCafe/, em 390×844 e 1440×1000, sem overflow horizontal, falhas ou pedidos externos. Teste isolado confirmou que privacy:check detecta divergência de texto/data e bloqueia asset fora da lista. A aplicação das regras de include/exclude foi conferida com a lógica oficial de EntryFilter; não foi executado um build remoto do Pages. Os seis arquivos previstos para o site não incluem fotografias, bancos, ZIPs ou logs. Os recursos offline existentes não foram modificados, sem reinstalação Android ou grande regressão nesta correção.

Os dois destinos HTTPS esperados retornaram HTTP 404 em 25/11/2026. A publicação ainda depende do commit/push pelo responsável e da configuração Deploy from a branch → main → /docs. publicUrl e publicUrlVerifiedAt continuam null. As pendências restantes de revisão, pacotes assinados e submissão ao Play permanecem conforme a lista acima.
