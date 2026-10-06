#!/usr/bin/env node
/**
 * Tools/verify-push.js — 推送之后做「端到端回读校验」
 *
 * 为什么要有这一层：
 *   clasp push 的退出码不可信。如果 .claspignore 把 dist/ 整个排除了，
 *   clasp 会静默输出 "Script is already up to date." 然后退出 0——
 *   你改了 4 个文件、命令全绿、线上纹丝不动，是最难查的一类故障。
 *
 * 所以这里不看退出码，而是真的把线上代码拉回来，跟本地 dist/ 逐字节比：
 *   不一致 → 退出 1，并把有差异的文件列出来
 *   完全一致 → 退出 0
 *
 * 用法：
 *   node Tools/verify-push.js            # 拉线上回读比对
 *   node Tools/verify-push.js --offline  # 不联网，只做本地产物自检
 *
 * 环境变量：
 *   CLASP_BIN  指定 clasp 命令（push.sh 会传，避免重复探测）
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OFFLINE = process.argv.includes('--offline');
const CLASP = process.env.CLASPBIN || 'clasp';

const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => {
  console.log('  ❌ ' + m);
  process.exitCode = 1;
};
const step = (m) => console.log('\n' + m);

function distFileNames() {
  if (!fs.existsSync(DIST)) return [];
  return fs
    .readdirSync(DIST)
    .filter((f) => f.endsWith('.gs') || f === 'appsscript.json')
    .map((f) => f.replace(/\.(gs|js)$/, ''));
}

function readIfExists(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch (e) {
    return null;
  }
}

function compare(localDir, remoteDir, label) {
  const names = distFileNames();
  if (!names.length) {
    bad(`${label}：本地 dist/ 里没有产物，先跑 node Tools/build.js`);
    return;
  }

  const diff = [];
  for (const name of names) {
    const local = readIfExists(path.join(localDir, name + '.gs'));
    // 线上扩展名可能是 .js（clasp push 更新同名文件时沿用线上后缀），也可能是 .gs
    let remote = readIfExists(path.join(remoteDir, name + '.js'));
    if (remote === null) remote = readIfExists(path.join(remoteDir, name + '.gs'));
    if (local === null) continue;
    if (remote === null) {
      diff.push(`${name}: 线上没有这个文件`);
      continue;
    }
    if (local !== remote) {
      diff.push(`${name}: 本地 ${Buffer.byteLength(local)}B / 线上 ${Buffer.byteLength(remote)}B`);
    }
  }

  if (diff.length) {
    bad(`${label} 有 ${diff.length} 个文件跟线上对不上：`);
    diff.forEach((d) => console.log('       · ' + d));
    console.log('\n     多半是 .claspignore 把 dist/ 排除了，或者 push 根本没生效。');
    console.log('     检查：.claspignore 里有没有 `**/*` 这种会连 dist/ 一起排除的规则。');
  } else {
    ok(`${label}：${names.length} 个文件与线上完全一致`);
  }
}

// ---------------------------------------------------------------- 本地自检

step('① 本地产物自检（不需要联网）');
{
  const names = distFileNames();
  if (!names.length) bad('本地 dist/ 里没有产物，先跑 node Tools/build.js');
  else ok(`本地 dist/ 产物齐全（${names.length} 个：${names.join(' ')}）`);
}

// ---------------------------------------------------------------- 线上回读

if (OFFLINE) {
  step('② 已跳过线上回读（--offline）');
  if (process.exitCode) process.exit(1);
  process.exit(0);
}

const claspCmd = require('./clasp-resolve.js')(CLASP, ROOT);
const claspParts = claspCmd.split(' ');
const claspBin = claspParts[0];
const claspArgs = claspParts.slice(1);

const claspJson = readIfExists(path.join(ROOT, '.clasp.json'));
if (!claspJson || !JSON.parse(claspJson).scriptId) {
  console.log('\n② 跳过线上回读：.clasp.json 里没有 scriptId，没绑过线上项目。');
  process.exit(process.exitCode || 0);
}

step('② 从线上拉回代码做回读比对（真实校验推送结果）');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'maobot-verify-'));
try {
  fs.writeFileSync(path.join(tmp, '.clasp.json'), claspJson);
  // 空 .claspignore = 放行全部，否则自己也会被自己的忽略规则坑到
  fs.writeFileSync(path.join(tmp, '.claspignore'), '');

  execFileSync(claspBin, claspArgs.concat(['pull', '--force']), {
    cwd: tmp,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const remoteDist = path.join(tmp, 'dist');
  if (!fs.existsSync(remoteDist)) {
    console.log('  ⚠️ 线上没拉到任何文件，跳过回读比对。');
    process.exit(process.exitCode || 0);
  }

  compare(DIST, remoteDist, '线上回读');
  if (process.exitCode) {
    console.log('\n  提示：先看 push 的输出里有没有 "Script is already up to date."——');
    console.log('        如果有，说明 clasp 压根没把 dist/ 当成本地代码。');
  }
} catch (e) {
  console.log('  ⚠️ 线上回读失败（' + String(e.message || e).split('\n')[0] + '），跳过。');
  console.log('     这只影响校验，不影响代码已经推上去这件事。');
} finally {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch (e) {}
}

if (process.exitCode) process.exit(1);
process.exit(0);
