import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const checker = fileURLToPath(new URL("./verify-prototype.mjs", import.meta.url));
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
