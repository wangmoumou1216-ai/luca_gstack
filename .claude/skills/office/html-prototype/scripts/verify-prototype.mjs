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
const extraArgs = process.argv.slice(3);
const modeArg = extraArgs.find((arg) => arg.startsWith("--mode="));
const explicitMode = modeArg ? modeArg.split("=")[1] : null;
const designBriefArg = extraArgs.find((arg) => !arg.startsWith("--"));
const designBriefPath = designBriefArg ? path.resolve(designBriefArg) : null;
const outDir = path.dirname(htmlPath);
const reportPath = path.join(outDir, "prototype-qa-report.md");
const jsonPath = path.join(outDir, "qa-results.json");
const screenshotDir = path.join(outDir, "screenshots");
const prototypeSpecPath = path.join(outDir, "prototype-spec.md");
const blueprintPath = path.join(outDir, "blueprint.yaml");
const designRulesArg = extraArgs.find((arg) => arg.startsWith("--design-rules="));
const designRulesPath = designRulesArg
  ? path.resolve(designRulesArg.slice("--design-rules=".length))
  : path.join(outDir, "design-rules.json");
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
const inferredMode = /\/figma-demo|figma-demo|Figma Demo Prototype Spec/i.test(prototypeSpec) || Boolean(blueprint)
  ? "figma-demo"
  : "html-prototype";
const allowedModes = new Set(["html-prototype", "figma-demo", "standalone-mobile", "ux-audit", "screenshot-delta", "muse-proto-gen"]);
const mode = explicitMode && allowedModes.has(explicitMode) ? explicitMode : inferredMode;

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
  ["No Lorem Ipsum", !/lorem ipsum/i.test(html), "Use realistic CRM copy or marked data placeholders."],
  ["No emoji icons", !/[\u{1F300}-\u{1FAFF}]/u.test(html), "Use local icon assets or text placeholders."],
  ["Prototype spec exists", mode === "muse-proto-gen" || fs.existsSync(prototypeSpecPath), "prototype-spec.md is required (muse-proto-gen exempt: it outputs HTML + qa-results.json only)."]
];
for (const [name, passed, detail] of forbidden) addCheck(name, passed, detail);
addCheck(
  "Generated region scoped or full-page accepted",
  true,
  hasScopedGeneratedRegion ? "Scoped generated/change region detected; style lint applies there." : "No generated/change region markers found; style lint applies to full HTML."
);

// Literal static clauses come from an actual supplied design source; absence is not compliance.
if (!designRulesArg && !fs.existsSync(designRulesPath)) {
  checks.push({ name: "Supplied design rules", passed: true, status: "N/A", detail: "No actual design rules supplied; visual compliance is unverified. General UX/browser checks still apply." });
} else {
  try {
    const rules = JSON.parse(fs.readFileSync(designRulesPath, "utf8"));
    const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
    const clauseArray = (value) => Array.isArray(value) && value.length > 0 && value.every(nonempty);
    if (!nonempty(rules.source) || !Array.isArray(rules.checks) || rules.checks.length === 0) {
      throw new Error("Expected source and nonempty checks array.");
    }
    const seenIds = new Set();
    for (const rule of rules.checks) {
      if (!rule || !nonempty(rule.id) || seenIds.has(rule.id)) throw new Error("Each rule needs a unique nonempty id.");
      seenIds.add(rule.id);
      const limit = rule.maxOccurrences;
      if ((rule.required !== undefined && !clauseArray(rule.required))
        || (rule.forbidden !== undefined && !clauseArray(rule.forbidden))
        || (limit !== undefined && (!limit || !nonempty(limit.text) || !Number.isInteger(limit.count) || limit.count < 0))
        || (rule.required === undefined && rule.forbidden === undefined && limit === undefined)) {
        throw new Error(`Invalid static clauses for ${rule.id}.`);
      }
      const missing = (rule.required || []).filter((text) => !generatedHtml.includes(text));
      const forbidden = (rule.forbidden || []).filter((text) => generatedHtml.includes(text));
      const occurrences = limit ? generatedHtml.split(limit.text).length - 1 : null;
      const failures = [
        ...missing.map((text) => `Missing ${JSON.stringify(text)}`),
        ...forbidden.map((text) => `Forbidden ${JSON.stringify(text)}`),
        ...(limit && occurrences > limit.count ? [`Found ${occurrences} occurrences, maximum ${limit.count}`] : [])
      ];
      addCheck(`Design rule: ${rule.id}`, failures.length === 0, `Source: ${rules.source}. ${failures.join("; ") || "Declared static clauses satisfied."}`);
    }
  } catch (error) {
    addCheck("Supplied design rules valid", false, error.message);
  }
}

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

