#!/usr/bin/env node
/**
 * Tools/make-manifest.js — 生成 deploy/manifest.json
 *
 * 这个清单是 /push 在线热更新的数据源：
 *   机器人拉取 manifest.json → 按 files[].url 逐个下载 → 调 Apps Script API 覆盖自己。
 *
 * 用法：
 *   node Tools/make-manifest.js [--version 1.2.0] [--note "更新说明"]
 *
 * 仓库地址与分支优先取命令行参数，其次取 package.json 的 repository.url。
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "Modules");
const OUT_DIR = path.join(ROOT, "deploy");

const ORDER = [
  "Params", "Utils", "Core", "Telegram", "UI", "Api",
  "AI", "Channel", "Deploy", "Commands", "Manage", "Triggers", "MaoBot",
];

function argOf(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : "";
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));

const repoRaw = argOf("--repo") || (pkg.repository && pkg.repository.url) || "";
const m = String(repoRaw).replace(/\.git$/, "").match(/github\.com[/:]([^/]+)\/([^/]+)/i);
if (!m) {
  console.error("无法确定仓库地址。请用 --repo https://github.com/owner/repo 指定。");
  process.exit(1);
}

const owner = m[1];
const repo = m[2];
const branch = argOf("--branch") || "main";
const version = argOf("--version") || pkg.version || "0.0.0";
const note = argOf("--note") || "MaoBot ProVersion " + version;

// 本项目在仓库里的相对路径（目录名含空格与 @，URL 里必须转义）
const subDir = argOf("--path") || "Apps%20Script/MaoBot@ProVersion";
const prefix = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${subDir}/`;

const files = ORDER.map((name) => ({
  name,
  url: prefix + "Modules/" + name + ".gs",
}));
files.push({ name: "appsscript", url: prefix + "appsscript.json" });

const manifest = {
  version,
  note,
  generatedAt: new Date().toISOString(),
  files,
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

console.log("✅ 已生成 deploy/manifest.json");
console.log("   版本：" + version);
console.log("   文件：" + files.length + " 个");
console.log("   首个地址：" + files[0].url);
console.log("");
console.log("   提交并 push 之后，在 Telegram 里发 /push check 即可看到新版本。");
