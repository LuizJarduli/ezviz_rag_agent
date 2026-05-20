# Documentação EZOpen para parceiros (pt-BR)

[![Partner docs CI](https://github.com/LuizJarduli/ezviz_rag_agent/actions/workflows/partner-docs.yml/badge.svg)](https://github.com/LuizJarduli/ezviz_rag_agent/actions/workflows/partner-docs.yml)

Fonte versionada em Markdown para o PDF de integração EZVIZ EZOpen e, na Fase 2, o pacote modular por plataforma. Este diretório é a **única fonte da verdade** para o conteúdo entregue aos parceiros (ADR-002).

## Pré-requisitos

- **Pandoc** ≥ 2.19 (recomendado; fixar a versão usada na sua máquina no campo abaixo ao validar o build)
- **Node.js** ≥ 20 e **pnpm** (monorepo)
- **@mermaid-js/mermaid-cli** (`mmdc`) + **Chrome/Chromium** — o build converte blocos ` ```mermaid ` em PNG antes do Pandoc (o preview Markdown do editor renderiza Mermaid nativamente; o PDF não). Na primeira execução sem Chrome no PATH, o script tenta `pnpm exec puppeteer browsers install chrome-headless-shell`.
- Motor PDF: o build **detecta automaticamente** o primeiro disponível no PATH: `xelatex`, `tectonic` ou `lualatex`. No macOS sem TeX completo, instale [Tectonic](https://tectonic-typesetting.github.io/) (`brew install tectonic`) — é o mesmo motor usado no CI.

| Ferramenta | Versão mínima | Notas |
|------------|---------------|-------|
| Pandoc | 2.19 | `pandoc --version` — pin a versão exata no seu ambiente ao validar o build |
| mmdc | 11.x | `pnpm exec mmdc --version` após `pnpm install` na raiz |
| PDF engine | xelatex **ou** tectonic | `tectonic --version` ou `xelatex --version` — um dos dois basta |
| pnpm | 9.x | na raiz do repositório |

## Corpus de referência (somente leitura)

Material factual em chinês, já rastreado no repositório:

```
packages/crawler/docs/sdk
```

Use-o para conferir APIs e fluxos oficiais; **todo texto voltado ao parceiro deve ser redigido em pt-BR**. Referências internas ao mosaico seguem ADR-006 (prosa e diagramas, sem colar código de apps internos).

## Estrutura

| Parte | Diretório | Conteúdo |
|-------|-----------|----------|
| I | `part-01-shared-concepts/` | EZOpen, autenticação genérica, glossário |
| II | `part-02-android/` | Guia Android (capítulos 01–06) |
| III | `part-03-ios/` | Guia iOS (mesmos nomes de arquivo que Android) |
| IV | `part-04-web/` | Guia Web com EZUIKit (`ezuikit-js`) |
| V | `part-05-best-practices/` | Mosaico, integração geral, segurança |
| — | `assets/` | Diagramas exportados (PNG/SVG) |
| — | `dist/` | PDF gerado (**ignorado pelo Git** — regra global `dist/` na raiz) |
| — | `modules/` | Pacote modular Fase 2 (**gerado** por `partner-docs:split`; ignorado pelo Git) |

Os nomes de arquivo dos capítulos de plataforma são **idênticos** entre Android, iOS e Web (ADR-001), por exemplo `01-auth.md`, `02-live-preview.md`.

### Paridade Android / iOS (checklist)

| Capítulo | Paridade estrutural | Diferenças intencionais documentadas |
|----------|---------------------|--------------------------------------|
| `01-auth.md` | Mesmos objetivos, init, token, ciclo de vida | iOS: CocoaPods/framework estático, `Info.plist`, `EZGlobalSDK` em regiões internacionais |
| `02-live-preview.md` | URI `.live`, happy path, teardown | iOS: modos LAN / P2P / streaming no corpus oficial |
| `03-playback.md` | Nuvem `.rec` + SD local (ADR-005) | Mesmo escopo; APIs de pause/seek nomeadas no corpus iOS |
| `04-device-control.md` | PTZ, captura, talk (ADR-005) | Permissões via `Info.plist` + prompt do sistema |
| `05-mosaic.md` | Grade, fullscreen, link Parte V | iOS: `UICollectionView` / `willDisplay`; referência interna `.swift` (ADR-006) |
| `06-wifi-config.md` | AP, sonic, wired | iOS: provisioning Smart automático, rede local iOS 14+, Demo exige certificado do parceiro |

Capítulos iOS completos: `part-03-ios/` (task_08). Android: `part-02-android/` (task_07).

## Convenções de autoria (pt-BR)

- Idioma: **português (Brasil)**; termos de produto EZVIZ podem permanecer em inglês no glossário.
- Cada capítulo: título H1, objetivos de aprendizado e, ao final, checklist de verificação (nas tasks de redação).
- URLs de exemplo em bloco de citação: `> **Exemplo (não obrigatório):** …`
- Sem segredos no repositório: use `YOUR_APP_KEY`, `YOUR_ACCESS_TOKEN`.
- Comentários HTML opcionais para rastreabilidade: `<!-- source: packages/crawler/docs/sdk/... -->`

## Comandos

Na raiz do monorepo (`process.cwd()` = raiz do repositório):

```bash
# Validar manifest, arquivos obrigatórios, links e content guards (ADR-004)
pnpm partner-docs:validate

# Testes do validador e do scaffold (Node native test, Node ≥ 20)
pnpm partner-docs:test

# Cobertura dos testes acima (meta ≥ 80% nas tasks de tooling)
pnpm partner-docs:test:coverage
```

`partner-docs:validate` usa `scripts/partner-docs/validate.ts` contra `docs/partner-ezopen-ptbr/partner-docs.manifest.json`. Enquanto o conteúdo dos capítulos ainda for stub (tasks de redação), a saída pode ser **código de saída 1** por falhas de content guard — isso é esperado; erros de resolução de módulo indicam problema de wiring.

PDF (Pandoc + validação prévia):

```bash
# Valida, depois gera dist/ezviz-ezopen-partner-ptbr.pdf (gitignored)
pnpm partner-docs:build
```

Pacote modular Fase 2 (export mecânico, sem reescrita de conteúdo):

```bash
# Valida a árvore-fonte, depois copia capítulos para modules/{shared,android,ios,web,best-practices}/
pnpm partner-docs:split
```

### Layout do pacote modular (`modules/`)

| Regra | Detalhe |
|-------|---------|
| Agrupamento | Campo `module` em `partner-docs.manifest.json` (mesmos cinco valores de ADR-001) |
| Caminho de saída | `modules/{module}/{basename-do-capítulo}.md` (ex.: `modules/web/02-live-preview.md`) |
| Front matter | Copiado apenas para `modules/shared/front-matter.md` (metadados de versão alinhados ao PDF) |
| Assets | Se existir `assets/`, copiado recursivamente para `modules/shared/assets/` |
| Links | Cópia **byte a byte** do Markdown-fonte; links relativos continuam apontando para caminhos `part-*/` da árvore mestre até uma passagem de formatação opcional |
| Versionamento | `docVersion` em `front-matter.md` e `version` no manifest devem coincidir com o PDF da mesma entrega (ex.: `1.0.0` após sign-off Fase 1) |
| Git | `docs/partner-ezopen-ptbr/modules/` está no `.gitignore` — artefato gerado; regenere com `pnpm partner-docs:split` após mudanças na fonte |

O script `scripts/partner-docs/build-pdf.sh` executa `partner-docs:validate` e, em seguida, `build.ts`, que:

1. Lê a ordem em `partner-docs.manifest.json` (front matter + capítulos).
2. Gera `dist/.build-staging/` com cada capítulo; blocos ` ```mermaid ` viram PNG em `dist/.build-staging/.mermaid/` via `mmdc`.
3. Injeta metadados Pandoc (`title`, `version`, `date`) do YAML em `front-matter.md`.
4. Invoca Pandoc sobre o staging com `-V lang=pt-BR` e `--pdf-engine` (auto: xelatex → tectonic → lualatex).

Variáveis opcionais:

| Variável | Uso |
|----------|-----|
| `PARTNER_DOCS_PDF_ENGINE` | Força um motor PDF (ex.: `tectonic`). Se omitido, o script escolhe o primeiro disponível em `xelatex`, `tectonic`, `lualatex` |
| `PANDOC_AVAILABLE=1` | Habilita o teste de integração de smoke do PDF na suíte (requer Pandoc + motor PDF no PATH) |

## Integração contínua (GitHub Actions)

Workflow: [`.github/workflows/partner-docs.yml`](../../.github/workflows/partner-docs.yml)

| Evento | Job | Comando | Efeito |
|--------|-----|---------|--------|
| `pull_request` | **Validate partner docs** | `pnpm partner-docs:test` → `pnpm partner-docs:validate` | Falha o check se estrutura, links ou content guards quebrarem; logs listam `chapterId` e regra do validador |
| `push` → `main` | Mesmo validate | idem | Garante `main` verde antes do smoke de PDF |
| `push` → `main` | **Build PDF (main smoke)** | `pnpm partner-docs:build` (`PARTNER_DOCS_PDF_ENGINE=tectonic`) | Instala Pandoc + Tectonic na imagem; não roda em PR |

**Paridade local ↔ CI:** os comandos acima são os mesmos da raiz do monorepo (`pnpm install` + scripts do `package.json`). Não há flags extras no workflow.

**Proteção de branch (manual):** em *Settings → Branches*, exija o check **Validate partner docs** antes do merge. Com isso, PRs com `partner-docs:validate` em falha não podem ser integrados.

### Checklist de verificação (integração)

1. Abrir um PR de teste que altere um capítulo em `docs/partner-ezopen-ptbr/`.
2. Confirmar que o workflow **Partner documentation** aparece nos checks do PR.
3. Introduzir uma violação de guard (ex.: remover `ezopen://` de um capítulo Web) e confirmar que o job **Validate partner docs** falha com saída citando `chapterId` / regra.
4. Reverter a violação e confirmar check verde.
5. Após merge em `main`, confirmar que o job **Build PDF (main smoke)** executa (opcional; artefato PDF permanece em `dist/`, gitignored).

## Arquivos principais

- `front-matter.md` — metadados do PDF (título, versão, público, data do crawl)
- `partner-docs.manifest.json` — ordem de capítulos e guards (task_02)
- `scripts/partner-docs/` — validador, build Pandoc e `split-modules.ts` (Fase 2)

## ADRs relacionados

Decisões em `.compozy/tasks/ezviz-ezopen-partner-doc-ptbr/adrs/` (estrutura por plataforma, Pandoc, EZUIKit Web, validação automatizada).
