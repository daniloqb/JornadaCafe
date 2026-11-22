# Complemento da Fase 07 — limpeza independente dos dados

Versão **0.7.1 / versionCode 16**, esquema **5**, formatos pessoal e compartilhável **v1**. As duas ações ficam nos mesmos blocos de Configurações usados para backup e compartilhamento. A instalação da atualização não executa nenhuma limpeza. Não houve commit ou push.

## O que cada ação remove

| Ação | Remove | Mantém |
| --- | --- | --- |
| **Limpar dados pessoais** | Cafés, produtores, propriedades, origens, torrefadores, espécies e notas sensoriais cadastradas; pacotes, saldos e movimentos; preparações, avaliações e correções; reflexões e vínculos pessoais. | Métodos, técnicas, famílias e versões de receitas; preferências de aparência, texto e avisos. |
| **Limpar receitas e métodos** | Métodos, técnicas, famílias e todas as versões das receitas atuais. | Coleção pessoal, estoque e movimentos, preparações com seus snapshots completos, avaliações, correções, reflexões e preferências. |

Ao limpar os dados pessoais, apenas o campo `coffeeId` das receitas mantidas é retirado, evitando vínculos com cafés excluídos. Seus campos técnicos, IDs, versões, etapas, fontes e datas são preservados. Não se cria ajuste nem recalcula estoque: os próprios pacotes e movimentos são removidos pelo escopo pessoal confirmado. Ao limpar a biblioteca, os snapshots do histórico permanecem íntegros e independentes do cadastro atual. Jornada e Descobertas continuam sendo recalculadas pelos seletores existentes.

As duas operações recusam uma sessão persistida ou em andamento, tanto na interface quanto no domínio. É necessário concluir ou descartar esse preparo antes. A limpeza não altera as configurações nem as unidades do aplicativo. É possível executar as duas ações separadamente para remover os dois grupos.

## Confirmação

Cada diálogo informa as categorias e contagens reais, os dados mantidos e o tratamento das fotos. Oferece **Salvar backup completo antes de limpar**, reutilizando o formato pessoal já existente. O botão destrutivo começa desabilitado: é necessário marcar **Entendo que estes dados serão excluídos deste aplicativo** e depois acionar **Excluir os dados confirmados**.

O foco inicial fica em **Manter meus dados**. Cancelar, fechar e Escape preservam todos os registros. A trava imediata de `useFormAction` evita chamadas duplicadas. Durante a operação, fechamento e ações concorrentes do diálogo ficam bloqueados. O resultado só apresenta limpeza concluída depois de a operação finalizar.

## Persistência e fotografias

`clearCollectionData` define os dois escopos no domínio e é aplicado dentro das transações dos adaptadores. IndexedDB inclui as fotos na mesma transação: registros e mídia são revertidos juntos se uma exclusão falhar.

SQLite respeita a ordem das chaves estrangeiras e das versões: receitas são removidas antes de técnicas/métodos; na limpeza pessoal, as receitas são desvinculadas antes de excluir cafés. A transação também registra um marcador único de exclusão de mídia pendente. O marcador permite reconhecer um commit concluído mesmo se a resposta se perder.

Após o commit, são removidas as fotografias sem referência no estado mantido e as gerações antigas de restauração. A verificação inclui fotos de cadastros atuais, snapshots de preparações/sessões e identidades originais de cafés corrigidos. Fotos ainda usadas pelo histórico continuam disponíveis mesmo ao remover métodos/técnicas da biblioteca. Arquivos órfãos gerenciados também são removidos.

Se a exclusão física falhar, os registros já removidos não são apresentados como se a transação tivesse sido revertida: a coleção compartilhada é recarregada e o diálogo informa que há fotografias aguardando exclusão. O marcador é mantido para nova tentativa da mesma limpeza ou retomada na inicialização. Ele só é apagado após concluir a remoção da mídia. Uma falha na transação de registros mantém o grupo original e todas as fotos. As operações são idempotentes.

A remoção usa exclusão normal de arquivos do aplicativo; não é um recurso de apagamento forense nem remove cópias exportadas para outros destinos.

