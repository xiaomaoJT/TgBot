#!/usr/bin/env bash
#
# Tools/push.sh — 一条命令把本地全部改动同步到线上 GAS 项目
#
# 解决的就是「改了 13 个文件，难道要一个一个粘贴？」这件事。
#
# 用法：
#   bash Tools/push.sh              # 推送代码（编辑器 + /dev 立即可见）
#   bash Tools/push.sh --deploy     # 推送代码 + 建版本 + 更新 Web 应用部署
#   bash Tools/push.sh --dry-run    # 只构建和自检，不推送
#
# 前置（只做一次）：
#   ① 打开 https://script.google.com/home/usersettings 把「Google Apps Script API」设为开启
#   ② npm i -g @google/clasp
#   ③ clasp login
#   ④ cp .clasp.json.example .clasp.json 并把 scriptId 换成你自己的
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

DO_DEPLOY=0
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --deploy)  DO_DEPLOY=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '3,16p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "未知参数：$arg（可用：--deploy / --dry-run / --help）"; exit 2 ;;
  esac
done

say()  { printf '%s\n' "$*"; }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die()  { printf '\n\033[31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 前置检查

step "① 环境检查"

command -v node >/dev/null 2>&1 || die "没找到 node。请先安装 Node.js 18+（https://nodejs.org）"

if [ ! -f .clasp.json ]; then
  cp .clasp.json.example .clasp.json
  die "首次运行：已生成 .clasp.json，请把里面的 scriptId 换成你自己的项目 ID。

  项目 ID 在哪找：
    打开你的 Apps Script 项目 → 左侧「⚙️ 项目设置」→ 往下拉到「ID」
    或直接看浏览器地址栏：https://script.google.com/home/projects/<这一串>/edit

  改完重新运行：bash Tools/push.sh"
fi

SCRIPT_ID="$(node -e '
  try { process.stdout.write(String(require("./.clasp.json").scriptId || "")); } catch (e) {}
')"
case "$SCRIPT_ID" in
  ""|*"把这里替换"*|*"替换成"*|*"your"*)
    die ".clasp.json 里的 scriptId 还是占位符，请填成真实项目 ID 后再运行。" ;;
esac

# clasp：优先用项目内依赖 → 全局命令 → npx 临时下载
if [ -x "node_modules/.bin/clasp" ]; then
  CLASP="node_modules/.bin/clasp"
elif command -v clasp >/dev/null 2>&1; then
  CLASP="clasp"
else
  say "  未检测到 clasp，将用 npx 临时调用（首次会自动下载，约十几秒）"
  say "  想更快可以全局安装：npm i -g @google/clasp"
  CLASP="npx --yes @google/clasp@3"
fi
say "  clasp 来源：$CLASP"

# 登录状态：clasp 把凭据存在 ~/.clasprc.json
if [ ! -f "$HOME/.clasprc.json" ]; then
  say "  尚未登录 clasp，正在打开浏览器授权（选你的 Google 账号即可）…"
  $CLASP login || die "clasp login 失败。请确认 ① 已开启 Apps Script API ② 网络可访问 Google。"
fi

# ---------------------------------------------------------------- 构建

step "② 构建 dist/（按固定顺序摊平模块）"
node Tools/build.js || die "构建失败，请先修掉上面的报错。"

step "③ 自检（重复声明 / 冒烟测试）"
if bash Tests/run.sh 2>&1 | grep -qE "无重复声明"; then
  say "  ✅ 无重复声明"
else
  die "顶格声明检查未通过。GAS 所有 .gs 共享一个全局作用域，同名函数会静默覆盖，
  务必先修掉再推送。详情：bash Tests/run.sh"
fi

if [ "$DRY_RUN" = "1" ]; then
  step "④ 已跳过推送（--dry-run）"
  say "  dist/ 已生成完毕，可直接查看：$ROOT/dist"
  exit 0
fi

# ---------------------------------------------------------------- 配置空值保护

step "④ 配置空值保护（别把你填过的值 push 没了）"
say "  规则：本地是空占位 → 采用线上已有的值，并写回本地源码。"
say "  所以你在 GAS 网页里填过的 EXECID / BOTID / KingId / webappUrl … 不会被这次 push 打回空。"
CLASPBIN="$CLASP" node Tools/keep-remote-values.js || say "  ⚠️ 空值保护没跑成功，继续推送（可能把你填过的值覆盖成空）"

# ---------------------------------------------------------------- 推送

step "⑤ 推送到 Apps Script 项目 $SCRIPT_ID"
say "  ⚠️ clasp push 是「同步」：线上多出来的文件会被删除，"
say "     所以别在 GAS 网页编辑器里手工改代码——下次 push 会被本地版本覆盖。"
PUSH_OUT="$($CLASP push --force 2>&1 || true)"
[ -n "$PUSH_OUT" ] && printf '%s\n' "$PUSH_OUT" | sed 's/^/  /'

