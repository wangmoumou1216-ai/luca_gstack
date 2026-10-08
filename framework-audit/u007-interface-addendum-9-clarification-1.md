# 补充9澄清1：登记额度与单探针预算接线

W28发现R6仍把capability_probe_limit硬编码为6。root确认这是补充9落地所需的同一批接线，由W28一并修改、W29验证、W27出对应草案；不增加调用、不重置已有turn资源。

- 精确合法entry.native_launch存在时，probe registration要求capability_probe_limit=7；省略该对象的旧路径仍要求6。其它值及交叉错配均拒绝，不能改成任意正整数。不得仅把所有旧路径全改成7。entry本身仍依补充9严格验证并与登记绑定。
- W27的P07 registration草案填写7。P07专用manifest的本题complexity预算允许60000累计观察token，实际release仍300秒/20动作/60000；不会因此修改master正式简单任务40000额度。P07只能stage=probe，草案未登记不可执行。
- 测试须覆盖新7/旧6各自合法，以及7配旧路径、6配新路径、8或任意其它值拒绝；R6旧用例不回填为新预算，也不掩去原失败。
- 这只是补充9已作出的额度决定接线，不是新的P07运行授权。全部准备/测试仍offline，root和非作者须看到最终精确候选再释放唯一运行。

<!-- FILE_END: u007-interface-addendum-9-clarification-1.md -->
