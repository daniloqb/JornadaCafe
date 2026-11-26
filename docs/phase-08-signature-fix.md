# Correção da validação de assinatura — 1.0.0 / 19

Verificação em 25/11/2026. ApplicationId preservado: `br.com.jornadacafe.app`. Nenhuma chave nova foi gerada; nenhuma instalação, publicação, alteração de versão, commit ou push foi realizada.

## Causa exata reproduzida

O orquestrador seleciona o Build Tools mais recente instalado: **37.0.0** nesta máquina. O `apksigner` dessa versão verificou o APK com sucesso (exit 0, esquema v2), mas retornou:

```text
Number of signers: 1
V2 Signer: certificate SHA-256 digest: 657766e21ea480814568b43b734ecc75ea5f331c47fb422ed5d8d962cdd9bf41
```

A expressão anterior procurava somente `Signer #1 certificate SHA-256 digest:`. Portanto, `match` ficava ausente e entrava no mesmo bloqueio usado para certificados diferentes. A mensagem de divergência era falsa: a comparação nem chegava a obter o digest do APK. O comportamento foi reproduzido com o APK real, mesmo sem variáveis de senha no ambiente.

Também havia um defeito independente: `run()` removia substrings iguais às senhas antes de devolver o texto aos parsers. Um segredo que coincidisse com parte de um digest podia corromper a comparação. Essa condição foi reproduzida com senha fictícia em teste; não foi presumido nem consultado o conteúdo das senhas reais.

## Correção

- Keystore: `keytool -exportcert`, sem `-rfc`, retorna o certificado DER; o SHA-256 é calculado diretamente sobre esses bytes, com stderr separado de stdout. O comportamento do comando é descrito na [documentação do keytool/JDK 21](https://docs.oracle.com/en/java/javase/21/docs/specs/man/keytool.html).
- APK: mantido `apksigner verify`; aceitos o formato legado e rótulos por esquema como `V2 Signer:`. Exigidos exatamente um assinante e o mesmo certificado entre os esquemas relatados.
- Normalização: espaços, dois-pontos e caixa são normalizados; o resultado precisa ter exatamente 64 dígitos hexadecimais. Ausência, digest inválido ou certificado diferente continuam bloqueando.
- AAB: mantido `jarsigner -verify -strict` com confiança explícita no certificado; o certificado folha retornado por `keytool -printcert -rfc -jarfile` é decodificado para DER e seu hash é comparado ao mesmo certificado de upload. A conferência do fingerprint não substitui a verificação JAR.
- Logs: segredos são removidos apenas da exibição e das mensagens de erro; os dados internos de validação permanecem intactos. DER não é decodificado como texto nem impresso.
- Permanecem obrigatórios os checks de pacote, versão, SDK, permissões, integridade, manifesto, ZIPalign, ELF, configuração 16 KB e APKs derivados.

O hash comparado é o **SHA-256 do certificado X.509 inteiro**. Não é o digest da chave pública nem o hash do APK/AAB.

## Resultados dos testes

`npm run test:release`: **21 testes passaram** (7 anteriores e 14 novos). Cobertura adicional: formatos antigo/37, espaços/caixa/dois-pontos, certificados diferentes, ausência/invalidade do digest, bloqueio de debug/múltiplos assinantes/divergência por esquema, distinção de chave pública/source stamp, exportação DER, proteção dos logs sem corromper o parser, AAB obrigatório e preservação dos bloqueios de identidade/SDK/alinhamento.

`npm run release:check` e `git diff --check` passaram. Os 182 testes da aplicação tinham passado na execução do responsável descrita no pedido; não foram reexecutados nesta correção exclusiva do orquestrador. A execução completa os roda novamente antes do Gradle.

## Pacotes existentes efetivamente conferidos

Certificado de referência informado pelo responsável:

```text
657766E21EA480814568B43B734ECC75EA5F331C47FB422ED5D8D962CDD9BF41
```

| Verificação | Resultado |
| --- | --- |
| APK — assinatura | `apksigner verify` aprovado, v2, certificado corresponde à referência acima |
| APK — identidade | br.com.jornadacafe.app; 1.0.0 / 19; minSdk 24; target/compileSdk 36 |
| APK — permissões/backup/debug | Auditoria passou: INTERNET + permissão interna AndroidX; backup desabilitado; não debuggable |
| APK — alinhamento/integridade | ZIP íntegro e `zipalign -c -P 16`; quatro libsqlcipher.so com PT_LOAD >=16384 e endereços/offsets congruentes |
| AAB — assinatura | `jarsigner -verify -strict` aprovado com certificado público de confiança conferido pelo fingerprint do responsável |
| AAB — certificado | SHA-256 do DER idêntico ao certificado de referência do keystore/APK |
| AAB — conteúdo | `bundletool validate`, manifesto, pacote/versão/SDK/permissões/componentes e FileProvider aprovados |
| AAB — 16 KB/integridade | PAGE_ALIGNMENT_16K e ELF das quatro ABIs aprovados; ZIP íntegro |

Para a auditoria JAR, foi usado um truststore temporário contendo **somente o certificado público do AAB**, após confirmar seu hash contra a referência independente fornecida pelo responsável. Não continha chave privada, não assinou arquivos e foi removido ao terminar. Isso permitiu validar a assinatura existente sem obter as senhas de upload. O novo caminho de exportação DER da keystore precisa ser exercitado na execução completa no terminal do responsável.

| Arquivo existente | Bytes | SHA-256 do arquivo (distinto do certificado) |
| --- | ---: | --- |
| android/app/build/outputs/apk/release/app-release.apk | 33793898 | 4ff8df2ad7d291901af4663c8298ddcaca4d27371cc6d24f92b2087d4f39e06d |
| android/app/build/outputs/bundle/release/app-release.aab | 28792823 | c8c0d26bf38155a4a318d1d82c425469dab9c1b4134d1892979f05506ebfc952 |

Esses hashes identificam as saídas já existentes da compilação do responsável. Uma nova compilação pode gerar hashes diferentes. Não foram promovidas para release/ como se todas as etapas do pipeline já tivessem concluído.

## Execução completa e pendências

Foi tentado novamente:

```bash
npm run build:release -- --version-name 1.0.0 --version-code 19
```

Esta sessão do agente não recebeu as quatro variáveis de assinatura nem BUNDLETOOL_JAR, embora elas tenham sido exportadas no terminal do responsável. O pré-check interrompeu corretamente em ANDROID_KEYSTORE_PATH ausente, antes de recompilar ou modificar versões. O responsável confirmou que repetirá o comando no próprio terminal com as credenciais já configuradas; não enviar senhas ao chat.

**Ainda pendentes:** execução integral com a keystore real, geração e auditoria de todos os APKs derivados do AAB de produção, promoção dos quatro arquivos finais em release/ e conferência de release-manifest.json/SHA256SUMS. A assinatura e os checks listados dos APK/AAB existentes foram aprovados; isso não equivale a declarar o pipeline inteiro concluído. O teste de execução em dispositivo/emulador 16 KB e a submissão ao Play também continuam separados.
