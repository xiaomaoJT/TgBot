#!/usr/bin/env node
/**
 * Tools/keep-remote-values.js — push 之前的「配置空值保护」
 *
 * 要解决的问题：
 *   `clasp push` 是整文件覆盖、以本地为准。你在 Apps Script 网页编辑器里
 *   手工填过 EXECID / BOTID / KingId / CONFIG.deploy.webappUrl …，
 *   下次 push 就会被本地那个空占位 `var EXECID = ""` 打回原样 ——
 *   表现就是「我明明填了，怎么一 push 又没了」。
 *
 * 规则（就一条，很直觉）：
 *   **本地是空占位 → 采用线上已有的值**，并写回本地源码，
 *   这样下次 build / push 都带得走，不会被还原。
 *
 *   本地已经有值的情况不动 —— 那说明是你自己填的，按 push 的既有语义以本地为准。
 *
 * 用法：
 *   node Tools/keep-remote-values.js                       # 自动拉线上 Params
 *   node Tools/keep-remote-values.js --offline             # 不联网
 *   node Tools/keep-remote-values.js --from=<线上Params>  # 指定"线上"来源（自测用）
 *
 * 环境变量：
 *   CLASPBIN  指定 clasp 命令（push.sh 会传）
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { extractParams, isEmptyPlaceholder, setValues, MODULES, DIST } = require('./params-edit.js');
const resolveClasp = require('./clasp-resolve.js');

const ROOT = path.resolve(__dirname, '..');
const OFFLINE = process.argv.includes('--offline');
const CLASP = process.env.CLASPBIN || 'clasp';

const FROM_FLAG = process.argv.find((a) => a.startsWith('--from='));
let FROM_ARG = '';
if (FROM_FLAG) FROM_ARG = FROM_FLAG.slice('--from='.length);
else {
  const fi = process.argv.indexOf('--from');
  if (fi >= 0) FROM_ARG = String(process.argv[fi + 1] || '');
}

const step = (m) => console.log('\n' + m);
const ok = (m) => console.log('  ✅ ' + m);
const info = (m) => console.log('  ℹ️ ' + m);
const bad = (m) => console.log('  ❌ ' + m);

const SECRET_KEYS = ['EXECID', 'BOTID', 'KingId', 'botIdAlone'];

// 这些密钥已迁移到 Modules/Secrets.gs（被 .gitignore 排除，不提交仓库）。
// 空值保护时跳过它们，避免把线上的真实值又写回 Params.gs —— 否则 Params.gs 会变回敏感文件。
const EXTERNALIZED = new Set(['EXECID', 'BOTID', 'KingId', 'botIdAlone', 'geminiKey', 'webappUrl']);

/** 打印配置值：密钥 / 私有名一律只报「已填」，绝不落到终端和日志里 */
function show(key, value) {
  const k = String(key);
  if (/key|token|secret|password|passwd|cookie|mail|phone/i.test(k) || SECRET_KEYS.includes(k)) {
    return '（已填写，' + String(value).length + ' 字符）';
  }
  let v = String(value);
  if (/^https?:\/\/[^/]+\//.test(v)) v = v.replace(/^(https?:\/\/[^/]+).*$/, '$1/…');
  return v;
}

/** 比对线上与本地，把「线上有值、本地空占位」的项收进 values */
function run(fromPath) {
  const files = [MODULES, DIST].filter((f) => fs.existsSync(f));
  if (!files.length) {
    bad('找不到 Params.gs（Modules/ 和 dist/ 都没有），先跑 node Tools/build.js');
    return 1;
  }

  const remote = extractParams(fs.readFileSync(fromPath, 'utf8')).map;
  const local = extractParams(fs.readFileSync(files[0], 'utf8')).map;

  const values = {};
  for (const [key, rv] of remote) {
    if (EXTERNALIZED.has(key)) continue; // 已迁到 Secrets.gs，别回填到 Params.gs
    if (isEmptyPlaceholder(rv.value)) continue; // 线上也是空 → 没得保护
    const lv = local.get(key);
    if (!lv) continue; // 本地没这个 key（一般是新版本才加的字段），不动
    if (!isEmptyPlaceholder(lv.value)) continue; // 本地自己有值 → 以本地为准
    values[key] = rv.value;
  }

  const keys = Object.keys(values);
  if (!keys.length) {
    ok('线上没有「你填过、本地还是空占位」的配置项，无需回填');
    return 0;
  }

  const applied = setValues(values); // Modules + dist 一起写，否则下次 build 又被盖掉
  if (!applied.length) {
    info('线上那些值在本地已经不是空占位了，跳过（文件可能被人手动改过，先别 push）');
    return 0;
  }

  step(`已保留你在线上手填的 ${applied.length} 项，写回本地源码：`);
  applied.forEach((k) => console.log(`       · ${k} = ${show(k, values[k])}`));
  console.log('\n  这些值现在进本地源码了，以后 build / push 都带得走，不会被还原。');
  if (applied.some((k) => SECRET_KEYS.includes(k))) {
    console.log('\n  🔒 提醒：Params.gs 现在含你的表格 ID / Token，别提交到公开仓库。');
  }
  return 0;
}

// ---------------------------------------------------------------- 取"线上" Params

step('取线上 Params 做空值保护');

let fromPath = FROM_ARG || null;
let tmpDir = null;

if (!fromPath && !OFFLINE) {
  const claspJson = path.join(ROOT, '.clasp.json');
  const cfg = fs.existsSync(claspJson) ? JSON.parse(fs.readFileSync(claspJson, 'utf8')) : null;
  if (!cfg || !cfg.scriptId) {
    info('.clasp.json 里还没有 scriptId，跳过空值保护（还没绑线上项目）');
    process.exit(0);
  }

  const claspCmd = resolveClasp(CLASP, ROOT);
  const parts = claspCmd.split(' ');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maobot-keep-'));
  try {
    fs.writeFileSync(path.join(tmpDir, '.clasp.json'), JSON.stringify(cfg));
    fs.writeFileSync(path.join(tmpDir, '.claspignore'), ''); // 别让它被忽略规则坑到
    execFileSync(parts[0], parts.slice(1).concat(['pull', '--force']), {
      cwd: tmpDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (const ext of ['js', 'gs']) {
      const cand = path.join(tmpDir, 'dist', 'Params.' + ext);
      if (fs.existsSync(cand)) {
        fromPath = cand;
        break;
      }
    }
  } catch (e) {
    bad('线上拉取失败：' + String(e.message || e).split('\n')[0]);
    bad('连不上线上就没法保护你填过的值。确认 clasp 已登录，或先别 push。');
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e2) {}
    process.exit(1);
  }

  if (!fromPath) {
    info('线上没拉到 Params 文件，跳过空值保护');
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {}
    process.exit(0);
  }
}

if (OFFLINE && !fromPath) {
  info('--offline：跳过空值保护');
  process.exit(0);
}

const code = run(fromPath);

// ⚠️ 回填读完文件才能清临时目录
if (tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch (e) {}
}
process.exit(code);
