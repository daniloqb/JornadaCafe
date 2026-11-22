## Causa identificada

A falha foi comprovada no `adb logcat` do Redmi 22101316G: **`TransactionTooLargeException` no thread principal ao parar a Activity para abrir o seletor SAF**. Em 21/11/2026, às 13:01:18 do relógio do aparelho, a transação continha **12.322.024 bytes**; o erro se repetiu às 13:04:20, 13:04:51 e 13:05:55. Não foi um diagnóstico de falta de memória.

O `DataFiles.save` original recebia o ZIP inteiro em Base64 e conservava esses dados no `PluginCall` usado por `startActivityForResult`. O código instalado do Capacitor 8.6.2 confirma duas cópias das opções no estado salvo: `Bridge.saveInstanceState` escreve `capacitorLastPluginCallOptions` e `Plugin.saveInstanceState` escreve `_json` em `capacitorLastPluginCallBundle`. Os logs mostram aproximadamente 6,16 MB em cada cópia. O Binder rejeitava esse estado e o Android encerrava o processo.

A geração e a verificação do ZIP antecediam esse ponto. A gravação no documento externo só ocorria no callback do seletor. Um documento criado pelo provedor podia, portanto, permanecer vazio quando o processo que deveria preenchê-lo já havia terminado. Os logs antigos comprovam o crash antes do retorno do seletor; não foi possível atribuir retrospectivamente cada documento vazio individual a um callback específico.

Evidência sanitizada: [crash e mecanismo](previews/phase-07.1/crash-sanitized.txt). Nenhuma foto, reflexão, entidade ou Base64 pessoal foi incluída nas evidências.

## Correção realizada

Mantida a versão **0.7.1 / código 16**, já existente no complemento de limpeza. Esquema **5**, `personal-full v1` e `library-share v1` preservados. Não houve commit ou push.

- `src/transfer/platform.ts`: prepara um arquivo privado pelo plugin, envia blocos sequenciais de até **192 KiB** e chama salvar/compartilhar com token, nome, tamanho e SHA-256. As opções da Activity ficam abaixo de 512 caracteres nos testes, independentemente do tamanho do ZIP. Não há ZIP completo em Base64 no estado da Activity.
- `android/.../DataFilesPlugin.java`: arquivo temporário em cache privado, limite e posição de cada bloco, tamanho positivo e hash conferidos antes de abrir o SAF. A cópia externa usa buffer de **32 KiB**, conta os bytes e fecha os fluxos antes de resolver a promessa. Quando o provedor permite abrir o destino para leitura, verifica seu SHA-256; um conteúdo divergente é recusado.
- Falhas de gravação tentam excluir exclusivamente o documento recém-criado por `ACTION_CREATE_DOCUMENT`. Se a exclusão não for possível, a mensagem informa que pode haver uma cópia vazia ou incompleta. Não há exclusão de documentos preexistentes.
- O cancelamento é um resultado separado, sem mensagem de sucesso. O temporário de salvamento é liberado em `finally`, inclusive nas falhas. Temporários compartilhados permanecem disponíveis ao leitor externo e expiram conservadoramente em uma preparação posterior, após 24 horas. O nome de exibição original é preservado pelo FileProvider.
- A abertura do seletor/compartilhamento tem tratamento de exceção também no thread da interface Android.
- `src/features/settings/DataManagement.tsx`: encerra a mensagem de processamento mesmo se a geração falhar e limpa mensagens anteriores ao salvar ou compartilhar novamente. O tratamento existente de formulário encerra o estado ocupado e apresenta os erros, permitindo nova tentativa.

A construção e a validação do ZIP existentes foram preservadas. A causa estava no transporte e no ciclo de vida Android; não foi feita uma refatoração do compressor. A instrumentação temporária cobriu leitura da coleção, referências e bytes das fotos, serialização, manifesto, compressão, releitura do ZIP, arquivo temporário, seletor, escrita, fechamento e retorno. Foi removida do código após guardar os [marcadores sanitizados](previews/phase-07.1/export-stages-sanitized.txt).

## Integridade

Os arquivos pessoais salvos no Android foram reabertos com o validador completo do aplicativo, incluindo ZIP/CRC, manifesto, tamanhos, SHA-256, contagens, entidades e referências. A comparação abrangeu todos os campos persistidos, versões de receita, preparações, snapshots, correção histórica, estoque/ajustes e reflexões. A restauração foi executada em um IndexedDB isolado com `fake-indexeddb`, seguida de fechamento/reabertura e nova comparação de linhas e hashes de imagens.

No cenário C físico, todas as linhas das **nove tabelas** e os hashes das seis fotografias permaneceram iguais antes/depois de exportar. O snapshot inicial ainda continha o marcador retomável de preferências da restauração de preparação do teste; a inicialização seguinte o consumiu normalmente. Esse marcador é distinguido da igualdade das entidades e não foi atribuído à exportação.

