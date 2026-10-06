#!/usr/bin/env node
/* =============================================================================
 * Tools/mode.js —— 机器人接入模式一键管理（Webhook ↔ 轮询）
 *
 *   node Tools/mode.js                 看当前状态（模式 / 触发器 / Webhook / 权限探测）
 *   node Tools/mode.js polling         切到轮询模式：删 Webhook + 装每分钟轮询触发器
 *   node Tools/mode.js webhook         切回 Webhook 模式（会先探测权限，不通就拒绝切）
 *   node Tools/mode.js drop            清空 Telegram 积压（不动绑定）
 *
 * 为什么要有「轮询」这一档：
 *   GAS Web 应用有两层权限，Telegram 走的是匿名 POST，
 *   只要「执行身份」没设成「以我（部署者）」，匿名 POST 就会被 302 重定向，
 *   表现就是「机器人收发不到消息、db_telegram 没记录」，而且 GAS 日志里几乎没有错误。
 *   轮询模式由时间触发器驱动，执行身份恒为「我」，完全绕开这两个权限项。
 *
 * 原理：通过 Apps Script API（:run）在 GAS 里执行函数，不需要打开编辑器手工点。
 * ============================================================================= */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RESET = '\x1b[0m';
const C = {
  ok:  (s) => '\x1b[32m' + s + RESET,
  bad: (s) => '\x1b[31m' + s + RESET,
  warn:(s) => '\x1b[33m' + s + RESET,
  dim: (s) => '\x1b[90m' + s + RESET,
  b:   (s) => '\x1b[1m' + s + RESET,
};

const C_BOT_TOKEN = /"(56[0-9]{4,}:[A-Za-z0-9_-]{20,})"/;

/* ------------------------------------------------------------------ 路径解析 */
function claspBin() {
  try {
    const out = execFileSync(path.join(ROOT, 'Tools', 'clasp-resolve.js'), ['clasp', '.'], { encoding: 'utf8' });
    const m = String(out).trim().split('\n').filter(Boolean).pop();
    if (m) return m;
  } catch (_) {}
  for (const p of ['/usr/local/bin/clasp', '/usr/local/lib/node_modules/@google/clasp/bin/clasp.js']) {
    if (fs.existsSync(p)) return p;
  }
  return 'clasp';
}
const CLASP = claspBin();

function clsprc() {
  const p = path.join(process.env.HOME || '', '.clasprc.json');
  if (!fs.existsSync(p)) throw new Error('找不到 ~/.clasprc.json，请先登录 clasp');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const t = j.tokens && j.tokens.default;
  if (!t) throw new Error('clasp 凭据里没有 tokens.default，请重新 clasp login');
  return t;
}

function scriptId() {
  const cfg = path.join(ROOT, '.clasp.json');
  if (!fs.existsSync(cfg)) throw new Error('找不到 .clasp.json');
  return JSON.parse(fs.readFileSync(cfg, 'utf8')).scriptId;
}

function botToken() {
  for (const f of ['dist/Params.gs', 'Modules/Params.gs']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(C_BOT_TOKEN);
    if (m) return m[1];
  }
  throw new Error('本地找不到 Bot Token（dist/Params.gs）');
}

