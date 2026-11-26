# Segurança dos dados — análise para o Play Console

Revisão técnica: 25/11/2026, candidata 1.0.0 / 19. Responsável: Danilo Queiroz Barbosa, daniloqb@gmail.com. Este documento prepara respostas; não preenche nem envia o formulário. Revalidar no pacote exato distribuído e após qualquer atualização de dependências.

## Critérios utilizados

O [formulário oficial Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en) distingue tratamento somente no dispositivo de coleta (transmissão para fora dele). A definição de compartilhamento contempla transferência para outros aplicativos, com exceções específicas, incluindo ações voluntárias iniciadas pelo usuário e razoavelmente esperadas. Não confundir ausência de coleta automática com ausência de dados pessoais armazenados ou de exportações.

## Inventário e finalidade

| Dados/fluxo | Onde e finalidade | Transmissão e controle |
| --- | --- | --- |
| Cafés, produtores/origens, pacotes, estoque, compras e notas | SQLite Android / IndexedDB web, diário e coleção | Sem envio automático identificado nos fluxos auditados |
| Métodos, técnicas, receitas/versionamento, links | Mesmo armazenamento, consulta e preparo | Biblioteca oficial embarcada; referências abertas por escolha no navegador |
| Preparações, avaliações sensoriais, reflexões, jornada/descobertas | Local, acompanhamento pessoal | Sem servidor do desenvolvedor |
| Fotografias selecionadas | Arquivos privados Android; armazenamento local web | Sem acesso amplo a fotos; exportação escolhida pelo usuário |
| Tema, fonte, avisos e estado do preparo | Preferências e dados locais | Sem analytics identificado |
| Backup pessoal ZIP | Arquivo escolhido em SAF/compartilhamento | Pode conter todos os registros/fotos/preferências; sem criptografia própria; destino escolhido pelo usuário |
| Biblioteca ZIP | Seleção de métodos/técnicas/receitas e imagens opcionais | Exclui automaticamente coleção/estoque/histórico/reflexões; texto livre ainda pode conter dados pessoais |
| E-mail de suporte | Caixa de e-mail do responsável/provedores | Só quando a pessoa envia mensagem; remetente/conteúdo para atendimento |
| Página pública e referências externas | GitHub/navegadores/serviços externos | Requisição iniciada pelo usuário; serviços tratam metadados segundo políticas próprias |

## Dependências e permissões

Auditados imports/call sites de React, Capacitor, SQLite, Filesystem, fflate e plugins locais DataFiles, ReferenceLinks, Preparation, Appearance. Não foram encontrados SDK de anúncios, Firebase, análise de uso, identificador publicitário, autenticação ou sincronização. Foi removido o scaffolding Gradle de Google Services não utilizado. Fontes são locais. O fetch de imagens da biblioteca oficial lê assets locais.

Filesystem e SQLite contêm capacidades opcionais de download/rede; os fluxos implementados não as invocam. A presença de INTERNET é declarada; não se infere ausência absoluta de tráfego a partir de grep. A verificação de runtime cobre apenas os cenários descritos no relatório da fase, não todos os comportamentos possíveis do SO/terceiros ou futuras versões.

A permissão biométrica vinha de AndroidX transitivo, sem uso no app, e foi removida no merge. Não há acesso amplo a arquivos/fotos, câmera, microfone, localização, contatos, notificações ou wake lock. A permissão de assinatura interna DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION não é um acesso a dados do usuário. FileProvider é privado, com URI temporária de leitura para cache/data-sharing/. Acordar/manter tela no preparo usa flag da janela; avisos usam áudio/feedback tátil em primeiro plano.

## Respostas propostas, condicionadas à auditoria do pacote final

| Campo do Console | Resposta preparada / fundamento |
| --- | --- |
| App coleta ou compartilha tipos obrigatórios a declarar? | **Não**, para os fluxos locais atuais, sem transmissão automática observada. Exportações voluntárias específicas e abertura de referências devem ser confrontadas com as exceções do formulário; não descrever isso como proibição de compartilhamento. Confirmar no pacote de produção. |
| Categorias coletadas | Nenhuma selecionada, se a condição anterior for confirmada. Fotos, diário e compras locais não são coleta pelo desenvolvedor apenas por existirem no dispositivo. |
| Criptografia em trânsito | Seguir os campos exibidos para apps sem coleta. Não marcar “sim” para criptografia de dados locais/ZIP; ela não existe. Caso o Console peça resposta aplicável a algum tráfego real, avaliar cada destino, inclusive links HTTP aceitos pelo usuário. |
| Exclusão de dados | Controles locais, exclusão de registros onde oferecida, limpar dados/desinstalar; cópias exportadas continuam no destino. Pedidos sobre suporte via e-mail. Não oferecer um endpoint fictício de exclusão remota. |
| Conta e exclusão de conta | Sem criação/login de conta no aplicativo. Requisito específico de exclusão de conta não se aplica enquanto isso permanecer verdadeiro. |
| Revisão independente de segurança | Não realizada; não reivindicar selo/certificação. |
| Política | HTML e cópia local preparados; URL pública ainda pendente de publicação autorizada e verificação. |

Se um formulário futuro exigir declarar suporte/e-mail, hosting ou novo SDK como coleta atribuível ao app, revisar a avaliação e o texto antes do envio, em vez de repetir respostas automaticamente. Não habilitar analytics, crash reporting, Firebase ou cloud sync sem reavaliar política e Data Safety.

## Retenção, proteção e direitos

Dados locais permanecem sob controle do usuário. Banco sem criptografia própria; ZIP sem criptografia; isolamento Android, validação de importação e hashes de transferência não equivalem a criptografia. Backup automático Android está desabilitado. A desinstalação não elimina cópias externas. Suporte retém mensagens conforme necessidade de atendimento e obrigações aplicáveis, com canal para solicitação. O responsável não pode executar exclusão remota de um banco que nunca recebeu.

A política apresenta direitos na medida aplicável, com base no [art. 18 da LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm), sem prometer conformidade jurídica integral. A base e os prazos concretos de eventuais tratamentos de suporte devem ser avaliados conforme o caso pelo responsável.

Pendências: revisão final do responsável; publicação/URL; verificação do AAB assinado e comportamento do pacote distribuído via Play; confirmação no Console de todos os campos efetivamente apresentados. Reavaliar SDK/permissões se houver qualquer divergência.
