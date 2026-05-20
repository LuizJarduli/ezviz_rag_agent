# Controle de dispositivo (Android)

<!-- source: packages/crawler/docs/sdk/Android SDK/Android 设备能力/云台控制.md -->
<!-- source: packages/crawler/docs/sdk/Android SDK/Android 设备能力/对讲.md -->
<!-- source: packages/crawler/docs/sdk/Android SDK/Android 设备能力/抓图.md -->

Ao concluir este capítulo, você será capaz de:

- Implementar **PTZ**, **captura (snapshot)** e **intercom (talk)** no Android quando o dispositivo e o SDK suportarem.
- Acionar controles a partir da tela de preview com feedback claro ao usuário.
- Evitar controles em player já liberado ou com token inválido.

> **Escopo v1 (ADR-005):** PTZ, captura e talk documentados **onde o corpus/SDK confirmam**. Consulte [matriz de capacidades](../part-01-shared-concepts/02-glossary-capability-matrix.md) antes de prometer ao cliente final.

## Pré-requisitos

- [Preview ao vivo](02-live-preview.md) ativo ou player em estado `playing`.
- Permissão `RECORD_AUDIO` se usar talk.
- Dispositivo com hardware suportado (PTZ motorizado, microfone no equipamento, etc.).

## Controles no escopo v1

| Controle | Comportamento do usuário | Feedback esperado |
|----------|--------------------------|-------------------|
| **PTZ** | Gestos ou botões direcionais (cima/baixo/esquerda/direita, zoom) | Movimento da imagem; limite ao atingir fim de curso |
| **Captura** | Botão “foto” / snapshot | Imagem salva em galeria ou buffer retornado ao app |
| **Talk / intercom** | Pressionar para falar (push-to-talk ou toggle) | Áudio bidirecional; indicador de microfone ativo |

Controles **fora** do escopo deste guia v1 (podem existir no SDK mas não são obrigatórios aqui): firmware OTA, configuração avançada de alarmes, operação remota de canal não vinculado ao player atual.

## PTZ

1. Inicie preview estável no canal alvo.
2. Chame APIs de PTZ do SDK (direção contínua ou passo, conforme documentação da versão).
3. **Pare** movimento ao soltar o botão (evita motor travado em alguns modelos).
4. Em mosaico, PTZ geralmente aplica-se apenas à **célula em foco** — não envie comando PTZ para players em background sem intenção.

Falhas: dispositivo sem PTZ (desabilitar UI); preview não iniciado (não enviar comando).

## Captura (snapshot)

1. Com stream ativo, invoque API de captura do frame atual.
2. Persista o arquivo conforme política do app (MediaStore, storage privado).
3. Informe sucesso ou erro (armazenamento cheio, stream não pronto).

Não capture em loop rápido sem throttle — pressão de I/O e memória.

## Intercom (two-way talk)

1. Solicite permissão de microfone em runtime (Android 6+).
2. Inicie talk **após** preview com áudio estabelecido (ordem conforme SDK).
3. Encerre talk ao sair da tela ou antes de `stop` do player.
4. Em mosaico, **um** talk por vez — parar talk da célula anterior ao focar outra.

Falhas: dispositivo sem microfone; outro cliente já em talk; token inválido.

## Web vs Android (expectativa)

| Controle | Android (este capítulo) | Web (Parte IV) |
|----------|-------------------------|----------------|
| PTZ | Sim* | Conforme EZUIKit* |
| Captura | Sim* | Conforme EZUIKit* |
| Talk | Sim* | Conforme EZUIKit* |

\*Confirme no dispositivo real e na versão do SDK.

## Referências cruzadas

- [Preview](02-live-preview.md) — pré-requisito de stream
- [Mosaico](05-mosaic.md) — qual célula recebe PTZ/talk
- [Segurança](../part-05-best-practices/03-security.md) — permissões e logs

## Checklist de verificação (fechamento)

- [ ] UI de PTZ/captura/talk oculta quando o dispositivo não suporta.
- [ ] Talk solicita permissão de microfone e encerra ao sair da tela.
- [ ] Nenhum comando enviado após `release` do player.
- [ ] Matriz de capacidades revisada com o modelo de câmera do parceiro.
