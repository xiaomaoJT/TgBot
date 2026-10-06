#!/usr/bin/env bash
# ============================================================
#  MaoBot@ProVersion 本地冒烟测试
#  在 Google Apps Script 之外用 Node 验证核心逻辑，不需要联网、不消耗配额。
#
#  用法：  bash Tests/run.sh
#  依赖：  Node.js 18+
#
#  步骤：
#    ① 跨文件重复声明检查（GAS 所有 .gs 共享一个全局作用域，重名会静默覆盖）
#    ② 拼接所有模块 + 模拟层 → 单文件，顺带充当"能否通过语法解析"的检查
#    ③ 跑断言
# ============================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
NODE_BIN="${NODE_BIN:-node}"

# ---- ① 重复声明检查 ----
"$NODE_BIN" "$HERE/check-dupes.js" "$ROOT/Modules"

# ---- ② 拼接 ----
OUT="$(mktemp -t maobot-test-XXXXXX).js"
trap 'rm -f "$OUT"' EXIT

# ⚠️ 顺序即 GAS 中的文件顺序。AI.gs 紧跟 Api.gs，Channel / Deploy 紧随其后，其余保持原样。
MODULES="Params Utils Core I18n Telegram UI Api AI Channel Deploy Commands Manage Triggers MaoBot"

cat "$HERE/gas-mock.js" > "$OUT"
echo "" >> "$OUT"
for m in $MODULES; do
  if [ ! -f "$ROOT/Modules/$m.gs" ]; then
    echo "❌ 缺少模块：Modules/$m.gs"
    exit 1
  fi
  cat "$ROOT/Modules/$m.gs" >> "$OUT"
  echo "" >> "$OUT"
done
cat "$HERE/smoke-test.js" >> "$OUT"

# ---- ③ 执行 ----
"$NODE_BIN" "$OUT"
