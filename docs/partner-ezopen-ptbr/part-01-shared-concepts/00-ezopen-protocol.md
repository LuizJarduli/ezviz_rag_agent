# Referência do protocolo EZOpen

<!-- source: packages/crawler/docs/sdk/轻应用EZUIKit Web SDK/UIKit SDK 功能API/直播/ezuikit-js 预览.md -->
<!-- source: packages/crawler/docs/sdk/轻应用EZUIKit Web SDK/UIKit SDK 功能API/视频巡检/ezuikit-js 视频巡检.md -->
<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 预览/取流方式.md -->

Ao concluir este capítulo, você será capaz de:

- Montar URIs `ezopen://` válidas para preview ao vivo (`.live`) e reprodução na nuvem (`.rec`).
- Incluir o **código de verificação** antes do host (`ezopen://{code}@open.ezviz.com/...`) quando o dispositivo ou o fluxo exigir criptografia.
- Usar **`open.ezviz.com`** como host fixo no esquema EZOpen; no Web, configurar URL de domínio em **propriedade separada** do player quando o contrato exigir.
- Diferenciar o que o SDK nativo costuma encapsular do que o integrador Web **deve** fornecer (URL + token + container DOM).
- Validar endereços antes de chamar o player e reconhecer falhas típicas de formato.

## O que é EZOpen

O esquema **`ezopen://`** identifica um fluxo de vídeo (preview ou gravação) para os players dos SDKs EZVIZ. Não substitui a URL HTTP da sua página nem a URL de autenticação da Open Platform — é o **endereço lógico do stream** passado ao construtor do player junto com o `accessToken` (ou token de fluxo restrito, quando aplicável).

| Conceito | Papel |
|----------|--------|
| `ezopen://` | Esquema fixo; sinaliza endereço de mídia EZVIZ |
| `{verificationCode}@` | **Opcional** — código de verificação do dispositivo (câmeras com criptografia); fica **antes** do host, separado por `@` |
| `open.ezviz.com` | Host fixo do esquema EZOpen (não use o hostname da URL de domínio do SDK na URI) |
| `{deviceSerial}` | Número de série do dispositivo na conta |
| `{channel}` | Canal lógico da câmera (geralmente `1` em dispositivos de canal único) |
| Sufixo `.live` / `.rec` | Tipo de fluxo: tempo real vs gravação |
| Query em `.rec` | Janela de tempo (`begin`, `end`) para playback na nuvem |

## Anatomia da URI

Forma geral (sem criptografia no dispositivo):

```text
ezopen://open.ezviz.com/{deviceSerial}/{channel}.{tipo}[?parametros]
```

Com **código de verificação** (câmera ou gravação criptografada):

```text
ezopen://{verificationCode}@open.ezviz.com/{deviceSerial}/{channel}.{tipo}[?parametros]
```

O trecho `{verificationCode}@` é a credencial de desbloqueio do fluxo — sintaxe de *userinfo* em URL (`código@host`), **não** faz parte do hostname. Omita-o inteiro (`…//open.ezviz.com/…`) quando o dispositivo não exigir código.

| Segmento | Descrição |
|----------|-----------|
| `{verificationCode}@` | Opcional; código de verificação EZVIZ (ex.: etiqueta do dispositivo). Obrigatório quando o stream está criptografado |
| `open.ezviz.com` | Host fixo do protocolo EZOpen |
| `{deviceSerial}` | Serial EZVIZ do dispositivo |
| `{channel}` | Número do canal (inteiro; na documentação oficial também aparece como *CameraNo*) |
| `{tipo}` | `live` (preview) ou `rec` (gravação / playback na nuvem) |
| `?begin=&end=` | Obrigatório na prática para `.rec` com janela definida; formato `yyyyMMddHHmmss` (14 dígitos, hora local conforme contrato do serviço) |

### Preview ao vivo (`.live`)

Use **`.live`** quando a intenção é vídeo em tempo real. O player solicita o fluxo de preview do canal indicado.

> **Exemplo (placeholders):** `ezopen://open.ezviz.com/C12345678/1.live`

Componentes:

- `open.ezviz.com` — host fixo em todas as URIs EZOpen deste guia.
- `C12345678` — serial fictício; substitua pelo serial real do dispositivo.
- `1` — canal 1.
- `.live` — sufixo de preview.

