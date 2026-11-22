# Formatos portáveis — versão 1

Aplicativo **0.7.0**, esquema persistente **5**. O formato de backup pessoal e o formato de biblioteca possuem constantes de versão independentes, ambos atualmente **1**. Uma versão futura desconhecida é recusada; a versão do aplicativo de origem é informativa. Não há migração do banco nesta fase.

## Envelope comum

Arquivos ZIP32 com nomes UTF-8, entradas armazenadas ou Deflate, sem criptografia, links simbólicos, volumes múltiplos, comentários ou ZIP64. Somente os caminhos descritos abaixo são aceitos. O manifesto contém:

```json
{
  "application": "minha-jornada-pelo-cafe",
  "backupKind": "library-share",
  "formatVersion": 1,
  "appVersion": "0.7.0",
  "schemaVersion": 5,
  "createdAt": "2026-11-21T10:00:00.000Z",
  "counts": { "methods": 1, "techniques": 0, "recipes": 1, "versions": 2 },
  "files": [
    { "path": "data/library.json", "size": 1234, "sha256": "<64 caracteres hexadecimais>" }
  ]
}
```

O exemplo é conceitual: tamanho e digest devem corresponder aos bytes reais. `manifest.json` não se inclui em `files`; todas as outras entradas são declaradas, sem duplicatas. Contagens são recalculadas e comparadas. Cada conteúdo possui SHA-256; o ZIP também tem seu CRC verificado. SHA-256 detecta corrupção e inconsistências, mas não autentica o remetente. O arquivo pessoal contém informações privadas e não é criptografado.

Limites implementados em `src/transfer/core.ts`: **96 MiB** de ZIP, **160 MiB** expandidos, **16 MiB** por entrada, **2.048** entradas e **20.000** entidades persistentes. Cada lista tem no máximo 20.000 elementos, cada texto 100.000 caracteres. A expansão declarada de uma entrada não pode superar 1.000 vezes seu tamanho comprimido. A descompressão incremental também limita os bytes efetivamente produzidos, mesmo quando os cabeçalhos mentem. A interface usa a abreviação MB para esses limites binários.

A leitura verifica diretório central, cabeçalhos locais, intervalos sobrepostos, truncamento, caminhos e nomes repetidos, compressão permitida, tamanho real, CRC e SHA antes da validação de domínio. Não extrai caminhos do arquivo diretamente no sistema de arquivos. JSON usa UTF-8 estrito e rejeita `__proto__`, `prototype`, `constructor` e propriedades desconhecidas. URLs de referências aceitam apenas HTTP/HTTPS. Números precisam ser finitos e respeitar as regras do domínio.

## Backup pessoal — `personal-full`

Nome: `jornada-cafe-backup-completo-AAAA-MM-DD-HHMM.zip`.

```text
manifest.json
data/personal.json
photos/<sha256>.jpg|png|webp
```

`data/personal.json` contém `{ "collection": CollectionData, "preferences": PortablePreferences }`. A coleção preserva todas as propriedades persistidas, incluindo campos opcionais e valores zero:

| Array | Conteúdo e relações |
| --- | --- |
| `records` | Produtores, propriedades, origens, torrefadores, espécies e notas sensoriais, com identidades, datas, geografia e vínculos. |
| `coffees` | Cadastro completo, características, avaliações comerciais, favoritos e relações. |
| `packages` | Gramagem inicial, saldo, datas e `adjustments` completos. Consumos não são reconstruídos a partir de preparações. |
| `methods`, `techniques` | Cadastro completo, fotos, referências, autoria e orientações. |
| `recipes` | Todas as famílias e versões, parâmetros, fonte, etapas, cronograma e vínculos. |
| `preparations` | Snapshots, identidade/versão da receita, execução, estados, avaliações e `parameterCorrections.original`. |
| `sessions` | Snapshot e checkpoint persistido; na restauração apenas `status` passa a `paused` e `needsConfirmation` a `true`. |
| `reflections` | Textos pessoais, datas, categorias, destaque e associações persistidas. |

