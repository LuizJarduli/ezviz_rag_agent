# Controle de dispositivo (Web)

<!-- source: packages/crawler/docs/sdk/轻应用EZUIKit Web SDK/UIKit SDK 功能API/设备能力/ -->

Ao concluir este capítulo, você será capaz de:

- Aplicar **PTZ** e **captura** via EZUIKit quando o stream estiver ativo.
- Entender limitações Web de **intercom (talk)** em relação ao nativo.
- Evitar comandos em player já destruído ou com token inválido.

> **Escopo v1 (ADR-005):** documentar PTZ, captura e talk **onde o corpus EZUIKit da sua versão confirmar**. Consulte [matriz de capacidades](../part-01-shared-concepts/02-glossary-capability-matrix.md).

## Pré-requisitos

- [Preview ao vivo](02-live-preview.md) em estado reproduzindo (`.live`).
- `accessToken` válido e URI EZOpen do canal alvo.
- UI com botões desabilitados quando o dispositivo não suporta o recurso.

## Controles no escopo v1

| Controle | Web (EZUIKit) | Android / iOS |
|----------|---------------|---------------|
| **PTZ** | Via APIs/métodos do player ou template EZUIKit* | APIs nativas do SDK |
| **Captura (snapshot)** | Método de captura de frame do player* | API nativa de snapshot |
| **Talk / intercom** | **Limitado ou indisponível** em muitas versões Web* | Suportado com `RECORD_AUDIO` / permissão mic |

\*Confirme no dispositivo e na versão `ezuikit-js` integrada. Se talk não existir na API Web, direcione o usuário ao app nativo.

## PTZ (Web)

1. Mantenha preview `.live` estável no container DOM.
2. Invoque controles PTZ expostos pelo EZUIKit (direção, zoom — conforme documentação da versão).
3. **Pare** movimento ao soltar o controle (evita motor em curso contínuo).
4. Em [mosaico](05-mosaic.md), PTZ aplica-se apenas ao **tile em foco** — não envie comando para players em background.

Falhas: dispositivo sem PTZ (ocultar UI); stream não iniciado.

## Captura (snapshot)

1. Com `play()` ativo, chame API de captura do EZUIKit.
2. Ofereça download ou envio ao backend do parceiro (blob/base64 conforme API).
3. Não dispare capturas em loop sem throttle.

## Intercom (talk) — expectativa Web

| Cenário | Recomendação |
|---------|--------------|
| API talk presente no EZUIKit | Solicitar permissão de microfone do browser; encerrar talk ao `destroy()` |
| API talk ausente | Documentar no produto: “intercom disponível no app mobile”; linkar Partes II–III |
| Mosaico | Um talk por vez; parar talk da célula anterior ao focar outra |

Browsers exigem **HTTPS** e gesto do usuário para ativar microfone.

## Web vs nativo (resumo)

| Controle | Android | iOS | Web (este capítulo) |
|----------|---------|-----|---------------------|
| PTZ | Sim* | Sim* | Conforme EZUIKit* |
| Captura | Sim* | Sim* | Conforme EZUIKit* |
| Talk | Sim* | Sim* | Frequentemente **não** ou parcial* |

## Modos de falha

| Sintoma | Verificação |
|---------|-------------|
| PTZ sem efeito | Preview não ativo; dispositivo fixo |
| Captura vazia | Stream ainda carregando |
| Talk falha | Permissão mic negada; recurso não suportado no Web |

## Referências cruzadas

- [Preview](02-live-preview.md) — pré-requisito de stream
- [Mosaico](05-mosaic.md) — célula em foco
- [Segurança](../part-05-best-practices/03-security.md) — HTTPS e tokens

## Checklist de verificação (fechamento)

- [ ] UI de PTZ/captura oculta quando o dispositivo não suporta.
- [ ] Talk Web testado na versão exata do `ezuikit-js` — ou marcado como nativo-only.
- [ ] Nenhum comando após `destroy()` do player.
- [ ] Matriz de capacidades revisada com o modelo de câmera do parceiro.
