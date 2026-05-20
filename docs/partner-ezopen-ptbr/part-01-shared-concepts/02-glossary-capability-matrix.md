# Glossário e matriz de capacidades

<!-- source: packages/crawler/docs/sdk/SDK概述及功能对比.md -->

Ao concluir este capítulo, você será capaz de:

- Usar o mesmo vocabulário EZVIZ em Android, iOS e Web ao ler as Partes II–IV.
- Consultar rapidamente se um recurso existe na plataforma alvo antes de prometer ao cliente final.
- Relacionar termos de auth, EZOpen e players sem ambiguidade.

> **Nota de escopo:** a matriz reflete o corpus oficial rastreado no repositório (*data do crawl* em `front-matter.md`). Recursos não listados no SDK da plataforma devem ser tratados como **não suportados** até confirmação com a EZVIZ.

## Glossário

| Termo (EN) | Termo / descrição (pt-BR) | Capítulo relacionado |
|------------|---------------------------|----------------------|
| AppKey | Identificador público do aplicativo na Open Platform | [01-auth](01-auth.md) |
| AppSecret | Segredo do aplicativo; uso **somente servidor** | [01-auth](01-auth.md) |
| accessToken | Token de acesso à APIs e players na sessão | [01-auth](01-auth.md) |
| authAddr / URL de auth | Endpoint do centro de autenticação | [01-auth](01-auth.md) |
| openAddr / URL de domínio | API e contexto de negócio/streaming | [01-auth](01-auth.md), [00-ezopen](00-ezopen-protocol.md) |
| DeviceSerial | Número de série do dispositivo | [00-ezopen](00-ezopen-protocol.md) |
| CameraNo / channel | Número do canal da câmera | [00-ezopen](00-ezopen-protocol.md) |
| EZOpen URI | Endereço lógico `ezopen://…` do fluxo | [00-ezopen](00-ezopen-protocol.md) |
| verificationCode / código de verificação | Credencial opcional antes do host (`code@open.ezviz.com`) para câmeras criptografadas | [00-ezopen](00-ezopen-protocol.md#câmeras-com-criptografia-código-de-verificação) |
| `.live` | Sufixo de preview / tempo real | [00-ezopen](00-ezopen-protocol.md) |
| `.rec` | Sufixo de gravação / playback | [00-ezopen](00-ezopen-protocol.md) |
| `begin` / `end` | Parâmetros de janela em `.rec` (`yyyyMMddHHmmss`) | [00-ezopen](00-ezopen-protocol.md) |
| Cloud playback | Reprodução de gravação na nuvem | Matriz abaixo; Partes II–IV § playback |
| Local playback | Reprodução de cartão SD / local | Nativo; **não** Web v1 |
| PTZ | Pan/tilt/zoom — controle de gimbal | Partes II–IV § device control |
| Talk / intercom | Áudio bidirecional com o dispositivo | Onde confirmado na matriz |
| Capture / snapshot | Captura de imagem do quadro atual | Onde confirmado na matriz |
| Mosaic / multi-preview | Vários streams simultâneos | Parte V + cap. 05 por plataforma |
| EZUIKit | SDK Web canônico deste guia (`ezuikit-js`) | Parte IV |
| DOM container | Elemento HTML onde o player Web é montado | Parte IV; [00-ezopen](00-ezopen-protocol.md) |
| streamToken (restrito) | Token de fluxo de menor escopo (opcional) | Corpus EZUIKit; fora do happy path v1 |

## Matriz resumida por plataforma

Legenda: **Sim** = descrito no corpus/SDK alvo deste guia; **Não** = não aplicável ou não documentado para a plataforma; **Parcial** = suporte limitado ou via outro SDK (ex.: 标准流 Web fora do escopo ADR-003).

Base: visão geral do SDK EZVIZ (*SDK概述及功能对比*) e escopo v1 do guia (playback na nuvem no Web; playback SD e provisioning apenas nativos).

| Módulo / capacidade | Android | iOS | Web (EZUIKit) |
|---------------------|---------|-----|---------------|
| Registro / auth Open Platform | Sim | Sim | Sim |
| Preview ao vivo (`.live`) | Sim | Sim | Sim |
| Montagem explícita `ezopen://` pelo integrador | Parcial (helpers SDK) | Parcial | **Sim (obrigatório)** |
| Container / view de player | View SDK | View SDK | **DOM do parceiro** |
| Playback nuvem (`.rec` + janela) | Sim | Sim | Sim (v1) |
| Playback local (SD) | Sim | Sim | **Não** (v1) |
| Controle PTZ | Sim* | Sim* | Conforme API EZUIKit* |
| Captura (snapshot) | Sim* | Sim* | Conforme API EZUIKit* |
| Intercom / talk | Sim* | Sim* | Conforme API EZUIKit* |
| Mosaico multi-câmera | Sim | Sim | Sim (1 URL + 1 container por célula) |
| Configuração Wi-Fi / provisioning | Sim | Sim | **Não** (nativo; ver Partes II–III) |
| Mensagens / alarmes push | Sim | Sim | Não no escopo Web deste guia |
| Capacidades de dispositivo (lista, firmware, etc.) | Sim | Sim | Não (foco em player) |

\*Confirme na Parte da plataforma e no dispositivo real; a matriz oficial lista dezenas de sub-recursos — este guia documenta **PTZ, captura e talk** onde o corpus da plataforma confirma.

### Módulos de alto nível (corpus oficial)

| Módulo | Android | iOS | 轻应用 Web (EZUIKit) |
|--------|---------|-----|----------------------|
| Capacidades de dispositivo | Sim | Sim | Não |
| Preview | Sim | Sim | Sim |
| Intercom | Sim | Sim | Sim |
| Playback local | Sim | Sim | Sim (player); **guia v1 Web: não documentar** |
| Playback armazenamento nuvem | Sim | Sim | Sim |
| Gravação nuvem 2.0 | Sim | Sim | Sim / parcial |
| Mensagens | Sim | Sim | Não |
| Provisioning / rede | Sim | Sim | Não |
| LAN device | Sim | Sim | Não |

## Paridade Web vs nativo (decisões v1)

| Tópico | Nativo (Android/iOS) | Web (EZUIKit) |
|--------|----------------------|---------------|
| URI EZOpen | Entender regras; SDK pode auxiliar | Construir e passar string completa |
| Token | accessToken no SDK | `accessToken` no construtor do player |
| Playback SD | Documentado | **Não documentar** |
| Wi-Fi setup | Documentado | Capítulo Web aponta para Partes II–III |
| Mosaico | Várias views SDK | Vários containers DOM + várias URIs |

## Como usar esta matriz no projeto

1. **Planejamento de produto** — se o requisito é playback SD ou provisioning, priorize app nativo.
2. **Arquitetura Web** — reserve um container e uma URI `ezopen://` por tile de mosaico.
3. **Auth** — configure URL de domínio/auth no SDK (e `domain` no Web, se aplicável) antes de desenvolver UI de vídeo; URIs EZOpen usam host `open.ezviz.com`.
4. **Revisão técnica** — compare implementação com a Parte da plataforma (II, III ou IV).

## Referências cruzadas

- [EZOpen](00-ezopen-protocol.md) — formato de URI e host fixo `open.ezviz.com`
- [Autenticação](01-auth.md) — credenciais
- Parte V — mosaico e desempenho: `part-05-best-practices/01-mosaic-performance.md`

## Checklist de verificação (fechamento)

- [ ] Identifiquei a plataforma alvo e confirmei preview + tipo de playback necessários.
- [ ] Se o escopo inclui SD ou Wi-Fi, confirmei que não é só Web.
- [ ] Para mosaico Web, planejei N containers e N URIs `ezopen://`.
- [ ] Termos deste glossário batem com os capítulos de implementação escolhidos.
