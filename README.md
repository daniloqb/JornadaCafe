# Minha Jornada pelo Café

Fundação técnica e visual da **Fase 01**: um diário pessoal de cafés especiais, com funcionamento local e uma interface inspirada em cadernos, materiais naturais e no ritual do café.

## Executar no navegador

Requisito: **Node.js 22.12 ou superior** e npm.

```bash
npm ci
npm run dev
```

Abra o endereço indicado pelo Vite, normalmente `http://127.0.0.1:5173`. O IndexedDB requer uma origem válida, como localhost ou HTTPS; não abra o HTML pelo protocolo `file://`.

```bash
npm run typecheck   # TypeScript
npm test            # Três verificações pontuais da persistência
npm run build       # TypeScript e bundle de produção em dist/
npm run preview     # Servir o build localmente
```

## Executar no Android

O projeto nativo já está em `android/`, com identificador `br.com.jornadacafe.app`. Requisitos: **JDK 21**, Android Studio compatível com Capacitor 8 e **Android SDK 36**. O aplicativo suporta Android 7 / API 24 ou superior.

Configure o SDK pelo Android Studio, por `ANDROID_HOME` ou em `android/local.properties` (arquivo local ignorado pelo Git):

```properties
sdk.dir=/caminho/para/Android/Sdk
```

```bash
npm run android:sync    # Build web e sincronização dos assets/plugins
npm run android:open    # Abrir o projeto no Android Studio
npm run android:run     # Sincronizar e executar em aparelho/emulador
```

Para gerar apenas o APK de desenvolvimento, depois de sincronizar:

```bash
cd android
./gradlew assembleDebug
```

No Windows, use `gradlew.bat assembleDebug`. O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`. Após alterações na interface, execute `npm run android:sync` antes de recompilar.

As barras do sistema usam ícones escuros. O Capacitor fornece os insets e o tema aplica áreas seguras no cabeçalho, nas laterais e na navegação inferior. O backup automático Android está desativado nesta fase local.

## Escopo entregue

- Cinco áreas acessíveis sem recarregar a aplicação: Início, Meus Cafés, Preparar, Minha Jornada e Minhas Descobertas.
- Início com ilustração SVG local, acesso ao preparo, resumo sem dados fictícios, estante e jornada recente.
- Estados vazios e espaços visuais para a coleção, futuras receitas, linha do tempo, reflexões e repertório sensorial.
- Pesquisa na coleção vazia e seleção entre grade/lista; o texto e a visualização escolhida permanecem ao navegar entre áreas na mesma sessão.
- URLs com hash preservam a área após recarregar e permitem usar voltar/avançar do navegador. Não há dependência de roteador nem necessidade de regras especiais no servidor.
- Navegação inferior em smartphones e lateral em telas maiores; controles com foco visível, rótulos acessíveis, acesso direto ao conteúdo e respeito à preferência por movimento reduzido.
- Tema centralizado em `src/theme/theme.css`, com a paleta solicitada, Fraunces nos títulos e DM Sans no restante. Fontes WOFF2 latinas e ilustração são incluídas no build, sem serviços externos de carregamento.
- Inicialização local com verificação de escrita/leitura, indicador de carregamento, aviso de falha e nova tentativa.

Não há autenticação, backend, sincronização, dados demonstrativos, cadastro, cronômetro ou receitas. Os espaços futuros estão identificados por texto, sem botões de cadastro inativos.

## Organização

```text
src/
  app/          Estrutura principal e navegação
  components/   Botões, cartão, cabeçalho, campo, estados e avisos
  features/     home, coffees, prepare, journey, discoveries
  domain/       Contrato de armazenamento e validação de versão
  data/         Adaptadores IndexedDB/SQLite e inicialização
  theme/        Tokens, tipografia e layout responsivo
  assets/       Ilustração original em SVG