Os tipos exatos são `src/domain/collection.ts`, `brewing.ts`, `preparation.ts` e `journey.ts`; a lista de campos e validação em execução fica em `src/transfer/validation.ts`. Referências atuais são verificadas. Snapshots históricos mantêm cadastros removidos e parâmetros corrigidos, sem serem substituídos pela biblioteca atual. A água corrigida do snapshot pode diferir da soma de seus despejos originais. Associações históricas a cafés removidos continuam válidas; vínculos de reflexões a preparações inexistentes são recusados.

As contagens do manifesto correspondem aos nove arrays e a `photos`, que conta identidades lógicas. `recipes` neste formato conta versões; o resumo da interface também calcula famílias e categorias individuais de `records`.

Fotografias são coletadas dos cadastros atuais, snapshots de preparações e sessões e identidade original de café em correções. Cada arquivo é identificado pelo SHA-256 dos bytes, preservados sem recompressão. Identidades diferentes com bytes iguais compartilham uma entrada. Essa entrada acrescenta ao manifesto `mediaType` e `photoIds`, a lista de IDs lógicos associados. O caminho, digest, MIME e assinatura JPEG/PNG/WebP precisam concordar. Fotos ausentes, repetidas ou sem vínculo são recusadas. Assets decorativos embarcados e arquivos órfãos não são exportados.

`preferences` contém somente:

```json
{
  "appearance": "system",
  "textSize": 100,
  "alerts": { "sound": false, "vibration": false }
}
```

Aparência: `light`, `dark`, `system`. Tamanho: 85, 90, 100, 110 ou 115. Unidades são fixas no aplicativo (g, °C, minutos/segundos), portanto não há preferência de unidade a exportar. Não são copiados caminhos, permissões, configurações do aparelho ou chaves arbitrárias de localStorage. Indicadores, hipóteses e comparações derivados são recalculados pelos seletores existentes; não há cache persistente de Descobertas.

### Aplicação segura

Todo o arquivo é validado antes do resumo e da confirmação. Restaurar substitui a coleção completa e recusa uma sessão atualmente existente no destino. O usuário pode salvar um backup da coleção atual antes de confirmar.

IndexedDB troca as nove tabelas, fotos e marcador de preferências em uma transação. SQLite prepara arquivos em `photo-generations/<uuid>/`, verifica sua releitura por SHA e só então substitui as linhas e o ponteiro `photo-root` na mesma transação SQL. A geração anterior permanece disponível até a próxima inicialização bem-sucedida. Se houver interrupção, o ponteiro comprometido identifica uma geração completa; diretórios abandonados são ignorados e limpos posteriormente. Uma resposta perdida após commit é reconhecida pela releitura do ponteiro. Não há alegação de transação conjunta entre SQLite e filesystem.

As preferências viajam em um marcador transacional `restored-preferences-pending`. Na inicialização são aplicadas às três chaves permitidas e o marcador é removido somente após o sucesso. Uma falha parcial é retomada na próxima inicialização. A aplicação é recarregada após restaurar, para todos os consumidores usarem a nova coleção. Nenhum timer recebido inicia automaticamente.

## Biblioteca — `library-share`

Nome: `jornada-cafe-biblioteca-AAAA-MM-DD-HHMM.zip`. Somente `manifest.json` e `data/library.json`, contendo `{ "methods": [], "techniques": [], "recipes": [] }`.

A projeção constrói os registros por lista explícita de campos:

