/**
 * Tools/clasp-resolve.js — 找到能用的 clasp
 *
 * 为什么需要它：node 的 execFileSync 不走 shell 的命令查找，
 * 而且部分环境（CI、临时目录、沙箱）里 PATH 根本不包含 clasp 的安装位置，
 * 于是 spawnSync 直接 ENOENT。手工探测几条常见路径更稳。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const CANDIDATES = [
  '/usr/local/bin/clasp',
  '/opt/homebrew/bin/clasp',
  '/usr/bin/clasp',
  path.join(os.homedir(), '.npm-global/bin/clasp'),
  path.join(os.homedir(), '.nvm/versions/node', '*', 'bin', 'clasp'),
  path.join(os.homedir(), 'Library/pnpm/clasp'),
];

/**
 * @param {string} cmd  传入的命令，可能是 "clasp" / "npx --yes @google/clasp@3" / 绝对路径
 * @param {string} root 项目根目录（优先找项目内 node_modules/.bin/clasp）
 * @returns {string} 可直接 spawn 的命令
 */
module.exports = function resolveClasp(cmd, root) {
  if (!cmd) cmd = 'clasp';
  if (cmd.includes('/') && !cmd.includes(' ')) return cmd;

  // 1) 项目内依赖最稳，版本跟 package.json 走
  if (root) {
    const local = path.join(root, 'node_modules/.bin/clasp');
    if (fs.existsSync(local)) return local;
  }

  // 2) 让 shell 帮忙查（走 login shell 的 profile，能命中 nvm/brew 装的）
  if (!cmd.includes(' ')) {
    for (const sh of ['/bin/bash', '/bin/zsh', '/bin/sh']) {
      if (!fs.existsSync(sh)) continue;
      try {
        const abs = execFileSync(sh, ['-lc', 'command -v ' + cmd], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim();
        if (abs && fs.existsSync(abs.split('\n')[0])) return abs.split('\n')[0];
      } catch (e) {}
    }
  }

  // 3) 常见安装位置直接探
  if (!cmd.includes(' ')) {
    for (const c of CANDIDATES) {
      if (c.includes('*')) continue;
      if (fs.existsSync(c)) return c;
    }
  }

  return cmd;
};
