# Release Android — Minha Jornada pelo Café

Preparação em 25/11/2026. Versão configurada **1.0.0 / 19**, `br.com.jornadacafe.app`. O responsável confirmou que nenhum pacote foi enviado ao Play Console. O histórico local chegou ao código 18. `versionName` é a versão exibida; `versionCode` é inteiro crescente de distribuição. Antes de cada upload futuro, confira também os códigos em todos os canais do Console: um código enviado não pode ser reutilizado.

## Requisitos e configuração

Node >=22.12, npm, Python >=3.10, JDK 21 (`java`, `keytool`, `jarsigner`), Android SDK com plataforma 36 e build-tools com `apksigner`, `zipalign -P 16`, `aapt`; dependências npm e Gradle instaladas. Gradle 8.14.3, AGP 8.13.0, Capacitor 8, minSdk 24, compile/targetSdk 36. Android 7 é o mínimo técnico; testar os aparelhos que serão suportados.

A [política de target SDK](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en) exige API 36 para novos apps/atualizações desde 31/08/2026; conferida em 25/11/2026. Reconfira antes da submissão.

A fonte central é `config/release.json`; Gradle e metadados de exportação leem essa versão. O script sincroniza package.json e lockfile após o preflight. `lastDistributedVersionCode` registra o último código distribuído: atualize após a distribuição e confira os códigos já usados no Console antes do próximo build. Não altere o applicationId.

## Chave de upload: criação manual, ainda pendente

A keystore própria não existia na auditoria. Nenhuma foi criada. Não usar a chave do BookNook, a debug ou uma chave de outro aplicativo. O script não gera chaves, não instala APKs e não publica.

Somente com autorização do responsável, no terminal local (senhas solicitadas interativamente pelo keytool; nunca enviar em chat):

```bash
(
set -e
mkdir -p ~/.android/keystores
chmod 700 ~/.android/keystores
# Pare se este arquivo já existir. Não sobrescreva uma chave anterior.
test ! -e ~/.android/keystores/jornada-cafe-upload.jks
keytool -genkeypair -v \
  -keystore ~/.android/keystores/jornada-cafe-upload.jks \
  -alias jornada-cafe-upload \
  -keyalg RSA -keysize 4096 -validity 10000
chmod 600 ~/.android/keystores/jornada-cafe-upload.jks
)
```

Execute a geração apenas se o teste de inexistência tiver terminado com sucesso. Use uma senha forte e a mesma senha para chave/store se o formato PKCS12 escolhido pelo JDK exigir. Identifique o titular como Danilo Queiroz Barbosa; não invente empresa/CNPJ. Guarde duas cópias seguras da keystore e as senhas em um gerenciador, fora do repositório e dos artefatos. Não perca nem substitua essa identidade entre versões.

