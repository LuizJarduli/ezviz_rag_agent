# Reprodução (iOS)

<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 回放/回放.md -->
<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 回放/SD卡录像封面.md -->
<!-- source: packages/crawler/docs/sdk/iOS SDK/iOS 回放/暂停恢复.md -->

Ao concluir este capítulo, você será capaz de:

- Diferenciar **playback na nuvem** (`.rec`) e **playback local (cartão SD)** no iOS.
- Iniciar, pausar/retomar e liberar o player para cada modo.
- Montar janelas de tempo em URIs `.rec` conforme [Part I](../part-01-shared-concepts/00-ezopen-protocol.md).
- Tratar gravações indisponíveis ou criptografadas em nível de produto.

> **Escopo v1 (ADR-005):** iOS documenta **nuvem** e **local (SD)** onde o SDK oficial suporta. Web documenta apenas nuvem — ver [matriz](../part-01-shared-concepts/02-glossary-capability-matrix.md).

## Pré-requisitos

- [Autenticação](01-auth.md) e familiaridade com [preview](02-live-preview.md).
- Dispositivo com gravação na nuvem ativada **e/ou** cartão SD com clipes, conforme o caso de uso.
- UI para seleção de data/hora ou lista de gravações (conforme APIs do SDK).

## Tipos de playback

| Tipo | URI / API típica | Onde os dados vivem |
|------|------------------|---------------------|
| **Nuvem (cloud)** | `ezopen://open.ezviz.com/{serial}/{channel}.rec?begin=…&end=…` | Serviço de gravação na nuvem EZVIZ |
| **Local (SD)** | APIs de playback local / cartão do SDK | Cartão no dispositivo |
| **Preview** | `.live` | Não é playback — ver capítulo 02 |

### Playback na nuvem (`.rec`)

```text
ezopen://open.ezviz.com/{deviceSerial}/{channel}.rec?begin=yyyyMMddHHmmss&end=yyyyMMddHHmmss
```

> **Exemplo (placeholders):** `ezopen://open.ezviz.com/C12345678/1.rec?begin=20250414080000&end=20250414100000`

Passos:

1. Obter lista de gravações na nuvem (SDK/API) ou deixar o usuário escolher intervalo.
2. Validar que `begin` ≤ `end` e formato de 14 dígitos.
3. Passar URI `.rec` ao player (ou parâmetros equivalentes).
4. Exibir estados: carregando, reproduzindo, pausado, erro.

O corpus iOS também cobre **pause/resume**, **seek por progresso** e **velocidade** — use as APIs da sua versão sem misturar com pipeline de preview ao vivo.

### Playback local (cartão SD)

1. Confirmar que o dispositivo reporta SD presente e gravações disponíveis (incluindo capa de clipe SD quando aplicável).
2. Usar o fluxo de **playback local** documentado no SDK (busca por data, arquivo por arquivo).
3. **Não** reutilizar URI `.rec` de nuvem para conteúdo SD — são pipelines distintos.

Comportamento esperado para o usuário:

- Se não houver clipe no intervalo: mensagem clara (“sem gravação neste período”).
- Se a gravação estiver criptografada: solicitar senha/fluxo oficial do dispositivo.

## Trocar preview ↔ playback

1. **Parar** o player de preview (`.live`).
2. Montar nova URI `.rec` (ou iniciar modo local).
3. Reutilizar a **mesma view** somente após `stop` completo — evita dois decoders na mesma superfície.

## Ciclo de vida

| Ação | Recomendação |
|------|----------------|
| Iniciar playback | Uma instância de player por tela (salvo mosaico de gravações — fora do escopo v1 típico) |
| Pausar | API de pause do SDK; manter token válido em sessões longas |
| Seek / mudar clipe | Parar → nova URI ou API de seek conforme documentação |
| Sair da tela | `stop` + liberar player — mesmo rigor que preview |

## Modos de falha

| Sintoma | Causa provável |
|---------|----------------|
| `.rec` sem vídeo | Janela `begin`/`end` sem gravação; fuso horário |
| SD não lista arquivos | Cartão ausente, não formatado, ou gravação desligada |
| Erro de decrypt | Gravação protegida — fluxo de senha do dispositivo |
| Mesmo erro com URI correta | Token expirado durante playback longo |

## Referências cruzadas

- [Referência EZOpen](../part-01-shared-concepts/00-ezopen-protocol.md) — `.rec`, `begin`, `end`
- [Visualização ao vivo](02-live-preview.md) — `.live`
- [Matriz de capacidades](../part-01-shared-concepts/02-glossary-capability-matrix.md) — local vs nuvem

## Checklist de verificação (fechamento)

- [ ] Produto define se oferece nuvem, SD ou ambos.
- [ ] URIs `.rec` usam `begin`/`end` válidos para nuvem.
- [ ] Fluxo SD usa APIs locais, não URI de nuvem por engano.
- [ ] Troca live → rec para stream anterior antes do novo.
- [ ] Player liberado ao sair da tela de playback.
