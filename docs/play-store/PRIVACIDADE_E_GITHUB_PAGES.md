# Política de privacidade — publicação por main /docs

Estratégia atual: **Settings → Pages → Deploy from a branch → main → /docs**. Não há workflow de publicação no repositório, nem necessidade de criar token ou acrescentar a permissão `workflow` por esta alteração. Os arquivos são HTML estáticos, com fontes locais; o servidor não precisa de Vite, React, Node ou scripts do projeto.

Responsável: **Danilo Queiroz Barbosa**. Privacidade/suporte: **daniloqb@gmail.com**. A política mantém a vigência e atualização de **25/11/2026**, sem alteração de conteúdo nesta correção.

## Arquivos públicos e sincronização

```text
docs/
  index.html
  politica-de-privacidade.html
  assets/
    fontes/
      dm-sans-latin-wght-normal.woff2
      fraunces-latin-wght-normal.woff2
    licencas/
      DM-Sans-OFL.txt
      Fraunces-OFL.txt
  _config.yml
```

`public/politica-de-privacidade.html` continua sendo a **fonte única do texto**, usada offline nas Configurações do Android. Nome, contato, datas e URL ficam em `config/privacy.json`. O componente e a cópia local não dependem do Pages.

O comando local abaixo copia a política para docs/ e as duas fontes/licenças explicitamente aprovadas. A única transformação do HTML é trocar o caminho relativo `fonts/` por `assets/fontes/`; todo o conteúdo, contato e datas são preservados.

```bash
npm run privacy:site
npm run privacy:check
```

O primeiro comando sincroniza; o segundo apenas verifica e falha se houver divergência ou arquivo não aprovado em docs/assets/. O nome `privacy:site` foi mantido para não quebrar o script de release, mas agora chama `scripts/sync-privacy-docs.mjs`. Não publica nada. Esses comandos só são necessários ao editar os arquivos localmente; os arquivos prontos são versionados e servidos diretamente pelo Pages.

`docs/_config.yml` usa o processamento padrão do Pages para excluir tudo, incluindo os relatórios, previews e referências já existentes, e incluir apenas os dois HTMLs e assets/. Assim a documentação técnica continua no Git, sem virar conteúdo do site. Não criar docs/.nojekyll: isso desativaria essas exclusões. Não colocar dados pessoais, ZIPs, bancos, fotos privadas, chaves ou logs em docs/assets/; a lista de cópia contém apenas fontes públicas e licenças. Essa filtragem do site não torna privados os arquivos que já estão em um repositório público.