## Implementação

| Arquivo | Alteração |
| --- | --- |
| `src/domain/data-management.ts`, `collection.ts` | Escopos explícitos, regra de sessão e preservação dos grupos. |
| `src/data/indexeddb-storage.ts` | Limpeza de registros e fotos em transação única. |
| `src/data/sqlite-storage.ts` | Ordem SQL, exclusão de mídia retomável e detecção de commit concluído. |
| `src/data/CollectionContext.tsx` | Recarrega o estado confirmado mesmo se a limpeza física posterior falhar. |
| `src/features/settings/ClearDataAction.tsx`, `DataManagement.tsx` | Botões nos dois blocos, resumo, backup prévio, confirmação e resultado. |
| `src/theme/theme.css` | Separação visual das ações de limpeza usando os tokens existentes. |
| `src/data/transfer.test.ts` | Quinze novos testes de escopo, preservação, sessões, falhas e retomada. |
| `package.json`, `package-lock.json`, `android/app/build.gradle`, `src/transfer/core.ts` | Versão 0.7.1 / 16, sem novas dependências nem migração. |

## Validação

- TypeScript e **135 testes em 18 arquivos** aprovados, incluindo quinze novos casos. Os adaptadores reais são exercitados com fake IndexedDB e SQLite em memória, substituindo a ponte nativa e o filesystem nos testes de host.
- Comparação integral do grupo mantido, estoque, movimentos, avaliações, correções e snapshots; preservação de fotos históricas e remoção de fotos pessoais/órfãs; backup válido depois de cada limpeza; idempotência e reabertura.
- Falhas simuladas revertem a transação em ambos os adaptadores. Há casos específicos de falha ao remover fotos no IndexedDB, retomada após falha de mídia SQLite e resposta perdida após commit.
- **120 verificações visuais**, nos cinco estados × larguras 320/390/768/1440 × Claro/Escuro × escalas 85/100/115%, sem overflow nos elementos medidos. Foram geradas **30 capturas web**.
- Fluxos pela interface: foco seguro, confirmação inicialmente desabilitada, cancelar, Escape, confirmação dupla, grupo mantido idêntico e bloqueio de sessão.
- Smartphone: as duas limpezas executadas exclusivamente em `br.com.jornadacafe.sandbox`, com dados fictícios. Comparação integral dos registros e hashes das fotos, cancelamento, confirmação dupla e persistência após encerrar o aplicativo. SQLite íntegro, sem vínculos SQL inválidos. **Quatro capturas físicas**.
- Build web, sincronização Capacitor e builds Android normal/separado aprovados. Os **22 arquivos web** do APK normal são idênticos a `dist/`. Permanecem os avisos do chunk principal (572,63 kB minificado / 169,07 kB gzip) e de `flatDir`.

Evidências: [matriz e fluxos](previews/phase-07-clear/validation.json), [Android isolado](previews/phase-07-clear/android-validation.json), [build/APK](previews/phase-07-clear/build-validation.json), [índice das capturas](previews/phase-07-clear/README.md).

## Atualização do smartphone mantendo os dados

Após os testes isolados, a instalação principal foi atualizada de **0.7.0 / 15** para **0.7.1 / 16** por `adb install -r`, com assinatura compatível. Foi guardada uma nova cópia técnica local verificada de banco, arquivos, preferências e WebView em diretório privado de `/tmp`, fora dos artefatos do projeto. Nenhuma das ações de limpeza foi acionada na instalação principal.

Banco e arquivos foram comparados por hash antes da primeira abertura. Após a inicialização, todas as linhas das nove tabelas persistentes e dos metadados foram comparadas integralmente, além dos hashes das fotografias ativas. Resultado e quantidades estão na [evidência de instalação](previews/phase-07-clear/install-validation.json).

APK normal: [app-debug.apk](../android/app/build/outputs/apk/debug/app-debug.apk). O pacote principal continua `br.com.jornadacafe.app`; o esquema permanece 5 e os formatos de backup continuam v1.
