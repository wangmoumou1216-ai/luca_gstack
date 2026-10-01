import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { resolvePrototypeOptions, inspectPrototype, extractPortableLogic } from "./verify-prototype.mjs";

const checker = fileURLToPath(new URL("./verify-prototype.mjs", import.meta.url));

// These deterministic tests run without browser, network, dependency installation or report I/O.
let staticAssertions = 0;
function check(condition, message) { assert.ok(condition, message); staticAssertions += 1; }
function rejected(args, html = "", spec = "") {
  assert.throws(() => resolvePrototypeOptions(args, html, spec), (error) => error.exitCode === 2); staticAssertions += 1;
}
const originalOptions = resolvePrototypeOptions([]);
assert.deepEqual(originalOptions, { purpose: "ui", uiVariantCount: 0 }); staticAssertions += 1;
assert.deepEqual(resolvePrototypeOptions(["--ui-variants"]), { purpose: "ui", uiVariantCount: 3 }); staticAssertions += 1;
for (const n of [0, 2, 3, 4, 5]) { assert.equal(resolvePrototypeOptions([`--ui-variants=${n}`]).uiVariantCount, n); staticAssertions += 1; }
for (const arg of ["--purpose=unknown", "--purpose", "--ui-variants=1", "--ui-variants=6", "--ui-variants=-1", "--ui-variants=2.5", "--ui-variants=03", "--ui-variants="]) rejected([arg]);
rejected(["--purpose=logic-validation", "--ui-variants=2"]);
rejected(["--purpose=ui"], '<html data-prototype-purpose="logic-validation">');
rejected([], '<html data-prototype-purpose="ui">', "purpose: logic-validation\n");
rejected(["--ui-variants=3"], '<html data-ui-variant-count="2">');
rejected([], '<html data-ui-variant-count="2">', "ui_variant_count: 3\n");
rejected(["--purpose=ui", "--purpose=ui"]);
const prose = "Domain question, current activity, next action, error and recovery control. ".repeat(5);
const states = ["default", "empty", "loading", "error", "success"];
const defaultHtml = `<html><body><!-- DECISION: D-001 -->${states.map((s) => `<section data-prototype-state="${s}">${prose}</section>`).join("")}</body></html>`;
const baseSpec = "Dynamic Reference Status: NOT_REQUIRED\nCurrent Aesthetic Score: 24/30\n";
const base = { html: defaultHtml, prototypeSpec: baseSpec };
const failures = (report) => report.checks.filter((c) => !c.passed).map((c) => c.name);
check(failures(inspectPrototype(base)).length === 0, "Default UI static behavior preserved");
check(inspectPrototype(base).checks.find((c) => c.name === "Supplied design rules").status === "N/A", "No rules means N/A");
const rule = { source: "actual fixture source", checks: [{ id: "literal", required: ["Domain question"], forbidden: ["FORBIDDEN"] }] };
check(failures(inspectPrototype({ ...base, rulesSupplied: true, designRules: rule })).length === 0, "Actual supplied rule passes");
check(failures(inspectPrototype({ ...base, html: defaultHtml + "FORBIDDEN", rulesSupplied: true, designRules: rule })).includes("Design rule: literal"), "Rule violation fails");
check(failures(inspectPrototype({ ...base, rulesSupplied: true, designRulesError: "missing file" })).includes("Supplied design rules valid"), "Missing supplied rules fail");
check(failures(inspectPrototype({ ...base, html: defaultHtml.replace("<!-- DECISION: D-001 -->", "") })).includes("Design decisions mapped"), "UI cannot lose decision gate");
check(failures(inspectPrototype({ ...base, prototypeSpec: baseSpec.replace("24/30", "23/30") })).includes("Current aesthetic score >= 24/30"), "UI cannot use logic aesthetics exemption");
check(failures(inspectPrototype({ ...base, html: defaultHtml.replaceAll('data-prototype-state=', 'not-state=') })).includes("State coverage markers present"), "UI fixed states retained");
const scoped = `FORBIDDEN<!-- GENERATED START -->${defaultHtml}<!-- GENERATED END -->`;
check(!failures(inspectPrototype({ ...base, html: scoped, rulesSupplied: true, designRules: rule })).includes("Design rule: literal"), "Preserved region remains outside style scope");
check(inspectPrototype({ ...base, mode: "figma-demo", blueprint: "nodes:\n  node-01-first:\n", prototypeSpec: baseSpec + "blueprint.yaml", html: defaultHtml + '<div data-node="node-01-first"></div>' }).checks.some((c) => c.name === "Figma demo blueprint exists" && c.passed), "Figma gates remain");
check(failures(inspectPrototype({ ...base, mode: "ux-audit" })).includes("UX audit FIX markers present"), "UX FIX gate remains");
check(failures(inspectPrototype({ ...base, mode: "screenshot-delta" })).includes("Screenshot delta preserved region declared"), "Screenshot preservation gate remains");
check(inspectPrototype({ ...base, html: defaultHtml.replace("<!-- DECISION: D-001 -->", ""), mode: "standalone-mobile", prototypeSpec: baseSpec + "standalone mobile traceability 不完整" }).checks.some((c) => c.name === "Standalone mobile traceability limitation recorded" && c.passed), "Standalone gate remains");

