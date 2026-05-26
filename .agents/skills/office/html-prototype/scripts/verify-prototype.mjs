#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const input = process.argv[2];
if (!input) {
  console.error("Usage: verify-prototype.mjs <docs/prototype/.../index.html> [design-brief.md]");
  process.exit(2);
}

const htmlPath = path.resolve(input);
const designBriefPath = process.argv[3] ? path.resolve(process.argv[3]) : null;
const outDir = path.dirname(htmlPath);
const reportPath = path.join(outDir, "prototype-qa-report.md");
const jsonPath = path.join(outDir, "qa-results.json");
const screenshotDir = path.join(outDir, "screenshots");
const prototypeSpecPath = path.join(outDir, "prototype-spec.md");
const blueprintPath = path.join(outDir, "blueprint.yaml");
const html = fs.readFileSync(htmlPath, "utf8");
const designBrief = designBriefPath && fs.existsSync(designBriefPath)
  ? fs.readFileSync(designBriefPath, "utf8")
  : "";
const prototypeSpec = fs.existsSync(prototypeSpecPath)
  ? fs.readFileSync(prototypeSpecPath, "utf8")
  : "";
const blueprint = fs.existsSync(blueprintPath)
  ? fs.readFileSync(blueprintPath, "utf8")
  : "";
const mode = process.argv.includes("--mode=figma-demo") || /\/figma-demo|figma-demo|Figma Demo Prototype Spec/i.test(prototypeSpec) || Boolean(blueprint)
  ? "figma-demo"
  : "html-prototype";

const checks = [];
function addCheck(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail: detail || "" });
}

function count(pattern, source = html) {
  return (source.match(pattern) || []).length;
}

function uniq(matches) {
  return Array.from(new Set(matches));
}

function extractGeneratedHtml(source) {
  const regions = [];
  const commentPatterns = [
    /<!--\s*===== 改动区 START =====\s*-->([\s\S]*?)<!--\s*===== 改动区 END =====\s*-->/gi,
    /<!--\s*GENERATED START\s*-->([\s\S]*?)<!--\s*GENERATED END\s*-->/gi,
    /<!--\s*PROTOTYPE GENERATED START\s*-->([\s\S]*?)<!--\s*PROTOTYPE GENERATED END\s*-->/gi
  ];
  for (const pattern of commentPatterns) {
    for (const match of source.matchAll(pattern)) regions.push(match[1]);
  }
  return regions.length ? regions.join("\n") : source;
}

