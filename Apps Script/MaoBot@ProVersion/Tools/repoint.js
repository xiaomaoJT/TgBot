#!/usr/bin/env node
/**
 * Tools/repoint.js —— 把机器人「重新指向」一张新表格（换数据库，推倒重来用）
 *
 * 典型场景：现有那张 XiaoMaoBot_DB 已经乱了 / 想全新一套，于是新开一张 Google Sheet，
 * 把机器人接到新表上。这件事里有三件是纯体力活（改 EXECID、重新 build、重新 push），
 * 交给脚本；剩下两件必须在浏览器点（建 9 张表、装轮询触发器），脚本末尾会告诉你。
 *
 * 用法：
 *   node Tools/repoint.js "https://docs.google.com/spreadsheets/d/<ID>/edit"
 *   node Tools/repoint.js <ID>                 直接给 ID 也行
 *   node Tools/repoint.js <...> --no-push      只改本地，不推 GAS
 *
 * ⚠️ 注意：这个脚本只换「表格」，不会新建 Google 表格 —— clasp 的凭据只有
 *    drive.metadata.readonly，没有建表权限。新表格必须你自己去 Drive 里新建，
 *    建完把地址粘给这个脚本就行。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { setValues, MODULES, DIST, ROOT } = require('./params-edit.js');

/* ------------------------------ 输出小工具 ------------------------------ */
const C = {
  ok: (s) => `\x1b[32m${s}\x1b[0m`,
  bad: (s) => `\x1b[31m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[90m${s}\x1b[0m`,
  b: (s) => `\x1b[1m${s}\x1b[0m`,
};
const say = (s) => console.log(s);
const line = (s) => console.log(C.dim(s || '─'.repeat(70)));

/* ------------------------------ 参数解析 ------------------------------ */
const args = process.argv.slice(2);
const NO_PUSH = args.includes('--no-push');
const raw = args.find((a) => !a.startsWith('--'));

if (!raw) {
  say('用法：node Tools/repoint.js <新表格ID 或 spreadsheets 链接> [--no-push]');
  say('');
  say('示例：');
  say('  node Tools/repoint.js "https://docs.google.com/spreadsheets/d/1AbC…8xYz/edit"');
  say('  node Tools/repoint.js 1AbC…8xYz');
  process.exit(1);
}

/** 从各种形式的链接/裸 ID 里抠出 spreadsheet id */
function parseSpreadsheetId(s) {
  const m = String(s).match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(String(s).trim())) return String(s).trim();
  return null;
}

const ID = parseSpreadsheetId(raw);
if (!ID) {
  say(C.bad('❌ 没认出这是个 Google 表格。'));
  line();
  say('  能认的写法：');
  say('    https://docs.google.com/spreadsheets/d/<ID>/edit');
  say('    或者直接贴那串 ID（通常 44 位，1 开头，中间横杠和下划线）');
  process.exit(1);
}

/* --------------------------- 拿到可访问的 token --------------------------- */
const CLASPRC = path.join(process.env.HOME || '', '.clasprc.json');
/** refresh 出 access_token；顺手带缓存，避免每次都换一次 */
let _token = null;

async function accessToken() {
  if (_token) return _token;
  if (!fs.existsSync(CLASPRC)) throw new Error(`找不到凭据 ${CLASPRC}`);
  const d = JSON.parse(fs.readFileSync(CLASPRC, 'utf8')).tokens.default;
  const body = new URLSearchParams({
    client_id: d.client_id,
    client_secret: d.client_secret,
    refresh_token: d.refresh_token,
    grant_type: 'refresh_token',
  });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body });
  const j = await r.json();
  if (!j.access_token) throw new Error('换 token 失败：' + JSON.stringify(j).slice(0, 200));
  _token = j.access_token;
  return _token;
}

