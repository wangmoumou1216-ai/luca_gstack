#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

// Importing this module only exposes deterministic inspection; CLI still runs browser QA.
export function resolvePrototypeOptions(args = [], html = "", spec = "") {
  const fail = (message) => { const error = new Error(message); error.exitCode = 2; throw error; };
  const agreed = (values, name, valid) => {
    if (values.some((value) => !valid(value))) fail(`Invalid ${name}: ${values.join(", ")}`);
    if (new Set(values).size > 1) fail(`Conflicting ${name} declarations: ${values.join(", ")}`);
    return values[0] ?? null;
  };
  const purposeArgs = args.filter((arg) => arg === "--purpose" || arg.startsWith("--purpose="));
  const countArgs = args.filter((arg) => arg === "--ui-variants" || arg.startsWith("--ui-variants="));
  if (purposeArgs.length > 1 || countArgs.length > 1) fail("Duplicate purpose or UI variant CLI options.");
  const filePurposes = [
    ...[...html.matchAll(/data-prototype-purpose=["']([^"']*)["']/g)].map((m) => m[1]),
    ...[...spec.matchAll(/^purpose:\s*(\S+)\s*$/gm)].map((m) => m[1])
  ];
  const purposeValues = [...filePurposes, ...purposeArgs.map((arg) => arg.slice("--purpose=".length))];
  const purpose = agreed(purposeValues, "purpose", (v) => v === "ui" || v === "logic-validation") ?? "ui";
  const fileCounts = [
    ...[...html.matchAll(/data-ui-variant-count=["']([^"']*)["']/g)].map((m) => m[1]),
    ...[...spec.matchAll(/^ui_variant_count:\s*(\S+)\s*$/gm)].map((m) => m[1])
  ];
  const countValues = [...fileCounts, ...countArgs.map((arg) => arg === "--ui-variants" ? "3" : arg.slice("--ui-variants=".length))];
  const uiVariantCount = Number(agreed(countValues, "ui_variant_count", (v) => /^(0|[2-5])$/.test(v)) ?? "0");
  if (purpose === "logic-validation" && uiVariantCount > 0) fail("logic-validation cannot enable UI variants.");
  return { purpose, uiVariantCount };
}

export function extractPortableLogic(html) {
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const matches = scripts.flatMap((script) => [...script.matchAll(/\/\/ PROTOTYPE LOGIC START\s*\n([\s\S]*?)\/\/ PROTOTYPE LOGIC END/g)]);
  return matches.length === 1 ? matches[0][1] : null;
}

function variantBlocks(html) {
  return [...html.matchAll(/<!--\s*PROTOTYPE VARIANT START:\s*([A-E])\s*-->([\s\S]*?)<!--\s*PROTOTYPE VARIANT END:\s*\1\s*-->/g)]
    .map((m) => ({ key: m[1], html: m[2], name: m[2].match(/data-variant-name=["']([^"']+)["']/)?.[1] ?? "" }));
}

function declaredIds(spec, field) {
  const line = spec.match(new RegExp(`^${field}:\\s*(\\[[^\\n]*\\])\\s*$`, "m"));
  if (!line) return [];
  try {
    const value = JSON.parse(line[1]);
    return Array.isArray(value) && value.every((v) => typeof v === "string" && v.trim()) && new Set(value).size === value.length ? value : [];
  } catch { return []; }
}

export function inspectPrototype({ html, prototypeSpec = "", designBrief = "", blueprint = "",
  mode = "html-prototype", purpose = "ui", uiVariantCount = 0, specExists = true,
  rulesSupplied = false, designRules = null, designRulesError = null }) {
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
  ["Prototype spec exists", specExists, "prototype-spec.md is required."]
];
for (const [name, passed, detail] of forbidden) addCheck(name, passed, detail);
addCheck(
  "Generated region scoped or full-page accepted",
  true,
  hasScopedGeneratedRegion ? "Scoped generated/change region detected; style lint applies there." : "No generated/change region markers found; style lint applies to full HTML."
);

