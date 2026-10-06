#!/usr/bin/env node
/**
 * Tools/bundle.js — 把 N 个模块合并成「一个文件」，用于纯手工粘贴到 GAS 编辑器
 *
 * 为什么需要它：
 *   clasp 是标准做法，但它需要 Node 环境 + `clasp login`（会开浏览器授权）。
 *   如果暂时不想装东西，或者公司网络装不上 npm 包，就把全部代码合并成一个
 *   `MaoBot.gs`，在 GAS 编辑器里「新建文件 → 全选粘贴」——**一次**粘贴即可。
 *
 * 产物：
 *   dist-bundle/MaoBot.gs        合并后的单文件（约 400 KB / 1 万行）
 *   dist-bundle/appsscript.json  清单文件（需要在编辑器里单独改）
 *
 * 用法：
 *   node Tools/bundle.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { ROOT, BUNDLE_DIR, ORDER, readModules } = require("./modules");

let modules;
try {
  modules = readModules();
} catch (e) {
  console.error("❌ " + e.message);
  process.exit(1);
}

fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
fs.mkdirSync(BUNDLE_DIR, { recursive: true });

/** 每个模块前面插一段分隔注释，粘贴后还看得出边界在哪 */
function divider(name, index) {
  const line = "=".repeat(74);
  return [
    "",
    `/* ${line}`,
    ` * 【${index + 1}/${ORDER.length}】${name}.gs`,
    ` * ${line} */`,
    "",
  ].join("\n");
}

const parts = [
  "/*",
  " * MaoBot@ProVersion —— 合并单文件版（由 Tools/bundle.js 生成，**请勿直接编辑**）",
  " *",
  " * 改代码请改 Modules/ 下的源文件，然后重新运行 `node Tools/bundle.js`。",
  " * 模块顺序与 clasp 推送顺序完全一致（Tools/modules.js 里唯一一份 ORDER 表）。",
  " *",
  " * 粘贴方法：GAS 编辑器 → 先删掉已有的全部 .gs 文件 → 新建一个文件命名 MaoBot",
  " *           → 全选本文件内容粘贴 → 保存（Ctrl/Cmd + S）",
  " *",
  " * 生成时间：__TIME__",
  " */",
  "",
];

modules.forEach((m, i) => {
  parts.push(divider(m.name, i));
  parts.push(m.code.replace(/\s*$/, "") + "\n");
});

const bundle = parts.join("\n").replace("__TIME__", new Date().toISOString());

const outGs = path.join(BUNDLE_DIR, "MaoBot.gs");
fs.writeFileSync(outGs, bundle, "utf8");
fs.copyFileSync(path.join(ROOT, "appsscript.json"), path.join(BUNDLE_DIR, "appsscript.json"));

const lines = bundle.split("\n").length;
const kb = (Buffer.byteLength(bundle, "utf8") / 1024).toFixed(0);

console.log(`✅ 已生成单文件合并版：dist-bundle/MaoBot.gs`);
console.log(`   ${modules.length} 个模块 · ${lines} 行 · 约 ${kb} KB`);
console.log(`   ${ORDER.join(" → ")}`);
console.log("");
console.log("   粘贴步骤：");
console.log("     ① GAS 编辑器里删掉所有旧的 .gs（留着会和新代码重名冲突）");
console.log("     ② 新建文件，命名 MaoBot，把 dist-bundle/MaoBot.gs 全选粘进去");
console.log("     ③ 项目设置 → 勾选「显示 appsscript.json」，用 dist-bundle/appsscript.json 覆盖");
console.log("");
console.log("   ⚠️ 单文件版能用，但改起来不友好；能装 clasp 建议用 bash Tools/push.sh");