const logicModule = `const PrototypeLogic = { initial: () => ({ count: 0 }), transition: (state, action) => action === "add" ? ({ count: state.count + 1 }) : ({ ...state }) };\n`;
const walks = ["happy", "edge", "illegal"].map((key) => `<section data-prototype-walkthrough="${key}"><button data-walkthrough-reset>Reset</button><button data-walkthrough-step="first" data-logic-action="add">Add</button></section><!-- WALKTHROUGH END: ${key} -->`).join("");
const logicHtml = `<html data-prototype-purpose="logic-validation"><body><h1 data-prototype-problem>${prose}</h1><dl data-prototype-state-panel data-prototype-state="initial"><dt>Count</dt><dd>0</dd></dl><nav data-prototype-freeplay><button data-logic-action="add">Add</button></nav><nav data-prototype-walkthrough-tabs>${["happy", "edge", "illegal"].map((key) => `<button data-show-walkthrough="${key}">${key}</button>`).join("")}</nav>${walks}<script>// PROTOTYPE LOGIC START\n${logicModule}// PROTOTYPE LOGIC END\n</script></body></html>`;
const logicSpec = "purpose: logic-validation\nui_variant_count: 0\nDynamic Reference Status: NOT_REQUIRED\nLogic Validation Coverage\nQuestion source: actual confirmed fixture brief\n";
const logicInput = { html: logicHtml, prototypeSpec: logicSpec, purpose: "logic-validation" };
check(failures(inspectPrototype(logicInput)).length === 0, "Logic exemption preserves all remaining static gates");
check(inspectPrototype(logicInput).checks.filter((c) => c.status === "N/A" && /aesthetic|State coverage/.test(c.name)).length === 2, "Only aesthetic and fixed-state gates N/A");
check(failures(inspectPrototype({ ...logicInput, html: logicHtml.replace("const PrototypeLogic", "document.title; const PrototypeLogic") })).includes("Portable pure logic boundary (static)"), "DOM contamination fails");
check(failures(inspectPrototype({ ...logicInput, html: logicHtml.replace('data-walkthrough-reset', 'not-reset') })).includes("Logic happy reset and real steps declared (static)"), "Missing known-state reset fails");
check(failures(inspectPrototype({ ...logicInput, html: logicHtml.replace('data-walkthrough-step="first"', 'not-step="first"') })).includes("Logic happy reset and real steps declared (static)"), "Missing real step fails");
check(failures(inspectPrototype({ ...logicInput, html: logicHtml.replace('data-prototype-problem', 'not-problem') })).includes("Logic visible problem and readable state declared (static)"), "Missing visible question fails");
const lifted = vm.runInNewContext(`${extractPortableLogic(logicHtml)}\nPrototypeLogic`, {}, { timeout: 1000 });
const one = lifted.transition(lifted.initial(), "add");
check(JSON.stringify(one) === '{"count":1}', "Independent fixture logic block is extractable; not native portability proof");

