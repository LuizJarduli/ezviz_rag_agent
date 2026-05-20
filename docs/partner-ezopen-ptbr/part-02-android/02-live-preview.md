# Visualização ao vivo (Android)

<!-- source: packages/crawler/docs/sdk/Android SDK/Android 预览/预览取流.md -->
<!-- source: packages/crawler/docs/sdk/Android SDK/Android 预览/开始预览.md -->

Ao concluir este capítulo, você será capaz de:

- Exibir preview ao vivo de um canal após sessão autenticada.
- Montar ou validar URI `ezopen://…/{channel}.live` conforme [Part I](../part-01-shared-concepts/00-ezopen-protocol.md).
- Gerenciar ciclo de vida do player (start, stop, teardown ao sair da tela).
- Diagnosticar falhas típicas (token, offline, canal, host).

## Pré-requisitos

- [Autenticação (Android)](01-auth.md) concluída — `accessToken` válido.
- **Serial do dispositivo** e **número do canal** conhecidos (lista de dispositivos do SDK ou backend do parceiro).
- Layout com **superfície de vídeo** (TextureView/SurfaceView ou componente de player documentado no AAR).

## URI EZOpen para preview

Forma (detalhes em [Referência EZOpen](../part-01-shared-concepts/00-ezopen-protocol.md)):

```text
ezopen://open.ezviz.com/{deviceSerial}/{channel}.live
```

| Campo | Origem no app |
|-------|----------------|
| `open.ezviz.com` | Host fixo do protocolo EZOpen |
| `{verificationCode}@` | Opcional — câmera criptografada; ver [EZOpen § criptografia](../part-01-shared-concepts/00-ezopen-protocol.md#câmeras-com-criptografia-código-de-verificação) |
| `{deviceSerial}` | Dispositivo selecionado |
| `{channel}` | Canal lógico (geralmente `1`) |

> **Exemplo (placeholders):** `ezopen://open.ezviz.com/C12345678/1.live`

### SDK monta a URI vs integrador explícito

| Abordagem | Quando usar |
|-----------|-------------|
| **Helper do SDK** | APIs que recebem serial + canal e montam o endereço internamente — comum em telas simples |
| **URI explícita** | Mosaico, troca rápida de canal, ou quando o corpus da sua versão expõe `setPlayUrl` / equivalente |

Em ambos os casos o integrador deve garantir **serial + canal + token + host** coerentes; URI mal formada ou host errado falha mesmo com helper.

## Fluxo feliz (happy path)

1. **Auth pronta** — token validado (lista de dispositivos ou ping leve).
2. **Montar layout** — view de player visível com dimensões > 0.
3. **Obter contexto** — serial e canal do dispositivo escolhido.
4. **Iniciar preview** — criar instância do player, associar à view, passar endereço `.live` (ou parâmetros serial/canal) e token da sessão.
5. **Callback de primeiro frame** — exibir indicador de carregamento até o primeiro frame ou erro.
6. **Parar ao sair** — `stop` + liberar superfície na destruição da tela.

```mermaid
sequenceDiagram
  participant UI as Activity/Fragment
  participant P as Player Android

  UI->>UI: token + serial + canal OK
  UI->>P: criar player + anexar view
  UI->>P: start (.live)
  P-->>UI: primeiro frame / erro
  UI->>P: stop + release (onDestroy)
```

## Ciclo de vida Android

| Callback | Ação no player |
|----------|----------------|
| `onPause` | Política do produto: pausar stream ou manter (economia de bateria vs UX) |
| `onStop` | Recomendado **parar** stream se a tela não estiver visível |
| `onDestroy` | **Obrigatório:** `stop` + `release` / `dispose` do player |
| Troca de dispositivo na mesma tela | Parar player atual antes de iniciar novo serial/canal |

Não navegue para outra Activity mantendo decoder ativo “em cache” sem política explícita — causa vazamento e falha na segunda visita.

## Modos de falha

| Sintoma | Verificação |
|---------|-------------|
| Tela preta, sem erro | View com altura/largura zero; player não anexado |
| Erro de autorização | Token expirado — renovar antes de retentar URI |
| Dispositivo offline | Estado na lista de dispositivos; rede do equipamento |
| Canal inválido | Canal inexistente no NVR/câmera |
| Domínio/auth incorretos | `apiUrl`/auth do SDK desalinhados ao token |
| Sufixo errado | `.rec` usado para intenção de live |

## Áudio no preview

Se o produto exige áudio ao vivo, habilite conforme API do player da sua versão do SDK. Intercom bidirecional é tratado em [Controle de dispositivo](04-device-control.md).

## Referências cruzadas

- [Referência EZOpen](../part-01-shared-concepts/00-ezopen-protocol.md) — `.live`, host, validação
- [Reprodução](03-playback.md) — trocar `.live` por `.rec`
- [Mosaico](05-mosaic.md) — vários previews simultâneos
- [Desempenho e mosaico](../part-05-best-practices/01-mosaic-performance.md) — limites de decoders

## Checklist de verificação (fechamento)

- [ ] Preview só inicia após `accessToken` validado.
- [ ] URI `.live` usa host `open.ezviz.com`.
- [ ] `onDestroy` (ou equivalente) sempre libera o player.
- [ ] Troca de canal/dispositivo para o stream anterior antes do novo.
- [ ] Erros de token disparam renovação, não retry infinito da mesma URI.
