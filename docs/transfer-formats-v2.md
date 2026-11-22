# Formatos portáveis — versão 2

Aplicativo **0.7.2 / 17**, esquema persistente **5**. A aplicação exporta `personal-full v2` e `library-share v2` e continua lendo as versões 1 de ambos. O [contrato v1](transfer-formats-v1.md) permanece como registro dos arquivos já emitidos. Versões desconhecidas, inclusive futuras, são recusadas antes de qualquer alteração local.

Os limites, ZIP32, CRC, SHA-256, validação de caminhos, JSON estrito, confirmação de restauração e transporte Android em blocos descritos no contrato anterior continuam aplicáveis. Nenhum conteúdo externo é baixado automaticamente.

## Receita e referências

O modelo existente guarda cada versão como um payload JSON de `BrewRecipe`; não há tabela independente de famílias. Foi acrescentado somente `photoId?: string`. A edição de fotografia propaga uma identidade local a todas as versões atuais da família na mesma transação do cadastro. Versões novas herdam a fotografia, sem duplicação de bytes. Essa alteração não cria uma versão técnica. Preparações e sessões existentes conservam seus snapshots e arquivos originais.

`source.author` representa **Apresentado por**; `source.url`, **Link da referência**. Os campos existentes `source.title` e `source.notes` continuam disponíveis. As fontes já eram próprias de cada versão e essa capacidade foi preservada. Uma nova versão começa com a mesma fonte e pode personalizá-la; editar uma referência não reescreve outras versões nem cria versões automaticamente. O criador da técnica continua em `technique.creator`.

URLs completas são preservadas no armazenamento. Cadastro, leitura de arquivos e abertura aceitam somente HTTP/HTTPS. A abertura é uma ação explícita por link externo com `noopener noreferrer`; no Android, o plugin `ReferenceLinks` valida novamente esquema e host e abre `ACTION_VIEW`, com tratamento de ausência de navegador. A abertura não depende do suporte do WebView a janelas `target=_blank`. Não são incorporadas páginas ou vídeos.

## Backup pessoal — `personal-full v2`

Estrutura preservada:

```text
manifest.json
data/personal.json
photos/<sha256>.jpg|png|webp
```

A versão 2 acrescenta `photoId` às receitas atuais e aos snapshots de receitas. A coleta de mídias também percorre esses vínculos. `source` e os demais campos continuam integralmente preservados. O backup pessoal inclui todas as fotografias necessárias, sem opção de exclusão.

Cada arquivo físico é deduplicado pelo SHA-256 dos bytes. `photoIds` no manifesto associa todas as identidades lógicas que compartilham o arquivo; `counts.photos` continua contando identidades lógicas. Uma imagem ausente bloqueia a exportação ou a leitura do arquivo. Imagens históricas continuam necessárias mesmo que a fotografia atual da família tenha sido removida.

A versão foi elevada porque o leitor anterior possui uma lista estrita de campos de receita e não entende seus novos vínculos de fotografia. O novo arquivo é explicitamente recusado pelo aplicativo antigo, em vez de permitir descarte silencioso de imagens. O leitor atual aceita arquivos pessoais v1 estruturalmente válidos, sem exigir campos novos; uma receita com `photoId` declarado em um envelope v1 é recusada.

## Biblioteca — `library-share v2`

```text
manifest.json
data/library.json
images/<sha256>.jpg|png|webp   # somente quando houver imagens autorizadas
```

Exemplo conceitual de manifesto; tamanhos e hashes precisam corresponder aos bytes reais:

```json
{
  "application": "minha-jornada-pelo-cafe",
  "backupKind": "library-share",
  "formatVersion": 2,
  "appVersion": "0.7.2",
  "schemaVersion": 5,
  "createdAt": "2026-11-22T15:00:00.000Z",
  "counts": { "methods": 1, "techniques": 1, "recipes": 1, "versions": 2, "photos": 1 },
  "files": [
    { "path": "data/library.json", "size": 1234, "sha256": "<hash dos dados>" },
    { "path": "images/<hash da imagem>.jpg", "size": 5678, "sha256": "<hash da imagem>", "mediaType": "image/jpeg" }
  ]
}
```

