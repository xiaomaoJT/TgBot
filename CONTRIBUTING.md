# 贡献指南

感谢你愿意改进 TgBot@XiaoMao。这个项目跑在 Google Apps Script 上，规模刻意保持可控，所以合并标准会比一般开源项目保守一些——先把底线说清楚，能省下双方很多来回。

## 提交之前

1. **先开 Issue 说清楚要解决什么**，尤其是涉及**模块拆分**、**指令注册表**、**数据表结构（`chat_settings` / `authority_management`）** 的改动。别写完一大片代码才发现方向不一致。
2. **不需要签 CLA**。你提交 PR 即视为同意：你的贡献按 [MIT 许可](LICENSE) 分发，同时你保留自己那份代码的著作权。完整说明见文末「许可」。
3. 涉及**安全问题**（Token 泄漏、越权、注入）的**不要开公开 issue**，请直接私信 [@XiaoMao](https://t.me/Xiao_MaoMao_bot) 或走 GitHub 的 Security Advisory。

## 项目底线（这几条不接受 PR 改动）

| 底线 | 含义 |
|---|---|
| **零运行时依赖** | 不引入任何 npm 运行时包。GAS 环境没有 `require`，`node_modules` 只服务于本地构建与测试脚本 |
| **只在 GAS 能力内实现** | 不使用 `fs` / `net` / `child_process` 等 Node 专有 API；不使用 `import` / `export`，GAS 是扁平全局作用域 |
| **模块清单唯一来源** | 新增或重命名模块，**必须**同步登记到 `Tools/modules.js` 的 `ORDER`。这是 build / bundle / 测试共用的顺序来源，漏登记会静默丢文件 |
| **禁止重复顶层声明** | GAS 所有 `.gs` 共享一个作用域，重名 `var` / `function` 会**静默覆盖**。提交前必须过 `check-dupes` |
| **密钥不进 `Params.gs`** | 真实凭据只放 `Modules/Secrets.gs`（已被 `.gitignore` 排除）。`Params.gs` 保持空占位 |
| **不改 `MaoBot@OfficialVersion`** | 那个目录是**对照基线**，用于证明 Pro 版改了什么、可随时回滚，不接受功能改动 |
| **不手改 `dist/`** | `dist/` 是 `Tools/build.js` 的产物，改了下次构建就被覆盖 |

## 改哪里

```
Apps Script/MaoBot@ProVersion/
├── Modules/*.gs          ← 源码在这里，所有改动都改这里
│   ├── Params.gs         ← 配置（空占位，可提交）
│   ├── Secrets.gs        ← 真实密钥（.gitignore 排除，不要提交）
│   ├── Commands.gs       ← 指令注册表（加指令改这里 + 写 handler）
│   ├── Manage.gs         ← 管理类指令 handler
│   ├── I18n.gs           ← 中英文文案
│   └── ...
├── Tools/
│   ├── modules.js        ← 模块顺序唯一来源
│   ├── build.js          ← 摊平成 dist/
│   └── verify-push.js    ← 推送后逐字节回读校验
└── Tests/                ← gas-mock + 冒烟测试
```

**新增一条指令的最小改动**：`Modules/Commands.gs` 的 `COMMANDS` 里加一条注册项 + 写 `handler` 函数。参数校验、权限分级（`level`）、`/help` 展示都由注册表统一处理，不要自己另写一套分发。

**新增一个模块**：`Modules/` 下建文件 → 登记到 `Tools/modules.js` 的 `ORDER` → 跑测试。

## 本地验证（提 PR 前必跑，三条全绿）

```bash
cd "Apps Script/MaoBot@ProVersion"

node Tools/build.js              # 摊平模块，检查行数/模块数
node Tests/check-dupes.js Modules   # 顶层声明查重（这条最容易被忽略）
bash Tests/run.sh                # 365 项冒烟测试
```

三条都通过再提 PR。**特别是 `check-dupes`**——GAS 的静默覆盖 bug 几乎都是从这里漏进去的，线上表现为「某个功能忽然不响应」，极难排查。

## 代码风格

- **跟随现有风格**：`var` / `function` 写法、2 空格缩进、单引号为主。不做纯格式化 PR、不为了用新语法而重构
- **注释与文案用中文**。面向用户的提示要说人话：**发生了什么 + 该怎么办**
  - 反例：`参数错误`
  - 正例：`缺少群 ID。用法：/auth block add -1001234567890`
- **提交信息用中文**，一句话说清改了什么
  - 例：`修复：入群申请通知缺少群组跳转链接`
  - 例：`新增：/auth 指令管理屏蔽列表与管理员列表`
- **富消息要兜底**：`sendMessage` 带 `parse_mode: HTML` 时，用户昵称、群名一律走 `esc()`（`Modules/Utils.gs:18`），否则一个 `<` 就能让整条消息发送失败；写进 `href="..."` 的值用 `escAttr()`

## 不要提交的内容

- `Modules/Secrets.gs` —— 真实 Bot Token / 表格 ID / Webhook 地址
- `.clasp.json` —— 含你的 `scriptId`
- `dist/`、`dist-bundle/` —— 构建产物
- `node_modules/` —— 依赖
- `.DS_Store`、`Thumbs.db` —— 系统垃圾
- 任何与改动无关的重构或格式化

> 第一次贡献先执行：`cp Modules/Secrets.gs.example Modules/Secrets.gs`，然后填自己的值。详见 [COURSE.md](Apps%20Script/MaoBot%40ProVersion/COURSE.md)。

## 提 PR

- 一个 PR 只做一件事，方便回滚
- 描述里写清楚：**改了什么、为什么改、怎么验证的**（附测试输出或复现步骤）
- 改了用户可见的文案，请**中英文一起改**（`Modules/I18n.gs`）
- 改了指令，请同步更新 `COURSE.md` 的指令表，并在 `CHANGELOG.md` 补一条

## 许可

你提交的贡献将按 [MIT 许可](LICENSE) 分发。

**为什么本项目不用 CLA：** CLA 的唯一硬价值是保留「将来整体更换许可 / 商业双授权」的能力，代价是每个贡献者都要签一次、维护一条签名分支，且会劝退一部分贡献者。对一个免费的个人工具项目，这个成本不划算——你提 PR 时按 MIT 授权，已经足够让代码被正常使用和分发。

如果将来项目真的需要换许可，会先在 Issue 里公开讨论，并联系当时的贡献者补签。
