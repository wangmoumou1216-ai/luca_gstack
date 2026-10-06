# W27：P07原生启动恢复检查包准备

**DONE_WITH_CONCERNS，仅W27静态准备交付。** 一套精确草案已经生成，14项离线完整性/拒绝检查通过。没有运行检查脚本、模型、probe或新app-server；没有登记P07。最终driver仍PENDING，需root收取W28/W29、冻结最终身份及非作者就绪检查后机械登记一次；本报告不是运行批准或框架主体落地。

## 输入、所有权和当前交付

完整读取W27任务（365d7b8d10fc083c5a2e74f9c344e166f52efc380471da5b1e240896af6932d1）、补充9（1e884bb8f68d0f615bb790384e426cfe6ba3fe680354fce388ba3c13bea3a3ca）、R6（b79ad202691866422421c9255df424d6082cca9d3a542800837bc7d8d7479156）及启动metadata（9b8b217eabaf687f722402e6b2d6388bb11f8b6f7156dd714d7ae9870cbfab1d）。N04沿用本人完整已读/已写相同SHA f262a9c21c714857e561a1cdcab6b715feb964b61424b38c3eb01d70a31693b3。完整读取P06 case/registration/manifest/preparation与launch.py，只作为精确模板，没有执行旧launcher。途中完整读补充9澄清1；不重置本turn预算。

仅新增本报告与下表五文件，均在 `/Users/luca/Desktop/luca_gstack/framework-audit/`；未改8812既有conditions、root f351、其他owner代码、原P06资料/失败、master manifest、全局配置/权限/凭据、生产规则或真实项目。没有private/archives读取、网络请求、Agent、提交推送。仅按任务明确允许做短暂loopback bind选端口，未listen、未长期保留socket。

| 文件 | bytes | SHA256 |
|---|---:|---|
| u007-p07-prepare.py | 16322 | 77cdee823858edd93c739cb291f56641b1e870ae9eaee7393c85618089ad670a |
| u007-p07-preparation.json | 13103 | ce2bbf04c3b9f9dd690fc2aa9f6c4e49ed4c94c33d7fbd8dfb7307f34e26f6f4 |
| u007-p07-case-draft.json | 20678 | 9cfa23dee88cd24eb6abfdfa1f56e31273677ca136008bd86328eb361d8e85ec |
| u007-p07-registration-draft.json | 5680 | e65cbb4dd05fa10202226eab59f37f7459270997a0b9585b8575d1a9dc1ac6e0 |
| u007-p07-manifest-draft.json | 7800 | c897c8dc8485e5ac0708faf72a432158a2eac3d44411d3b0fee1f18193b06e55 |

唯一owned instance：`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/luca-u007-p07-04djwjwm`。
最终run ID：`u007-p07-native-appserver-r1`；case ID：`P07-native-command-boundary`。
未来运行condition路径是该instance的`runs/u007-p07-native-appserver-r1/condition`，当前`runs/`尚不存在。静态副本单独位于`prepared-condition/`，静态协议证据位于`preparation-evidence/`，不会冒充未来实际run证据。

## 相对P06的逐项变化

