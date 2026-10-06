#!/usr/bin/env node
/**
 * Tools/setup-webhook.js — 重新部署后，一条命令把 Telegram 重新指向新地址
 *
 * 什么时候用它：
 *   ① 删掉旧部署、重新「新建部署」拿到新的 /exec 地址
 *   ② 曾经绑到 /dev 测试地址（表现为「绑定成功但机器人毫无反应」）
 *   ③ 想换到另一个部署（比如从 @HEAD 迁到固定版本）
 *
 * 用法：
 *   node Tools/setup-webhook.js <新的 /exec 完整地址>
 *   node Tools/setup-webhook.js --drop          # 不清地址，只清积压
 *
 * 做了什么：
 *   getWebhookInfo（看现状） → setWebhook 到新地址 → 再 getWebhookInfo 复核
 *   → 顺手清积压 → POST 实测一遍，确认 Telegram 真能送进 GAS
 *
 * ⚠️ 必须传 /exec 结尾的正式部署地址，**不要**用 /dev 那个：
 *    /dev 是测试地址，Telegram 访问不了，会绑定成功但机器人不动。
 */

'use strict';

const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

const say = (m) => console.log(m);
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => console.log('  ❌ ' + m);
const warn = (m) => console.log('  ⚠️ ' + m);
const line = (m) => console.log('     ' + m);

/** 从某个 Params 源码里抠 Bot Token */
function tokenFrom(src) {
  if (!src) return '';
  const m = String(src).match(/var\s+BOTID\s*=\s*"([^"]+)"/);
  return m ? m[1] : '';
}

/** 优先用本地 dist/Params.gs，其次拉一份线上 Params（不污染 dist） */
function findToken() {
  const local = path.join(ROOT, 'dist', 'Params.gs');
  if (fs.existsSync(local)) {
    const t = tokenFrom(fs.readFileSync(local, 'utf8'));
    if (t) return t;
  }
  const cfgPath = path.join(ROOT, '.clasp.json');
  if (!fs.existsSync(cfgPath)) return '';
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  if (!cfg.scriptId) return '';
  const { execFileSync } = require('child_process');
  const os = require('os');
  const resolveClasp = require('./clasp-resolve.js');
  const bin = resolveClasp('clasp', ROOT).split(' ');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'maobot-hook-'));
  try {
    fs.writeFileSync(path.join(tmp, '.clasp.json'), JSON.stringify({ scriptId: cfg.scriptId }));
    fs.writeFileSync(path.join(tmp, '.claspignore'), '');
    execFileSync(bin[0], bin.slice(1).concat(['pull', '--force']), {
      cwd: tmp,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const ext of ['js', 'gs']) {
      const p = path.join(tmp, 'Params.' + ext);
      if (fs.existsSync(p)) {
        const t = tokenFrom(fs.readFileSync(p, 'utf8'));
        if (t) return t;
      }
    }
    return '';
  } catch (e) {
    return '';
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {}
  }
}

const TG = 'https://api.telegram.org';
const info = async (token) => (await fetch(`${TG}/bot${token}/getWebhookInfo`)).json();

(async function main() {
  const arg = process.argv[2];
  const dropOnly = arg === '--drop';
  const url = dropOnly ? '' : arg || '';

  say('\n🎯 绑定 / 检查 Telegram Webhook\n');

  const token = findToken();
  if (!token) {
    bad('拿不到 BOT Token');
    line('先配好：node Tools/setup-config.js');
    process.exit(1);
  }

  let before = null;
  try {
    before = (await info(token)).result || {};
  } catch (e) {}
  if (before) {
    say('【当前】');
    say('  地址   : ' + (before.url || '(未绑定)'));
    say('  积压   : ' + (before.pending_update_count || 0));
    if (before.last_error_message) say('  报错   : ' + before.last_error_message);
    say('');
  }

  /* ---- 校验地址 ---- */
  if (!dropOnly) {
    if (!url) {
      bad('缺地址。用法：node Tools/setup-webhook.js <你的 /exec 地址>');
      line('拿地址：GAS → 部署 → 管理部署 → 展开部署 → 复制 /exec 那一条');
      process.exit(1);
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/AKfycb[A-Za-z0-9_-]+\/exec$/.test(url)) {
      if (url.indexOf('/dev') !== -1) {
        bad('这是 /dev 测试地址，Telegram 访问不了');
        line('Web 应用部署的正式地址是 ...AKfycb.../exec 结尾的那个');
        line('（编辑器顶部「部署 → 测试」给的是 /dev，别用）');
      } else {
        bad('地址不对，不是 GAS 的 /exec 地址：' + url);
      }
      process.exit(1);
    }
  }

  /* ---- 清积压（保留绑定） ---- */
  const cur = dropOnly ? (before && before.url) : url;
  if (!cur) {
    warn('没有可绑定的地址，退出');
    process.exit(1);
  }
  if (dropOnly || before && before.url !== cur) {
    const reset = dropOnly ? cur : cur;
    const r = await fetch(
      `${TG}/bot${token}/setWebhook?url=${encodeURIComponent(reset)}&drop_pending_updates=true`,
      { method: 'POST' }
    ).then((x) => x.json());
    if (r && r.ok) {
      say('【清积压】已清空（保留绑定地址）');
      say('  为什么每次都要清：权限或地址一修好，积压的旧消息会被一次性重放刷屏。');
      say('');
    } else {
      warn('清积压失败：' + JSON.stringify(r).slice(0, 160));
      say('');
    }
  }

  /* ---- 复核 ---- */
  let after = null;
  try {
    after = (await info(token)).result || {};
  } catch (e) {}
  if (after) {
    say('【复核】');
    say('  地址   : ' + (after.url || '(未绑定)'));
    say('  积压   : ' + (after.pending_update_count || 0));
    if (after.last_error_message) say('  报错   : ' + after.last_error_message);
    say('');
  }

  /* ---- 实测 POST ---- */
  const probe = await fetch(cur, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ update_id: -1 }),
  }).catch(() => null);

  const code = probe ? probe.status : 0;
  say('【实测】POST → ' + code + '  ← Telegram 走的就是这条');
  say('');

  if (code === 200) {
    ok('通了。现在去 Telegram 发 /ping 或一条普通消息试试');
    if (after && after.pending_update_count) {
      say('  还有积压，再跑一次本脚本（--drop）清掉');
    }
    process.exit(0);
  }
  if (code === 302 || code === 301) {
    bad('还是被重定向 —— 部署的「执行身份」没设对');
    say('');
    say('  修法：GAS → 部署 → 管理部署 → 找到这个 /exec 对应的部署 → ✏️ 编辑');
    line('→ 「执行身份」改成「以我（部署者）的身份」「谁可以访问」保持「任何人」→ 保存');
  } else if (code === 401) {
    bad('匿名请求被拒（401）——「谁可以访问」不是「任何人」');
    say('');
    line('修法：管理部署 → 编辑 → 「谁可以访问」改成「任何人」「执行身份」改成「以我」');
  } else {
    warn('返回 ' + code + '，去看 GAS「执行记录」里这次请求到底怎么回事');
  }
  process.exit(1);
})();
