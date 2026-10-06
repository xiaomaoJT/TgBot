"use strict";
/**
 * Tools/modules.js — 模块清单的**唯一来源**
 *
 * 为什么要单独抽一个文件：
 *   Tools/build.js（摊平给 clasp）和 Tools/bundle.js（合并成单文件给手工粘贴）
 *   都依赖同一份「模块顺序表」。两处各写一份的下场，就是某天新增模块时
 *   只改了一处 —— 于是 clasp 推上去的顺序和手工粘贴的顺序不一致，
 *   而 GAS 的顶层 var 是按文件顺序求值的，这种偏差只在线上偶发，本地查不出来。
 *   所以这里只保留一份，两个脚本都从这里取。
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "Modules");
const DIST = path.join(ROOT, "dist");
const BUNDLE_DIR = path.join(ROOT, "dist-bundle");

/**
 * 顺序即 GAS 中的加载顺序。
 * ⚠️ 新增模块必须同时加到这里，否则 build 会直接报错退出（故意的，防止顺序漂移）。
 */
const ORDER = [
  "Params", "Secrets", "Utils", "Core", "I18n", "Telegram", "UI", "Api",
  "AI", "Channel", "Deploy", "Commands", "Manage", "Triggers", "MaoBot",
];

/**
 * 读取 Modules/ 下所有 .gs，校验与 ORDER 严格对齐。
 * @return {{name:string, code:string}[]} 已按 ORDER 排好序
 */
function readModules() {
  if (!fs.existsSync(SRC)) {
    throw new Error("找不到 Modules/ 目录，请在 MaoBot@ProVersion 根目录下运行。");
  }

  const names = fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith(".gs"))
    .map((f) => f.replace(/\.gs$/, ""));

  const missing = names.filter((n) => ORDER.indexOf(n) === -1);
  if (missing.length) {
    throw new Error(
      "Modules/ 里有未登记到 ORDER 的模块：" +
        missing.join(", ") +
        "\n  请补进 Tools/modules.js 的 ORDER（顺序会影响顶层变量初始化）"
    );
  }

  const absent = ORDER.filter((n) => names.indexOf(n) === -1);
  if (absent.length) {
    // 通常是被 .gitignore 排除的私密配置（如 Secrets.gs）：本地没有就跳过，
    // 不影响构建——别人 clone 后没这个文件也能跑 build / push。
    console.warn(
      "⚠️ ORDER 里跳过本地不存在的模块（一般是被 .gitignore 排除的私密配置）：" +
        absent.join(", ")
    );
  }

  return ORDER.filter((name) => names.indexOf(name) !== -1).map((name) => ({
    name: name,
    code: fs.readFileSync(path.join(SRC, name + ".gs"), "utf8"),
  }));
}

module.exports = { ROOT, SRC, DIST, BUNDLE_DIR, ORDER, readModules };