A [assinatura do Google Play](https://developer.android.com/studio/publish/app-signing) distingue chave de **upload** da chave de **assinatura de distribuição** administrada pelo Play. O AAB é assinado com upload; os APKs do Play podem ter outro certificado. Um APK direto assinado com upload não deve ser presumido atualizável sobre a instalação do Play.

## Ferramenta bundletool

Baixe `bundletool-all-<versão>.jar` exclusivamente dos [releases oficiais](https://github.com/google/bundletool/releases) e guarde fora do Git. Registre versão/origem no controle local de ferramentas. Nesta máquina foi baixado para testes `/tmp/jornada08/bundletool-all-1.18.3.jar` (SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`); pode ser usado enquanto esse arquivo temporário existir. O script exige `BUNDLETOOL_JAR` para validar AAB, manifesto, configuração de páginas e todos os APKs derivados. Não usa automaticamente o jar parcial do cache Gradle.

## Ambiente e build

Em um terminal privado, com tracing desligado:

```bash
set +x
export ANDROID_KEYSTORE_PATH="$HOME/.android/keystores/jornada-cafe-upload.jks"
export ANDROID_KEY_ALIAS='jornada-cafe-upload'
export BUNDLETOOL_JAR='/caminho/fora/do/git/bundletool-all.jar'
read -r -s -p 'Senha da keystore: ' ANDROID_KEYSTORE_PASSWORD
printf '\n'
read -r -s -p 'Senha da chave: ' ANDROID_KEY_PASSWORD
printf '\n'
export ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD
npm run release:check
npm run build:release -- --version-name 1.0.0 --version-code 19
unset ANDROID_KEYSTORE_PASSWORD ANDROID_KEY_PASSWORD
```

Não use senhas na linha de comando, `.env`, gradle.properties, `-P`, scripts, prints ou relatórios. O Gradle recebe as quatro variáveis externas; sem elas, qualquer tarefa release falha, sem fallback debug. Builds debug/sandbox continuam independentes. Use `--no-daemon --no-configuration-cache` para a release; evite ambientes compartilhados e dumps de ambiente.

O script valida argumentos, ferramentas, appId, keystore externa/alias/certificado; executa typecheck, testes existentes e de segurança do release, biblioteca oficial, build web, preparação estática e `cap sync`; compila APK/AAB; valida antes de copiar para `release/`. Não reutiliza saídas antigas: Gradle executa clean. O diretório `release/` é ignorado pelo Git. Arquive uma entrega anterior antes de repetir; o script recusa sobrescrever os quatro destinos.

## O que é verificado

- APK: `apksigner verify --verbose --print-certs`, fingerprint correspondente à keystore, integridade ZIP, pacote/versão/SDK/permissões via aapt, backup desabilitado, não debuggable, `zipalign -c -P 16 -v 4` e ELF de todas as `.so`.
- AAB: `jarsigner -verify -strict` confiando explicitamente no certificado da keystore, fingerprint público, `bundletool validate`, manifesto (identidade/SDK/permissões/componentes exportados/FileProvider), integridade ZIP e ELF.
- 16 KB: cada PT_LOAD deve ter alinhamento >=16384 e offset/endereço congruentes; bundle deve declarar `PAGE_ALIGNMENT_16K`; todos os APKs de `bundletool build-apks` passam assinatura, ZIPalign e ELF. Senhas para bundletool são transmitidas por pipes anônimos Linux, sem arquivos de senha persistentes.
- Manifesto permite INTERNET e a permissão de assinatura interna do AndroidX; biometria, armazenamento amplo, câmera, localização, notificações e wake lock não são necessários. MainActivity é exportada para o launcher; o receptor ProfileInstaller pode ser exportado protegido por DUMP. FileProvider não exportado, limitado a `cache/data-sharing/`.

O suporte a [páginas de 16 KB](https://developer.android.com/guide/practices/page-sizes) exige também teste de execução em dispositivo/emulador 16 KB. As bibliotecas SQLCipher 4.17.0 das quatro ABIs inspecionadas já têm alinhamento ELF 16384. Isso sozinho não comprova o bundle release nem substitui o teste de execução. Consulte o relatório da fase para separar o que foi executado das pendências.

## Comparação de certificados e formatos do apksigner

O digest da keystore é calculado sobre o certificado DER retornado por `keytool -exportcert`; não depende da aparência do fingerprint em `keytool -list`. O parser APK aceita tanto `Signer #1 certificate SHA-256 digest:` quanto os rótulos por esquema do Build Tools 37, como `V2 Signer: certificate SHA-256 digest:`. O AAB continua exigindo assinatura JAR estrita e comparação do certificado folha DER.

Espaços, dois-pontos e caixa são normalizados, com exigência de 64 dígitos hexadecimais. Não confundir certificado com digest de chave pública ou hash dos arquivos. A proteção de senhas atua somente nos logs, preservando os dados internos usados pelas verificações.

O [relatório da correção de assinatura](phase-08-signature-fix.md) registra a falsa rejeição reproduzida, os 21 testes de release e a auditoria dos pacotes existentes. Uma execução interrompida não declara os artefatos prontos: repetir o comando no terminal com as credenciais externas e concluir todas as etapas obrigatórias.

## Entrega e evidências

```text
release/
  jornada-cafe-v1.0.0-build19.apk
  jornada-cafe-v1.0.0-build19.aab
  release-manifest.json
  SHA256SUMS
```

O manifesto registra versão, appId, SDKs, data UTC, tamanhos, SHA-256, fingerprint público e verificações. `SHA256SUMS` cobre os dois pacotes e o manifesto. Confira `sha256sum -c SHA256SUMS` dentro de release/. Nunca copie keystore, backups, bancos, fotos privadas ou logs pessoais para essa pasta. Artefatos só são promovidos após os checks obrigatórios; o script não declara publicação realizada nem execução 16 KB validada.

## Migração da instalação atual sem perder dados

A instalação principal atual é debug. Release/Play têm certificados distintos; `adb install -r` não contorna essa incompatibilidade. **Não desinstalar automaticamente.**

1. No aplicativo atual, gerar backup **pessoal completo**, incluindo fotos; salvar fora da área privada do app.
2. Validar formato, integridade e conteúdo com o fluxo existente em um ambiente de teste isolado; conferir contagens e fotos sem restaurar sobre dados reais.
3. Guardar segunda cópia em outro local seguro. Um backup de biblioteca não substitui o backup pessoal.
4. Conferir certificado instalado e os certificados APK direto/Play, usando `apksigner` em cópia do APK obtida com `adb shell pm path br.com.jornadacafe.app` + `adb pull`.
5. Planejar a troca com o responsável. Somente após backup confirmado e autorização específica, remover a instalação incompatível e instalar a versão de produção desejada.
6. Restaurar o backup pessoal por ação do responsável e conferir cafés, estoque, receitas, fotografias e histórico. Manter as duas cópias até concluir a conferência.

Nesta fase os testes físicos devem usar `br.com.jornadacafe.sandbox`. Não substituir nem restaurar a instalação principal. Os ZIPs não são criptografados pelo app: proteja as cópias.

## Publicação e futuras atualizações

Revisar [materiais da loja](play-store/loja.md), [privacidade/Pages](play-store/PRIVACIDADE_E_GITHUB_PAGES.md), [Data Safety](play-store/data-safety.md) e [checklist](play-store/privacy-checklist.md). Criar aplicativo no Console, ativar Play App Signing, registrar upload, enviar AAB assinado, completar ficha e declarações, testar pelo Play e solicitar produção apenas após aprovação do responsável.

Para novas contas pessoais criadas após 13/11/2023, o [Google exige teste fechado](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en) com pelo menos 12 participantes inscritos continuamente por 14 dias antes de solicitar acesso à produção (regra consultada em 25/11/2026). Confirme o tipo/data da conta no Console: primeira publicação não prova que essa exigência se aplica.

Em futuras versões reutilize a chave, incremente versionCode considerando todos os uploads, ajuste versionName, atualize política/Data Safety se houver mudança de tratamento, execute novamente o script e os testes físicos. Não assuma que a assinatura de upload é a assinatura dos APKs distribuídos pelo Play.
