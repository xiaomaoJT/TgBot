**[TgBot@XiaoMao](https://github.com/xiaomaoJT/TgBot)**
***https://github.com/xiaomaoJT/TgBot***



------------

#### Telegram Bot机器人，基于Google Apps Script实现。

| **最近更新时间** | **2026年09月30日**                                          |
| :--------------- | :----------------------------------------------------------- |
| **当前版本**     | **正式版 - V1.74** ｜ **重构版 - ProVersion（新增）**        |
| **功能清单**     | **功能描述：** ❶ 超级群管功能❷ 广告词/敏感词过滤/动态配置、自动删除/警告/封禁❸ 多样化接口查询、XiaoMao数据加工❹ 自定义聊天窗快捷键盘/消息跟随按钮❺ 关键字消息/私聊消息 自动回复❻ 私聊消息/群组消息 捕捉及消息私人推送❼ 私聊消息/群组消息 自动存储<br />**功能细则：** 入群检测、退群检测、入群欢迎、退群欢送、超级群管功能、用户封禁、用户解封、用户禁言、广告词敏感词拦截及自动删除、chatGPT查询、消息私人推送、BOT消息主动回复、自动接口查询及数据加工、自定义键盘、私聊及自动回复、关键字自动回复、消息存储、消息自动删除等功能 |
| **作者**         | <br />**⚠️  源码开发不易，使用引用请注明出处！⚠️**<br /><br />**@XiaoMao   <br /><br />⚠️  源码开发不易，使用引用请注明出处！⚠️**<br /><br /> |
| **成本**         | **完全免费｜持续更新**                                       |
| **机器人**       | [**XiaoMaoBot机器人 在线快速体验**](https://t.me/Xiao_MaoMao_bot) |
| **安全检测**     | **已通过OSCS社区的安全工具检测，该项目暂无安全风险**         |



------------

##### 🎟 XiaoMao频道 · 群组

<div align="center">
<a href="https://t.me/xiaomaoJT" target="_blank">
<img src=https://img.shields.io/badge/Telegram-XiaoMao频道-blue alt=github style="margin-bottom: 5px;" />
</a>
<a href="https://t.me/hSuMjrQppKE5MWU9" target="_blank">
<img src=https://img.shields.io/badge/Telegram-XiaoMao%E7%BE%A4%E8%81%8A-red alt=github style="margin-bottom: 5px;" />
</a>
<a href="https://t.me/Xiao_MaoMao_bot" target="_blank">
<img src=https://img.shields.io/badge/Robot-XiaoMaoBot-orange alt=github style="margin-bottom: 5px;" />
</a>
<a href="https://github.com/xiaomaoJT/xiaomaoJT/blob/main/photo/qrcode.jpg?raw=true" target="_blank">
<img src=https://img.shields.io/badge/WeChat-小帽集团-green alt=github style="margin-bottom: 5px;" />
</a>
</div>



------

##### 🎟 快速导航 · 目录

- ▶️ [正式版部署 - 视频教程](https://www.alipan.com/s/dW2yPirBysi) ✅

- 🚀 [正式版部署 - 文字教程](https://github.com/xiaomaoJT/TgBot/blob/main/Apps%20Script/MaoBot%40OfficialVersion/COURSE.md) ✅
- 🛰️ [数据表部署 - 填写教程 ✅](https://github.com/xiaomaoJT/TgBot/blob/main/Apps%20Script/MaoBot%40OfficialVersion/DB/COURSE.md)
- 🚁 [正式版源码解析](https://github.com/xiaomaoJT/TgBot/blob/main/Apps%20Script/MaoBot%40OfficialVersion/README.md)  



- 🆕 [重构版 ProVersion - 源码解析](./Apps%20Script/MaoBot%40ProVersion/README.md) **（推荐）**
- 🆕 [重构版 ProVersion - 部署教程](./Apps%20Script/MaoBot%40ProVersion/COURSE.md) ✅
- 🆕 [重构版 ProVersion - 数据表说明](./Apps%20Script/MaoBot%40ProVersion/DB/COURSE.md)
- 🆕 [重构版 ProVersion - **能力扩展可行性分析**](./Apps%20Script/MaoBot%40ProVersion/ROADMAP.md) 📈 基于 Bot API 10.3 与 GAS 配额



- 📖 [仓库资源更新日志](https://github.com/xiaomaoJT/TgBot/blob/main/UPDATELOG.md) **小版本模块更新说明请参见更新日志**

- 🚗 [测试版部署 - 文字教程](https://github.com/xiaomaoJT/TgBot/blob/main/COURSE.md)



------------


##### 🎟 目录构成
+ ###### [Apps Script](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script) **总目录**

    + **MaoBot@ProVersion** -- 🆕 **重构版「模块化 + 多源容错 + 官方能力全接入」**
        + **Modules** -- 10 个模块（配置 / 工具 / 基础设施 / TG API / UI / 接口 / 指令 / 群管 / 调度 / 入口）
        + **DB** -- 数据表结构说明
        + **Tests** -- 本地冒烟测试（Node 运行，不联网）
        + **appsscript.json** -- 清单文件

    + **MaoBot@OfficialVersion** -- 小帽机器人正式版「**模块化部署（持续更新）**」
        + **DB** -- 初始化数据表
        + **Modules** -- 模块化代码

    + **MaoBot@BetaVersion** -- 小帽机器人测试版「**一体化部署（停止维护）**」

    + **配置图解**
    + **BotTest**
        + **BaseBot** -- 基础用法
        + **HighBot** -- 经典案例


⚠️ 请注意，自正式版「V1.00」起，Beta测试版本将停止维护并不再更新。官方版「**MaoBot@OfficialVersion**」继续保留可用；若需要更完善的功能与更稳的架构，建议迁移到「**MaoBot@ProVersion**」——数据表结构 100% 兼容，可平滑迁移。



------

#### 📋 To-Do / 待办列表

**1、Graphic message [ Completion of development 🎉 ] 「20240823 - V1.20+」**

- 图文消息 [开发完成 🎉] 「完成于20240823，版本V1.20+已支持」

**2、Channel information monitor, query, keyword push [Not yet started]**

- 频道消息监听、查询、关键词推送 [未开始...]

**3、Message auto-destruction [ Completion of development 🎉 ] 「20250312 - V1.30+」 [⚠️ Due to GAS limitations, high concurrency is only supported at 20 times per 30 seconds]**

- 消息自动删除 [开发完成 🎉] 「完成于20250312，版本V1.30+已支持」「受限于GAS，高并发仅支持20次/30s」
- 🆕 **ProVersion 已解除该限制**：改用「1 个分钟级调度器 + 任务队列表」，触发器数量恒为 1，不再受 GAS 20 触发器上限约束

**4、Hot deployment [Not yet started]**

- 热更新 [未开始...]「需配合 clasp / GitHub Actions 实现」

**5、Dynamic configuration of sensitive words[ Completion of development 🎉 ]「20250605 - V1.54+ / ProVersion 已完善」**

- 敏感词的动态配置 [开发完成 🎉] 「动态新增与动态删除均已支持，ProVersion 提供 `/word add|del|list` 指令」

**6、Telegram official capabilities [ Completion of development 🎉 ]「20260930 - ProVersion」**

- 官方能力全量接入 [开发完成 🎉]
- 命令面板 `setMyCommands`、回调应答 `answerCallbackQuery`、消息原地编辑翻页、内联模式、表情回应、邀请链接、入群审批、频道身份封禁、话题群、批量删除、Webhook 自管理



------

##### 🎟 Github Stats

<div align="left">
<img src="https://github-readme-stats.vercel.app/api?username=xiaomaoJT&show_icons=true&count_private=true&hide_border=true" align="center" style="height:180px;" />
</div>


------


##### 🎟 Visitor Counter

<div align="left">
<img src="https://komarev.com/ghpvc/?username=xiaomaoJT&&style=flat-square" align="center" />
</div>



------------

#### 🎟 ***声明***

- 此项目中仅用于学习研究，不保证其合法性、准确性、有效性，请根据情况自行判断，本人对此不承担任何保证责任。
- 由于此脚本仅用于学习研究，您必须在下载后 24 小时内将所有内容从您的计算机或手机或任何存储设备中完全删除，若违反规定引起任何事件本人对此均不负责。
- 请勿将此脚本用于任何商业或非法目的，若违反规定请自行对此负责。
- 此脚本涉及应用与本人无关，本人对因此引起的任何隐私泄漏或其他后果不承担任何责任。
- 本人对任何脚本引发的问题概不负责，包括但不限于由脚本错误引起的任何损失和损害。
- 如果任何单位或个人认为此脚本可能涉嫌侵犯其权利，应及时通知并提供身份证明，所有权证明，我将在收到认证文件确认后删除此脚本。
- 所有直接或间接使用、查看此脚本的人均应该仔细阅读此声明。本人保留随时更改或补充此声明的权利。一旦您使用或复制了此脚本，即视为您已接受此免责声明。
