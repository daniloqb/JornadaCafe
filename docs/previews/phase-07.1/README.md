# Evidências da correção Android 07.1

- [Relatório](../../phase-07.1.md): diagnóstico, correção, integridade, testes físicos e limites.
- [Validação consolidada](validation.json): tamanhos e SHA-256 dos três ZIPs pessoais externos, restauração isolada, biblioteca, builds e preservação.
- [Crash sanitizado](crash-sanitized.txt): exceção Binder e duplicação das opções da Activity.
- [Etapas sanitizadas](export-stages-sanitized.txt): geração, temporário, SAF, escrita, fechamento, releitura, retorno e cancelamento; apenas identificadores e números.
- [Falhas nativas](native-sanitized.txt) e [reexecução final](native-final.txt): plugin real contra provedor exclusivo de teste.
- [Coleção principal](main-preservation.json): todas as linhas e metadados iguais, 16 fotos com hashes iguais, integridade e chaves estrangeiras.
- [Sandbox](sandbox-preservation.json): estado integral preservado após cancelamento e exportação técnica.
- [APK normal](build-validation.json): identidade, versão, SHA-256 e 22 arquivos web iguais a `dist`.

Os destinos SAF foram escolhidos e confirmados manualmente pelo usuário no aparelho; a automação ADB de toques continuou bloqueada. As coleções fictícias foram preparadas por CDP na sandbox. Os arquivos externos reais foram copiados e verificados; nenhuma validação de salvamento foi substituída por chamada direta ao callback.

ZIPs de teste e roteiros permanecem em `/tmp/jornada071-*`. Cópias técnicas da instalação principal estão em diretório privado de `/tmp`, fora do projeto. Os artefatos deste diretório não contêm dados pessoais, Base64 de imagens ou fotografias.
