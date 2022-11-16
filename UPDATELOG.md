**[TgBot](https://github.com/xiaomaoJT/TgBot)**   ***https://github.com/xiaomaoJT/TgBot***  **@XiaoMao**

**[<< 回到首页](https://github.com/xiaomaoJT/TgBot)** 



------------

#####  <span id="update">🎟 更新日志</span>

> 如何更新？在Google表格的Apps脚本中，替换maobot代码，保存并部署即可。

> 如何更新部署？右上角部署 > 管理部署 > 编辑 > 选择新版本，输入版本描述 > 部署即可生效。

> 旧部署将自动归档；请注意保留前三行 EXECID 、 EXECNAME 、 BOTID参数。

+ ##### 20221116

  * > 更新maobot，内部测试版本号@Beta4.02。

  * > 修复部分api接口，更改接口策略，由XiaoMao二次加工而得。

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