if printf '%s' "$PUSH_OUT" | grep -q "already up to date"; then
  say "  ℹ️ clasp 说「已是最新」。"
  say "     这不一定是好事：如果本地明明改过，说明 clasp 压根没把 dist/ 当成本地代码"
  say "     （最常见是 .claspignore 里写了 \`**/*\`，gitignore 语义会把 dist/ 整个排除）。"
  say "     最终结论交给下面那步回读校验，不靠这句文本猜。"
fi

say "  ✅ 推送命令已执行"

# ---------------------------------------------------------------- 可选：更新部署

step "⑥ 回读校验（把线上代码拉回来，跟本地逐字节比）"
CLASPBIN="$CLASP" node Tools/verify-push.js || die "回读校验没过：线上和本地对不上。
  多半就是上面那个「already up to date」的同类问题，按提示改 .claspignore。"

# ---------------------------------------------------------------- 部署现状（每次都报）

step "⑦ 部署现状（决定你的 push 会不会立刻生效）"
DEP_LIST="$( { $CLASP list-deployments 2>/dev/null || $CLASP deployments 2>/dev/null || true; } )"
if [ -z "$DEP_LIST" ]; then
  say "  ⚠️ 读不到部署列表，跳过。"
else
  # 输出形如：  - AKfycbxxxx @791 - PRO_v1.1     或     - AKfycbxxxx @HEAD
  printf '%s\n' "$DEP_LIST" | grep -E 'AKfycb' | while read -r line; do
    ID="$(printf '%s' "$line" | grep -oE 'AKfycb[A-Za-z0-9_-]{20,}' | head -1)"
    TAG="$(printf '%s' "$line" | sed -E 's/.*(AKfycb[A-Za-z0-9_-]{20,})[[:space:]]*//')"
    case "$TAG" in
      *HEAD*)
        say "  · ${ID:0:16}…  @HEAD（跟随最新代码，push 后自动生效）"
        ;;
      *@*)
        say "  · ${ID:0:16}…  $TAG   ⚠️ 固定版本快照 —— push 后它仍跑旧代码，必须更新版本"
        ;;
      *)
        say "  · ${ID:0:16}…  $TAG"
        ;;
    esac
  done
  if printf '%s' "$DEP_LIST" | grep -qE '@[0-9]+'; then
    say ""
    say "  ⚠️ 存在「固定版本」部署。只跑 push（不加 --deploy）不会让它生效，"
    say "     两种办法二选一："
    say "       A. bash Tools/push.sh --deploy        ← 自动建版本并挂到所有固定版本部署上"
    say "       B. GAS 界面「部署 → 管理部署 → ✏️ 编辑 → 版本选最新 → 部署」"
  fi
fi

if [ "$DO_DEPLOY" = "1" ]; then
  step "⑧ 发版：把新版本挂到所有「固定版本」部署上"

  DESC="push $(date '+%Y-%m-%d %H:%M')"
  VER="${VER:-}"   # 防御：下面的 while 里会引用 $VER，别让它处在"未定义"状态
  VER="$( { $CLASP version "$DESC" 2>/dev/null || true; } | grep -oE 'version [0-9]+|[0-9]+' | grep -oE '[0-9]+' | tail -1 )"

  if [ -z "$VER" ]; then
    say "  ⚠️ 没能创建/解析版本号，跳过自动发版。"
    say "     请到 GAS 界面「部署 → 管理部署 → ✏️ 编辑 → 版本选最新 → 部署」。"
  else
    say "  已创建版本 $VER"
    # @HEAD 的部署本来就跟随 HEAD，不需要动；只处理固定版本的
    TARGETS="$(printf '%s\n' "$DEP_LIST" | grep -E 'AKfycb' | grep -vE '@HEAD' \
      | grep -oE 'AKfycb[A-Za-z0-9_-]{20,}' )"
    if [ -z "$TARGETS" ]; then
      say "  没有「固定版本」部署（全部 @HEAD），push 完就已经生效。"
    else
      while read -r dep; do
        [ -z "$dep" ] && continue
        say "  挂到 ${dep:0:16}… …"
        # clasp 3 的正确用法：update-deployment <deploymentId> -V <版本号>
        # （旧写法「redeploy <id> <version>」在 3.x 会报 too many arguments）
        # 按**输出**判断而不是退出码：clasp 偶尔会退出 0 但没真正改成功
        OUT="$($CLASP update-deployment "$dep" -V "$VER" 2>&1)"
        if printf '%s' "$OUT" | grep -q "Redeployed"; then
          say "    ✅ 已更新到版本 $VER（/exec 地址不变）"
        else
          OUT2="$($CLASP redeploy "$dep" -V "$VER" 2>&1)"
          if printf '%s' "$OUT2" | grep -q "Redeployed"; then
            say "    ✅ 已更新到版本 $VER（/exec 地址不变）"
          else
            say "    ⚠️ 没能自动更新（clasp 说：$(printf '%s' "$OUT$OUT2" | head -1)）"
            say "       请到 GAS「部署 → 管理部署 → ✏️ 编辑 → 版本选 $VER → 部署」"
          fi
        fi
      done <<EOF
