#!/usr/bin/env node
/**
 * Tools/setup-config.js — 交互式配置向导
 *
 * 解决的问题：Params.gs 里的必填项（表格 ID / Bot Token / 你的 Telegram ID…）
 * 手改容易漏、容易写错位置，而且写完还得记得 push。
 *
 * 用法：
 *   node Tools/setup-config.js            # 交互式，只问没填的
 *   node Tools/setup-config.js --show     # 只看当前值，不改
 *
 * 特点：
 *   · 已填的项默认跳过（不覆盖你填好的）
 *   · 同时写 Modules/Params.gs（源码）和 dist/Params.gs（产物），build 不会冲掉
 *   · 每项都带说明，不用你回去翻文档
 */

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { extractParams, setValues, getValue, MODULES } = require('./params-edit.js');

const SHOW_ONLY = process.argv.includes('--show');
const ROOT = path.resolve(__dirname, '..');

// 问哪些字段、怎么解释 —— 加新配置项只要往这里加一行
const FIELDS = [
  {
    key: 'EXECID',
    required: true,
    label: 'Google 表格 ID',
    hint: '打开你的表格，网址里 /d/ 和 /edit 之间那一串，例如 1AbC2dEf3GhI4jKlMnOpQrStUv5WxYz\n      （没有表格就先去 Google Sheets 新建一个空的）',
  },
  {
    key: 'BOTID',
    required: true,
    label: 'Telegram Bot Token',
    hint: '@BotFather → /newbot → 给它起名 → 给它选个用户名 → 它发你 123456789:AAE…\n      这串就是 Token，机器人收不到消息九成是这里错了',
  },
  {
    key: 'KingId',
    required: false,
    label: '你的 Telegram 数字 ID',
    hint: '先私聊机器人发一条消息（发 /id 也能拿到），需要私人推送功能才填，可留空',
  },
  {
    key: 'botIdAlone',
    required: false,
    label: '机器人自己的数字 ID',
    hint: '同上，从 /id 的返回里能看到（形如 8001234567），填错只会轻微降级，可留空',
  },
  {
    key: 'webappUrl',
    required: false,
    label: 'Web 应用 /exec 地址',
    hint: '留空 = 自动解析（推荐，不用填）。只有自动解析拿不到时才手填，且必须以 /exec 结尾。\n      手填的地址会在每次 push 时被保护、不会被覆盖成空',
  },
];

function mask(key, v) {
  if (!v) return "(空)";
  // 密钥 / 私有名一律只报「已填写」，不落到终端和日志里
  if (/key|token|secret|password|execid|kingid|botid/i.test(String(key))) return "（已填写，" + v.length + " 字符）";
  if (/^https?:\/\/[^/]+\//.test(v)) return v.replace(/^(https?:\/\/[^/]+).*$/, "$1/…");
  return v;
}

if (!fs.existsSync(MODULES)) {
  console.error('❌ 找不到 Modules/Params.gs');
  process.exit(1);
}

const { map } = extractParams(fs.readFileSync(MODULES, 'utf8'));

console.log('\n🎫 MaoBot 配置向导\n');
console.log('  以下是必填 / 常用项。已填过的默认跳过，直接回车也等于跳过。\n');

const todo = [];
for (const f of FIELDS) {
  const cur = map.has(f.key) ? map.get(f.key).value : undefined;
  if (cur === undefined) {
    console.log(`  ⚠️  ${f.key}  在 Params.gs 里没找到这个字段，跳过（可能是版本不一致）`);
    continue;
  }
  if (cur) console.log(`  ✅ ${f.key.padEnd(12)} ${f.label}：${mask(f.key, cur)}`);
  else if (SHOW_ONLY) console.log(`  ⬜ ${f.key.padEnd(12)} ${f.label}：未填`);
  else todo.push(f);
}

if (SHOW_ONLY) {
  console.log('\n  想填写就运行：node Tools/setup-config.js\n');
  process.exit(0);
}

if (!todo.length) {
  console.log('\n  🎉 都填好了，没什么要补的。\n');
  process.exit(0);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const answers = {};

function ask(i) {
  if (i >= todo.length) return Promise.resolve();
  const f = todo[i];
  const need = f.required ? '（必填）' : '（可留空）';
  console.log(`\n  ─────────────────────────────────────────`);
  console.log(`  ${f.label} ${need}   [${f.key}]`);
  console.log(`  ${f.hint}\n`);
  return new Promise((resolve) => {
    rl.question('  › ', (ans) => {
      const v = String(ans).trim();
      if (v) answers[f.key] = v;
      ask(i + 1).then(resolve);
    });
  });
}

ask(0)
  .then(() => {
    rl.close();
    if (!Object.keys(answers).length) {
      console.log('\n  什么都没填，未改动任何文件。\n');
      process.exit(0);
    }
    const applied = setValues(answers);
    console.log('\n  已写入 Modules/Params.gs 和 dist/Params.gs：');
    Object.entries(answers).forEach(([k, v]) => {
      console.log(`    · ${k} = ${mask(k, v)}`);
    });
    if (!applied.length) {
      console.log('\n  ⚠️ 一个字段都没改到 —— 可能是 key 拼错或文件被改动过，先别 push。\n');
      process.exit(1);
    }
    console.log('\n  下一步：bash Tools/push.sh          # 推送并让 Web 应用生效');
    console.log('        不用 --deploy 也行，/dev 立刻能看到新配置。\n');
    console.log('  🔒 提醒：Params.gs 现在含你的 Token，别把它提交到公开仓库。\n');
    process.exit(0);
  })
  .catch((e) => {
    console.error('  ❌ ' + (e && e.message));
    process.exit(1);
  });