const stateMatches = uniq([...html.matchAll(/data-prototype-state=["']([^"']+)["']/g)].map((m) => m[1]));
const stateCommentMatches = uniq([...html.matchAll(/STATE:\s*([^\n<]+)/g)].map((m) => m[1].trim()));
const allStates = uniq([...stateMatches, ...stateCommentMatches]);
if (mode === "figma-demo") {
  const blueprintNodeIds = uniq([...blueprint.matchAll(/\bnode-\d{2,}[-\w]*\b/gi)].map((m) => m[0]));
  const htmlNodeIds = uniq([
    ...[...html.matchAll(/data-(?:demo-)?node=["']([^"']+)["']/g)].map((m) => m[1]),
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
} else if (mode === "muse-proto-gen") {
  addCheck("State coverage recorded (informational)", true, `States: ${allStates.join(", ") || "none"}. muse-proto-gen requires no state markers; AC-level state coverage is muse-proto-judge's job, not this deterministic gate.`);
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
} else if (mode === "ux-audit") {
  const fixIds = uniq([...html.matchAll(/FIX:\s*([A-Z0-9-]+)/g)].map((m) => m[1]));
  addCheck("UX audit FIX markers present", fixIds.length > 0, `Found FIX IDs: ${fixIds.join(", ") || "none"}.`);
} else if (mode === "screenshot-delta") {
  const hasChangedRegion = /改动区 START|GENERATED START|PROTOTYPE GENERATED START/i.test(html);
  const hasKeepRegion = /保持区 START/i.test(html);
  addCheck("Screenshot delta changed region declared", hasChangedRegion, "Expected 改动区 or generated region markers.");
  addCheck("Screenshot delta preserved region declared", hasKeepRegion, "Expected 保持区 markers for unchanged screenshot areas.");
} else if (decisionIds.length > 0) {
  const missing = decisionIds.filter((id) => !mappedDecisionIds.includes(id));
  addCheck("Design decisions mapped", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : `${decisionIds.length}/${decisionIds.length} mapped.`);
} else if (mode === "standalone-mobile") {
  addCheck(
    "Standalone mobile traceability limitation recorded",
    /standalone mobile|独立移动端|不调用母版|traceability.*不完整|可追踪.*不完整/i.test(prototypeSpec),
    "prototype-spec.md must state carrier choice and incomplete traceability when no design brief is used."
  );
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
  ...checks.map((check) => `| ${check.name} | ${check.status || (check.passed ? "PASS" : "FAIL")} | ${String(check.detail).replace(/\n/g, "<br>")} |`),
  "",
  "## Screenshots",
  "",
  browserResult.screenshots.length ? browserResult.screenshots.map((item) => `- ${item}`).join("\n") : "- Not generated",
  "",
  "## Coverage",
  "",
  `- Primary utility usages (informational, no default quota): ${primaryCount}`,
  `- States: ${allStates.join(", ") || "none"}`,
  `- Design decisions in brief: ${decisionIds.join(", ") || "none"}`,
  `- Design decisions mapped in HTML: ${mappedDecisionIds.join(", ") || "none"}`,
  ""
].join("\n"));

console.log(`${passed ? "PASS" : "FAIL"} ${reportPath}`);
process.exit(passed ? 0 : 1);
