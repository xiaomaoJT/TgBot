/* ============================================================
 *  跨文件重复声明检查
 * ------------------------------------------------------------
 *  Google Apps Script 里所有 .gs 文件共享【同一个全局作用域】，
 *  不是模块系统。两个文件里出现同名的 function / var，
 *  后加载的那个会静默覆盖前一个 —— 结果是行为取决于文件顺序，
 *  而且不报任何错，极难排查。（本轮就踩过一次：AI 代码从 Api.gs
 *  拆到 AI.gs 时忘了删旧的。）
 *
 *  这个脚本把这种问题变成构建期的硬失败。
 * ============================================================ */

const fs = require("fs");
const path = require("path");

const dir = process.argv[2];
if (!dir) {
  console.error("用法: node check-dupes.js <Modules 目录>");
  process.exit(2);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".gs")).sort();
if (!files.length) {
  console.error("没有找到任何 .gs 文件：" + dir);
  process.exit(2);
}

// 抓「顶格声明」：行首无缩进的 function 名 / var 名 / const 名 / let 名
const DECL = /^(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=)/gm;

/** @type {Map<string, string[]>} 名字 -> 声明它的文件列表 */
const owners = new Map();
let total = 0;

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  DECL.lastIndex = 0;
  let m;
  while ((m = DECL.exec(src)) !== null) {
    const name = m[1] || m[2];
    if (!name) continue;
    total++;
    if (!owners.has(name)) owners.set(name, []);
    owners.get(name).push(f);
  }
}

const dupes = [...owners.entries()].filter(([, fs2]) => fs2.length > 1);

console.log("扫描 " + files.length + " 个模块，共 " + total + " 处顶格声明");

if (dupes.length) {
  console.log("\n❌ 发现重复声明（GAS 全局作用域下会静默互相覆盖）：");
  for (const [name, where] of dupes) {
    console.log("   " + name + "  →  " + [...new Set(where)].join(", "));
  }
  process.exit(1);
}

console.log("✅ 无重复声明");