O uso de include/exclude segue a [configuração oficial do Jekyll](https://jekyllrb.com/docs/configuration/options/). Não há tema, template Liquid, plugin ou build customizado. O HTML também abre diretamente no navegador sem JavaScript.

## Testar localmente e com subdiretório

Depois de sincronizar:

```bash
python3 -m http.server 4174 --bind 127.0.0.1 --directory docs
```

Abrir `http://127.0.0.1:4174/` e seguir o link da política. Conferir fontes, leitura em smartphone/desktop, zoom, teclado e links. O servidor Python é somente uma prévia local: ele não aplica as exclusões do Pages e deve ficar limitado a 127.0.0.1.

Os links HTML/CSS usam caminhos relativos, sem `/assets/` na raiz do domínio. Por isso funcionam também sob `/JornadaCafe/`. Verificar esse cenário antes de publicar. A página inicial é uma apresentação curta com link para a política; não é o aplicativo web.

## Push rejeitado: histórico local já preparado

Diagnóstico de 25/11/2026, confirmado por consulta remota (`git ls-remote`):

- O remoto estava em **c5fde63b3befcb7ecc78667258bffc4262d86835**.
- O commit local **91b69fa40e9d074fa082ef41e370c67da97edbb1** era o único não publicado e criava `.github/workflows/privacy-pages.yml`; o remoto não tinha o arquivo.
- Apenas excluir o workflow em um segundo commit manteria sua criação no histórico enviado e não resolveria a rejeição do token.

A correção do histórico **já foi preparada**, sem commit/push:

1. Criada a referência local **backup/fase08-antes-pages-docs-91b69fa**, preservando o commit original completo.
2. Colocada no índice a versão final dos arquivos, com a correção de Pages e as demais alterações legítimas da Fase 08.
3. Executado `git reset --soft origin/main`: main agora aponta para c5fde63, mantendo os arquivos e todas as alterações preparadas no índice.
4. Conferido que nenhum workflow aparece no índice relativo ao remoto nem em commits pendentes de main. Hashes dos arquivos da correção e das configurações protegidas foram conferidos.

Não houve reset hard, force push, commit, push ou exclusão do trabalho da Fase 08. Não é necessário repetir o reset. A branch de segurança continua com o commit antigo; não deve ser enviada junto com main.

### Comandos para o responsável enviar

Revisar `git status`, `git diff --cached --stat` e `git diff --cached`. O estado esperado é main em c5fde63 com as alterações da Fase 08/correção preparadas para commit. Se houver outras alterações, revisá-las antes. O bloco abaixo para caso o HEAD/remoto tenham mudado ou haja arquivos rastreados ainda não preparados; nesse caso, reavaliar o estado e integrar contribuições novas sem sobrescrevê-las.

```bash
(
set -e
npm run privacy:check
git fetch origin
test "$(git branch --show-current)" = main
test "$(git rev-parse HEAD)" = c5fde63b3befcb7ecc78667258bffc4262d86835
test "$(git rev-parse origin/main)" = c5fde63b3befcb7ecc78667258bffc4262d86835
test -z "$(git diff --name-only)"
git diff --cached --check
test -z "$(git diff --cached --name-only -- .github/workflows/)"
git diff --cached --stat
git commit -m "Prepara release 1.0.0 e política estática em docs"
test -z "$(git log --format=%H origin/main..HEAD -- .github/workflows/)"
git push origin main
)
```

Usar somente `git push origin main`, sem `--all`, `--mirror` ou `--force`. A referência de segurança conserva o workflow antigo, mas não faz parte da linha de main que será enviada. Se o push falhar por autenticação geral, investigar a causa sem ampliar o token para workflows: esta preparação não cria/modifica esse tipo de arquivo.

Depois de um push bem-sucedido, main e origin/main devem coincidir. O procedimento preserva as alterações legítimas em um novo commit diretamente sobre o remoto, permitindo avanço normal da branch.

## Ativar GitHub Pages

Após o push autorizado:

1. Abrir o repositório **daniloqb/JornadaCafe** no GitHub.
2. Acessar **Settings → Pages**.
3. Em **Build and deployment → Source**, escolher **Deploy from a branch**.
4. Escolher a branch **main** e a pasta **/docs**.
5. Clicar em **Save** e aguardar a disponibilização pelo GitHub.
6. Abrir a URL HTTPS em uma janela anônima e no smartphone, sem autenticação GitHub.

Não selecionar a opção de workflow personalizado. O próprio GitHub pode mostrar uma execução interna de Pages para publicar a branch; isso é administrado pelo serviço e não exige adicionar um arquivo .github/workflows/ ao projeto. O procedimento segue a [documentação oficial de publicação por branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Destinos **esperados**, ainda não confirmados como publicados:

- Início: https://daniloqb.github.io/JornadaCafe/
- Política: https://daniloqb.github.io/JornadaCafe/politica-de-privacidade.html

Na consulta HTTPS realizada nesta correção, **ambos retornaram HTTP 404**. `publicUrl` e `publicUrlVerifiedAt` permanecem null. Não houve alteração da configuração remota do Pages.

## Confirmar e configurar a URL no app e no Play

Depois da publicação, verificar HTTPS/status 200, Content-Type HTML, conteúdo renderizado sem download, ausência de login/404, links/fontes, nome/contato/datas corretos e leitura em celular/desktop/anônimo. Conferir também que caminhos de previews/, references/ e documentos internos não foram publicados.

Somente com sucesso real, preencher `config/privacy.json`:

- `publicUrl`: `https://daniloqb.github.io/JornadaCafe/politica-de-privacidade.html`;
- `publicUrlVerifiedAt`: data ISO real da conferência (não preencher antecipadamente).

Recompilar para habilitar **Abrir versão online** nas Configurações, mantendo a cópia local. Informar a mesma URL no Google Play Console e verificar novamente antes da submissão. Nenhuma configuração de assinatura, versão ou banco muda por causa dessa publicação.

## Atualizações futuras

Editar somente o HTML fonte em public/, ajustar datas em HTML/config quando o conteúdo mudar, executar privacy:site e privacy:check, revisar o diff e então fazer commit/push autorizado. O Pages acompanha a branch/pasta configuradas. Revalidar a URL e manter a política pública coerente com o app distribuído e Data Safety. Não editar a cópia em docs/ isoladamente.