$TARGETS
EOF

      # ---- 复核：clasp 偶尔"报成功但没真挂上"（2026-10-05 实际踩到过，
      #      导致线上跑的还是旧快照，把"代码没生效"误判成"方案无效"）。
      #      所以发完版一定回头看一眼 deployment 后面的 @版本号。
      DEP_NOW="$($CLASP deployments 2>/dev/null | grep -E 'AKfycb' || true)"
      if printf '%s' "$DEP_NOW" | grep -q "@${VER}"; then
        say "  ✅ 复核通过：固定版本部署已指向 @${VER}"
      else
        say "  ⚠️ 复核发现没挂上（仍指向旧版本），自动重试…"
        printf '%s\n' "$TARGETS" | while read -r dep; do
          [ -z "$dep" ] && continue
          RETRY="$($CLASP update-deployment "$dep" -V "$VER" 2>&1 || true)"
          if printf '%s' "$RETRY" | grep -q "Redeployed"; then
            say "     ✅ 重试成功：${dep:0:16}… → @${VER}"
          else
            say "     ❌ 重试仍失败：$(printf '%s' "$RETRY" | head -1)"
            say "        请到 GAS「部署 → 管理部署 → ✏️ 编辑 → 版本选 ${VER} → 部署」"
          fi
        done
      fi
    fi
  fi
fi

# ---------------------------------------------------------------- Web 应用体检

# 「代码推上去了但机器人没反应」是这个项目最容易踩、也最难自己判断的坑：
# 代码完全正确，只是部署的「执行身份」没设对，消息在 GAS 门口就被 302 掉了。
# 所以每次 push 都实测一遍，直接点名该改哪个部署，别让人去 GAS 界面里猜。
if [ "${SKIP_CHECK:-0}" != "1" ]; then
  step "⑨ Web 应用可达性体检（Telegram 能不能把消息送进来）"
  CHECK_OUT="$(mktemp)"
  CLASPBIN="$CLASP" node Tools/check-webapp.js > "$CHECK_OUT" 2>&1 && CHECK_RC=0 || CHECK_RC=$?
  sed 's/^/  /' "$CHECK_OUT"
  rm -f "$CHECK_OUT"
  if [ "$CHECK_RC" = "0" ]; then
    say "  ✅ 权限通了。"
  else
    say ""
    say "  ⚠️ 权限没通：代码是对的，但消息进不来 —— 指令和关键词都没反应就是这个原因。"
    say "     上面已经点名该改哪个部署，改完执行（验证 + 清积压）："
    say "       node Tools/check-webapp.js --drop"
    say "     想跳过这步：SKIP_CHECK=1 bash Tools/push.sh"
  fi
fi

# ---------------------------------------------------------------- 收尾提示

step "完成"
cat <<'EOF'
  推送后还需要做的事：

  1) 让线上 Web 应用生效
     · 带 @HEAD 的部署：push 完立刻就是新代码，不用管
     · 固定版本部署（@数字）：必须再发一版才算生效
       bash Tools/push.sh --deploy
       或 GAS 界面「部署 → 管理部署 → ✏️ 编辑 → 版本选最新 → 部署」

     ⚠️ 上面第⑦步会明确告诉你项目里有哪些部署、哪个是固定版本。
        /exec 地址在发版后不会变，所以已经绑定的 webhook 不用重绑。

  2) 首次推送或 oauthScopes 有变动时，需要重新授权
     在编辑器里随便运行一个函数（如 diagnose()），按提示完成授权。

  3) 只改了配置（Params.gs 里的开关 / 关键词 / 敏感词）
     不必走这一整套，在 Telegram 里发 /reload 即可。

  4) 千万别在 GAS 网页编辑器里直接改代码 / 改配置
     push 是「以本地为准」的覆盖。你在网页里手填的 CONFIG 会被下次 push 打回本地的值。
     · 改配置：改本地 Modules/Params.gs，再 push；不想 push 就 /reload
     · 只想填 /exec 地址：在 Telegram 私聊发 /webhook bind <地址>
       （它存进脚本属性，热更新和 push 都冲不掉，一次就够）
     · 第一次配置 / 想看当前值：node Tools/setup-config.js [--show]
       （交互向导，只问没填的项，Token 显示时打码）

  5) 想知道这次到底推上去没有
     第⑥步「回读校验」已经把线上代码拉回来逐字节比过了，全绿就说明线上确实变了。
     随时可以单独再验：node Tools/verify-push.js
EOF