function variantHtml(keys = ["A", "B", "C"]) {
  return `<html data-prototype-purpose="ui" data-ui-variant-count="3"><body>${keys.map((key) => `<!-- PROTOTYPE VARIANT START: ${key} --><section data-prototype-variant="${key}" data-variant-name="Layout ${key}"><!-- DECISION: D-001 -->${prose}<p data-prototype-content-id="source-role">Same actual role</p><button data-prototype-action="primary">Inspect source</button>${states.map((s) => `<button data-show-state="${s}">${s}</button><section data-prototype-state="${s}">${prose}</section>`).join("")}</section><!-- PROTOTYPE VARIANT END: ${key} -->`).join("")}<nav data-prototype-variant-switcher><button data-variant-prev>Prev</button><span data-prototype-variant-label></span><button data-variant-next>Next</button></nav><p data-prototype-variant-error><button data-variant-recover="A">Recover</button></p></body></html>`;
}
const variantSpec = `purpose: ui\nui_variant_count: 3\nDynamic Reference Status: NOT_REQUIRED\nUI Variant Coverage\ncommon_content_ids: ["source-role"]\n${["A", "B", "C"].map((key) => `Variant ${key} Current Aesthetic Score: 24/30`).join("\n")}\n`;
const variantInput = { html: variantHtml(), prototypeSpec: variantSpec, uiVariantCount: 3, designBrief: "D-001" };
check(failures(inspectPrototype(variantInput)).length === 0, "Every variant has its own static contract");
check(inspectPrototype({ ...variantInput, uiVariantCount: 0 }).variants.length === 0, "Count zero never enables variant traversal from markers");
check(!failures(inspectPrototype({ ...variantInput, html: variantHtml().replaceAll('data-ui-variant-count="3"', "data-ui-variant-count='3'") })).includes("UI variant count file contract (static)"), "Single-quoted HTML count is equivalent");
check(failures(inspectPrototype({ ...variantInput, html: variantHtml(["C", "B", "A"]) })).includes("UI variant stable keys and boundaries (static)"), "Reordering stable keys fails");
check(failures(inspectPrototype({ ...variantInput, prototypeSpec: variantSpec.replace("Variant B Current Aesthetic Score: 24/30", "Variant B Current Aesthetic Score: 23/30") })).includes("Variant B current aesthetic score >= 24/30 (declared)"), "Each variant independently retains score gate");
check(failures(inspectPrototype({ ...variantInput, html: variantHtml().replace('data-prototype-state="empty"', 'not-state="empty"') })).includes("Variant A required UI states (static)"), "State omission in one variant fails despite other variants");
check(failures(inspectPrototype({ ...variantInput, html: variantHtml().replace('data-prototype-content-id="source-role"', 'data-prototype-content-id="other"') })).includes("Variant A common content markers (static)"), "Per-key inventory omission fails, not semantic conservation proof");
check(failures(inspectPrototype({ ...variantInput, html: variantHtml().replace("<!-- DECISION: D-001 -->", "") })).includes("Variant A common decisions mapped (static)"), "Per-key decision omission fails");
check(failures(inspectPrototype({ ...variantInput, html: variantHtml().replace('data-prototype-variant-error', 'not-error') })).includes("UI shared floating control contract (static)"), "Unknown-key recovery contract required");
console.log(`PASS ${staticAssertions} deterministic assertions; STATIC_CONTRACT_ONLY; native/browser/model semantics/real selection NOT_RUN.`);
if (process.argv.includes("--static-only")) process.exit(0);
// The full existing browser regression suite remains the default test entry, for authorized Htest.
const { chromium } = await import("playwright");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prototype-design-rules-"));
const htmlPath = path.join(dir, "index.html");
const rulesPath = path.join(dir, "design-rules.json");
const fixture = `<!doctype html><html><head><style>body { font-family: system-ui; color: #2563eb; }</style></head><body>
<!-- DECISION: D-001 -->
${["default", "empty", "loading", "error", "success"].map((state) => `<section data-prototype-state="${state}" class="bg-primary bg-blue-500 text-gray-900 text-sm"><p>${"Customer activity, next action, status explanation and recovery controls. ".repeat(4)}</p></section>`).join("\n")}
</body></html>`;
fs.writeFileSync(htmlPath, fixture);
fs.writeFileSync(path.join(dir, "prototype-spec.md"), "Dynamic Reference Status: NOT_REQUIRED\nCurrent Aesthetic Score: 24/30\n");