android/        Projeto nativo Capacitor
public/         Favicon e licenças das fontes
```

### Persistência

As telas dependem apenas do resultado da inicialização. O contrato `LocalStorage` permite inicializar, ler/gravar metadados e fechar a conexão; cada tecnologia fica no seu adaptador.

- **Navegador:** IndexedDB `minha-jornada-pelo-cafe`, versão 1, com apenas o object store `metadata`. As operações aguardam o commit da transação.
- **Android:** SQLite `minha_jornada_pelo_cafe`, versão 1, com apenas a tabela `metadata`, usando `@capacitor-community/sqlite`. O módulo nativo é carregado somente no Android.
- A inicialização escreve e relê `schema-version = 1`. Versões desconhecidas são recusadas sem substituir o metadado. Chamadas simultâneas compartilham a inicialização; falhas liberam uma nova tentativa.
- Não existe fallback em memória. Se o armazenamento falhar, o aplicativo permite explorar as telas e mostra o aviso correspondente.

Não foram antecipados modelos de cafés nem tabelas de domínio. A Fase 02 deverá adicionar suas próprias entidades e migrações. No navegador, os dados pertencem à origem utilizada; limpar os dados do site remove a base. No Android, a base pertence à instalação e é removida ao desinstalar.

## Dependências

Produção: React/React DOM 19, Capacitor Core/Android 8, SQLite Community 8, Lucide React e as fontes locais DM Sans/Fraunces.

Desenvolvimento: TypeScript 5.9, Vite 8, plugin React, Tailwind CSS 4 com plugin Vite, Capacitor CLI, tipos TypeScript, Vitest 5 e fake-indexeddb. O `package-lock.json` fixa as versões resolvidas. Playwright foi utilizado apenas em uma pasta temporária para a verificação manual assistida; não faz parte do projeto.

As fontes são distribuídas sob OFL-1.1; suas licenças estão em `public/licenses/`.

## Verificações da entrega

Executadas em 15/11/2026:

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção | Aprovados |
| Vitest | 3 testes aprovados: persistência ao reabrir, versão incompatível e ausência de IndexedDB |
| Chrome local | Inicialização e cinco áreas aprovadas, sem erros de execução |
| Navegação | CTA de preparo, área ativa, histórico, recarga e preservação de pesquisa/visualização aprovados |
| Responsividade | Cinco áreas verificadas em 320, 390, 768 e 1440 px, sem rolagem horizontal |
| IndexedDB real no Chrome | Base apenas com metadados; versão 1 confirmada após recarga |
| Falha de inicialização e nova tentativa | Verificadas no Chrome com falha controlada |
| SVG e XML Android | Sintaxe validada |
| Capacitor Android | Plataforma adicionada e sincronização concluída |
| APK de desenvolvimento | `assembleDebug` aprovado com JDK 21 / SDK 36 |
| Instalação no aparelho conectado | Aprovada: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` retornou `Success` |
| Execução no aparelho | Pendente: inicialização do aplicativo e do SQLite nativo, navegação e áreas seguras ainda não verificadas |

A instalação foi concluída em uma nova tentativa, após os bloqueios iniciais com `INSTALL_FAILED_USER_RESTRICTED`. O APK de desenvolvimento está instalado no aparelho conectado.

**Pendência:** abrir o aplicativo no aparelho e confirmar a inicialização do SQLite nativo, a navegação entre as cinco áreas e o respeito às áreas seguras. A instalação bem-sucedida não confirma essas verificações de execução. O build apresentou avisos do template/dependências sobre `flatDir`, ferramentas do SDK e stripping da biblioteca SQLCipher, sem impedir a compilação. A versão de produção assinada não faz parte desta fase.

Documentação de referência: [Capacitor Android](https://capacitorjs.com/docs/android), [System Bars e áreas seguras](https://capacitorjs.com/docs/apis/system-bars), [SQLite Community](https://github.com/capacitor-community/sqlite) e [Tailwind com Vite](https://tailwindcss.com/docs/installation/using-vite).