Nenhuma restauração, limpeza, importação, atualização ou alteração de estoque foi executada na instalação principal durante esta correção. Os testes e a instalação do APK corrigido usaram exclusivamente `br.com.jornadacafe.sandbox`. A comparação final de todas as linhas das nove tabelas e dos metadados foi idêntica, assim como os hashes das **16 fotografias**. `integrity_check` retornou `ok`, sem violações de chaves estrangeiras. Veja a [preservação principal](previews/phase-07.1/main-preservation.json). Após cancelamento e exportação da biblioteca, o estado fictício também conservou todas as linhas, metadados e hashes: [comparação da sandbox](previews/phase-07.1/sandbox-preservation.json).

## Validação

| Cenário | Resultado |
| --- | --- |
| A — sem fotografias | ZIP externo **2.857 bytes**, `teste.zip`, salvo manualmente pelo SAF. Manifesto, entidades e restauração isolada aprovados. |
| B — fotografias e histórico | ZIP externo **1.917.593 bytes**, `teste2.zip`, salvo manualmente pelo SAF. Seis identidades lógicas deduplicadas em uma imagem; todos os hashes e entidades conferidos, incluindo restauração isolada. |
| C — maior volume | ZIP externo **13.138.031 bytes**, seis imagens distintas, foto de produtor e café, snapshots históricos e 50 preparações. Salvamento SAF, releitura, hashes e restauração isolada aprovados. |
| D — cancelamento | Seletor SAF aberto com o arquivo maior e cancelado manualmente. Callback `cancelled`, promessa encerrada e nenhum início de escrita externa. |
| E — falha de escrita | Teste Android no plugin real com provedor exclusivo do APK de teste: interrupção após escrita parcial, corrupção na releitura e remoção do documento incompleto. Nenhum sucesso retornado; nova tentativa completou 524.288 bytes. Temporário ausente também foi recusado antes de abrir o seletor. |
| F — biblioteca | ZIP externo **1.181 bytes**, salvo pelo SAF na versão final. Projeção idêntica, manifesto e SHA válidos, apenas os dois membros permitidos, sentinelas pessoais e UUIDs locais ausentes. Importação aditiva preservou os registros pessoais; reimportação reconheceu os quatro itens, incluindo duas versões, sem duplicar. |
| TypeScript e testes | **141 testes em 19 arquivos**, incluindo seis testes novos do transporte Android e regressão da biblioteca; teste nativo instrumentado aprovado. |
| Web e Capacitor | Build e sincronização aprovados. Chunk principal **573,33 kB / 169,31 kB gzip**; permanece o aviso conhecido acima de 500 kB. |
| Android | **BUILD SUCCESSFUL** offline para APK isolado, APK normal e instrumentação. APK normal `br.com.jornadacafe.app`, 0.7.1 / 16, com **22 arquivos web idênticos ao dist**. |

O salvamento físico não foi substituído por um handler JavaScript: o usuário escolheu e confirmou os destinos no SAF do aparelho. CDP foi usado para preparar as coleções fictícias e acionar os controles React de exportação. Os arquivos externos foram localizados pelo MediaStore e copiados com ADB para inspeção integral. A seleção do destino e o salvamento foram manuais porque o aparelho continuou negando `INJECT_EVENTS`, inclusive após a tentativa de liberar a configuração USB.

No cenário C instrumentado, leitura de registros levou aproximadamente 194 ms, leitura de imagens 3.339 ms, serialização 14 ms, compressão 96 ms, releitura do ZIP 359 ms e preparação em partes 2.101 ms. São medidas de uma execução, não um benchmark. Houve captura pontual de memória do processo, sem evidência de OOM; ela não mede o pico do renderer. O mesmo processo permaneceu vivo durante os seletores com fotografias e o arquivo maior.

Evidências: [validação consolidada](previews/phase-07.1/validation.json), [falhas nativas sanitizadas](previews/phase-07.1/native-sanitized.txt), [etapas de exportação](previews/phase-07.1/export-stages-sanitized.txt). Fixtures, ZIPs e roteiros ficaram em `/tmp/jornada071-*`, sem bibliotecas novas no projeto.

## Pendências

Outros provedores de documentos, armazenamento sem espaço físico real, morte deliberada do processo e falha de energia não foram exercitados; a falha de escrita foi simulada em provedor de teste no aparelho. Provedores que recusam a abertura para leitura permitem apenas conferir a quantidade escrita e o fechamento do fluxo; não se afirma releitura nesses casos. O compartilhamento não implica envio confirmado a destinatários.

A correção foi homologada com gravação SAF física no pacote isolado. A atualização do aplicativo principal não faz parte desta validação: foi mantida a instalação existente, e o APK normal ficou disponível para revisão. Não foi iniciada a Fase 08.
