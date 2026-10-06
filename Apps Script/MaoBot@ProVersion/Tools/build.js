#!/usr/bin/env node
/**
 * Tools/build.js — 把 Modules/*.gs 摊平到 dist/，供 clasp 推送
 *
 * 为什么需要这一步：
 *   clasp 会按「相对 rootDir 的路径」生成 GAS 里的文件名。
 *   如果直接推 `Modules/Utils.gs`，GAS 项目里就会出现一个叫 `Modules/Utils` 的文件，
 *   名字带目录前缀之后，编辑器里的文件列表会很难看，顺序也不好管。
 *   摊平到 dist/ 之后再推，GAS 里就是干净的 `Utils.gs`。
 *
 * 用法：
 *   node Tools/build.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, DIST, ORDER, readModules } = require("./modules");

let modules;
try {
  modules = readModules();
} catch (e) {
  console.error("❌ " + e.message);
  process.exit(1);
}

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

modules.forEach((m) => {
  fs.writeFileSync(path.join(DIST, m.name + ".gs"), m.code, "utf8");
});

// appsscript.json 必须一起进去，否则 clasp push 会把线上项目的清单清空
fs.copyFileSync(path.join(ROOT, "appsscript.json"), path.join(DIST, "appsscript.json"));

const lines = modules.reduce((n, m) => n + m.code.split("\n").length, 0);

console.log(`✅ 已生成 dist/：${ORDER.length} 个模块，约 ${lines} 行`);
console.log("   " + ORDER.join(" → "));
console.log("   下一步：bash Tools/push.sh（或 npm run push）");
