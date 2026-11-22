# Evidências — Fase 07.2

Todos os registros das capturas são fictícios. Fotografias de teste reutilizam os assets ilustrativos embarcados; nenhuma fotografia ou reflexão da instalação principal foi incluída.

## Interface

| Contexto | Claro | Escuro |
| --- | --- | --- |
| Campos e fotografia | [Novos campos](recipe-fields-light.png) | [Novos campos](recipe-fields-dark.png) |
| Cartões, 390 px / 100% | [Com foto e ícone](list-light-100-390.png) | [Com foto e ícone](list-dark-100-390.png) |
| Limite de 320 px / 115% | [Miniaturas e texto](list-light-115-320.png) | [Miniaturas e texto](list-dark-115-320.png) |
| Detalhe | [Imagem e referência](recipe-detail-light-390.png) | [Imagem e referência](recipe-detail-dark-390.png) |
| Seleção de biblioteca | [Checkbox padrão](library-selection-light.png) | [Checkbox padrão](library-selection-dark.png) |
| Exportação sem fotos | [Resumo](library-preview-without-images-light.png) | [Resumo](library-preview-without-images-dark.png) |
| Exportação com fotos | [Miniaturas](library-preview-with-images-light.png) | [Miniaturas](library-preview-with-images-dark.png) |
| Importação | [Prévia](library-import-preview-light.png) | [Prévia](library-import-preview-dark.png) |
| Receita importada | [Fotografia](imported-recipe-light.png) | [Fotografia](imported-recipe-dark.png) |

[Formulário sem imagem](recipe-form-without-image-light.png), [imagem selecionada antes de salvar](recipe-form-selected-light.png) e [receita sem referência](recipe-without-reference-dark.png). As demais capturas `list-<tema>-<escala>-<largura>.png` cobrem as 24 combinações de listagem.

## Android

[Seleção no formulário](android-photo-selected.png), [receita salva](android-recipe-photo.png), [miniaturas após reabrir](android-reopened-list.png) e [backup pronto](android-personal-ready.png).

[Biblioteca com imagens](android-library-with-images.png), [salvamento concluído](android-library-saved.png), [prévia da importação](android-import-preview.png), [receita importada](android-imported-recipe.png) e [revisão do preparo](android-imported-preparation-review.png).

## Resultados

- [Layouts e fluxos web](web-validation.json): 72 verificações de layout e operações pela interface.
- [Testes automatizados](tests.json): 172 aprovados em 21 arquivos.
- [Backup físico pessoal](android-personal-validation.json): ZIP externo validado e restaurado em IndexedDB isolado com comparação integral.
- [Bibliotecas físicas](android-library-validation.json): arquivos sem/com fotos, projeção técnica e privacidade.
- [Importação física](android-import-validation.json): todas as linhas e imagens existentes preservadas.
- [Referência externa](android-link-validation.json): abertura manual no Firefox e rejeição nativa de esquemas inválidos.
- [Coleção principal](main-preservation.json): comparação integral de registros, metadados, preferências e 16 fotografias.
- [Atualização principal autorizada](main-update-validation.json): instalação de 0.7.2 / 17 com dados e 16 fotografias preservados, incluindo conferência após a primeira abertura.
- [Builds](build-validation.json): identidade, hashes dos APKs e correspondência dos assets com o `dist`.
- [Instrumentação nativa](native-tests.txt): teste real do plugin de transporte e rejeição de URLs inseguras.

ZIPs, backups privados, fixtures de execução e roteiros auxiliares permanecem em `/tmp/jornada072`; os backups privados da instalação principal não fazem parte destas evidências.
