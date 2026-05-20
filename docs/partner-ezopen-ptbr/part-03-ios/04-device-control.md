# Controle de dispositivo (iOS)

<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 预览/云台.md -->
<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 预览/截图抓图.md -->
<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 对讲/对讲.md -->

Ao concluir este capítulo, você será capaz de:

- Implementar **PTZ**, **captura (snapshot)** e **intercom (talk)** no iOS quando o dispositivo e o SDK suportarem.
- Acionar controles a partir da tela de preview com feedback claro ao usuário.
- Evitar controles em player já liberado ou com token inválido.

> **Escopo v1 (ADR-005):** PTZ, captura e talk documentados **onde o corpus/SDK confirmam**. Consulte [matriz de capacidades](../part-01-shared-concepts/02-glossary-capability-matrix.md) antes de prometer ao cliente final.

## Pré-requisitos

- [Preview ao vivo](02-live-preview.md) ativo ou player em estado reproduzindo.
- Permissão de microfone no `Info.plist` + prompt do sistema se usar talk.
- Dispositivo com hardware suportado (PTZ motorizado, microfone no equipamento, etc.).

## Controles no escopo v1

| Controle | Comportamento do usuário | Feedback esperado |
|----------|--------------------------|-------------------|
| **PTZ** | Gestos ou botões direcionais (cima/baixo/esquerda/direita, zoom) | Movimento da imagem; limite ao atingir fim de curso |
| **Captura** | Botão “foto” / snapshot | Imagem salva em Fotos ou buffer retornado ao app |
| **Talk / intercom** | Pressionar para falar (push-to-talk ou toggle) | Áudio bidirecional; indicador de microfone ativo |

Controles **fora** do escopo deste guia v1: firmware OTA, alarmes avançados, abertura de porta de fechadura via token privado (caso especial documentado no corpus de fechaduras — integração opcional).

## PTZ

1. Inicie preview estável no canal alvo.
2. Chame APIs de PTZ do SDK (direção contínua ou passo, conforme documentação da versão).
3. **Pare** movimento ao soltar o botão.
4. Em mosaico, PTZ aplica-se apenas à **célula em foco**.

Falhas: dispositivo sem PTZ (desabilitar UI); preview não iniciado.

## Captura (snapshot)

1. Com stream ativo, invoque API de captura do frame atual.
2. Persista conforme política do app (álbum de fotos, sandbox do app).
3. Informe sucesso ou erro (armazenamento cheio, stream não pronto).

Não capture em loop rápido sem throttle.

## Intercom (two-way talk)

1. Solicite permissão de microfone quando necessário.
2. Inicie talk **após** preview com áudio estabelecido (ordem conforme SDK).
3. Encerre talk ao sair da tela ou antes de `stop` do player.
4. Em mosaico, **um** talk por vez.

Falhas: dispositivo sem microfone; outro cliente já em talk; token inválido.

## Android vs iOS vs Web (expectativa)

| Controle | iOS (este capítulo) | Android | Web (Parte IV) |
|----------|---------------------|---------|----------------|
| PTZ | Sim* | Sim* | Conforme EZUIKit* |
| Captura | Sim* | Sim* | Conforme EZUIKit* |
| Talk | Sim* | Sim* | Conforme EZUIKit* |

\*Confirme no dispositivo real e na versão do SDK.

## Referências cruzadas

- [Preview](02-live-preview.md) — pré-requisito de stream
- [Mosaico](05-mosaic.md) — qual célula recebe PTZ/talk
- [Segurança](../part-05-best-practices/03-security.md) — permissões e logs

## Checklist de verificação (fechamento)

- [ ] UI de PTZ/captura/talk oculta quando o dispositivo não suporta.
- [ ] Talk solicita permissão de microfone e encerra ao sair da tela.
- [ ] Nenhum comando enviado após liberar o player.
- [ ] Matriz de capacidades revisada com o modelo de câmera do parceiro.
