# Fase 07.3 — Capturas e evidências

**O catálogo oficial 1 foi consolidado a partir do ZIP aprovado pelo responsável:** 8 métodos, 6 técnicas, 8 famílias e 8 versões. As seis imagens da fonte foram omitidas por falta de autorização de redistribuição. As capturas com prefixo `official-` mostram esse catálogo real; as demais registram a preparação anterior, com dados sintéticos ou catálogo legado, e não representam o conteúdo padrão atual.

## Catálogo aprovado

| Evidência | Conteúdo |
| --- | --- |
| [Atualização principal autorizada](main-update-validation.json) | Instalação de 0.7.3 / 18 sobre 0.7.2 / 17, assinatura conferida, cópia privada anterior, todas as linhas/metadados e 27 fotografias preservados. |
| [Fonte e preservação](official-source-validation.json) | Comparação canônica integral com o ZIP aprovado, hash, dependências, oito receitas aceitas no preparo guiado, reimportação sem duplicações e preservação de registros pessoais/legados. |
| [Interface oficial](official-web-validation.json) | **144 combinações** de listas/detalhes × Claro/Escuro × 85/100/115% × 320/390/768/1440 px. Sem transbordamento ou exceções. Importação individual e completa, revisão de preparo e persistência após recarga. |
| [Android oficial](official-android-validation.json) | APK sandbox real com as oito receitas, consulta após recarga sem rede simulada no WebView e nenhum acesso à instalação principal. |
| [Build final](build-validation.json) | 182 testes, TypeScript, build web, Capacitor e APKs com o catálogo aprovado; 22 arquivos web idênticos ao `dist` em cada APK. |

| Vista oficial, 390 px / 100% | Claro | Escuro |
| --- | --- | --- |
| Receitas | [Lista](official-recipes-light-100-390.png) | [Lista](official-recipes-dark-100-390.png) |
| Métodos | [Lista](official-methods-light-100-390.png) | [Lista](official-methods-dark-100-390.png) |
| Técnicas | [Lista](official-techniques-light-100-390.png) | [Lista](official-techniques-dark-100-390.png) |
| Receita | [Detalhe](official-recipe-detail-light-100-390.png) | [Detalhe](official-recipe-detail-dark-100-390.png) |
| Método | [Detalhe](official-method-detail-light-100-390.png) | [Detalhe](official-method-detail-dark-100-390.png) |
| Técnica | [Detalhe](official-technique-detail-light-100-390.png) | [Detalhe](official-technique-detail-dark-100-390.png) |

Também: [antes de importar](official-item-before-import.png), [já na biblioteca](official-item-after-import.png), [cópia pessoal](official-personal-recipe.png), [revisão de preparo](official-preparation-review.png), receita em 320 px / 115% nos temas [Claro](official-recipe-detail-light-115-320.png) e [Escuro](official-recipe-detail-dark-115-320.png), e consulta Android [da lista](official-android-library.png) e [do detalhe](official-android-detail.png). Nenhuma receita foi executada e nenhum estoque foi consumido durante esses fluxos.

## Evidências históricas da preparação

As telas sintéticas abaixo foram carregadas apenas em memória, sem substituir o catálogo ativo do projeto naquela etapa. A imagem branca de 1 px é uma sentinela de teste, não uma imagem distribuída. As capturas Android antigas mostram o legado antes da consolidação.

| Evidência | Conteúdo |
| --- | --- |
| [Validação web](web-validation.json) | 168 combinações: 7 vistas × Claro/Escuro × 85/100/115% × 320/390/768/1440 px; sem transbordamento ou exceções. Importação real pelo botão React, equivalência, versões e persistência após recarga. |
| [CLI e build sintético](cli-validation.json) | Projeto temporário: geração v1, repetição idempotente, bloqueio de perda de identidade, v2 com imagem autorizada, verificação e imagem copiada ao `dist`. |
| [Validação Android](android-validation.json) | Consulta e recarga da biblioteca sem rede, simulada somente no WebView sandbox. Nenhum acesso à instalação principal. |
| [Build final atual](build-validation.json) | Catálogo aprovado empacotado; ver seção inicial deste índice. |

Capturas selecionadas a 390 px / 100%, com dados sintéticos:

| Vista | Claro | Escuro |
| --- | --- | --- |
| Explorar / receitas | [Lista](recipes-light-100-390.png) | [Lista](recipes-dark-100-390.png) |
| Métodos | [Lista](methods-light-100-390.png) | [Lista](methods-dark-100-390.png) |
| Técnicas | [Lista](techniques-light-100-390.png) | [Lista](techniques-dark-100-390.png) |
| Método | [Detalhe](method-detail-light-100-390.png) | [Detalhe](method-detail-dark-100-390.png) |
| Técnica | [Detalhe](technique-detail-light-100-390.png) | [Detalhe](technique-detail-dark-100-390.png) |
| Receita com sentinela de imagem | [Detalhe](recipe-photo-light-100-390.png) | [Detalhe](recipe-photo-dark-100-390.png) |
| Receita sem imagem | [Detalhe](recipe-no-photo-light-100-390.png) | [Detalhe](recipe-no-photo-dark-100-390.png) |

Também foram capturados [antes da importação](item-before-import.png), [já na biblioteca](item-after-import.png), [cópia pessoal importada](personal-imported-recipe.png) e a receita em 320 px / 115% nos temas [Claro](recipe-photo-light-115-320.png) e [Escuro](recipe-photo-dark-115-320.png). Os detalhes a 390 px foram recapturados após corrigir o espaçamento entre o título da fonte e seu link. As capturas longas incluem a barra inferior fixa na posição do viewport; o restante do conteúdo fica acessível por rolagem.

No Android: [biblioteca offline](android-offline-library.png) e [detalhe offline](android-offline-detail.png). A rede física do aparelho não foi alterada, nenhum preparo foi iniciado e nenhuma coleção foi limpa ou importada na sandbox nesta conferência. O catálogo oficial consolidado e as evidências atuais estão na seção inicial deste índice; a autorização das seis imagens continua pendente.

O [relatório da fase](../../phase-07.3.md) registra implementação, comandos, identificação estável, direitos de imagem, preservação e pendências.