const generatedHtml = extractGeneratedHtml(html);
const hasScopedGeneratedRegion = generatedHtml !== html;
const externalResourcePattern = /\b(?:src|href)=["'](?:https?:)?\/\/(?!localhost|127\.0\.0\.1)[^"']+["']|@import\s+url\(["']?(?:https?:)?\/\//i;

const forbidden = [
  ["No external CDN resources", !externalResourcePattern.test(html), "HTML should use local loaded assets only. Plain text URLs are allowed."],
  ["No Tailwind default blue primary in generated area", !/\b(bg|text|border)-blue-(400|500|600|700)\b/.test(generatedHtml), "Use framework tokens, not Tailwind default blue."],
  ["No generic font stack in generated area", !/\b(Inter|Roboto|Arial|Helvetica Neue|Google Fonts)\b|font-family:\s*(system-ui|sans-serif)/i.test(generatedHtml), "Generated area must not introduce generic font stacks; framework-level fallback is ignored."],
  ["No generic Tailwind font sizes in generated area", !/\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl)\b/.test(generatedHtml), "Use text-15/text-13/text-12 in generated content unless a local token requires otherwise."],
  ["No decorative gradient utilities in generated area", !/\bbg-gradient-to-[trbl]/.test(generatedHtml), "B2B prototype should avoid generic AI gradient backgrounds."],
  ["No Lorem Ipsum", !/lorem ipsum/i.test(html), "Use realistic CRM copy or marked data placeholders."],
  ["No emoji icons", !/[\u{1F300}-\u{1FAFF}]/u.test(html), "Use local icon assets or text placeholders."],
  ["Prototype spec exists", fs.existsSync(prototypeSpecPath), "prototype-spec.md is required."]
];
for (const [name, passed, detail] of forbidden) addCheck(name, passed, detail);
addCheck(
  "Generated region scoped or full-page accepted",
  true,
  hasScopedGeneratedRegion ? "Scoped generated/change region detected; style lint applies there." : "No generated/change region markers found; style lint applies to full HTML."
);

if (prototypeSpec) {
  addCheck(
    "Dynamic reference recorded",
    /Dynamic Reference (Scan|Status)|动态参考|Dynamic Reference Status:\s*(COMPLETED|SKIPPED_TOOL_UNAVAILABLE|NOT_APPLICABLE_FIGMA_DEMO|NOT_REQUIRED)/i.test(prototypeSpec),
    "prototype-spec.md must record whether dynamic reference scan completed or was skipped because tools were unavailable."
  );
  const scoreMatch = prototypeSpec.match(/Current Aesthetic Score\s*[:：]\s*(\d{1,2})\s*\/\s*30/i)
    || prototypeSpec.match(/当前审美.*?(\d{1,2})\s*\/\s*30/s);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;
  addCheck(
    "Current aesthetic score >= 24/30",
    score !== null && score >= 24,
    score === null ? "No Current Aesthetic Score found in prototype-spec.md." : `Found ${score}/30.`
  );
}

const primaryCount = count(/\b(bg|text|border)-primary\b/g);
addCheck("Primary color usage <= 3", primaryCount <= 3, `Found ${primaryCount} primary utility usages.`);

const stateMatches = uniq([...html.matchAll(/data-prototype-state=["']([^"']+)["']/g)].map((m) => m[1]));
const stateCommentMatches = uniq([...html.matchAll(/STATE:\s*([^\n<]+)/g)].map((m) => m[1].trim()));
const allStates = uniq([...stateMatches, ...stateCommentMatches]);
if (mode === "figma-demo") {
  const blueprintNodeIds = uniq([...blueprint.matchAll(/\bnode-\d{2,}[-\w]*\b/gi)].map((m) => m[0]));
  const htmlNodeIds = uniq([
    ...[...html.matchAll(/data-demo-node=["']([^"']+)["']/g)].map((m) => m[1]),
    ...[...html.matchAll(/NODE:\s*([^\n<]+)/g)].map((m) => m[1].trim())
  ]);
  addCheck("Figma demo blueprint exists", Boolean(blueprint), "blueprint.yaml is required for figma-demo mode.");
  addCheck(
    "Figma demo node coverage present",
    htmlNodeIds.length > 0 || allStates.length > 0,
    `Found demo nodes: ${htmlNodeIds.join(", ") || "none"}; states: ${allStates.join(", ") || "none"}.`
  );
  addCheck(
    "Figma demo blueprint has nodes",
    blueprintNodeIds.length > 0 || /nodes\s*:/i.test(blueprint),
    `Blueprint node hints: ${blueprintNodeIds.join(", ") || "nodes key not found"}.`
  );
} else {
  addCheck("State coverage markers present", allStates.length >= 5, `Found states: ${allStates.join(", ") || "none"}.`);
}

const decisionIds = uniq([...designBrief.matchAll(/\bD-\d{3}\b/g)].map((m) => m[0]));
const mappedDecisionIds = uniq([...html.matchAll(/DECISION:\s*(D-\d{3})/g)].map((m) => m[1]));
const buildDecisionCount = count(/BUILD_DECISION:/g);
if (mode === "figma-demo") {
  addCheck(
    "Figma demo build decisions recorded",
    mappedDecisionIds.length > 0 || buildDecisionCount > 0 || /mapping-proof\.md|blueprint\.yaml/i.test(prototypeSpec),
    `DECISION markers: ${mappedDecisionIds.length}; BUILD_DECISION markers: ${buildDecisionCount}.`
  );
} else if (decisionIds.length > 0) {
  const missing = decisionIds.filter((id) => !mappedDecisionIds.includes(id));
  addCheck("Design decisions mapped", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : `${decisionIds.length}/${decisionIds.length} mapped.`);
} else {
  addCheck("Design decisions mapped", mappedDecisionIds.length > 0, `No design brief IDs found; HTML mapped IDs: ${mappedDecisionIds.join(", ") || "none"}.`);
}

const textLength = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
addCheck("Non-empty rendered text", textLength > 200, `Approximate text length: ${textLength}.`);

let browserResult = {
  attempted: false,
  available: false,
  consoleErrors: [],
  screenshots: []
};

try {
  const { chromium } = await import("playwright");
  browserResult.attempted = true;
  browserResult.available = true;
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewports = [
    ["desktop", { width: 1440, height: 900 }],
    ["tablet", { width: 1280, height: 720 }],
    ["mobile", { width: 390, height: 844 }]
  ];
  for (const [name, viewport] of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
    await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
    browserResult.screenshots.push(`screenshots/${name}.png`);
    browserResult.consoleErrors.push(...errors.map((error) => ({ viewport: name, error })));
    await page.close();
  }
  await browser.close();
  addCheck("Browser screenshots generated", browserResult.screenshots.length === 3, browserResult.screenshots.join(", "));
  addCheck("Console errors = 0", browserResult.consoleErrors.length === 0, browserResult.consoleErrors.map((e) => `${e.viewport}: ${e.error}`).join("\n"));
} catch (error) {
  browserResult.attempted = true;
  browserResult.available = false;
  browserResult.error = error.message;
  addCheck("Browser verification available", false, `Playwright unavailable or failed: ${error.message}`);
}

const passed = checks.every((check) => check.passed);
const results = {
  htmlPath,
  designBriefPath,
  mode,
  passed,
  generatedAt: new Date().toISOString(),
  checks,
  primaryCount,
  states: allStates,
  blueprintPath: fs.existsSync(blueprintPath) ? blueprintPath : null,
  decisionIds,
  mappedDecisionIds,
  browser: browserResult
};

fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
fs.writeFileSync(reportPath, [
  "# Prototype QA Report",
  "",
  `Generated: ${results.generatedAt}`,
  `HTML: ${path.relative(process.cwd(), htmlPath)}`,
  `Mode: ${mode}`,
  `Overall: ${passed ? "PASS" : "FAIL"}`,
  "",
  "## Checks",
  "",
  "| Check | Result | Detail |",
  "|---|---|---|",
  ...checks.map((check) => `| ${check.name} | ${check.passed ? "PASS" : "FAIL"} | ${String(check.detail).replace(/\n/g, "<br>")} |`),
  "",
  "## Screenshots",
  "",
  browserResult.screenshots.length ? browserResult.screenshots.map((item) => `- ${item}`).join("\n") : "- Not generated",
  "",
  "## Coverage",
  "",
  `- Primary utility usages: ${primaryCount}`,
  `- States: ${allStates.join(", ") || "none"}`,
  `- Design decisions in brief: ${decisionIds.join(", ") || "none"}`,
  `- Design decisions mapped in HTML: ${mappedDecisionIds.join(", ") || "none"}`,
  ""
].join("\n"));

console.log(`${passed ? "PASS" : "FAIL"} ${reportPath}`);
process.exit(passed ? 0 : 1);
