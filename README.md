# Catalyst — Financial Sourcing & Due Diligence CLI

**Catalyst** is an enterprise-grade terminal execution tool and AI-driven assistant designed for **Search Funds**, **Private Equity**, and **Financial Analysts**. It automates target acquisition sourcing, structured financial document parsing, and due diligence auditing, outputting structured data directly into investment-committee-ready Excel workbooks.

Built with a secure **Client-Server architecture** (Node.js/Hono/TypeScript), Catalyst executes lightweight client-side terminal commands while keeping intellectual property (AI prompts, parsing rules, and models) secure on a private self-hostable server.

---

## Key Features

- 🔍 **Autonomous Sourcing (`sourcing`):** Query and compile off-market acquisition targets in a specified industry and region, including valuation estimates, key contact details, and initial risk checks.
- 📊 **Structured Extraction (`extract`):** Parse complex financial statements (PDF, Excel, CSV) to extract clean balance sheets and multi-year income statements.
- ⚖️ **Due Diligence Auditing (`audit`):** Automatically audit financial statements to calculate key ratios, identify EBITDA adjustments (add-backs & one-offs), and detect red flags.
- 📁 **Automated Excel Deliverables:** Every command automatically structures and formats outputs into beautiful, multi-tab Excel files (`.xlsx`) matching professional finance formatting.
- 🔒 **Enterprise Security:** Bypasses public B2C authentication and billing. Relies on secure header API Keys (`X-Catalyst-API-Key`) for corporate licensing and self-hosting.

---

## Monorepo Architecture

Catalyst is organized as a TypeScript monorepo managed by `pnpm`:

```
├── packages
│   ├── cli/         # Command-line interface client (Commander, XLSX, OpenTUI)
│   ├── server/      # Hono API Server, AI SDK integrations, and dotenv loader
│   ├── shared/      # Shared Zod schemas, type definitions, and AI tool contracts
│   └── database/    # Prisma schemas and local database client (optional)
```

---

## Installation & Local Setup

### Prerequisites
- Node.js (v22+)
- `pnpm` (installed via `npm install -g pnpm`)

### 1. Clone & Install Dependencies
Clone your repository and install dependencies at the root level:
```bash
pnpm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit the `.env` file to add your API keys:
```env
API_URL=http://127.0.0.1:3000
CATALYST_API_KEY=your_secure_licensing_key_here

# AI Providers (At least one is required to enable live AI generation)
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key
```

*Note: If no AI provider API keys are configured, the server operates in **Demo Mode**, returning high-fidelity simulated financial data out of the box.*

### 3. Start the Central Server
Start the backend server locally (listens on `http://127.0.0.1:3000`):
```bash
pnpm --filter @catalyst/server run dev
```

---

## CLI Commands Reference

You can run commands using the `catalyst` entry wrapper:

### 1. Sourcing Targets
Identify target companies matching sector, geography, and scale:
```bash
pnpm exec tsx packages/cli/bin/catalyst sourcing --industry "SaaS" --region "France" --output targets_leads.xlsx
```
- **Output:** A formatted spreadsheet containing target company descriptions, valuation ranges, growth metrics, and key contacts.

### 2. Financial Statement Extraction
Extract structured balance sheets and income statement metrics from a financial report:
```bash
pnpm exec tsx packages/cli/bin/catalyst extract --target path/to/financials.pdf --output acme_financials.xlsx
```
- **Output:** A multi-tab workbook containing `Overview & Balance Sheet`, `Key Metrics` (YoY comparison), and `Analyst Notes`.

### 3. Due Diligence Auditing
Audit accounts to find anomalies, compute ratios, and detail EBITDA adjustments:
```bash
pnpm exec tsx packages/cli/bin/catalyst audit --target path/to/financials.pdf --output due_diligence_report.xlsx
```
- **Output:** A workbook structured into `Overview & Key Ratios` (D/E, current ratio, margins), `EBITDA Adjustments` (add-backs with rationales), and `Red Flags` (prioritized by severity).

---

## Production Compilation

To bundle and compile the CLI into a standalone, single-file binary executable (e.g., `catalyst.exe` for client distribution) using Bun's native compiler:
```bash
# Inside packages/cli
bun build ./src/index.tsx --compile --outfile catalyst
```
This enables zero-dependency execution for non-technical users.
