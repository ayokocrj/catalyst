import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const API_KEY = process.env.CATALYST_API_KEY ?? "";

// Helper to make API calls to the server
async function fetchFinanceAPI(endpoint: string, body: any) {
  try {
    const response = await fetch(`${API_URL}/finance/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Catalyst-API-Key": API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned status ${response.status}: ${errText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`\x1b[31mError connecting to server on ${API_URL}:\x1b[0m`, error.message);
    process.exit(1);
  }
}

// ----------------------------------------------------
// 1. SOURCING COMMAND
// ----------------------------------------------------
export async function runSourcing(options: { industry: string; region: string; size: string; output: string }) {
  console.log(`\x1b[36m[Sourcing]\x1b[0m Searching targets for industry: "${options.industry}", region: "${options.region}", size: "${options.size}"...`);
  
  const result = await fetchFinanceAPI("sourcing", {
    industry: options.industry,
    region: options.region,
    size: options.size,
  });

  const targets = result.targets || [];
  console.log(`\x1b[32m✔ Found ${targets.length} high-probability target companies.\x1b[0m`);

  // Format data for Excel
  const excelRows = targets.map((t: any) => ({
    "Company Name": t.name,
    "Website": t.website,
    "Description": t.description,
    "Revenue / Scale": t.revenue,
    "Employees": t.employees,
    "Est. Valuation": t.estimatedValuation,
    "YoY Growth": t.growthRate,
    "Contact Name": t.contactPerson,
    "Contact Email": t.contactEmail,
    "Identified Red Flags": t.redFlags ? t.redFlags.join("; ") : "",
  }));

  // Create Excel file
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows);
  
  // Set simple column widths
  const maxW = [{wch: 25}, {wch: 25}, {wch: 45}, {wch: 15}, {wch: 12}, {wch: 18}, {wch: 12}, {wch: 20}, {wch: 25}, {wch: 50}];
  ws["!cols"] = maxW;

  XLSX.utils.book_append_sheet(wb, ws, "Sourcing Lead Sheet");
  
  const outputPath = path.resolve(process.cwd(), options.output);
  XLSX.writeFile(wb, outputPath);
  console.log(`\x1b[32m✔ Exported to Excel sheet at: \x1b[34m${outputPath}\x1b[0m`);
}

// ----------------------------------------------------
// 2. EXTRACT COMMAND
// ----------------------------------------------------
export async function runExtract(options: { target: string; output: string; instructions?: string }) {
  const targetPath = path.resolve(process.cwd(), options.target);
  if (!fs.existsSync(targetPath)) {
    console.error(`\x1b[31mError: Target file not found at ${targetPath}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[36m[Extraction]\x1b[0m Reading document: ${path.basename(targetPath)}...`);
  const fileBuffer = fs.readFileSync(targetPath);
  const fileContentBase64 = fileBuffer.toString("base64");
  const fileName = path.basename(targetPath);
  const ext = path.extname(targetPath).toLowerCase();
  
  let fileType = "application/octet-stream";
  if (ext === ".pdf") fileType = "application/pdf";
  else if (ext === ".xlsx") fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  else if (ext === ".csv") fileType = "text/csv";

  console.log(`\x1b[36m[Extraction]\x1b[0m Parsing and extracting financial statements via server...`);
  const data = await fetchFinanceAPI("extract", {
    fileContentBase64,
    fileName,
    fileType,
    customInstructions: options.instructions,
  });

  console.log(`\x1b[32m✔ Successfully extracted data for company: \x1b[1m${data.companyName}\x1b[0m`);

  const wb = XLSX.utils.book_new();

  // Tab 1: Overview & Balance Sheet
  const overviewRows = [
    { Label: "Company Name", Value: data.companyName },
    { Label: "Sector", Value: data.sector },
    { Label: "Country", Value: data.country },
    { Label: "", Value: "" },
    { Label: "BALANCE SHEET SUMMARY", Value: "" },
    { Label: "Cash", Value: data.balanceSheet?.cash || "" },
    { Label: "Debt", Value: data.balanceSheet?.debt || "" },
    { Label: "Equity", Value: data.balanceSheet?.equity || "" },
    { Label: "Working Capital (BFR)", Value: data.balanceSheet?.workingCapital || "" },
  ];
  const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
  wsOverview["!cols"] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, "Overview & Balance Sheet");

  // Tab 2: Key Financial Metrics
  const metricsRows = (data.keyMetrics || []).map((m: any) => ({
    "Year": m.year,
    "Revenue (Chiffre d'Affaires)": m.revenue,
    "Gross Profit (Marge Brute)": m.grossProfit,
    "EBITDA (Excédent Brut d'Exploitation)": m.ebitda,
    "Net Income (Résultat Net)": m.netIncome,
    "EBITDA Margin": m.ebitdaMargin,
  }));
  const wsMetrics = XLSX.utils.json_to_sheet(metricsRows);
  wsMetrics["!cols"] = [{ wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsMetrics, "Key Metrics");

  // Tab 3: Analyst Notes
  const notesRows = (data.risksAndNotes || []).map((note: string, idx: number) => ({
    "No.": idx + 1,
    "Analytical Note / Risk Highlight": note,
  }));
  const wsNotes = XLSX.utils.json_to_sheet(notesRows);
  wsNotes["!cols"] = [{ wch: 8 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsNotes, "Analyst Notes");

  const outputPath = path.resolve(process.cwd(), options.output);
  XLSX.writeFile(wb, outputPath);
  console.log(`\x1b[32m✔ Exported to structured Excel workbook at: \x1b[34m${outputPath}\x1b[0m`);
}

// ----------------------------------------------------
// 3. AUDIT COMMAND
// ----------------------------------------------------
export async function runAudit(options: { target: string; output: string }) {
  const targetPath = path.resolve(process.cwd(), options.target);
  if (!fs.existsSync(targetPath)) {
    console.error(`\x1b[31mError: Target file not found at ${targetPath}\x1b[0m`);
    process.exit(1);
  }

  console.log(`\x1b[36m[Audit]\x1b[0m Reading document: ${path.basename(targetPath)}...`);
  const fileBuffer = fs.readFileSync(targetPath);
  const fileContentBase64 = fileBuffer.toString("base64");
  const fileName = path.basename(targetPath);
  const ext = path.extname(targetPath).toLowerCase();
  
  let fileType = "application/octet-stream";
  if (ext === ".pdf") fileType = "application/pdf";
  else if (ext === ".xlsx") fileType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  else if (ext === ".csv") fileType = "text/csv";

  console.log(`\x1b[36m[Audit]\x1b[0m Performing due diligence & EBITDA adjustments audit via server...`);
  const data = await fetchFinanceAPI("audit", {
    fileContentBase64,
    fileName,
    fileType,
  });

  console.log(`\x1b[32m✔ Audit Completed. Due Diligence Score: \x1b[1m\x1b[33m${data.auditScore}/100\x1b[0m`);

  const wb = XLSX.utils.book_new();

  // Tab 1: Audit Summary & Key Ratios
  const summaryRows = [
    { Section: "Due Diligence Score", Value: `${data.auditScore} / 100` },
    { Section: "Investment Summary", Value: data.summary },
    { Section: "", Value: "" },
    { Section: "FINANCIAL RATIOS", Value: "" },
    { Section: "Current Ratio (BFR)", Value: data.keyRatios?.currentRatio || "" },
    { Section: "Debt to Equity (Levier)", Value: data.keyRatios?.debtToEquity || "" },
    { Section: "Gross Margin", Value: data.keyRatios?.grossMargin || "" },
    { Section: "EBITDA Margin", Value: data.keyRatios?.ebitdaMargin || "" },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary["!cols"] = [{ wch: 25 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Overview & Key Ratios");

  // Tab 2: EBITDA Adjustments (Add-backs)
  const adjRows = (data.ebitdaAdjustments || []).map((adj: any) => ({
    "Adjustment Item": adj.item,
    "Impact Amount": adj.amount,
    "Rationale / Due Diligence Reasoning": adj.rationale,
  }));
  const wsAdj = XLSX.utils.json_to_sheet(adjRows);
  wsAdj["!cols"] = [{ wch: 30 }, { wch: 15 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsAdj, "EBITDA Adjustments");

  // Tab 3: Red Flags
  const flagRows = (data.redFlags || []).map((flag: any) => ({
    "Severity": flag.severity,
    "Finding / Risk": flag.finding,
    "Mitigation / Recommendation": flag.recommendation,
  }));
  const wsFlags = XLSX.utils.json_to_sheet(flagRows);
  wsFlags["!cols"] = [{ wch: 12 }, { wch: 50 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsFlags, "Red Flags & Recommendations");

  const outputPath = path.resolve(process.cwd(), options.output);
  XLSX.writeFile(wb, outputPath);
  console.log(`\x1b[32m✔ Exported complete audit worksheet to: \x1b[34m${outputPath}\x1b[0m`);
}