### Câmeras com criptografia (código de verificação)

Dispositivos com **criptografia de vídeo** ativada exigem o código de verificação na URI. Ele aparece **imediatamente após** `ezopen://` e **antes** de `open.ezviz.com`, no formato `ezopen://{verificationCode}@open.ezviz.com/...`.

| Situação | Forma da URI |
|----------|----------------|
| Dispositivo sem criptografia | `ezopen://open.ezviz.com/{serial}/{channel}.live` |
| Dispositivo com criptografia | `ezopen://{verificationCode}@open.ezviz.com/{serial}/{channel}.live` |

> **Exemplo (placeholders):** `ezopen://YOUR_VERIFY_CODE@open.ezviz.com/C12345678/1.live`

- `YOUR_VERIFY_CODE` — código de verificação definido pelo usuário ou impresso no dispositivo (não confundir com `accessToken`).
- O mesmo prefixo `{verificationCode}@` aplica-se a `.rec` quando a gravação na nuvem estiver criptografada: `ezopen://YOUR_VERIFY_CODE@open.ezviz.com/C12345678/1.rec?begin=…&end=…`.
- No Web, a string completa (incluindo `code@`) vai no parâmetro `url` do EZUIKit, junto com `accessToken`.
- **Não** registre o código de verificação em logs de produção — trate-o como segredo do usuário final (ver [Segurança](../part-05-best-practices/03-security.md)).

### Reprodução na nuvem (`.rec`)

Use **`.rec`** para playback de gravação na nuvem (cloud storage / cloud record). No **Web (EZUIKit)**, o escopo v1 cobre apenas playback na nuvem via `.rec`; playback de cartão SD local é **nativo** (Android/iOS) — ver [matriz de capacidades](02-glossary-capability-matrix.md).

> **Exemplo (placeholders):** `ezopen://open.ezviz.com/C12345678/1.rec?begin=20250414000000&end=20250414120000`

- `begin` — início da janela pesquisável.
- `end` — fim da janela.
- Ambos em `yyyyMMddHHmmss` (ex.: `20250414000000` = 14/04/2025 00:00:00).

Alguns fluxos permitem `.rec` sem query quando o SDK/UI gerencia a busca de lista de gravações; para integração programática explícita no Web, prefira sempre informar `begin` e `end` válidos.

### Alternar de preview para playback

A troca de modalidade é feita **mudando a URI** (e, se necessário, o token de fluxo):

1. Pare ou destrua o player atual (evita vazamento de recursos no Web).
2. Substitua o sufixo `.live` por `.rec` (ou o inverso).
3. Em `.rec`, acrescente ou atualize `begin` e `end`.
4. Passe a nova URL e um `accessToken` ainda válido ao construtor ou a `changePlayUrl` (EZUIKit).

> **Exemplo (placeholders):** de `ezopen://open.ezviz.com/C12345678/1.live` para `ezopen://open.ezviz.com/C12345678/1.rec?begin=20250414080000&end=20250414100000`

## Responsabilidades: nativo vs Web

| Responsabilidade | Android / iOS | Web (EZUIKit) |
|------------------|---------------|---------------|
| Obter `AppKey` / `accessToken` | Parceiro (via backend seguro) | Idem |
| Configurar URL de domínio / auth do ambiente | Parceiro, no `init` do SDK (`apiUrl` / `authUrl` ou equivalente) | **Opcional** — propriedade de domínio **separada** do `url` EZOpen (ex.: `domain` no init/EZUIKit); ver [Auth Web](../part-04-web/01-auth.md) |
| Montar URI `ezopen://` completa | Frequentemente **auxiliado** por APIs do SDK; o parceiro ainda precisa entender serial/canal/token | **Obrigatório** — string explícita no `url` do player, sempre com host `open.ezviz.com` |
| Fornecer superfície de UI / view | SDK fornece view de player; app embute na hierarquia | **Obrigatório** — elemento DOM (`id` / container) com tamanho visível |
| Passar token ao player | `setAccessToken` / equivalente | `accessToken` (ou token restrito conforme doc EZUIKit) |
| Playback SD local | Suportado (v1) | **Fora de escopo** v1 |
| Playback nuvem `.rec` | Suportado | Suportado com `begin`/`end` |