// Literal static clauses come from an actual supplied design source; absence is not compliance.
if (!rulesSupplied) {
  checks.push({ name: "Supplied design rules", passed: true, status: "N/A", detail: "No actual design rules supplied; visual compliance is unverified. General UX/browser checks still apply." });
} else {
  try {
    if (designRulesError) throw new Error(designRulesError);
    const rules = designRules;
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
      const targets = uiVariantCount > 0 ? variantBlocks(html).map((v) => [v.key, extractGeneratedHtml(v.html)]) : [[null, generatedHtml]];
      for (const [key, targetHtml] of targets) {
      const missing = (rule.required || []).filter((text) => !targetHtml.includes(text));
      const forbidden = (rule.forbidden || []).filter((text) => targetHtml.includes(text));
      const occurrences = limit ? targetHtml.split(limit.text).length - 1 : null;
      const failures = [
        ...missing.map((text) => `Missing ${JSON.stringify(text)}`),
        ...forbidden.map((text) => `Forbidden ${JSON.stringify(text)}`),
        ...(limit && occurrences > limit.count ? [`Found ${occurrences} occurrences, maximum ${limit.count}`] : [])
      ];
      addCheck(`${key ? `Variant ${key} ` : ""}Design rule: ${rule.id}`, failures.length === 0, `Source: ${rules.source}. ${failures.join("; ") || "Declared static clauses satisfied."}`);
      }
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
  if (purpose === "logic-validation") {
    checks.push({ name: "Current aesthetic score >= 24/30", passed: true, status: "N/A", detail: "Logic validation only; readability and all other gates remain." });
  } else if (uiVariantCount === 0) {
  const scoreMatch = prototypeSpec.match(/Current Aesthetic Score\s*[:：]\s*(\d{1,2})\s*\/\s*30/i)
    || prototypeSpec.match(/当前审美.*?(\d{1,2})\s*\/\s*30/s);
  const score = scoreMatch ? Number(scoreMatch[1]) : null;
  addCheck(
    "Current aesthetic score >= 24/30",
    score !== null && score >= 24,
    score === null ? "No Current Aesthetic Score found in prototype-spec.md." : `Found ${score}/30.`
  );
  }
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
} else {
  if (purpose === "logic-validation") {
    checks.push({ name: "State coverage markers present", passed: true, status: "N/A", detail: "Fixed five UI states only; actual logic states/transitions/errors/reset remain required." });
  } else {
    addCheck("State coverage markers present", allStates.length >= 5, `Found states: ${allStates.join(", ") || "none"}. Static markers are not browser evidence.`);
  }
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
} else if (purpose === "logic-validation") {
  addCheck("Logic question source recorded", /Logic Validation Coverage/.test(prototypeSpec) && /^Question source:\s*\S.+$/m.test(prototypeSpec), "Use the actual confirmed brief; do not fabricate D IDs for a standalone question.");
} else {
  addCheck("Design decisions mapped", mappedDecisionIds.length > 0, `No design brief IDs found; HTML mapped IDs: ${mappedDecisionIds.join(", ") || "none"}.`);
}

const textLength = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
addCheck("Non-empty rendered text", textLength > 200, `Approximate text length: ${textLength}.`);


const portableLogic = extractPortableLogic(html);
const variants = uiVariantCount > 0 ? variantBlocks(html) : [];
if (purpose === "logic-validation") {
  addCheck("Logic self-contained single script (static)", count(/<script\b/gi) === 1 && !/<(?:script|link|img|iframe)\b[^>]*(?:src|href)=["'](?!data:|#)[^"']+["']/i.test(html), "Single inline HTML/CSS/script; no loaded asset dependencies.");
  addCheck("Logic visible problem and readable state declared (static)", /data-prototype-problem\b/.test(html) && /data-prototype-state-panel\b/.test(html) && stateMatches.length > 0, "Browser must verify the actual visible question and full domain-state panel, not a JSON dump.");
  addCheck("Portable pure logic boundary (static)", Boolean(portableLogic) && /\bPrototypeLogic\b/.test(portableLogic) && !/\b(document|window|HTMLElement|localStorage|sessionStorage|fetch|XMLHttpRequest|indexedDB)\b|querySelector|addEventListener/.test(portableLogic), "Boundary/forbidden references only; extraction, semantic purity and no reverse page callbacks need independent evidence.");
  addCheck("Logic freeplay actions declared (static)", /data-prototype-freeplay\b/.test(html) && /<button\b[^>]*data-logic-action=/i.test(html), "Actual button actions and full re-rendering require browser observation.");
  addCheck("Logic tabbed walkthroughs declared (static)", /data-prototype-walkthrough-tabs\b/.test(html) && ["happy", "edge", "illegal"].every((key) => new RegExp(`data-show-walkthrough=["']${key}["']`).test(html)), "At least happy/edge/illegal tabs, each starting from its known initial state.");
  for (const key of ["happy", "edge", "illegal"]) {
    const block = html.match(new RegExp(`<[a-z][^>]*data-prototype-walkthrough=["']${key}["'][^>]*>([\\s\\S]*?)<!--\\s*WALKTHROUGH END:\\s*${key}\\s*-->`, "i"))?.[1] ?? "";
    addCheck(`Logic ${key} reset and real steps declared (static)`, /<button\b[^>]*data-walkthrough-reset\b/.test(block) && /<button\b[^>]*data-walkthrough-step=["'][^"']+["'][^>]*data-logic-action=["'][^"']+["']|<button\b[^>]*data-logic-action=["'][^"']+["'][^>]*data-walkthrough-step=["'][^"']+["']/.test(block), "Reset/steps are real buttons. Browser must prove known-state reset and explicit progression.");
  }
}
if (uiVariantCount > 0) {
  const expectedKeys = ["A", "B", "C", "D", "E"].slice(0, uiVariantCount);
  const actualKeys = [...html.matchAll(/data-prototype-variant=["']([^"']*)["']/g)].map((m) => m[1]);
  addCheck("UI variant stable keys and boundaries (static)", JSON.stringify(actualKeys) === JSON.stringify(expectedKeys) && JSON.stringify(variants.map((v) => v.key)) === JSON.stringify(expectedKeys), "Exact A…E prefix, each rendering subtree with matching START/END boundaries.");
  addCheck("UI variant count file contract (static)", new RegExp(`data-ui-variant-count=["']${uiVariantCount}["']`).test(html) && new RegExp(`^ui_variant_count:\\s*${uiVariantCount}\\s*$`, "m").test(prototypeSpec) && /UI Variant Coverage/.test(prototypeSpec), "HTML/spec/CLI counts agree; real comparison authorization remains a Human Gate.");
  addCheck("UI shared floating control contract (static)", count(/data-prototype-variant-switcher\b/g) === 1 && /data-variant-prev\b/.test(html) && /data-variant-next\b/.test(html) && /data-prototype-variant-label\b/.test(html) && /data-prototype-variant-error\b/.test(html) && /data-variant-recover=["']A["']/.test(html) && variants.every((v) => !/data-prototype-variant-switcher\b/.test(v.html)), "One shared bar outside rendering subtrees; actual floating layout, URL/focus/keyboard/recovery need browser evidence.");
  const contentIds = declaredIds(prototypeSpec, "common_content_ids");
  const requiredStates = uniq(["default", "empty", "loading", "error", "success", ...declaredIds(prototypeSpec, "required_state_ids")]);
  addCheck("UI common content source inventory declared (static)", contentIds.length > 0, "IDs must come from real role/scenario/module/metric/table/action/detail sources; markers alone do not prove conservation.");
  for (const variant of variants) {
    const key = variant.key;
    const states = uniq([...variant.html.matchAll(/data-prototype-state=["']([^"']+)["']/g)].map((m) => m[1]));
    const mapped = uniq([...variant.html.matchAll(/DECISION:\s*(D-\d{3})/g)].map((m) => m[1]));
    const presentContent = uniq([...variant.html.matchAll(/data-prototype-content-id=["']([^"']+)["']/g)].map((m) => m[1]));
    const scoreMatch = prototypeSpec.match(new RegExp(`Variant ${key} Current Aesthetic Score\\s*[:：]\\s*(\\d{1,2})\\s*\\/\\s*30`, "i"));
    variant.states = states;
    variant.declaredAestheticScore = scoreMatch ? Number(scoreMatch[1]) : null;
    addCheck(`Variant ${key} required UI states (static)`, requiredStates.every((state) => states.includes(state) && new RegExp(`data-show-state=["']${state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(variant.html)), `Each key needs five real state containers/buttons plus declared applicable states: ${requiredStates.join(", ")}. Comments do not count.`);
    addCheck(`Variant ${key} current aesthetic score >= 24/30 (declared)`, variant.declaredAestheticScore !== null && variant.declaredAestheticScore >= 24 && variant.declaredAestheticScore <= 30, `Declared ${variant.declaredAestheticScore ?? "none"}/30; independent rubric/source review still required.`);
    addCheck(`Variant ${key} common decisions mapped (static)`, decisionIds.every((id) => mapped.includes(id)), `Actual confirmed D IDs: ${decisionIds.join(", ") || "none in input; source-kind gates still apply"}. AC semantics need source review.`);
    addCheck(`Variant ${key} common content markers (static)`, contentIds.length > 0 && contentIds.every((id) => presentContent.includes(id)), "Marker inventory only; exact source content/roles/actions must be independently sampled.");
    addCheck(`Variant ${key} name declared (static)`, Boolean(variant.name), "Current bar must show key and this actual name.");
    addCheck(`Variant ${key} read-only actions declared (static)`, /<(?:button|a)\b[^>]*data-prototype-action=["'][^"']+["']/.test(variant.html), "Every applicable action is a real control/stub; browser traverses visible state and shared primary controls, semantics require source AC review.");
    if (mode === "ux-audit") addCheck(`Variant ${key} UX FIX markers present`, /FIX:\s*[A-Z0-9-]+/.test(variant.html), "Each key preserves the applicable UX fix contract.");
    if (mode === "screenshot-delta") addCheck(`Variant ${key} changed region declared`, /改动区 START|GENERATED START|PROTOTYPE GENERATED START/i.test(variant.html), "Shared preserved region remains required by the source-kind gate.");
    if (mode === "figma-demo") addCheck(`Variant ${key} Figma node coverage present`, /data-(?:demo-)?node=["'][^"']+["']|NODE:\s*[^\n<]+|data-prototype-state=/.test(variant.html), "Blueprint/build-decision gates above remain in force.");
  }
}
return { checks, primaryCount, states: allStates, decisionIds, mappedDecisionIds, variants, portableLogic };
}

async function probeBrowser({ htmlPath, screenshotDir, purpose, variants, checks }) {
  const result = { attempted: true, available: false, consoleErrors: [], screenshots: [], observations: [] };
  const add = (name, passed, detail) => checks.push({ name, passed: Boolean(passed), detail });
  let browser;
  try {
    const { chromium } = await import("playwright");
    browser = await chromium.launch({ headless: true });
    result.available = true;
    fs.mkdirSync(screenshotDir, { recursive: true });
    const viewports = [["desktop", { width: 1440, height: 900 }], ["tablet", { width: 1280, height: 720 }], ["mobile", { width: 390, height: 844 }]];
    const capture = async (page, name) => {
      await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
      result.screenshots.push(`screenshots/${name}.png`);
    };
    const keyVisible = async (page, key) => {
      const visible = [];
      for (const variant of variants) if (await page.locator(`[data-prototype-variant="${variant.key}"]`).isVisible()) visible.push(variant.key);
      const label = await page.locator("[data-prototype-variant-label]").textContent();
      const name = variants.find((variant) => variant.key === key)?.name;
      if (JSON.stringify(visible) !== JSON.stringify([key]) || !label.includes(key) || !label.includes(name)) throw new Error(`Variant ${key}: rendering subtree or key/name label mismatch.`);
    };
    for (const [viewportName, viewport] of viewports) {
      const page = await browser.newPage({ viewport });
      page.on("console", (msg) => { if (msg.type() === "error") result.consoleErrors.push({ viewport: viewportName, error: msg.text() }); });
      page.on("pageerror", (err) => result.consoleErrors.push({ viewport: viewportName, error: err.message }));
      const targets = variants.length ? variants : [{ key: null }];
      for (const variant of targets) {
        const url = new URL(pathToFileURL(htmlPath));
        if (variant.key) url.searchParams.set("variant", variant.key);
        await page.goto(url.href, { waitUntil: "networkidle" });
        if (variant.key) {
          await keyVisible(page, variant.key);
          await capture(page, `${viewportName}-variant-${variant.key}`);
          for (const state of variant.states) {
            // Re-open the same known variant before each state/action rather than borrowing prior state.
            await page.goto(url.href, { waitUntil: "networkidle" });
            const root = page.locator(`[data-prototype-variant="${variant.key}"]`);
            await root.locator(`[data-show-state="${state}"]`).first().click();
            const panel = root.locator(`[data-prototype-state="${state}"]`).first();
            if (!await panel.isVisible()) throw new Error(`Variant ${variant.key}: state ${state} did not become visible.`);
            await capture(page, `${viewportName}-variant-${variant.key}-state-${state.replace(/[^a-zA-Z0-9_-]/g, "_")}`);
            const actions = await root.locator("[data-prototype-action]").evaluateAll((nodes) => nodes.filter((node) => node.getClientRects().length > 0 && !node.closest("[hidden]")).map((node) => node.getAttribute("data-prototype-action")));
            const actionObservations = [];
            for (const [index, action] of actions.entries()) {
              await page.goto(url.href, { waitUntil: "networkidle" });
              const actionRoot = page.locator(`[data-prototype-variant="${variant.key}"]`);
              await actionRoot.locator(`[data-show-state="${state}"]`).first().click();
              const actionPanel = actionRoot.locator(`[data-prototype-state="${state}"]`).first();
              const before = await actionPanel.textContent();
              await actionRoot.locator(`[data-prototype-action="${action}"]:visible`).first().click();
              const after = await actionRoot.innerText();
              const screenshot = `${viewportName}-variant-${variant.key}-state-${state.replace(/[^a-zA-Z0-9_-]/g, "_")}-action-${index}`;
              await capture(page, screenshot);
              actionObservations.push({ action, before, after, screenshot: `screenshots/${screenshot}.png`, semanticVerdict: "REQUIRES_SOURCE_AC_REVIEW" });
            }
            result.observations.push({ viewport: viewportName, key: variant.key, state, actions: actionObservations, mechanicallyObserved: true, semanticVerdict: "REQUIRES_SOURCE_AC_REVIEW" });
          }
        } else if (purpose === "logic-validation") {
          if (!await page.locator("[data-prototype-problem]").isVisible() || !await page.locator("[data-prototype-state-panel]").isVisible()) throw new Error("Logic problem/state panel is not visible.");
          const freeplayActions = await page.locator("[data-prototype-freeplay] button[data-logic-action]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-logic-action")));
          if (!freeplayActions.length) throw new Error("Logic has no actual freeplay buttons.");
          for (const [index, action] of freeplayActions.entries()) {
            await page.goto(url.href, { waitUntil: "networkidle" });
            const before = await page.locator("[data-prototype-state-panel]").textContent();
            await page.locator(`[data-prototype-freeplay] button[data-logic-action="${action}"]`).first().click();
            const after = await page.locator("[data-prototype-state-panel]").textContent();
            await capture(page, `${viewportName}-freeplay-${index}`);
            result.observations.push({ viewport: viewportName, action, before, after, semanticVerdict: "REQUIRES_MODEL_AC_AND_EXTRACTED_MODULE_REVIEW" });
          }
          for (const key of ["happy", "edge", "illegal"]) {
            await page.locator(`[data-show-walkthrough="${key}"]`).click();
            const panel = page.locator(`[data-prototype-walkthrough="${key}"]`);
            if (!await panel.isVisible()) throw new Error(`Walkthrough ${key} did not open.`);
            await panel.locator("button[data-walkthrough-reset]").click();
            const initial = await page.locator("[data-prototype-state-panel]").textContent();
            const steps = await panel.locator("button[data-walkthrough-step]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-walkthrough-step")));
            if (!steps.length) throw new Error(`Walkthrough ${key} has no real steps.`);
            for (const [index, step] of steps.entries()) {
              const before = await page.locator("[data-prototype-state-panel]").textContent();
              await panel.locator(`button[data-walkthrough-step="${step}"]`).click();
              const after = await page.locator("[data-prototype-state-panel]").textContent();
              await capture(page, `${viewportName}-walkthrough-${key}-step-${index}`);
              result.observations.push({ viewport: viewportName, walkthrough: key, step, before, after, semanticVerdict: "REQUIRES_MODEL_AC_AND_EXPLICIT_PROGRESSION_REVIEW" });
            }
            await panel.locator("button[data-walkthrough-reset]").click();
            const restored = await page.locator("[data-prototype-state-panel]").textContent();
            if (restored !== initial) throw new Error(`Walkthrough ${key} reset did not restore its known rendered initial state.`);
            await capture(page, `${viewportName}-walkthrough-${key}-reset`);
          }
          await capture(page, viewportName);
        } else {
          // Original default UI/demo path: three viewport screenshots, no new state/action effects.
          await capture(page, viewportName);
        }
      }
      if (variants.length && viewportName === "desktop") {
        const keys = variants.map((v) => v.key);
        const checkUrl = (page, key) => {
          const actual = new URL(page.url());
          if (actual.searchParams.get("variant") !== key || actual.searchParams.get("qa-preserve") !== "sentinel" || actual.hash !== "#qa-anchor") throw new Error("Variant navigation lost key, other query or hash.");
        };
        for (const key of keys) {
          const link = new URL(pathToFileURL(htmlPath));
          link.searchParams.set("qa-preserve", "sentinel"); link.searchParams.set("variant", key); link.hash = "qa-anchor";
          await page.goto(link.href, { waitUntil: "networkidle" }); await keyVisible(page, key);
          await page.reload({ waitUntil: "networkidle" }); await keyVisible(page, key); checkUrl(page, key);
        }
        const first = new URL(page.url()); first.searchParams.set("variant", keys[0]);
        await page.goto(first.href, { waitUntil: "networkidle" });
        await page.locator("[data-variant-prev]").click(); await keyVisible(page, keys.at(-1)); checkUrl(page, keys.at(-1));
        await page.locator("[data-variant-next]").click(); await keyVisible(page, keys[0]); checkUrl(page, keys[0]);
        await page.keyboard.press("ArrowLeft"); await keyVisible(page, keys.at(-1)); checkUrl(page, keys.at(-1));
        await page.keyboard.press("ArrowRight"); await keyVisible(page, keys[0]); checkUrl(page, keys[0]);
        for (const kind of ["input", "textarea", "contenteditable"]) {
          // Temporary in-memory QA focus fixtures exercise the existing page key handler; not product content evidence.
          await page.evaluate((kind) => {
            const node = document.createElement(kind === "contenteditable" ? "div" : kind);
            node.id = "prototype-qa-focus";
            if (kind === "contenteditable") { node.contentEditable = "true"; const child = document.createElement("span"); child.tabIndex = 0; child.textContent = "QA focus"; node.append(child); document.body.append(node); child.focus(); }
            else { document.body.append(node); node.focus(); }
          }, kind);
          await page.keyboard.press("ArrowRight"); await keyVisible(page, keys[0]); checkUrl(page, keys[0]);
          await page.keyboard.press("ArrowLeft"); await keyVisible(page, keys[0]); checkUrl(page, keys[0]);
          await page.locator("#prototype-qa-focus").evaluate((node) => node.remove());
        }
        const unknown = new URL(page.url()); unknown.searchParams.set("variant", "UNKNOWN");
        await page.goto(unknown.href, { waitUntil: "networkidle" });
        if (!await page.locator("[data-prototype-variant-error]").isVisible()) throw new Error("Unknown variant silently substituted a valid key.");
        for (const key of keys) if (await page.locator(`[data-prototype-variant="${key}"]`).isVisible()) throw new Error("Unknown variant renders a valid subtree.");
        await page.locator('[data-variant-recover="A"]').click(); await keyVisible(page, "A"); checkUrl(page, "A");
        result.observations.push({ navigation: "deep-link/reload/arrow/keyboard/focus/other-query/hash/unknown-recovery", mechanicallyObserved: true });
      }
      await page.close();
    }
    add("Browser screenshots generated", variants.length || purpose === "logic-validation" ? result.screenshots.length >= 3 : result.screenshots.length === 3, result.screenshots.join(", "));
    add("Console errors = 0", result.consoleErrors.length === 0, result.consoleErrors.map((e) => `${e.viewport}: ${e.error}`).join("\n"));
    if (variants.length || purpose === "logic-validation") add("Browser mechanical traversal completed", true, "Recorded actual key/state/action/reset/navigation observations. Semantic model/AC, source conservation, independent scoring and real user selection remain separate evidence.");
  } catch (error) {
    result.error = error.message;
    add("Browser verification available", false, `Playwright unavailable or failed: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
  return result;
}

export async function verifyPrototype(args = process.argv.slice(2)) {
const input = args[0];
if (!input) {
  console.error("Usage: verify-prototype.mjs <docs/prototype/.../index.html> [design-brief.md] [--purpose=ui|logic-validation] [--ui-variants=N]");
  process.exit(2);
}

const htmlPath = path.resolve(input);
const extraArgs = args.slice(1);
const modeArg = extraArgs.find((arg) => arg.startsWith("--mode="));
const explicitMode = modeArg ? modeArg.split("=")[1] : null;
// Retired explicit modes must not silently enter the legacy unknown-mode fallback.
if (explicitMode?.toLowerCase() === "muse-proto-gen") {
  console.error("RETIRED: muse-proto-gen QA mode is unavailable; no replacement mode was selected.");
  process.exit(2);
}
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
const allowedModes = new Set(["html-prototype", "figma-demo", "standalone-mobile", "ux-audit", "screenshot-delta"]);
const mode = explicitMode && allowedModes.has(explicitMode) ? explicitMode : inferredMode;


let options;
try { options = resolvePrototypeOptions(extraArgs, html, prototypeSpec); }
catch (error) { console.error(error.message); return error.exitCode ?? 2; }
let designRules = null;
let designRulesError = null;
const rulesSupplied = Boolean(designRulesArg) || fs.existsSync(designRulesPath);
if (rulesSupplied) {
  try { designRules = JSON.parse(fs.readFileSync(designRulesPath, "utf8")); }
  catch (error) { designRulesError = error.message; }
}
const { checks, primaryCount, states: allStates, decisionIds, mappedDecisionIds, variants } = inspectPrototype({
  html, prototypeSpec, designBrief, blueprint, mode, ...options,
  specExists: fs.existsSync(prototypeSpecPath), rulesSupplied, designRules, designRulesError
});
const browserResult = await probeBrowser({ htmlPath, screenshotDir, purpose: options.purpose, variants, checks });
const passed = checks.every((check) => check.passed);
const results = {
  htmlPath,
  designBriefPath,
  mode,
  purpose: options.purpose,
  uiVariantCount: options.uiVariantCount,
  variantCoverage: variants.map(({ key, name, states, declaredAestheticScore }) => ({ key, name, states, declaredAestheticScore, sourceSemanticReview: "REQUIRED" })),
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
  `Purpose: ${options.purpose}; UI variants: ${options.uiVariantCount}`,
  "Evidence boundary: marker/declaration checks and mechanical browser observations do not prove model/AC semantics, content conservation, independent scores or real user selection.",
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
return passed ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await verifyPrototype();
}
