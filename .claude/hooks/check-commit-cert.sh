#!/bin/bash
# ========================================================
# Hook 脚本:提交前检查质量通行证
#
# 这个脚本被 Claude Code 的 PreToolUse hook 调用,
# 在每次 Bash 命令执行前运行。如果命令中包含 "git commit",
# 则检查项目根目录下是否存在两本通行证。
#
# 两本通行证:
#   test-result.json    — tester 助手签发
#   quality-result.json — quality-engineer 助手签发
#
# 两个都在 → 放行(exit 0)
# 任何一个缺失 → 拦截(exit 1)
# ========================================================

# 从 stdin 读取工具调用信息(JSON 格式)
INPUT=$(cat)

# 提取工具名和命令内容(用简单的 grep 解析,避免依赖 jq)
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | sed 's/"tool_name":"//;s/"//')
COMMAND=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | sed 's/"command":"//;s/"//')

# 不是 Bash 命令,直接放行
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# 命令中不包含 "git commit",直接放行
if ! echo "$COMMAND" | grep -q "git commit"; then
  exit 0
fi

# ====== 检测到 git commit,检查通行证 ======

CERT1="test-result.json"
CERT2="quality-result.json"

MISSING=""

if [ ! -f "$CERT1" ]; then
  MISSING="$MISSING  - 单元测试通过凭证(tester 签发)\n"
fi

if [ ! -f "$CERT2" ]; then
  MISSING="$MISSING  - 质量审查通过凭证(quality-engineer 签发)\n"
fi

if [ -n "$MISSING" ]; then
  echo ""
  echo "/git-save 已被拦截。"
  echo ""
  echo "原因:本次存档没有经过质量检查,缺少以下通行许可:"
  echo -e "$MISSING"
  echo "请说"帮我存档",系统会自动完成检查并获取通行许可后存档。"
  exit 1
fi

# 通行证齐全,放行
exit 0
