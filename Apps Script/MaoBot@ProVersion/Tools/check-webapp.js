#!/usr/bin/env node
/**
 * Tools/check-webapp.js — 定位「机器人没反应」到底卡在哪个部署的权限上
 *
 * 为什么需要它：
 *   GAS 一个项目里可能有**多个 Web 应用部署**，而 Telegram 只认 **webhook 绑定的那一个**。
 *   你改了 A 部署的权限，机器人照样没反应 —— 因为消息压根没走到 B。
 *   这个脚本会把所有部署列出来逐个实测，直接点名「该改的是这一个」。
 *
 * GAS Web 应用有两层权限，症状却只有一个：
 *
 *   ① 谁可以访问 = 任何人          ← 决定匿名 GET / POST 能不能过
 *   ② 执行身份   = 以我（部署者）   ← 决定匿名 POST（也就是 Telegram 发的）能不能过
 *
 * 只配 ① 不配 ②：匿名 GET 依然 200，但匿名 POST 会 302 跳到 macros/echo，
 *   getWebhookInfo 留下一句 "Wrong response from the webhook: 302 Found"。
 *
 * ⚠️ 判定必须用 POST。我第一次用 GET 测，测出「权限没问题」白排查一轮。
 *
 * 用法：
 *   node Tools/check-webapp.js             # 体检（默认所有部署 + webhook 绑定对照）
 *   node Tools/check-webapp.js --url <u>   # 只测指定地址
 *   node Tools/check-webapp.js --drop      # 清掉 Telegram 积压（保留绑定）
 *
 * 探测零副作用：POST 内容是 {"update_id":-1}，没有 message 字段，
 *   机器人会立刻 return —— 不发消息、不写表、不消耗配额。
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const resolveClasp = require('./clasp-resolve.js');

const ROOT = path.resolve(__dirname, '..');
const CLASP = process.env.CLASPBIN || 'clasp';

const say = (m) => console.log(m);
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => console.log('  ❌ ' + m);
const warn = (m) => console.log('  ⚠️ ' + m);
const line = (m) => console.log('     ' + m);

/* ---------- clasp / 线上配置 ---------- */

