# 新增模板：Agent 快速指南

用途：给本库新增一个可发现、可预览、可安全绑定的模板。不是运行 OD，也不授权发布。
从仓库根执行；字段以本目录 `schema.json` 为准，采用/置信与人类门以
[`runtime/page-context.md`](../runtime/page-context.md) 为准。无需重读其他设计 skill 或修改路由词表。

## 1. 确认源与新增身份

- **先复制，不重写。** 用户提供的 HTML 必须逐字节复制。CSS、脚本、内嵌资源、隐藏 template 状态和现有交互代码全部保留；不格式化、不加锚点、不插说明、不用简化页或截图代替原件。
- 取得用户给定的准确 HTML/资产、用途和新增授权；只读原文件。不要从模板推断当前项目/设计系统。
- 检查 `catalog.json` 和 `retired_page_ids`，选从未使用过的 `page_id`；旧页不覆盖、不删、不复用 ID。
- 原件副本放 `sources/originals/<page_id>.html`；source_ref 填仓库相对完整路径。外置资源保持原相对路径和字节，原件及 `framework/` 只读。当前 `original-preserving-v1` 只交接自包含 HTML；发现原 CSP 未阻断的外置 CSS/JS/图片/字体等依赖时会以 `ORIGINAL_ASSETS_REQUIRED` 停住。先保留整套原始资产并补经审计的资产闭包能力，未支持前不得标成 `adapter-available`，更不能只运 HTML 冒充完整模板。
- 在 source-manifest.json 记录真实原件路径、字节数、SHA-256 与 copy_source。运行 `node scripts/template-copy.mjs import`：只创建新副本，已存在的不同字节不覆盖；随后 `node scripts/template-copy.mjs verify --audit-originals` 逐字节比较。
- P0 不支持脚本或复杂状态时是验证器/适配器的能力缺口，**不是删改模板的许可**。保留完整副本，标明执行待适配；先停住，不生成替身。

## 2. 登记真实结构

先运行 `node scripts/original-template-index.mjs --write`，从完整副本惰性提取已有位置，旁车写入
`original-index/<page_id>.json`。它包含源hash、解析器版本、原有锚点、template状态作用域及脚本/样式指纹，
不执行原脚本、不注入HTML。`unique_in_scope=false` 的位置不得直接采用；`data-source-node` 仅是
捕获线索，不是稳定模块ID。定位前可用 `locateOriginalNode` 从实际原件重新验证，拒绝版本漂移/歧义。

登记信息放在外置 catalog/旁车中，不写入原 HTML。四份原件使用 `original_copy.status=adapter-available` 和
`original-preserving-v1` 路径；每轮仍须验证具体位置/范围及实际输出，不表示所有交互均已验收。
不能沿用旧影子页的 module/slot/state，也不能设为旧静态 `carrier_eligible`。原件交接参数见 runtime §7。

先读 `schema.json` 的 `page`、`module`、`slot` 及状态支持字段，然后参照一个结构相近的现有条目：

- 页面：用途、名称/别名、source_ref、viewport、全部状态，`scope=framework`、lifecycle、carrier_eligible。
- regions：供检索/预览，唯一真实锚点与真实父子关系；一个标题不是整组字段的区域边界。
- modules：语义 module_id、唯一 `id|data-module` 锚点、parent、允许 modify/remove/preserve、required、保持不变量。
  必须有唯一 `parent_module_id=null` 的 required root，禁止 remove；其他模块都连接到该根。
- slots：仅供 add，唯一锚点、真实 parent module、清晰的新增职责；不能用任意 CSS selector。
- state_support：逐状态明确 supported/unsupported；支持项必须有真实锚点与可操作 target，缺证据写原因。
  “列出了状态名称”不等于 supported。未完成审计的条目不开放 carrier。

完成条件：每个可用状态与修改位置都能在真实源/预览里指出；不存在重复锚点或伪父子关系。

## 3. 计算版本（不要手填 hash）

`source_hash` 是源 HTML 原始 bytes 的 SHA-256（不要格式化后另算）。登记结构后，用现有 helper：

```js
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { computeModuleContractHash, computeCatalogHash } from './scripts/page-context.mjs';
import { parseCarrierDom } from './scripts/carrier-dom.mjs';
// page/catalog 是准备写回的完整登记对象；本示例不自行写文件。
// 仅在选择静态执行适配器时尝试；拒绝后保留原件，绝不重写以求通过。
parseCarrierDom(await readFile(page.source_ref, 'utf8'));
page.source_hash = createHash('sha256').update(await readFile(page.source_ref)).digest('hex');
page.module_contract_hash = computeModuleContractHash(page);
const catalogHash = computeCatalogHash(catalog); // 用于本轮判断证据，不是静态采用授权
```

副本 source_hash 必须等于原件 raw_sha256，字节数也必须相同；不是两份不同文件分别算 hash 就算绑定。
任何 source/module/catalog 变化都会使旧绑定证据失效；新版本不能沿用旧采用确认。

## 4. 验证与反例

```sh
node scripts/page-context.mjs validate
node scripts/test-template-copy.mjs --audit-originals
node scripts/test-original-template-edits.mjs
node scripts/test-original-copy-handoff.mjs
node scripts/page-context.mjs phase-a-discovery --query '新页的自然用途描述'
node scripts/test-page-context.mjs
node scripts/test-carrier-asset-profile.mjs
node scripts/test-page-context-preview.mjs
node scripts/test-template-flow.mjs
```

有原始来源文件时另外显式跑 `node scripts/test-page-context.mjs --audit-originals` 和
`node scripts/test-carrier-asset-profile.mjs --audit-originals`；缺少原始文件会失败，不能把未审计写成 PASS。

检索命中只是线索：用未写 page_id 的真实需求核对用途/状态/位置，低置信不得强推。
从 `scripts/page-context-preview.mjs` 的 CLI usage 取当前参数，隔离渲染新页并查看实际截图，不能
只看退出码。给新页增加至少一组合法绑定和重复锚点/错误状态/非法动作的负例；carrier 实际组包
使用真实冻结 Packet 与 TAC。常规测试不得依赖个人桌面路径；原始来源审计必须显式运行并报告结果。

## 5. 入库交付

交付 page_id、原件=副本的 hash/字节证明、外置定位清单及已验证范围。惰性预览不执行脚本，不算交互验收。
模板入库通过不等于真实 OD 生成验收；需要 OD 时另走准确项目/new namespace 与分离授权。
按任务的独立审查和 Git 授权门收尾。不要自动切项目、写 OD、修改 `framework/` 或推送。

<!-- FILE_END: page-library/README.md -->