A projeção técnica mantém a lista explícita de campos do v1. Somente a receita pode acrescentar `image?: string`, com o SHA-256 do arquivo incluído. Não exporta `photoId`, UUID de fotografia, nome original de arquivo, caminho privado ou `photoIds`. Métodos e técnicas continuam sem fotografias nesta modalidade. `counts.photos` conta arquivos únicos efetivamente incluídos, e a leitura exige correspondência exata entre referências, arquivos e contagens. Famílias recebidas com fotografias divergentes entre versões são recusadas antes da importação.

**Incluir imagens das receitas** começa desmarcado. Nesse estado, nenhuma fotografia é lida ou incluída e `image` é omitido. Quando marcado, somente as fotografias das famílias selecionadas são lidas; versões e dependências técnicas continuam automáticas. Fotografias de cafés, produtores, métodos ou técnicas não são incluídas por associação indireta. A prévia apresenta o estado da opção, imagens, contagens, dependências e todos os textos livres técnicos para revisão.

A seleção não autoriza automaticamente a redistribuição de fotografias. A interface apresenta: “Inclua somente imagens próprias ou que você tenha autorização para compartilhar. O nome e o link da referência podem ser compartilhados sem a fotografia.” Não há verificação automática de licença.

### Identidade, duplicidades e importação

As identidades técnicas são exatamente as do v1: campos técnicos, fontes e referências normalizadas, versões e seu grafo. A fotografia fica fora da identidade técnica; uma mudança de UUID local ou a ausência de imagem opcional não duplica uma receita tecnicamente idêntica. Referências textuais diferentes constituem conteúdo diferente e preservam famílias independentes, mesmo com nomes iguais. Uma alteração na composição técnica da família inteira continua podendo gerar uma família independente, conforme a regra anterior.

Na confirmação:

- Conteúdos idênticos reutilizam registros locais; fotografias existentes são sempre mantidas. A prévia informa quantas famílias já têm imagem.
- Uma família idêntica sem fotografia pode receber a imagem sob a confirmação da importação. Parâmetros, fontes, IDs e versões permanecem iguais.
- Conteúdos novos recebem UUIDs locais e vínculos reconstruídos. Um mesmo hash de imagem usado por várias famílias novas do arquivo recebe uma única identidade de mídia preparada.
- Reimportar o mesmo arquivo não duplica versões nem fotografias. Arquivos v1 anteriores continuam reconhecíveis pela mesma identidade técnica, inclusive quando uma importação v2 acrescenta sua imagem ausente.
- Famílias técnicas idênticas selecionadas para uma exportação são consolidadas pela identidade anterior. Se possuírem imagens diferentes, a primeira família na ordenação de IDs locais fornece a apresentação; imagens sem vínculo na projeção resultante são excluídas.

Todas as imagens declaradas são verificadas por tamanho, hash, assinatura de formato e, no navegador/WebView, decodificação e dimensões. O limite de seleção/importação é 15 MiB por fotografia e 40 megapixels. O seletor existente converte as imagens escolhidas para JPEG de até 1.600 px. A importação conserva os bytes recebidos, sem download ou recompressão automática.

As imagens novas são gravadas sob identidades novas e relidas por SHA-256 antes da transação que publica os vínculos. Uma falha de banco reverte os registros; a limpeza confere referências atuais antes de remover os arquivos preparados. Uma morte do processo antes do commit pode deixar arquivos órfãos, mas não receitas apontando para arquivos que ainda não foram preparados. A rotina existente de limpeza pode retirar esses órfãos posteriormente. Não se presume uma transação conjunta entre SQLite e filesystem.

Um plano de prévia desatualizado é recusado. A importação não escreve cafés, pacotes, estoque, preparações, avaliações, reflexões, sessões ou preferências do destinatário. Fotografias ausentes, inválidas ou não declaradas nunca são ignoradas silenciosamente.

## Compatibilidade

| Arquivo | Aplicativo 0.7.2 | Aplicativo 0.7.1 |
| --- | --- | --- |
| `personal-full v1` | Lê e restaura | Lê e restaura |
| `personal-full v2` | Lê e restaura | Recusa a versão |
| `library-share v1` | Importa | Importa |
| `library-share v2`, com ou sem imagens | Importa | Recusa a versão |
| Versão futura desconhecida | Recusa | Recusa |

As fixtures sintéticas `src/transfer/fixtures/personal-v1.zip` e `library-v1.zip` foram emitidas pelo código anterior às alterações da Fase 07.2. Os testes leem esses arquivos sem regenerá-los com o novo exportador.
