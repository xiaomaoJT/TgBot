**[TgBot@XiaoMao](https://github.com/xiaomaoJT/TgBot)**
***https://github.com/xiaomaoJT/TgBot***



------------

#### Telegram Bot机器人，基于Google Apps Script实现。

| **最近更新时间** | **2022年11月13日**                                           |
| :--------------- | :----------------------------------------------------------- |
| **当前版本**     | **Beta3.97**                                                 |
| **Bot功能**      | **可实现敏感词过滤、接口查询、自定义键盘、私聊与@自动回复、关键字回复等功能** |
| **仓库作者**     | **@XiaoMao**                                                 |
| **搭建成本**     | **完全免费**                                                 |



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

📚 [XiaoMaoBot机器人源码](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot.gs/maoBot.gs)

🌲 [XiaoMaoBot机器人源码 · 参数解析](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/MaoBot.gs)

🚗 [Telegram Bot 搭建教程](#course)

📖 [仓库资源更新日志](#update)



------------

##### <span id="couse">🎟 Telegram Bot 搭建教程</span>
> 轻松上手，带你免费打造属于自己的telegram机器人
>
> [三分钟免费注册外区Apple ID 教程](https://mp.weixin.qq.com/s/YzYsF9QyHZVJK9P7bsrURQ)

###### 🚗 第一步：创建\登陆谷歌账号，并打开[谷歌云端硬盘](https://drive.google.com/drive/my-drive?ths=true)

```text
1⃣️ Google账号请自行创建，此处不作详细说明～
2⃣️ 登陆Google账号，并打开Google Drive
3⃣️ 谷歌云端硬盘地址：https://drive.google.com/drive/my-drive?ths=true
```

###### 🚗 第二步：新建 Google 表格

```text
1⃣️ 左上角新建，选择Google 表格即可。
2⃣️ 浏览器地址栏，记下表格ID 
```

```javascript
//例如
https://docs.google.com/spreadsheets/d/XXXXXXX这一串就是表格IDXXXXXXXXXXX/edit#gid=0
```

```text
3⃣️ 修改表格名称及表格底部工作表名（右键，重命名）
4⃣️ 至此，表格新建完毕。
```

```text
⚠️ 注意事项：
1⃣️ 表格ID很重要，需记下来❕
2⃣️ 工作表名很重要，需记下来❕
3⃣️ 注意工作表名和表格名的区别，工作表名是表格底下的名称，不是顶上的❕❕❕
```

###### 🚗 第三步：创建个人tg机器人

```text
1⃣️ telegram搜索 @BotFather 机器人
2⃣️ 点击 @BotFather 菜单 /newbot 或 自行输入
3⃣️ 待机器人响应后 按要求输入 自己的机器人名称，注意名称要求小写字母，且以bot结尾，例如maobot或者mao_bot 等等
4⃣️ 如果提示被使用，则继续重新输入新名称，直到可用为止
5⃣️ 创建成功后，将自动生成一串token代码，即为你的机器人ID码
6⃣️ 通过 @BotFather 菜单 /setjoingroups ，选择机器人后，点击Enable按钮打开机器人加群功能，开启后可通过机器人详情页，实现新增到群组或频道功能。
7⃣️ 至此机器人创建完成。
```

```text
⚠️ 注意事项：
1⃣️ 机器人token很重要，需记下来❕
2⃣️ 如果泄漏，可以通过@BotFather进行重置。
3⃣️ 机器人可通过 @BotFather 发送 /mybots 指令进行类似描述、头像、关于、指令等基本设定，这里不做深究

更多教程可查看：https://ithelp.ithome.com.tw/articles/10245264
```

###### 🚗 第四步：创建Google Apps Script函数，完成机器人部署

> [MaoBot.gs 代码](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot.gs/maoBot.gs)
>
> [部署图解](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/配置图解)

```text
1⃣️ 打开刚刚创建的Google表格，点击工具栏 扩展程序 > Apps脚本
2⃣️ 复制maoBot.gs代码，并全部覆盖粘贴到脚本内
3⃣️ 完善EXECID - 谷歌表格ID；在引号内填入自己的谷歌表格ID
4⃣️ 完善EXECNAME - 谷歌表格 工作表名；在引号内填入自己的谷歌表格工作表名
5⃣️ 完善BOTID - tg机器人Token；在引号内填入自己的tg机器人Token
6⃣️ 保存代码，文件名可随意自定义
7⃣️ 点击部署 > 新建部署
8⃣️ 选择部署类型 > web应用
9⃣️ 描述自行随意填写，有访问权限的人员 选择 任何人
🔟点击部署，进行全部授权，全部允许（左下角小字点开，选择展开后最下面的按钮）
1⃣️1⃣️ 部署成功后，复制web应用网址，替换下面链接，并复制到浏览器打开进行机器人激活
1⃣️2⃣️ 完成，可以通过群聊或者私聊自己的机器人进行消息回复了，并且交互的信息将会自动存于Google表格中。
```

```javascript
https://api.telegram.org/bot 你的tg机器人Token /setWebhook?url=你的web应用网址
//上面链接替换 你的tg机器人Token和你的web应用网址 内容即可
//注意链接不要留空格
//注意token前面有bot需要保留

//替换完成后，复制链接到浏览器打开，返回下方内容皆为成功
{"ok":true,"result":true,"description":"Webhook is set"}
{"ok":true,"result":true,"description":"Webhook is already set"}

//返回下面内容，则tg机器人Token失效，请通过 @BotFather 进行重置，然后再次执行第四步 重新部署
{"ok":false,"error_code":401,"description":"Unauthorized"}
```


------------

#####  <span id="update">🎟 更新日志</span>
> 如何更新？在Google表格的Apps脚本中，替换maobot代码，保存并部署即可。

> 如何更新部署？右上角部署 > 管理部署 > 编辑 > 选择新版本，输入版本描述 > 部署即可生效。

> 旧部署将自动归档；请注意保留前三行 EXECID 、 EXECNAME 、 BOTID参数。

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



------------


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