/** 用 Drive metadata 接口确认这张表存在、是表格、且当前账号读得到 */
async function probeSheet(id) {
  const tok = await accessToken();
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=name,mimeType`, {
    headers: { Authorization: 'Bearer ' + tok },
  });
  if (r.status === 404) return { ok: false, why: '这张表不存在（ID 抄错了，或者表被移到回收站）' };
  if (r.status === 403) return { ok: false, why: '读不到这张表 —— 要么没共享给你，要么文件权限是「仅指定的人」' };
  if (!r.ok) return { ok: false, why: `Drive 返回 ${r.status}` };
  const j = await r.json();
  const isSheet = j.mimeType === 'application/vnd.google-apps.spreadsheet';
  return { ok: true, name: j.name, isSheet };
}

/* --------------------------------- 主流程 --------------------------------- */
(async () => {
  say(C.b('🎯 把机器人重新指向一张新表格'));
  line();

  say('【① 先确认这张表能不能读】');
  let probe;
  try {
    probe = await probeSheet(ID);
  } catch (e) {
    say(C.bad('  探测失败：' + e.message));
    say('');
    say('  多半是 clasp 凭据过期了，跑一次 `clasp login` 重授权即可。');
    process.exit(1);
  }
  if (!probe.ok) {
    say(C.bad('  ❌ ' + probe.why));
    line();
    say('  先去 Google Drive 把这张表删掉/重建，或者检查文件权限，再来一次。');
    process.exit(1);
  }
  if (!probe.isSheet) {
    say(C.bad('  ❌ 这是个 Google 文档/表单，不是电子表格。'));
    say('  必须是表格：Drive → 新建 → Google 表格');
    process.exit(1);
  }
  say(`  ✅ 找到了：${C.b(probe.name)}`);
  say(`     ID：${ID}`);
  line();

  say('【② 写入 EXECID（Modules + dist 两边都写）】');
  const applied = setValues({ EXECID: ID });
  if (!applied.length) {
    say(C.warn('  ⚠️ Params.gs 里没找到 EXECID 这一项，没动。检查文件是不是被改过。'));
  } else {
    say(`  ✅ 已写入：${applied.join(', ')}`);
  }
  line();

  say('【③ 重新构建】');
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'Tools', 'build.js')], { stdio: 'pipe' });
    say('  ✅ dist/ 已重建');
  } catch (e) {
    say(C.bad('  ❌ build 失败：' + String(e.stderr || e.message).slice(0, 300)));
    process.exit(1);
  }
  const newId = require(path.join(ROOT, 'Tools', 'params-edit.js')).getValue(DIST, 'EXECID');
  if (newId !== ID) {
    say(C.bad('  ❌ 构建产物里 EXECID 还是旧值，中止。'));
    process.exit(1);
  }
  say('  ✅ 产物里的 EXECID 已是新表');
  line();

  if (!NO_PUSH) {
    say('【④ 推送到 GAS】');
    try {
      execFileSync('clasp', ['push', '--force'], { stdio: 'pipe', cwd: ROOT });
      say('  ✅ 已推送');
    } catch (e) {
      const out = String(e.stdout || '') + String(e.stderr || '');
      say(C.bad('  ❌ push 失败：' + out.slice(0, 400)));
      say('');
      say('  可以手工跑一下：clasp push --force');
      process.exit(1);
    }
    try {
      execFileSync('clasp', ['pull', '--force'], { stdio: 'pipe', cwd: ROOT });
      const remote = require(path.join(ROOT, 'Tools', 'params-edit.js')).getValue(
        path.join(ROOT, 'dist', 'Params.gs'), 'EXECID');
      say(remote === ID ? '  ✅ 回读线上：EXECID 就是新表' : C.bad(`  ❌ 回读不一致：${remote}`));
    } catch (e) {
      say(C.warn('  ⚠️ 回读没跑成，代码应该还是推上去了。'));
    }
  } else {
    say(C.warn('【④ 跳过推送（--no-push）】'));
  }
  line();

  /* ------------------------------ 收尾提示 ------------------------------ */
  say(C.b('接下来你在浏览器里点两下就行'));
  line();
  say(`  第 1 站：script.google.com → 打开这个项目 → 运行 ${C.b('initSheets()')}`);
  say('           → 一次性把 9 张表 + 表头建齐（db_telegram / key_params / …）');
  say('           → 想更省事就跑 bootstrap()，建表 + 装调度器一次做完');
  say('');
  say(`  第 2 站：还是这个编辑器，运行 ${C.b('switchToPolling()')}`);
  say('           → 删掉那个一直 302 的 webhook，装上每分钟轮询触发器');
  say('           → 这步不做的话，消息要等最多 1 分钟才回（轮询的最小间隔）');
  say('');
  say(C.warn('为什么推荐轮询而不是继续修 webhook？'));
  say('  匿名 POST 到 GAS Web App 会被 GAS 前端 302 到授权页（macros/echo），');
  say('  这是 GAS 的固定握手，跟权限下拉、跟 doPost 返回什么都无关，试不出来。');
  say('  轮询走时间触发器，身份恒为「我」，这个坑整体不存在。');
  line();
})();