1. **case仅/id与/request改变。** id为P07；request仅重绑定owned instance路径和临时选取端口，并加入已授权的原生exec_command参数shell=/bin/sh、login=false、tty=false。要求参数不支持或未采用时保留失败，禁止独立command/exec或unsandboxed thread shell替代。
2. **四个initial_files逐字/逐字段与P06相等。** 检查脚本SHA e19a4be201653dcc1ee005cf670e5d4da83f736a98d3e97860a22b93a663ee00；allowed marker、未改loader与完整rules均保留原hash。脚本/marker内的P06文字只是冻结夹具原标签，刻意保留以不改变检查字节；它不代表已有P07执行结果。request中Complete script部分也与P06逐字相同。
3. **八项判据原样保留：** allowed-read、outside-read、symlink-escape-denied、readonly-case-write、outside-write、child-inherits-denial、network-connect-denied、baseline-active-rules。仅AST解析并核名称/marker常量，不执行脚本。baseline预期office stdout hash仍66a501665fb15b3b5e30fead5a47901d064c92f633e04a9baf9a0d284f86b0b4。
4. **四checkpoint、输入交付和权限不变。** request_delivered→inputs_delivered→work_ready→before_final_submission；四输入仍在request_delivered交付。authorized_actions、events、expected_artifacts、失败恢复/澄清合同全部与P06相等。所有文件/网络权限只替换新owned路径，不新增允许根；root deny/minimal read、Python/Codex/PyYAML只读根、network false和effective_probe=null保留。
5. **entry精确新增：** `native_launch={"allow_login_shell":false,"shell_snapshot":false,"experimental_raw_events":true}`，registration和manifest release一致，无额外键/权限override。原生请求参数和准备记录一致；这不证明模型会采用参数或shell已成功启动。
6. **资源按补充9及澄清1：** 本probe release=300秒/20可见动作/60000累计可观察token，外包装最大325秒后清理；registration.capability_probe_limit=7。仅P07专用manifest的simple.observed_tokens设60000，capability_driver_probes_max=7；原P06/master正式simple=40000文件没有改动。开发24/隐藏96/额外24/总144/保留8及heavy保持。
7. **草案状态与绑定：** registration/manifest/preparation为DRAFT_NOT_REGISTERED_NOT_RUN；release.status=PENDING_DRIVER_FREEZE_AND_INDEPENDENT_REVIEW；两处driver_sha256均为字符串PENDING，preparation.final_driver_identity也PENDING。没有把R6 driver hash伪装成最终W28版本。其它当前稳定绑定沿用R6，case、registration互引hash更新。
8. **描述/账本元数据：** 更新准备时间、理由、case路径、run/probe标识，删除旧registered_at；模型/effort从冻结P06模板保留，不读全局配置。专用manifest记录补充8/9/澄清1及29+26=55工作人员分配。没有写执行ledger或master release。

精确递归changed-path清单见draft-delta.json；case确认为仅两个changed paths，其余差异包括由路径/身份变化引起的hash和metadata更新，没有隐藏fixture改变。

## owned材料、依赖与端口

outside/denied.txt复制旧P06协调者自有标记，SHA d3f70e24d92e616531085b76b1ec752011393ee74fd909300e887746aafbd28b。probe-runtime/escape.txt是指向本instance该marker的symlink，仅为既有escape-denial检查，不授权读取其它路径。两个最终写入目标当前不存在。

Python真实文件SHA2477b47fa3ae65b9574eb18a15edb364e96948eaa1875ad3f1c80d780efc9c12、canonical Codex0.160.0 SHA112fae7a5a1223e673c8a1791d32338f37df8b527ff1159bb8adac6c4dbf1b4b以及P06已冻结的26个PyYAML非cache文件逐一核hash，package根直接children仍为_yaml/yaml/pyyaml-6.0.3.dist-info。没有安装、导入运行probe或读取全局配置；这只是文件身份，不是实际sandbox访问/执行证明。

本次最终选取端口 **58503**：一次bind(127.0.0.1,0)取得可用端口后立即关闭，当前不保留。未来root launcher必须在任何模型启动/登记效果前重新bind此精确端口、**不listen并持有到真实终态和清理**；绑定失败则停止，不能静默换端口而继续用旧hash草案。不得直接重用P06 launcher中的全局config读取或固定6上限，它仅是已有流程参考。

## 准备脚本及离线验证

`u007-p07-prepare.py`只有准备与`--check`模式；唯一子进程调用是Node纯离线materializeCondition/createCaseRuntime/initialMessage。没有runTrial/driver导入、Codex启动、probe.py执行、模型调用或自启动launcher。初次准备创建新owned instance；已有交付存在时拒绝覆盖。`--check`核模板、运行时文件、草案相互绑定、脚本身份、marker、symlink及静态输入，只读、不保留端口。

用R6现有conditions产生T，材料hash保持：
`66bee6476856dc260e2425e8b4785522db699e066d49fa8fd6d3f7ffba77d2e5`。
其AGENTS内容没有注入框架规则。用现有case protocol构造静态副本，initialMessage只推进初始化到request_delivered，四输入全部可用；没有注册真实thread、调用case工具、生成probe-result或伪造finalize成功。

