# EZVIZ Crawler

This package contains scripts to crawl EZVIZ public documentation and convert it into Markdown format for ingestion by the RAG agent.

## Available Crawlers

| Name | Description | Command | Output Directory |
| :--- | :--- | :--- | :--- |
| **SDK** | Crawls the EZVIZ Open Platform SDK documentation, including overviews, integration guides, and API references for various platforms (Android, iOS, Web, etc.). | `pnpm run crawl:sdk` | `packages/crawler/docs/sdk` |

## Usage

1. **Install dependencies**:

    ```bash
    pnpm install
    ```

2. **Run a crawler**:

    ```bash
    pnpm run crawl:sdk
    ```

3. **Output**:
    The crawled documentation will be saved as Markdown files in the `docs` directory. The structure mirrors the documentation hierarchy.

## Development

- **Scripts**: Located in `src/crawlers/`.
- **Helper Functions**: Shared utilities in `src/crawlers/helpers/`.
- **Constants**: Configuration constants in `src/crawlers/constants/`.

## Notes

- The crawler uses `playwright` for navigation and `turndown` with `turndown-plugin-gfm` for HTML-to-Markdown conversion.
- Breadcrumbs are preserved as blockquotes (`> Path / To / Doc`) to aid in context for the RAG agent.
