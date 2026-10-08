# W30 检查程序修复交付

状态：DONE_WITH_CONCERNS。限定代码与离线验证完成；真实 sandbox 与方法资格仍未通过。本轮未新增行为运行、P08 登记、instance、Agent、网络、权限根或生产切换。

交付：同目录 u007-probe-program-r8.py 与 u007-probe-program-r8.test.py。
程序 SHA256：56fa4f358c982813f736244d543c3f17468d09aae80cb04d1a5fe6eac5b1d2a4
测试 SHA256：1f9dfb91f87bfb49ce72193f90ac1c3eb9e2ba02ca83f61411824d84bca055e8

八项原检查、顺序、marker、loader 相对来源及预期 hash 均保留。子解释器使用 Path(sys.executable).resolve()。逐项捕获异常并继续，其余已取得结果不丢失。预期拒绝只接受原 EPERM/EACCES；子进程启动 PermissionError 不冒充子进程内权限成功。正常运行或可捕获异常输出一行 JSON，失败退出 1，成功退出 0；进程被杀或 stdout 不可写不作可输出承诺。

loader 保留实际 exit/stdout/stderr、预期与实际 hash、解析告警与异常。启动失败时 exit/hash 为 null。冻结 loader 输出是纯文本，YAML 解析失败会在 stderr 报告且可能 exit 0；这些事实分别记录，不新增 JSON 解析要求。JSON 形状/损坏字符串不能绕过原 hash 判据，超时的 bytes 以 hex 无损保留。

验证命令：
`/opt/homebrew/opt/python@3.14/bin/python3.14 -B /Users/luca/Desktop/luca_gstack/framework-audit/u007-probe-program-r8.test.py`
实际退出 0，16/16 通过，测试进程 0.127 秒。所有探针文件读写、socket、subprocess 均 stub；测试包含成功、预期/非预期拒绝、逐项异常、P07 型启动失败、非零退出、解析告警、hash/JSON/编码异常、canonical argv 与参数错误。另做 AST/sha 静态核对，原 case、prepare、replay 字节身份不变。

证据目录：
`/private/var/folders/6l/df04c0js1k7113s6bq7qfltr0000gn/T/u007-w30-offline-evidence-xklxguef/`
其中 evidence.json 收录冻结输入、产物与日志 hash；test-run.json 收录命令、退出、耗时；tests.stderr 为完整 unittest 日志，tests.stdout 为空。

剩余最小真实验证输入：由 root 在取得另行运行额度及资格后绑定此程序新 hash，复用原八项判据、marker、两份原 loader 输入、既有最小权限根、canonical Python 与 PyYAML 依赖，提供合法隔离目录及受控 loopback 端口。真实执行需留八项 JSON、loader exit/hash/stderr、协议终态及可信原生操作归属/停止证据。本轮没有制作该登记，也未验证这些行为；mock 通过不能解除 J11 FAIL、whole_chain UNKNOWN 或 formal=false。

资源：本轮起点 epoch 1790983857.68973；实际 turn ID 与模型 usage 未暴露，交 root 核对。至报告写入累计 20 个保守动作，0 子 Agent/模型试跑/真实权限网络探针。可见工具输出至少 20,226 token，完整可观测 token 未知；当前耗时及输入/测试身份见 evidence.json。
