**[TgBot](https://github.com/xiaomaoJT/TgBot)**   ***https://github.com/xiaomaoJT/TgBot***  **@XiaoMao**

**[<< 回到首页](https://github.com/xiaomaoJT/TgBot)** 



------

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



------------

#####  <span id="update">🎟 更新日志</span>

> 如何更新？在Google表格的Apps脚本中，替换maobot代码，保存并部署即可。

> 如何更新部署？右上角部署 > 管理部署 > 编辑 > 选择新版本，输入版本描述 > 部署即可生效。

> 旧部署将自动归档；请注意保留前三行 EXECID 、 EXECNAME 、 BOTID 参数，及新参数 KingId、botIdAlone。

> 诸如行内键盘调用类更新将不作细致更新记录，最新更新时间以首页或本页或版本号为主。

> 本仓自2022年9月10日起 已持续更新 ***100*** 次

> ***最新更新时间 2023.06.25 16:05***



+ **20230625**

  * > 更新maobot，内部测试版本号@Beta4.4-420。

  * > 修复部分api，补充新参数文档。



+ **20230621**

  * > 更新maobot，内部测试版本号@Beta4.4-417。

  * > 新增功能【bot消息主动回复：即使用bot身份回复他人消息】，当前版本仅适用于回复文本消息。


+ **20230505**

  * > 更新maobot，内部测试版本号@Beta4.4-382。

  * > 新增参数【forGotList】。

+ **20230418**

  * > 更新maobot，内部测试版本号@Beta4.4-377。

  * > 修复新逻辑下非文本消息捕捉失效问题。

  * > 新增捕捉内容中私聊类型的用户定位。

+ **20230409**

  * > 更新maobot，内部测试版本号@Beta4.4-362。

  * > 升级api请求。


+ **20230407【跨版本更新·⚠️·需要更新·修复重大bug】**

  * > 更新maobot，内部测试版本号@Beta4.4-354。

  * > 修复重大逻辑Bug。

  * > 加快响应速度，理论上加快6倍。


+ **20230323**

  * > 补充源码注释及部分教程。


+ **20230322**

  * > 更新maobot，内部测试版本号@Beta4.3-291。

  * > 新增参数botIdAlone，用于识别引用类型消息的回复

  * > 提升智能回复，针对引用消息进行捕捉回复


+ **20230320**

  * > 更新maobot，内部测试版本号@Beta4.3-285。

  * > 优化响应策略，新增对提及消息的支持


+ **20230317**

  * > 更新maobot，内部测试版本号@Beta4.3-273。

  * > 优化响应策略

  * > 优化@类型消息错误捕捉


+ **20230303**

  * > 更新maobot，内部测试版本号@Beta4.3-266。

  * > 优化start消息回复

  * > 优化api查询时查询数据为空的情况


+ **20230224**

  * > 更新maobot，内部测试版本号@Beta4.3-264。

  * > 优化私人消息推送内容，新增非私聊讯息内容来源跳转，优化推送排版

  * > 优化消息存储时非文本消息的undefined报错

+ **20230222**

  * > 更新maobot，内部测试版本号@Beta4.3-253。

  * > 新增对表情、图片、视频、文件、音频消息的识别

  * > 新增隐私指令【 /myid 】，可用于获取自身 tg_chat_id，请注意私聊机器人调用。

  * > 优化私人消息推送，新增详情推送服务及[教程](https://github.com/xiaomaoJT/TgBot/blob/main/COURSE.md)

  * > 新增可用于测试的样例[maoBotTest.gs](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot.gs/maoBotTest.gs)

  * > 新增表格内容消息类型存储


+ **20230221**

  * > 更新maobot，内部测试版本号@Beta4.3-249。

  * > 优化私人消息推送机制 ，新增推送量级选择

  * > 新增对私聊消息中非文本类型消息的识别及响应

  * > 优化提及类型消息的识别及响应


+ **20230220**

  * > 更新maobot，内部测试版本号@Beta4.3-228。

  * > 新增chatGPT二次聚合接口（原接口为减少调用次数，将优先调用数据库数据，即重复问题的回答可能一致，长时间未回复请尝试更换问题，最长等待时间10min，并已接入违禁词拦截，请勿询问政治敏感、色情低俗、赌、毒等违法内容，消息经二次加工而得，可能存在滞后，请注意文明玩耍，勿恶意刷屏）

  * > 新增机器人消息私人推送，目前为全量推送（测试中，当前类型可能造成频繁推送），请至源码顶处完善KingId，即主人的chat_id

  * > 优化关键字响应，减少无关回复

  * > 优化示例

+ **20230117**

  * > 更新maobot，内部测试版本号@Beta4.3-200。

  * > 更新键盘栏响应。

+ **20230114**

  * > 更新maobot，内部测试版本号@Beta4.2198。

  * > 更新底部键盘栏配置。

+ **20230110**

  * > 更新maobot，内部测试版本号@Beta4.2192。

  * > 剔除响应时间，新增响应延迟计算方法(/delay方法期限开放)。

  * > 优化响应逻辑，提高响应速度。

+ **20230109**

  * > 更新maobot，内部测试版本号@Beta4.2182。

  * > 新增响应关键字及解决入口。

  * > 优化响应逻辑，提高响应速度。

+ **20230106**

  * > 更新maobot，内部测试版本号@Beta4.2180。

  * > 新增QX教程按钮。

  * > 优化响应逻辑，提高响应速度。

+ **20221228**

  * > 更新maobot，内部测试版本号@Beta4.2179。

  * > 下线疫情查询接口功能。

  * > 优化响应逻辑，提高响应速度。

+ **20221215**

  * > 更新maobot，内部测试版本号@Beta4.2178。

  * > 上线入群欢迎、退群欢送功能。

  * > 优化响应逻辑，提高响应速度。

+ ##### 20221128（灰度测试中）

  * > 更新maobot，内部测试版本号@Beta4.2175。

  * > 新增入群欢迎、退群欢送功能（功能测试中）。

  * > 优化响应逻辑，提高响应速度。

  * > 新增Bot.gs模块脚本。

+ ##### 20221126

  * > 更新maobot，内部测试版本号@Beta4.11。

  * > 修复随机小姐姐视频接口。

+ ##### 20221124

  * > 更新maobot，内部测试版本号@Beta4.10。

  * > 修复部分bug。

+ ##### 20221117

  * > 更新maobot，内部测试版本号@Beta4.08。

  * > 修复所有api接口，简化接口调用语句。

  * > 升级api调用方式，采用json格式，数据由XiaoMao加工而得。

+ ##### 20221116

  * > 更新maobot，内部测试版本号@Beta4.02。

  * > 修复部分api接口，更改接口策略，由XiaoMao加工而得。

+ ##### 20221114

  * > 更新maobot，内部测试版本号@Beta3.99。

  * > 优化自定义键盘配置，新增tg解限制 按钮。

+ ##### 20221113

  * > 更新maobot，内部测试版本号@Beta3.97。

  * > 新增基于DFA算法的聊天消息敏感词过滤（checkSensitiveDFA方法）。

  * > 优化部分mention类型消息错误提示。

  * > 修复部分BUG。

+ ##### 20221109

  * > 更新maobot，内部测试版本号@Beta3.84。

  * > 增加api指令错误捕捉。

  * > 新增去广告指令。

  * > 修复部分BUG。

+ ##### 20221028

  * > 更新maobot，内部测试版本号@Beta3.80。

  * > 优化masBot部分api指令，防止误判。

  * > 新增启用机器人时start指令的识别。

+ ##### 20221026

  * > 更新maobot，内部测试版本号@Beta3.78。

  * > 优化部分资源失效问题。

  * > 优化部分字段undefined存储。

+ ##### 20221021

  * > 更新maobot，内部测试版本号@Beta3.76。

  * > 优化讯息存储结构，增加回复语句存储（数据存储更改，需同步修改Google表格结构），[配置图解 点击查看](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/配置图解)。

  ```text
  发起时间	用户ID	用户名称	用户昵称	消息类型	消息来源	来源ID	消息内容	消息JSON
  ```

  * > 修复消息回调键盘失效的问题。

  * > 新增接口聊天机器人 ，通过指令 /hi 激活 ，例如/hi 早上好

  * > 新增国内疫情查询 ， 通过指令 /yq 激活 ， 例如/yq 广东

+ ##### 20221017

  * > 更新maobot源码参数详解。

+ ##### 20221016

  * > 免费节点订阅地址开放 [XiaoMao-Forever](https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-Forever)。

  * > 内部测试版本号 MaoBot @Beta3.2

+ ##### 20221014

  * > 更新maoBot.gs存储优化，避免id串自动格式化。

  * > 优化自动回复逻辑，仅对 私聊消息、关键字、@消息 三种类型进行回复。

  * > 内部测试版本号 MaoBot @Beta3.1

+ ##### 20221013

  * > 更新maoBot.gs回复内容设定及语句换行样式优化。

  * > 内部测试版本号 MaoBot @Beta2.3

+ ##### 20221009

  * > MaoBot @Beta2.0

  * > 新增maoBot参数描述

  * > 升级功能，增加接口查询：天气状况查询、短链接生成、抖音热搜榜、手机号码查询、网站测速、酷狗音乐、腾讯视频、中国农历查询

+ ##### 20221008

  * > MaoBot @Beta1.1

  * > 增加关键字回复功能，优化自动回复配置

  * > 增加使用教程

+ ##### 20221001

  * > MaoBot @Beta1.0 第一测试版

  * > 可实现自定义键盘、消息跟随键盘、自动回复、消息存储等功能

+ ##### 20220930

  * > bot基础代码



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

