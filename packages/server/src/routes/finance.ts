import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

const app = new Hono();

// Middleware to enforce API key authentication if CATALYST_API_KEY is configured on the server
app.use("/*", async (c, next) => {
  const clientKey = c.req.header("X-Catalyst-API-Key");
  const serverKey = process.env.CATALYST_API_KEY;
  if (serverKey && clientKey !== serverKey) {
    return c.json({ error: "Unauthorized: Invalid X-Catalyst-API-Key header" }, 401);
  }
  await next();
});

// Helper to check for API keys and get preferred model
function getLanguageModel() {
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic("claude-3-5-sonnet-20241022");
  } else if (process.env.OPENAI_API_KEY) {
    return openai("gpt-4o");
  }
  return null;
}

// ----------------------------------------------------
// 1. SOURCING ENDPOINT
// ----------------------------------------------------
const sourcingSchema = z.object({
  targets: z.array(
    z.object({
      name: z.string(),
      website: z.string(),
      description: z.string(),
      revenue: z.string(),
      employees: z.number(),
      estimatedValuation: z.string(),
      growthRate: z.string(),
      contactPerson: z.string(),
      contactEmail: z.string(),
      redFlags: z.array(z.string()),
    })
  ),
});

const sourcingInputSchema = z.object({
  industry: z.string(),
  region: z.string(),
  size: z.string().optional().default("TPE/PME"),
});

app.post("/sourcing", zValidator("json", sourcingInputSchema), async (c) => {
  const { industry, region, size } = c.req.valid("json");
  const model = getLanguageModel();

  if (!model) {
    // Return mock data for out-of-the-box demo
    return c.json({
      targets: [
        {
          name: `${industry.replace(/\s+/g, "")} Solutions Ltd`,
          website: `https://www.example-${industry.toLowerCase().replace(/[^a-z0-9]/g, "")}-solutions.com`,
          description: `Leading provider of local ${industry.toLowerCase()} solutions tailored for regional business markets in ${region}.`,
          revenue: "$2.4M ARR",
          employees: 18,
          estimatedValuation: "$8M - $10M",
          growthRate: "+15% YoY",
          contactPerson: "Jean Dupont",
          contactEmail: "j.dupont@company-example.com",
          redFlags: ["Concentration de clientèle élevée (un client représente 35% du CA)"],
        },
        {
          name: `${region.split(" ")[0]} ${industry} Technologies`,
          website: `https://www.example-region-tech.com`,
          description: `Niche player specializing in proprietary software and integration services in ${industry} across ${region}.`,
          revenue: "$1.8M ARR",
          employees: 12,
          estimatedValuation: "$5.5M - $7M",
          growthRate: "+22% YoY",
          contactPerson: "Sarah Johnson",
          contactEmail: "s.johnson@region-tech-example.com",
          redFlags: ["Pas de direction financière structurée (comptabilité externalisée)"],
        },
        {
          name: `Alpha Growth Partners`,
          website: `https://www.example-alphagrowth.com`,
          description: `Established manufacturer and digital service provider in the ${industry} sector, serving mid-market enterprise clients.`,
          revenue: "$4.1M ARR",
          employees: 35,
          estimatedValuation: "$15M - $18M",
          growthRate: "+8% YoY",
          contactPerson: "Marc Lemaire",
          contactEmail: "m.lemaire@alphagrowth-example.com",
          redFlags: ["Contrats clients de courte durée (inférieurs à 12 mois)", "Dette senior importante"],
        }
      ],
    });
  }

  try {
    const prompt = `Identify 3 high-probability private target companies in the "${industry}" sector located in region "${region}" with company size/scale of "${size}". 
Provide realistic estimates and placeholders for proprietary info. Format output strictly according to the schema. Make the description and redFlags bilingual or in French if region is European.`;

    const { object } = await generateObject({
      model,
      schema: sourcingSchema,
      prompt,
    });

    return c.json(object);
  } catch (error) {
    console.error("Sourcing generation error:", error);
    return c.json({ error: "Failed to generate sourcing lead sheet" }, 500);
  }
});

// ----------------------------------------------------
// 2. EXTRACTION ENDPOINT
// ----------------------------------------------------
const extractSchema = z.object({
  companyName: z.string(),
  sector: z.string(),
  country: z.string(),
  keyMetrics: z.array(
    z.object({
      year: z.string(),
      revenue: z.string(),
      grossProfit: z.string(),
      ebitda: z.string(),
      netIncome: z.string(),
      ebitdaMargin: z.string(),
    })
  ),
  balanceSheet: z.object({
    cash: z.string(),
    debt: z.string(),
    equity: z.string(),
    workingCapital: z.string(),
  }),
  risksAndNotes: z.array(z.string()),
});

const extractInputSchema = z.object({
  fileContentBase64: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  customInstructions: z.string().optional(),
});