function run(expectedExit, extra = []) {
  const result = spawnSync(process.execPath, [checker, htmlPath, ...extra], { encoding: "utf8" });
  const report = JSON.parse(fs.readFileSync(path.join(dir, "qa-results.json"), "utf8"));
  assert.equal(result.status, expectedExit, JSON.stringify({ output: result.stdout, error: result.stderr, failures: report.checks.filter((c) => !c.passed) }));
  return report;
}

// External styles and a system font are valid without the retired brand rules.
let report = run(0);
assert.equal(report.checks.find((c) => c.name === "Supplied design rules").status, "N/A");
assert.equal(report.browser.screenshots.length, 3);
assert.ok(report.checks.some((c) => c.name === "Console errors = 0" && c.passed));

const rules = { source: "Test design specification v1", checks: [
  { id: "accent", required: ["#2563eb"], forbidden: ["#ff8000"] },
  { id: "font", required: ["font-family: system-ui"] },
  { id: "accent-locations", maxOccurrences: { text: "bg-primary", count: 5 } }
] };
fs.writeFileSync(rulesPath, JSON.stringify(rules));
report = run(0);
assert.equal(report.checks.filter((c) => c.name.startsWith("Design rule:")).length, 3);

// Prove the actual rule bites: pass → exact violation / exit 1 → restored pass.
fs.writeFileSync(htmlPath, fixture.replace("#2563eb", "#ff8000"));
report = run(1);
assert.deepEqual(report.checks.filter((c) => !c.passed).map((c) => c.name), ["Design rule: accent"]);
assert.match(report.checks.find((c) => c.name === "Design rule: accent").detail, /Forbidden/);
fs.writeFileSync(htmlPath, fixture);
run(0);

// A supplied file is never silently treated as absent or compliant.
report = run(1, [`--design-rules=${path.join(dir, "missing.json")}`]);
assert.ok(report.checks.some((c) => c.name === "Supplied design rules valid" && !c.passed));
fs.writeFileSync(rulesPath, JSON.stringify({ source: "Test", checks: [{ id: "empty" }] }));
report = run(1);
assert.ok(report.checks.some((c) => c.name === "Supplied design rules valid" && !c.passed));

// The generated-region boundary still excludes preserved source styling.
fs.writeFileSync(rulesPath, JSON.stringify(rules));
fs.writeFileSync(htmlPath, `<aside style="color:#ff8000">Preserved reference</aside><!-- GENERATED START -->${fixture}<!-- GENERATED END -->`);
run(0);

// General failures still block even when style rules pass.
fs.writeFileSync(htmlPath, fixture.replace("<!-- DECISION: D-001 -->", ""));
report = run(1);
assert.deepEqual(report.checks.filter((c) => !c.passed).map((c) => c.name), ["Design decisions mapped"]);
fs.writeFileSync(htmlPath, fixture);
run(0);

// Removing legacy design resources must preserve the independent demo controller.
const templatePath = fileURLToPath(new URL("../../figma-demo/templates/demo-template.html", import.meta.url));
const template = fs.readFileSync(templatePath, "utf8")
  .replace("<!-- ASSEMBLY: INSERT NODE CONTAINERS HERE -->", '<section class="demo-node active" data-node="node-01-first">First node</section><section class="demo-node" data-node="node-02-second">Second node</section>');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  const requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  await page.setContent(template);
  assert.equal(await page.locator(".demo-progress-dot").count(), 2);
  assert.equal(await page.locator("#demo-container").evaluate((el) => el.getBoundingClientRect().height), 844);
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector('[data-node="node-02-second"]').classList.contains("active") && !document.querySelector('[data-node="node-01-first"]').classList.contains("active"));
  assert.match(await page.locator("#demo-node-label").textContent(), /2 \/ 2/);
  await page.keyboard.press("ArrowLeft");
  await page.waitForFunction(() => document.querySelector('[data-node="node-01-first"]').classList.contains("active") && !document.querySelector('[data-node="node-02-second"]').classList.contains("active"));
  await page.locator('button[title="隐藏控制栏"]').click();
  assert.equal(await page.locator("#demo-restore-controls").isVisible(), true);
  await page.getByRole("button", { name: "显示控制栏" }).click();
  assert.equal(await page.locator("#demo-restore-controls").isVisible(), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
} finally {
  await browser.close();
}
console.log(`PASS prototype rule and general QA checks; evidence: ${dir}`);