**本轮真实失败及修复：** 第一条`python3 -B .../u007-p07-prepare.py`外层exit1、KeyError checkpoint（工具e5b084）。内部Node构造exit0，但initialMessage()是JSON字符串；准备脚本错误地当对象读取。修正为JSON.parse后，在**同一个instance**完成第二次准备（fbd223，exit0）。首轮静态副本/日志归档在attempt-1/，没有清零/删除失败记录；第二次端口重新短暂选择，首轮从未执行检查程序。未扩大任务方法或权限。

**最终离线命令：**
```sh
python3 -B /Users/luca/Desktop/luca_gstack/framework-audit/u007-p07-prepare.py --check
```
exit0，输出DRAFT_INTEGRITY_PASS_NOT_RUNTIME_RELEASE（36149c）。相同工具内执行validate_drafts内存反例及重复prepare检查，14项全部通过：合法草案；额外native键、false用0代替、login=true、cap6、cap8、错误40000资源、提前READY、伪最终driver、输入改动、移除checkpoint、两处共同扩权均拒绝；重复prepare真实exit1且四份草案hash不变；脚本/模型保持及无run/probe产物通过。没有用反例失败伪装真实探针失败；都是离线准备器的校验。

| owned instance内文件 | SHA256 |
|---|---|
| offline-tests.json | 4ef79c281b6c769e64a57b642ed36d32594358c5abc13a27cab30bc0cd085f9e |
| static-material-process.json | 84d6756df2445ba8e822836e46f67ed6b6fa48bdaace6147c5d2dde5e12edc28 |
| static-material-check.json | 4b1539c7364ea56c5581277248311dfbaf3e9b80c6892c12ae0a980a8b38041e |
| attempt-1/failure.txt | f0e4409bae70c940f611177004e3e37d7131c53a579898d0bb13b0cc57284c99 |
| draft-delta.json | 6322cb4e58e74c4d37390c1c08f443fcdb63dd6665b85a93ababeb2c71a5640f |

## root下一步与必要限制

当前草案**不可运行**。root收取W28最终driver/W29结果后，机械填registration.bindings.driver_sha256及manifest.runtime_release.bindings.driver_sha256，更新registration和manifest的互引hash，更新preparation中的对应draft_files摘要与final_driver_identity事实，再形成精确独立审查输入。本文的hash是W27交付时的PENDING草案，不能冒称后续最终冻结hash。当前`--check`专门检查本版PENDING草案；root不得用它对已经改成最终绑定的另一版本声称原摘要仍通过。

非作者确认后才由root另行建立launch包装器、登记一次并运行；本包没有新增launcher。未来包装器须保留外层325秒整组清理、端口持有、raw RPC/错误/nullable计数以及实际模型/命令参数不匹配的失败。元数据仅证两个false可回显，既不能保证/bin/sh采用，也不证明zsh fork是旧根因。全链观测、八项检查、规则loader、协议终态及产物仍待真实证据。没有P07输出、没有成功proof、没有正式比较/生产释放。

## 资源尾记

本turn单独计W27；当前实际turn ID接口未提供，UNKNOWN，由root按真实turn账本核对。首观察epoch1790979473.427496；报告生成epoch 1790980230.3499892，已观察跨度756.922秒。沿用25分钟/60保守动作/80000观察token，不因澄清或首轮失败重置。工具层保守动作上界40（含functions包装、嵌套工具、草案编写、离线检查和交付读回），全部失败计入；离线子进程及两次短bind不冒称模型行为。模型usage/总token遥测UNKNOWN，不记零或伪精确费用；0模型/probe/new-app-server/network request/Agent。总工作29+review26=55、P01—P06及旧失败成本全部保留。

本卡完成是可审阅的精确静态草案，不是评估成功、更不是框架三模块主体实施、联合终验或commit/push完成。

<!-- FILE_END: u007-p07-preparation-report.md -->
