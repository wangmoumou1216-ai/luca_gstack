# P07实际结果：原生命令已执行，loader子进程失败

本次唯一真实尝试已终止，driver真实exit1、transport exit0，144.319秒，无外层超时。观察累计61934 token（上限60000，报告超过后中断），1个thread/turn，中断有终态确认。正式开发/隐藏运行仍0。P01—P07全部保留，能力7/7已用，不自动追加P08。

这次新增的重要事实是原始Responses事件实际保留了第一次exec包装器输入和输出。请求包含精确Python命令、/bin/sh、login=false、tty=false；返回内层chunk16cd62/exit1及probe.py第27行的真实Traceback。原生Python脚本确实运行，不能继续说“没有原生命令尝试/输出”或把本次归成完全相同的open_session失败。

脚本在subprocess.run([sys.executable,...get_rules.py...])处被拒绝：PermissionError errno1，路径/opt/homebrew/opt/python@3.14/bin/python3.14。只读路径核对确认它经两层symlink到已允许的canonical Python，sha256完全相同。词法路径不在现有profile允许项中；这支持最小候选解释，但具体Seatbelt规则及“只用resolve(sys.executable)是否足够”未运行证明。不能根据同字节就声称权限已覆盖，也不能擅自增加父目录/HOME访问。

脚本在最终统一输出之前异常退出，因此没有八项检查JSON；到达loader行只证明先前语句走过，不能据此给前七项PASS。loader未成功，协议仅到inputs_delivered，读取过T的AGENTS，无最终artifact。随后可见累计token越界触发中断；四次服务流重连也保留。命令失败与预算终止分开记录，不把全部耗时/成本归因于框架。

R7检测到2个可见动态操作和1个未映射hook调用，tool_actions=null，formal=false。新增raw外层call_id与hook内层call_id不同；不能只按时间附近强行当同一ID，亦不能把有raw输出等同于全链完整计数。实际命令成功启动和观察驱动仍不具备正式资格是两件同时成立的事。

父级见证：marker与26个package文件未改、禁止写入目标不存在；driver SIGTERM成功，SIGKILL返回ESRCH；外层观察无错误、已观察进程均无存活项。未观察后代的绝对不存在仍不作保证。

结果/原始RPC/launch/提取窗口的精确hash和位置见u007-p07-root-evidence.json。提取仅第一原生命令call/output，不复制全局配置或隐藏推理。早先监控读取只看message字段而漏看inbound.raw，本轮已修正解析，未用该错误投影判定没有事件；完整原始日志未更改。

主协调决定：保持正式比较与生产变更HOLD，保留这个真实进展及失败；进行一次只读的方法可行性裁决。必须同时处理解释器别名、原生调用可观测性、必要控制与资源要求，不能只修一个路径再盲目加token重跑。此报告没有放宽权限、改检查项或授权新的运行；也不是用户全生命周期目标已完成。

<!-- FILE_END: u007-p07-root-result.md -->
