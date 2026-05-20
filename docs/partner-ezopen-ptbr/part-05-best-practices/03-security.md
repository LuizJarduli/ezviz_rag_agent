# Segurança

<!-- source: packages/crawler/docs/sdk/轻应用EZUIKit Web SDK/安全说明.md (higiene geral); PRD privacy constraints -->

Ao concluir este capítulo, você será capaz de:

- Separar segredos de backend (AppSecret) de credenciais de sessão (`accessToken`) no cliente.
- Aplicar higiene em exemplos, logs e suporte sem vazar tokens reais.
- Atender requisitos mínimos de transporte (HTTPS) e privacidade de vídeo do usuário final.
- Executar checklist de segurança antes de enviar o app a produção ou compartilhar o PDF com terceiros.

## Modelo de confiança

| Ativo | Onde pode existir | Nunca em |
|-------|-------------------|----------|
| **AppKey** | App mobile/Web, variáveis de build não commitadas | Repositório público sem proteção |
| **AppSecret** | Servidor do parceiro, cofre de segredos | App cliente, PDF impresso, ticket de suporte |
| **accessToken** | Memória do app, parâmetro do player, backend | URL compartilhável, analytics de terceiros, screenshot |
| **URI `ezopen://`** | Pode aparecer mascarada em log agregado | Link público sem token ainda válido |
| **Código de verificação** (`code@` na URI) | Entrada do usuário / etiqueta do dispositivo | Logs, analytics, tickets de suporte |

O parceiro é responsável pelo **backend de auth** e pela **política de retenção** de logs. A EZVIZ fornece tokens e streams; a documentação não substitui o contrato de privacidade da Open Platform.

## Tokens e credenciais

### AppSecret (somente servidor)

- Obtenha `accessToken` no servidor com AppKey + AppSecret.
- O app cliente chama **apenas** a API do parceiro; nunca a rota que expõe AppSecret.
- Rotacione AppSecret se houver suspeita de vazamento; invalide tokens emitidos na janela afetada.

### accessToken no cliente

| Plataforma | Prática recomendada |
|------------|---------------------|
| Android / iOS | Guardar em memória ou armazenamento criptografado do SO; renovar antes de `expire` |
| Web | Obter token via backend do parceiro; não embutir token estático em bundle JS |
| Todas | Passar token ao player somente após auth bem-sucedida; limpar ao logout |

Renovação: em mosaico ou playback longo, agende refresh **antes** do vencimento — ver [Autenticação](../part-01-shared-concepts/01-auth.md).

## Higiene de exemplos e documentação

Use **sempre** placeholders em código de exemplo e no PDF entregue ao parceiro:

| Placeholder | Significado |
|-------------|-------------|
| `YOUR_APP_KEY` | AppKey de desenvolvimento |
| `YOUR_ACCESS_TOKEN` | Token de sessão fictício |
| `YOUR_VERIFY_CODE` | Código de verificação de câmera criptografada (não logar em produção) |
| `C12345678` | Serial ilustrativo (não usar serial real de cliente) |

> **Exemplos Emive/híbridos** nos capítulos de auth (`authhybridcloud.emivecloud.com`) são **ilustração de par de endpoints** — não são configuração obrigatória nem credenciais válidas.

### O que não publicar

- Capturas de tela com QR de provisioning contendo senha Wi-Fi.
- Vídeos de demonstração com áudio de ambiente identificável sem consentimento.
- Dumps de rede com `accessToken` completo em ferramentas compartilhadas (Charles, Proxyman export público).

## Transporte e superfície de ataque

- **HTTPS** obrigatório para auth, APIs do parceiro e páginas que embutem EZUIKit.
- **Web:** restrinja origens que podem embutir o player (CSP, iframe policy) conforme sua arquitetura.
- **Deep links** com `ezopen://` não substituem auth — não coloque token na query de deep link customizado do parceiro.

## Privacidade e dados de vídeo

- Informe o usuário final conforme a política de privacidade EZVIZ e a legislação aplicável (LGPD no Brasil).
- Armazenamento local de snapshots/gravações pelo app do parceiro exige base legal e controles de acesso próprios — fora do escopo do SDK, mas obrigatório no produto.
- Em suporte, peça **serial mascarado**, horário do incidente e `correlationId` — não peça vídeo bruto com PII se não for necessário.

## Relação com outros capítulos

| Tema | Onde aprofundar |
|------|-----------------|
| Fluxo de auth e falha de token | [Auth compartilhado](../part-01-shared-concepts/01-auth.md) |
| Logs sem segredos | [Integração geral](02-general-integration.md) |
| Teardown e vazamento de players | [Desempenho e mosaico](01-mosaic-performance.md) |
| Container Web e URI | Parte IV `02-live-preview` / `03-playback` |

## Checklist de verificação (fechamento)

- [ ] AppSecret ausente do repositório e de builds de cliente.
- [ ] Exemplos usam apenas placeholders; nenhum token de produção em Markdown ou PDF.
- [ ] Logs e crash reports mascararam `accessToken` e AppSecret.
- [ ] HTTPS em todas as rotas de auth e APIs que retornam token.
- [ ] Política de privacidade referenciada onde o app exibe vídeo ao usuário.
- [ ] Processo de suporte documentado sem exigir credenciais completas por e-mail.
