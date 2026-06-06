import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { RootLayout } from "./layouts/root-layout";
import { Home } from "./screens/home";
import { NewSession } from "./screens/new-session";
import { Session } from "./screens/session";
import { Command } from "commander";
import { runSourcing, runExtract, runAudit } from "./lib/commands";

// Parse CLI commands
const program = new Command();

program
  .name("catalyst")
  .description("Catalyst CLI - Specialized financial due diligence & sourcing assistant")
  .version("1.0.0");

program
  .command("sourcing")
  .description("Identify target acquisitions in an industry and region")
  .requiredOption("-i, --industry <industry>", "Target industry (e.g., SaaS, Retail)")
  .requiredOption("-r, --region <region>", "Target geographic region (e.g., France, Europe)")
  .option("-s, --size <size>", "Company size class (e.g., PME, ETI)", "TPE/PME")
  .option("-o, --output <output>", "Path to save Excel file", "sourcing_leads.xlsx")
  .action(async (options) => {
    await runSourcing(options);
    process.exit(0);
  });

program
  .command("extract")
  .description("Extract structured financial statements and key ratios from a PDF/Excel document")
  .requiredOption("-t, --target <path>", "Path to target PDF/Excel document")
  .option("-o, --output <output>", "Path to save output Excel file", "extracted_financials.xlsx")
  .option("-inst, --instructions <text>", "Custom AI extraction instructions")
  .action(async (options) => {
    await runExtract(options);
    process.exit(0);
  });

program
  .command("audit")
  .description("Perform audit and EBITDA adjustments analysis on a financial statement")
  .requiredOption("-t, --target <path>", "Path to financial statement document (PDF/Excel)")
  .option("-o, --output <output>", "Path to save output audit Excel file", "due_diligence_audit.xlsx")
  .action(async (options) => {
    await runAudit(options);
    process.exit(0);
  });

if (process.argv.length > 2) {
  program.parse(process.argv);
} else {
  // Launch default interactive OpenTUI Mode
  const router = createMemoryRouter([
    {
      path: "/",
      element: <RootLayout />,
      children: [
        { index: true, element: <Home /> },
        { path: "sessions/new", element: <NewSession /> },
        { path: "sessions/:id", element: <Session /> },
      ]
    }
  ]);

  function App() {
    return <RouterProvider router={router} />
  }

  const renderer = await createCliRenderer({
    targetFps: 60,
    exitOnCtrlC: false,
  });
  createRoot(renderer).render(<App />);
}