| Tipo | Campos compartilháveis |
| --- | --- |
| Método | `id`, `name`, `description`, `notes`. |
| Técnica | `id`, `name`, `methodId`, `creator`, `sources`, `principle`, `guidance`, `notes`. |
| Receita | `id`, `familyId`, `version`, `previousVersionId`, `versionNote`, `name`, `methodId`, `techniqueId`, `dose`, `water`, `temperature`, `grind`, `grinder`, `filter`, `estimatedSeconds`, `notes`, `source`, `steps`. |
| Fonte | `id`, `title`, `author`, `url`, `notes`. |
| Etapa | `id`, `order`, `name`, `type`, `water`, `cumulativeWater`, `startSeconds`, `durationSeconds`, `advance`, `condition`, `notes`. |

A proporção é derivada de dose/água. Todas as versões da família selecionada são incluídas, junto de seus métodos e técnicas. Técnicas incluem seu método quando necessário. Uma seleção vazia é bloqueada; dependências ausentes impedem a exportação.

Não são projetados cafés, produtores pessoais, fotos, pacotes, saldos, ajustes, preparações, avaliações, reflexões, sessões, preferências, IDs pessoais, datas de uso ou `referenceKey`. `coffeeId` é omitido da receita técnica. IDs de fontes e etapas tornam-se `source-N`/`step-N`. Os textos técnicos escolhidos — nomes, notas, instruções e créditos — são incluídos como escritos; a interface pede sua revisão antes de compartilhar. A lista de campos não identifica automaticamente informação privada digitada dentro desses textos.

### Identidades e importação

A serialização canônica ordena chaves com `localeCompare('en')`, conserva ordem de arrays, omite propriedades `undefined` e usa números/strings JSON. A impressão SHA-256 usa UTF-8 dessa serialização. Métodos recebem `m-<hash>`; técnicas, `t-<hash>` sobre seus campos e referências técnicas já normalizadas. A família recebe `f-<hash>` das versões ordenadas, incluindo o número da versão anterior; cada receita recebe `<familyId>-v<N>`. A leitura reconstrói essas identidades e exige correspondência com os dados.

A pré-visualização compara as mesmas projeções da biblioteca do destino. Conteúdo idêntico reutiliza o registro existente; nome igual com conteúdo diferente cria cópia independente. Novos registros, etapas e fontes ganham UUIDs locais; mapas reescrevem métodos, técnicas, famílias e versão anterior. A assinatura da família inteira conserva o grafo de versões: uma família alterada/extensa posteriormente pode ser importada como outra família, sem mesclagem ou sobrescrita de versões.

O plano guarda a biblioteca observada na pré-visualização. Se ela mudar antes da confirmação, é necessário selecionar novamente o arquivo. Todos os itens novos são aplicados em uma transação nos dois adaptadores; falhas revertem a importação. Linhas pessoais e sessão ativa permanecem idênticas. O conteúdo importado usa os mesmos formulários, personalização, versionamento e preparo guiado existentes.

## Plataformas

Na web, o navegador fornece escolha de arquivo e download por Blob; compartilhamento de arquivo depende de Web Share e tem fallback para download. O aplicativo informa que solicitou o download, sem afirmar que o navegador concluiu sua gravação.

No Android, `DataFiles` usa Storage Access Framework (`ACTION_OPEN_DOCUMENT`, `ACTION_CREATE_DOCUMENT`) e compartilhamento `ACTION_SEND` com FileProvider e concessão temporária de leitura. Não exige permissão ampla de armazenamento. O salvamento externo só é confirmado após concluir a escrita. Abrir o menu de compartilhamento não é confirmação de envio ou de backup. Cancelamentos não alteram a coleção; uma falha de escrita externa é informada, sem apresentar cópia parcial como válida. Nada depende de nuvem, conta ou rede.

A correção Android da Fase 07.1 não modifica os formatos. O ZIP validado é preparado em cache privado por blocos; o seletor e o compartilhamento recebem apenas uma referência curta, nome, tamanho e SHA-256. A gravação externa conta os bytes, fecha o fluxo e verifica o hash quando o provedor permite releitura. Falhas tentam remover somente o documento criado pela operação e são informadas sem confirmar sucesso.