app.post("/extract", zValidator("json", extractInputSchema), async (c) => {
  const { fileContentBase64, fileName, fileType, customInstructions } = c.req.valid("json");
  const model = getLanguageModel();

  if (!model) {
    // Return mock data for out-of-the-box demo
    return c.json({
      companyName: "Acme Finance Corp (Mocked)",
      sector: "SaaS & Financial Services",
      country: "France",
      keyMetrics: [
        { year: "2023", revenue: "€3,450,000", grossProfit: "€2,932,000", ebitda: "€860,000", netIncome: "€540,000", ebitdaMargin: "24.9%" },
        { year: "2024", revenue: "€4,200,000", grossProfit: "€3,570,000", ebitda: "€1,134,000", netIncome: "€720,000", ebitdaMargin: "27.0%" },
        { year: "2025 (Proj)", revenue: "€5,100,000", grossProfit: "€4,335,000", ebitda: "€1,479,000", netIncome: "€950,000", ebitdaMargin: "29.0%" }
      ],
      balanceSheet: {
        cash: "€1,240,000",
        debt: "€500,000 (Dette bancaire long-terme)",
        equity: "€2,100,000",
        workingCapital: "€310,000",
      },
      risksAndNotes: [
        "Forte dépendance au marché français (90% du CA).",
        "Marge EBITDA en augmentation de 2% par an grâce à des économies d'échelle.",
        "Le BFR est maîtrisé, représentant environ 7% du chiffre d'affaires.",
        `Fichier traité : ${fileName}`
      ],
    });
  }

  try {
    const prompt = `You are a Private Equity analyst. Analyze the attached file named "${fileName}" and extract the key financial statements, metrics, and balance sheet metrics.
${customInstructions ? `Custom User Instructions: ${customInstructions}` : ""}`;

    const { object } = await generateObject({
      model,
      schema: extractSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "file",
              data: fileContentBase64,
              mimeType: fileType,
            },
          ],
        },
      ],
    });

    return c.json(object);
  } catch (error) {
    console.error("Extraction error:", error);
    return c.json({ error: "Failed to parse document and extract financial data" }, 500);
  }
});

// ----------------------------------------------------
// 3. AUDIT ENDPOINT
// ----------------------------------------------------
const auditSchema = z.object({
  auditScore: z.number().describe("Due diligence score out of 100"),
  ebitdaAdjustments: z.array(
    z.object({
      item: z.string(),
      amount: z.string(),
      rationale: z.string(),
    })
  ),
  keyRatios: z.object({
    currentRatio: z.string(),
    debtToEquity: z.string(),
    grossMargin: z.string(),
    ebitdaMargin: z.string(),
  }),
  redFlags: z.array(
    z.object({
      severity: z.enum(["HIGH", "MEDIUM", "LOW"]),
      finding: z.string(),
      recommendation: z.string(),
    })
  ),
  summary: z.string(),
});

const auditInputSchema = z.object({
  fileContentBase64: z.string(),
  fileName: z.string(),
  fileType: z.string(),
});

app.post("/audit", zValidator("json", auditInputSchema), async (c) => {
  const { fileContentBase64, fileName, fileType } = c.req.valid("json");
  const model = getLanguageModel();

  if (!model) {
    return c.json({
      auditScore: 78,
      ebitdaAdjustments: [
        { item: "Salaire excédentaire du dirigeant", amount: "€120,000", rationale: "Remplacement par un DG professionnel au prix du marché réduirait cette charge." },
        { item: "Frais de déplacement exceptionnels", amount: "€45,000", rationale: "Dépenses de séminaire personnel non-récurrentes." },
        { item: "Frais de restructuration de l'équipe support", amount: "€35,000", rationale: "Coût de licenciement ponctuel et non-récurrent." }
      ],
      keyRatios: {
        currentRatio: "1.85 (Sain)",
        debtToEquity: "0.24 (Faible levier)",
        grossMargin: "85.0% (Excellent)",
        ebitdaMargin: "27.0% (Solide)",
      },
      redFlags: [
        { severity: "HIGH", finding: "Baisse de 5% du panier moyen par client sur 12 mois.", recommendation: "Auditer le taux de churn (attrition) client par cohorte." },
        { severity: "MEDIUM", finding: "Dépenses marketing en hausse de 40% pour un CA en hausse de seulement 15%.", recommendation: "Évaluer le CAC (Coût d'Acquisition Client) et le LTV (Lifetime Value)." },
        { severity: "LOW", finding: "Absence de marque déposée à l'international.", recommendation: "Déposer le nom de marque dans l'UE." }
      ],
      summary: `L'entreprise cible présente une excellente rentabilité intrinsèque avec un EBITDA retraité (après ajustements) de 31% du CA. Les finances sont saines, mais l'efficacité de l'acquisition client doit être surveillée de près en raison d'une hausse importante des frais marketing. Fichier audité : ${fileName}`,
    });
  }

  try {
    const prompt = `You are a senior investment manager running due diligence. Audit the attached financial statement file named "${fileName}".
Identify EBITDA adjustments (add-backs/one-offs), key financial ratios, and red flags (severity: HIGH, MEDIUM, LOW). Provide an investment summary score out of 100.`;

    const { object } = await generateObject({
      model,
      schema: auditSchema,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "file",
              data: fileContentBase64,
              mimeType: fileType,
            },
          ],
        },
      ],
    });

    return c.json(object);
  } catch (error) {
    console.error("Audit error:", error);
    return c.json({ error: "Failed to audit financial statements" }, 500);
  }
});

export default app;