No Web, a sequência esperada é: [autenticação pronta](01-auth.md) → container no DOM → montar EZOpen → criar player → `play` → tratar erros. Detalhes de montagem estão na Parte IV.

## Exemplos comentados

### 1. Preview de canal único

```text
ezopen://open.ezviz.com/C12345678/1.live
```

| Parte | Valor | Nota |
|-------|-------|------|
| Esquema | `ezopen` | Fixo |
| Host | `open.ezviz.com` | Fixo; não substitua pelo hostname da URL de domínio |
| Serial | `C12345678` | Do cadastro do dispositivo |
| Canal | `1` | Confirme capacidade multi-canal do hardware |
| Sufixo | `.live` | Preview |

### 2. Preview com câmera criptografada

```text
ezopen://YOUR_VERIFY_CODE@open.ezviz.com/C12345678/1.live
```

| Parte | Valor | Nota |
|-------|-------|------|
| Código | `YOUR_VERIFY_CODE@` | Antes do host; obrigatório se o dispositivo exige verificação |
| Host | `open.ezviz.com` | Fixo |
| Serial / canal / sufixo | Idem ao preview sem criptografia | |

### 3. Playback na nuvem com janela

```text
ezopen://open.ezviz.com/C12345678/1.rec?begin=20250414000000&end=20250414120000
```

| Parte | Valor | Nota |
|-------|-------|------|
| Sufixo | `.rec` | Gravação |
| `begin` / `end` | 14 dígitos | Mesmo fuso/convenção usado na busca de gravações |

### 4. Troca live → rec (mesmo dispositivo)

Mantenha `open.ezviz.com`, `{deviceSerial}` e `{channel}` (e o prefixo `{verificationCode}@`, se já estava na URI); altere apenas sufixo e query.

## Checklist de validação de URI

Antes de abrir o player, confira:

- [ ] Esquema é `ezopen://` (não `http://` nem `https://`).
- [ ] Host da URI é `open.ezviz.com` (não o hostname da URL de domínio do SDK).
- [ ] Se o dispositivo é criptografado, a URI contém `{verificationCode}@` **antes** de `open.ezviz.com` (não depois do serial).
- [ ] Serial e canal existem na conta autenticada.
- [ ] Preview usa `.live`; playback na nuvem usa `.rec`.
- [ ] Em `.rec` com janela fixa, `begin` ≤ `end` e formato `yyyyMMddHHmmss` (14 caracteres).
- [ ] Não usou `.live` quando a intenção era gravado (sintoma: stream ao vivo ou erro de tipo).
- [ ] No Web, a URI será passada junto com `accessToken` válido ao player — URI sozinha não autentica.

## Erros comuns

| Sintoma provável | Causa frequente |
|------------------|-----------------|
| Stream vazio / erro de auth | Token inválido ou URL de domínio/auth do SDK desalinhada ao contrato (Web: propriedade `domain` separada do `url` EZOpen) |
| Preview falha em câmera criptografada | Código de verificação ausente, incorreto ou colocado após o host em vez de `code@open.ezviz.com` |
| Canal inválido | Número de canal errado ou dispositivo offline |
| Playback sem vídeo | `begin`/`end` fora do intervalo gravado |
| Web: player não aparece | Container ausente, tamanho zero ou player criado antes do DOM |
| Preview quando queria gravado | Sufixo `.live` em vez de `.rec` |

## Referências cruzadas

- Credenciais e ciclo de vida do token: [Autenticação (conceitos compartilhados)](01-auth.md)
- Termos e matriz por plataforma: [Glossário e matriz de capacidades](02-glossary-capability-matrix.md)
- Implementação Web: Parte IV (`part-04-web/02-live-preview.md`, `part-04-web/03-playback.md`)

## Checklist de verificação (fechamento)

- [ ] Consigo montar uma URI `.live` e uma `.rec` com `begin`/`end` para o mesmo dispositivo.
- [ ] Sei quando usar `ezopen://{verificationCode}@open.ezviz.com/...` em dispositivos criptografados.
- [ ] URIs usam `open.ezviz.com`; domínio híbrido (se houver) está na config do SDK/Web, não no host EZOpen.
- [ ] Entendo que no Web devo fornecer container DOM + `ezopen://` + `accessToken`.
- [ ] Revisei o checklist de validação antes de integrar em produção.