function runClasp(args) {
  if (!fs.existsSync(path.join(ROOT, '.clasp.json'))) {
    throw new Error('缺少 .clasp.json');
  }
  const bin = resolveClasp(CLASP, ROOT).split(' ');
  return execFileSync(bin[0], bin.slice(1).concat(args), {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** 解析 `clasp list-deployments` 输出 → [{id, label}] */
function listDeployments() {
  const out = runClasp(['list-deployments']);
  const list = [];
  for (const raw of out.split('\n')) {
    const m = raw.match(/^-\s+([A-Za-z0-9_-]+)\s+(@\S+)?/);
    if (m) list.push({ id: m[1], label: m[2] || '' });
  }
  return list;
}

/**
 * 从线上 Params 取 Bot Token。
 * ⚠️ 必须拉到**临时目录**：clasp pull 默认写进项目 dist/，
 *    把本地刚构建好、还没 push 的产物冲掉，白白丢一次 build 结果。
 */
function remoteParams() {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.clasp.json'), 'utf8'));
  const bin = resolveClasp(CLASP, ROOT).split(' ');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'maobot-params-'));
  try {
    fs.writeFileSync(path.join(tmp, '.clasp.json'), JSON.stringify({ scriptId: cfg.scriptId }));
    fs.writeFileSync(path.join(tmp, '.claspignore'), ''); // 空 = 不排除任何文件
    execFileSync(bin[0], bin.slice(1).concat(['pull', '--force']), {
      cwd: tmp,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const ext of ['js', 'gs']) {
      const p = path.join(tmp, 'Params.' + ext);
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    }
    return '';
  } catch (e) {
    return '';
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  }
}

function pick(src, re) {
  const m = String(src).match(re);
  return m ? m[1] : '';
}

/* ---------- 探测 ---------- */

async function probe(url) {
  const body = JSON.stringify({ update_id: -1 });
  const get = await fetch(url, { method: 'GET', redirect: 'manual' }).catch(() => null);
  const post = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).catch(() => null);
  return {
    get: get ? get.status : 0,
    post: post ? post.status : 0,
    loc: post ? post.headers.get('location') || '' : '',
  };
}

/** 把状态码翻译成人话 */
function explain(post, get) {
  if (post === 200) return '通';
  if (post === 302 || post === 301) return '执行身份不对（匿名 POST 被重定向）';
  if (post === 401) return '「谁可以访问」不是「任何人」';
  if (post === 404) return '部署地址不存在';
  return '意外状态码 ' + post;
}

(async function main() {
  const argUrlIdx = process.argv.indexOf('--url');
  const argUrl = argUrlIdx > -1 ? process.argv[argUrlIdx + 1] : '';
  const wantDrop = process.argv.includes('--drop');

  say('\n🔎 Web 应用可达性检查\n');

  /* ---- ① Telegram 那边怎么说（真相来源） ---- */
  const params = remoteParams();
  const token = pick(params, /var\s+BOTID\s*=\s*"([^"]*)"/);
  if (!token) {
    bad('拿不到线上 BOTID');
    process.exit(1);
  }

  const info = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
  const w = info.result || {};
  const boundUrl = w.url || '';
  const pending = w.pending_update_count || 0;

  say('【Telegram 视角】');
  say('  绑定地址   : ' + (boundUrl || '(未设置 webhook)'));
  if (boundUrl) {
    const b = boundUrl.match(/macros\/s\/([A-Za-z0-9_-]+)/);
    say('  地址尾号   : @' + (b ? b[1].slice(-6) : '?'));
  }
  say('  积压更新   : ' + pending);
  say('  最近报错   : ' + (w.last_error_message || '无'));
  if (w.last_error_date) {
    say('  报错时间   : ' + new Date(w.last_error_date * 1000).toLocaleString('zh-CN'));
  }
  say('');

  /* ---- ② 逐个部署实测 ---- */
  let deps = [];
  try {
    deps = listDeployments();
  } catch (e) {
    warn('列不出部署：' + e.message);
  }

  let target = null; // webhook 绑定的那个部署
  const others = [];
  if (deps.length) {
    say('【逐个部署实测】');
    for (const d of deps) {
      const url = `https://script.google.com/macros/s/${d.id}/exec`;
      const r = await probe(url);
      const rec = { ...d, ...r, url, isTarget: boundUrl.includes(d.id) };
      if (rec.isTarget) target = rec;
      else others.push(rec);
      const mark = rec.isTarget ? '⬅ webhook 绑的这个' : '';
      say(`  ${d.label || '(无版本标记)'}  ${d.id.slice(-8)}`);
      line(`GET ${r.get || '-'}   POST ${r.post || '-'}  → ${explain(r.post, r.get)}  ${mark}`);
    }
    say('');
  }

  /* ---- ③ 清积压 ---- */
  if (wantDrop) {
    if (!boundUrl) {
      warn('没有绑定地址，不用清');
    } else {
      const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(boundUrl)}&drop_pending_updates=true`, {
        method: 'POST',
      }).then((x) => x.json()).catch(() => null);
      say('【清积压】');
      if (r && r.ok) {
        const after = await (await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)).json();
        ok('已清空（保留绑定地址），当前积压 ' + ((after.result || {}).pending_update_count || 0));
        say('  为什么这么做：权限修好那一刻，积压的旧消息会被一次性重放刷屏；');
        say('  所以「改完权限 → 立刻再跑一次 --drop」是最干净的顺序。');
      } else {
        warn('清空失败：' + JSON.stringify(r));
      }
      say('');
    }
  }

  /* ---- ④ 结论 ---- */
  const url = argUrl || (target && target.url) || boundUrl;
  if (!url) {
    bad('没有可测的地址');
    process.exit(1);
  }

  const r = target
    ? target
    : await probe(url);
  const post = r.post;

  say('【结论】');
  if (post === 200) {
    ok('目标部署 Telegram 能正常访问（POST → 200）');
    say('  如果机器人还是不回话，问题在代码侧，不是权限：');
    line('私聊发 /health 看自检，发 /kw 看关键词表，发 /reload 清缓存。');
    process.exit(0);
  }

  if (post === 302 || post === 301) {
    bad('消息进不来 —— 这就是「/ping 没反应、关键词不回复、db_telegram 没记录」的根因');
    say('');
    if (target) {
      say('  该改的是这一个部署（只有它才收到 Telegram 的消息）：');
      say('');
      say('    ' + target.label);
      line('ID 尾号 ' + target.id.slice(-8) + '   →   ' + target.url);
      say('');
      line('在 GAS 的「管理部署」里，按 URL 认它 —— 展开部署卡片能看到 /exec 地址，');
      line('必须跟上面这串一模一样。项目里可能有两个部署，改错那个等于没改。');
      say('');
    }
    say('  修法（1 分钟，只动一项，别动别的）：');
    say('   ① script.google.com → 你的项目 → 部署 → 管理部署');
    say('   ② 找到上面那个部署，点 ✏️ 编辑');
    say('   ③ 「执行身份」改成「以我（部署者）的身份」  ← 只改这一项');
    say('   ④ 「谁可以访问」保持「任何人」不要动');
    say('   ⑤ 保存即可，不用新建版本，权限立刻生效');
    say('');
    if (others.length) {
      say('  另外 ' + others.length + ' 个部署（这些不归 webhook 用，改了也没用）：');
      for (const o of others) {
        say(`    · ${o.label || '(无版本标记)'}  ${explain(o.post, o.get)}`);
      }
      say('');
    }
    say('  改完跑：');
    line('node Tools/check-webapp.js --drop     （验证 + 顺手清掉积压）');
    say('');
    line('为什么 db_telegram 是空的：消息在 GAS 门口就被 302 了，压根没进脚本，');
    line('自然不写表 —— 三个现象是同一个根因。');
    process.exit(1);
  }

  if (post === 401) {
    bad('「谁可以访问」不是「任何人」：匿名请求被 GAS 直接拒了');
    say('');
    say('  修法：管理部署 → 编辑 → 「谁可以访问」改成「任何人」，执行身份改成「以我」');
    process.exit(1);
  }

  if (post === 404) {
    bad('地址不存在（404）：这个部署可能已被删掉，需要重建并重新绑 webhook');
    process.exit(1);
  }

  warn('返回了 ' + post + '，不是常见的权限问题 → 去 GAS「执行记录」看这次请求的日志');
  process.exit(1);
})();
