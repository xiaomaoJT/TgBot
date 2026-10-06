/**
 * Tools/params-edit.js — 读写 Params.gs 里「字符串型配置项」的公共方法
 *
 * Params.gs 的格式是固定的（`var KEY = "";` 和 `key: "",   // 注释` 两种），
 * 所以只做行级解析/回写，不引入 JS 解析器 —— 配置能被人手改坏的方式很多，
 * 但行级改写不会把注释、缩进、字段顺序弄丢。
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MODULES = path.join(ROOT, 'Modules', 'Params.gs');
const DIST = path.join(ROOT, 'dist', 'Params.gs');

/** 顶层 var 声明：  var EXECID = "";   /   EXECID = "";
 *  对象属性：        webappUrl: "",   /   repo: "",   （都带行尾注释） */
const TAIL = '\\s*[,;]?\\s*(?://[^\\S\\n]*.*)?\\s*$';
const RE_VAR = new RegExp(`^(\\s*)(?:var\\s+)?([A-Za-z_$][\\w$]*)\\s*=\\s*(["'])(.*?)\\3${TAIL}`);
const RE_PROP = new RegExp(`^(\\s*)([A-Za-z_$][\\w$]*)\\s*:\\s*(["'])(.*?)\\3${TAIL}`);

/** 抽出一个文件里所有字符串型配置项：key -> { line, value, kind } */
function extractParams(src) {
  const map = new Map();
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    const mv = line.match(RE_VAR); // 只吃 `IDENT = "…"`；对象属性用冒号，归下面那条
    if (mv) {
      map.set(mv[2], { line: i, key: mv[2], value: mv[4], indent: mv[1], kind: 'var' });
      return;
    }
    const mp = line.match(RE_PROP);
    if (mp) {
      map.set(mp[2], { line: i, key: mp[2], value: mp[4], indent: mp[1], kind: 'prop' });
    }
  });
  return { map, lines };
}

/** 替换某一行的字符串值，保留缩进、引号风格和行尾注释 */
function replaceValue(line, newValue) {
  return line.replace(/(["'])(.*?)\1/, (m, q) => {
    const safe = String(newValue).split(q).join('\\' + q);
    return q + safe + q;
  });
}

const isEmptyPlaceholder = (v) => v === '' || v == null;

/** 读某个 key 在指定文件里的当前值 */
function getValue(file, key) {
  if (!fs.existsSync(file)) return null;
  const { map } = extractParams(fs.readFileSync(file, 'utf8'));
  const hit = map.get(key);
  return hit ? hit.value : null;
}

/**
 * 设置若干 key 的值。
 * @param {object} values  { key: value }，值为空字符串表示清空
 * @param {object} [opts]  { files: [路径…]，默认同时写 Modules 和 dist }
 * @returns {string[]} 实际改动的 key
 */
function setValues(values, opts) {
  const files = (opts && opts.files) || [MODULES, DIST].filter((f) => fs.existsSync(f));
  const applied = [];
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    const parsed = extractParams(src);
    let out = src;
    for (const [key, value] of Object.entries(values)) {
      const lv = parsed.map.get(key);
      if (!lv) continue;
      if (lv.value === value) continue;
      const hit = parsed.lines[lv.line];
      if (!hit) continue;
      const next = out.replace(hit, replaceValue(hit, value));
      if (next !== out) {
        out = next;
        if (!applied.includes(key)) applied.push(key);
      }
    }
    if (out !== src) fs.writeFileSync(file, out, 'utf8');
  }
  return applied;
}

module.exports = { extractParams, replaceValue, isEmptyPlaceholder, getValue, setValues, MODULES, DIST, ROOT };