/* ------------------------------------------------------- Apps Script API 调用 */
async function readAccessToken() {
  const t = clsprc();
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: t.client_id, client_secret: t.client_secret,
      refresh_token: t.refresh_token, grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('刷新 access_token 失败：' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}

/** 在 GAS 里执行一个函数，返回结果（或错误说明）。fn 名必须全局存在。 */
async function gasRun(tok, sid, fn, params) {
  const res = await fetch(`https://script.googleapis.com/v1/scripts/${sid}:run`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    // ⚠️ devMode 必须是 true：默认 false 时跑的是「已部署版本」，
    //    clasp push 只是「保存」，新代码在 API 里还看不见，会误报函数不存在。
    body: JSON.stringify({ function: fn, parameters: params || [], devMode: true }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error('HTTP ' + res.status + ' ' + t.slice(0, 300));
  }
  let op = await res.json();
  if (op.name && op.done !== true) {
    for (let i = 0; i < 20 && !op.done; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      op = await (await fetch('https://script.googleapis.com/v1/' + op.name, {
        headers: { Authorization: 'Bearer ' + tok },
      })).json();
    }
  }
  if (op.error) {
    const e = op.error;
    const msg = (e.details && e.details[0] && e.details[0].errorMessage) || e.message || '未知错误';
    if (e.code === 3 && /reading from storage|NOT_FOUND/i.test(msg)) {
      throw new Error('Apps Script API 未启用（GAS 读不到脚本内容，所以任何函数都「不存在」）：\n' +
        '        开启：GAS 编辑器 → ⚙️ 项目设置（Project Settings）→ 勾选「启用 Apps Script API」→ 保存\n' +
        '        开启后本工具可直接跑；不想开也能用，切换时在编辑器里手工运行函数即可。');
    }
    if (e.code === 3) throw new Error('函数 ' + fn + ' 不存在或抛错：' + msg);
    if (e.code === 4) throw new Error('GAS 执行超时（函数跑了超过 6 分钟）：' + msg);
    throw new Error('GAS 执行失败（code ' + e.code + '）：' + msg);
  }
  return op.response && op.response.result !== undefined ? op.response.result : null;
}

/* ----------------------------------------------------------------- Telegram */
async function tg(method, query) {
  const r = await fetch('https://api.telegram.org/bot' + botToken() + '/' + method +
    (query ? '?' + new URLSearchParams(query).toString() : ''));
  return r.json();
}

function probe(url) {
  return new Promise((resolve) => {
    const done = (get, post) => resolve({ get, post });
    fetch(url, { redirect: 'manual' })
      .then((r) => fetch(url, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' }, body: '{"update_id":-1}' })
        .then((r2) => done(r.status, r2.status)).catch(() => done(r.status, 0)))
      .catch(() => done(0, 0));
  });
}

/* --------------------------------------------------------------------- 输出 */
function say(t) { console.log(t); }
function line(t) { console.log(C.dim('  ' + t)); }
function rule() { say('─'.repeat(62)); }

async function reportMode() {
  rule();
  say(C.b('【当前接入模式】'));
  const tok = await readAccessToken();
  const sid = scriptId();
  let d = null;
  try {
    d = await gasRun(tok, sid, 'modeDiag', []);
  } catch (e) {
    say(C.bad('  读取模式状态失败：' + e.message));
    say('');
    if (d === null) d = null; // 状态拿不到时，下面的权限探测照常给结论
  }
  if (d) {
    const wh = d.webhook || {};
    say('  Webhook   : ' + (wh.url || '（未绑定）'));
    say('              pending = ' + (wh.pending_update_count != null ? wh.pending_update_count : '?'));
    if (wh.last_error_message) say('              最近错误: ' + C.bad(wh.last_error_message));
    say('  触发器    : ' + (d.triggers && d.triggers.length ? d.triggers.join(' , ') : '（无）'));
    say('  轮询状态  : ' + (d.hasPolling ? C.ok('已装（每分钟拉一次）') : C.warn('未装')));
    say('  轮询偏移  : ' + d.pollOffset);
  }

  if (d && d.hasPolling) {
    say('');
    say(C.ok('✅ 正在轮询模式 —— 机器人可靠工作，不受 Web App 权限影响。'));
    say('   代价：消息最多延迟约 1 分钟。想恢复实时，见下面「切回 Webhook」。');
  }

  say('');
  say(C.b('【Web 应用权限实测】'));
  const info = await tg('getWebhookInfo');
  const bound = (info && info.result && info.result.url) || '';
  if (!bound) {
    say('  ' + C.warn('当前没绑 Webhook，所以不存在权限问题（这本身就是轮询模式）。'));
  } else {
    const r = await probe(bound);
    const mark = r.post === 200 ? C.ok('通') : C.bad('不通（' + r.post + '）');
    say('  webhook 绑的部署  ' + C.dim(bound.slice(0, 46) + '…'));
    say('  GET ' + r.get + '   POST ' + r.post + ' → ' + mark);
    if (r.post !== 200) {
      say('');
      say('  这解释了「机器人没反应、db_telegram 没记录」：');
      say('  Telegram 推过来的 POST 被 GAS 弹走了，消息根本没进脚本。');
      say('');
      say(C.b('  两条路，选一条：'));
      say('  ① 修权限（实时，但要手动改 GAS 界面）');
      say('     → ' + C.ok('node Tools/enable-webapp.js') + C.dim('  给操作步骤'));
      say('  ② 切轮询（省事，不碰权限，延迟 ≤1 分钟）← 推荐，现在就能用');
      say('     → ' + C.ok('node Tools/mode.js polling'));
    }
  }
  rule();
}

async function doPolling() {
  rule();
  say(C.b('【切换 → 轮询模式】'));
  const tok = await readAccessToken();
  const sid = scriptId();
  const r = await gasRun(tok, sid, 'switchToPolling', []);
  say('  ' + C.ok('✅ ' + (r || '已切换')));
  say('');
  say('  现在机器人靠「每分钟拉一次」取消息，不再依赖 Web 应用权限。');
  say('  改完立刻去 Telegram 发一条 /ping 试试（最多等 1 分钟）。');
  say('  之后记得跑一次 ' + C.ok('bash Tools/push.sh') + C.dim(' 把最新的建表代码推上去，否则 db_telegram 可能没表。'));
  rule();
}

async function doWebhook() {
  rule();
  say(C.b('【切换 → Webhook 模式】'));
  // 先探测权限，不通就别切，免得切完还是哑的
  const info = await tg('getWebhookInfo');
  const bound = (info && info.result && info.result.url) || '';
  if (bound) {
    const r = await probe(bound);
    if (r.post !== 200) {
      say('  ' + C.bad('当前 webhook 部署 POST 返回 ' + r.post + '，权限还是不通。'));
      say('  先修权限再切，否则切过去一样收不到消息。');
      say('');
      say('  修法：' + C.ok('node Tools/enable-webapp.js') + C.dim(' 查看分步操作'));
      rule();
      return;
    }
    say('  权限探测：POST ' + C.ok('200') + ' —— 通，开始切换…');
  } else {
    say('  当前没绑 Webhook，直接绑定…');
  }
  const tok = await readAccessToken();
  const sid = scriptId();
  const out = await gasRun(tok, sid, 'switchToWebhook', []);
  say('  ' + C.ok('✅ ' + (out || '已切换')));
  rule();
}

async function doDrop() {
  rule();
  say(C.b('【清空 Telegram 积压】'));
  const before = await tg('getWebhookInfo');
  const b = before && before.result ? before.result : {};
  const url = b.url || '';
  const pend = b.pending_update_count || 0;
  const err = b.last_error_message || '';
  say('  当前 pending = ' + pend + (err ? '   ' + C.bad(err) : ''));
  if (!url) {
    say('  ' + C.warn('没绑 Webhook（轮询模式），本该没有积压。'));
    rule();
    return;
  }
  if (pend === 0) {
    say('  ' + C.ok('本来就是 0，不用清。'));
    rule();
    return;
  }
  const r = await tg('setWebhook', { url, drop_pending_updates: 'true' });
  say('  ' + ((r && r.ok) ? C.ok('✅ 已清到 0（绑定保留：' + url + '）') : C.bad(JSON.stringify(r).slice(0, 200))));
  rule();
}

/* --------------------------------------------------------------------- main */
async function main() {
  const arg = (process.argv[2] || '').toLowerCase();
  try {
    if (arg === 'polling') await doPolling();
    else if (arg === 'webhook') await doWebhook();
    else if (arg === 'drop') await doDrop();
    else if (arg === 'enable-webapp' || arg === 'webapp') await showWebappFix();
    else await reportMode();
  } catch (e) {
    say(C.bad('✖ ' + e.message));
    process.exitCode = 1;
  }
}

async function showWebappFix() {
  rule();
  say(C.b('【Web 应用权限怎么改】'));
  say('');
  say('  你现在的状态是：GET 200 / POST 302。');
  say('  这条组合的含义是 —— 「谁可以访问 = 任何人」已经对了，');
  say('  坏的只有「执行身份」那一项（还停在「以访问者」）。');
  say('');
  say('  改法（1 分钟，只动一项）：');
  say('   ① script.google.com → 你的项目 → 部署 → 管理部署');
  say('   ② 按 /exec 完整地址找到要改的那个部署 → ✏️ 编辑');
  say('   ③ 「执行身份」→ 以我（部署者）的身份   ★ 只动这一项');
  say('   ④ 「谁可以访问」保持「任何人」         ★ 别动');
  say('   ⑤ 保存（不用新建版本，权限立刻生效）');
  say('');
  say('  改完验证：' + C.ok('node Tools/check-webapp.js'));
  say('');
  say('  ⚠️ 别在别的部署上改：一个项目可以有好几个 Web 应用部署，');
  say('     Telegram 只认 webhook 绑定的那一个，改错的一律没用。');
  say('');
  say('  嫌麻烦的话，直接用轮询模式，不用碰这些：');
  say('    → ' + C.ok('node Tools/mode.js polling'));
  say('');
  say('  两种模式随时互切（' + C.ok('node Tools/mode.js') + ' 看当前状态）。');
  rule();
}

main();
