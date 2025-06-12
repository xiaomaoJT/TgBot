**[TgBot](https://github.com/xiaomaoJT/TgBot)**   ***https://github.com/xiaomaoJT/TgBot***  **@XiaoMao**

**[<< 回到首页](https://github.com/xiaomaoJT/TgBot)** 



```text
 * author ： @XiaoMao
 * xiaomao组织⬇️
 * # 微信公众号 【小帽集团】
 * # Tg频道频道：https://t.me/xiaomaoJT
 *
 * 正式版 V1.54 - updateTime@20250605

 *
 * 源码开发不易，使用引用请注明出处！
 * 源码开发不易，使用引用请注明出处！
 * 源码开发不易，使用引用请注明出处！
 *
 
 正式版特点：
 1、代码模块化划分
 2、数据表独立管理
 3、配置独立管理
 
 功能描述：
 ❶ 超级群管功能
 ❷ 广告词/敏感词过滤/动态配置、自动删除/警告/封禁
 ❸ 多样化接口查询、数据加工
 ❹ 自定义聊天窗快捷键盘/消息跟随按钮
 ❺ 关键字消息/私聊消息 自定义配置｜自动回复
 ❻ 私聊消息/群组消息 捕捉及消息私人推送
 ❼ 私聊消息/群组消息 自动存储
 
 功能细则：
 入群检测｜退群检测
 入群欢迎｜退群欢送
 超级群管功能：用户封禁、用户解封、用户禁言
 广告词敏感词拦截及自动删除、封禁、动态配置
 chatGPT查询
 消息私人推送
 BOT消息主动回复
 自动接口查询及数据加工
 自定义键盘
 私聊及自动回复
 关键字自动回复
 消息存储
 等
 
 
```



------------

#### 🎟 Telegram Bot 快速使用教程

> 1. 关注并激活[XiaoMaoBot机器人](https://t.me/Xiao_MaoMao_bot)。
> 2. 将XiaoMaoBot机器人拉入群聊。
> 3. 授予XiaoMaoBot机器人管理员权限。
> 4. 至此即可自动开启XiaoMaoBot机器人所有功能。

------

------

#### 🎟 Telegram Bot 快速搭建教程

##### 视频教程

▶ [正式版部署 - 视频教程](https://www.alipan.com/s/dW2yPirBysi) ✅



##### 文字教程

###### 🚗 第一步：创建\登陆谷歌账号，并打开[谷歌云端硬盘](https://drive.google.com/drive/my-drive?ths=true)

```text
1⃣️ Google账号请自行创建，此处不作详细说明～
2⃣️ 登陆Google账号，并打开Google Drive
3⃣️ 谷歌云端硬盘地址：https://drive.google.com/drive/my-drive?ths=true
```


###### 🚗 第二步：创建个人tg机器人

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
🚨用于「var BOTID = ""」中使用

2⃣️ 如果泄漏，可以通过@BotFather进行重置。
3⃣️ 机器人可通过 @BotFather 发送 /mybots 指令进行类似描述、头像、关于、指令等基本设定，这里不做深究

更多教程可查看：https://ithelp.ithome.com.tw/articles/10245264
```


###### 🚗 第三步：新建 Google 表格

```text
1⃣️ 左上角新建，选择Google 表格即可。
2⃣️ 浏览器地址栏，记下表格ID 
```

```javascript
//例如
https://docs.google.com/spreadsheets/d/XXXXXXX这一串就是表格IDXXXXXXXXXXX/edit#gid=0
```

```text
3⃣️ 导入初始化表
4⃣️ 至此，表格新建完毕。
```

```text
⚠️ 注意事项：
1⃣️ 表格ID很重要，需记下来❕
🚨用于「var EXECID = ""」中使用

2⃣️ 初始化表格下载地址
https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot%40OfficialVersion/DB/XiaoMaoBot_DB.xlsx
```

###### 🚗 第四步：创建Google Apps Script函数，完成机器人部署

```text
1⃣️ 打开刚刚创建的Google表格，点击工具栏 扩展程序 > Apps脚本
2⃣️ 按「Modules」目录新建gs脚本「Maobot、Params、Core、Manage、Api、Utils」
https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/MaoBot%40OfficialVersion/Modules
【⚠️根据以上文件创建，请注意『MaoBot.gs』需放首位，请注意删除网页上自带的所有代码！】

3⃣️ 完善「params.gs」中的参数「EXECID」、「BOTID」
4⃣️ 私聊XiaoMaoBot，回复/myid ，获取个人ID，完善「params.gs」中参数「KingId」
https://t.me/Xiao_MaoMao_bot

5⃣️ 完善「params.gs」中的参数「botIdAlone」
56698908989:xxxxxxxx_xxxxxxxx_xxxxxxxxxxxx
其中:前面「56698908989」即是「botIdAlone」

6⃣️ ⚠️保存代码，文件名可随意自定义【⚠️必须手动保存一次，注意顶部myfunction函数变为doPost函数，未切换请手动切换doPost】

7⃣️ 点击部署 > 新建部署
8⃣️ 选择部署类型 > web应用
9⃣️ 描述自行随意填写，有访问权限的人员 选择 任何人
🔟点击部署，进行全部授权，全部允许（左下角小字点开，选择展开后最下面的按钮）
1⃣️1⃣️ 部署成功后，复制web应用网址，替换下面链接，并复制到浏览器打开进行机器人激活
1⃣️2⃣️ 完成，可以通过群聊或者私聊自己的机器人进行消息回复了，并且交互的信息将会自动存于Google表格中。
1⃣️3⃣️ 群聊请注意授予机器人管理权限，部分功能激活请根据源码参数解析提示补充完整必要参数。
```

```javascript
https://api.telegram.org/bot 你的tg机器人Token /setWebhook?url=你的web应用网址
//上面链接替换 你的tg机器人Token和你的web应用网址 内容即可
//⚠️注意链接不要留空格
//⚠️注意链接不要留空格 -- 空格会被浏览器自动转义成 %20 ，请注意排查问题～
//⚠️注意链接不要留空格
//注意token前面有bot需要保留

//替换完成后，复制链接到浏览器打开，返回下方内容皆为成功
{"ok":true,"result":true,"description":"Webhook is set"}
{"ok":true,"result":true,"description":"Webhook is already set"}

//返回下面内容，则tg机器人Token失效，请通过 @BotFather 进行重置，然后再次执行第四步 重新部署
{"ok":false,"error_code":401,"description":"Unauthorized"}

源码开发不易，使用引用请注明出处！遇到问题欢迎留言～

⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️

请注意，以上激活状态仅代表gas WEB部署完成，并不代表可完整运行。

完整功能激活请注意检查以下几点：
1、必要参数填写完整 ⚠️
2、私聊检测【私聊机器人 所有能力表现完整✅】
3、群聊内赋予机器人管理权限。
4、google表格内容会随群聊或机器人私聊自动捕捉信息并实时写入⚠️【私聊表格必须有新数据写人✅】

🚨代码错误排查
1、打开Google Apps Script
2、左侧菜单打开 脚本执行
3、查看允许日志及报错提示
4、根据提示再问题追踪
```

------



##### 🚗 新功能 · 内容补充

> **新特性补充-1.1**
>
> 此补充内容**自更新日期[20230220] 版本号@Beta4.3-228 起**。
>
> 补充内容为新升级项，非必填，若不填写则此服务不生效。
>
> 新增私人消息推送服务，涉及源码顶部参数 **KingId 、 KingType 、KingInfo**
>
> KingID可通过私聊 [XiaoMao机器人](https://t.me/Xiao_MaoMao_bot) 回复 **/myid** 获取

```javascript
私人消息推送服务，即会将机器人采集的指定内容实时推送给服务所有者或指定人。
当前消息详情支持 表情、图片、视频、文件、音频 五种类型消息，其他类型消息只推送消息内容。 

// 取需要推送的主人 TG 的 chat_id
var KingId = "";
// 1 全部类型
// 2 群聊 + 私聊类型
// 3 私聊类型
// 4 群聊类型
var KingType = 1;
// 1 推送详情（原图片、视频、贴纸等）
// 0 仅推送基础消息
var KingInfo = 1;


推送内容预览：

🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄🍄

XiaoMaoBot捕捉到用户讯息

📝 简要内容：[文本消息] XXXX
🎎 原始用户：XXXX
🏖 来源位置：来自 [私聊]
🛎 发送时间：2023/06/29 14:05:06
📰 原始数据：
{"update_id":xxxx,"message":{"message_id":xxxx,"from":{"id":xxxx,"is_bot":false,"first_name":"xxxx","username":"xxxx","language_code":"zh-hans"},"chat":{"id":xxxx,"first_name":"xxxx","username":"xxxx","type":"private"},"date":xxxx,"voice":{"duration":0,"mime_type":"audio/ogg","file_id":"xxxx","file_unique_id":"xxxx","file_size":4200}}}

🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀🍀
```

------

>**新特性补充-1.2**
>
>**Bot消息主动回复 - 私人消息推送功能升级补充项** 更新日期[20230621] 版本 **@Beta4.4-417**
>
>[**部署图解**](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/配置图解)
>
>以下特性仅适用于开启私人消息推送服务后的MaoBot。
>
>------
>
>**使用限制：**
>
>1、主动回复功能仅适用于Bot主人，即KingId所属者。
>
>2、主动回复功能仅可通过部署后的MaoBot私聊窗口进行回复。
>
>3、版本@Beta4.4-417 - 当前版本仅支持主动回复文本消息。
>
>4、不建议频繁使用Bot主动私聊功能，避免造成误封等不必要的麻烦，后果自负。
>
>------
>
>**使用教程：**
>
>通过部署后的私人MaoBot聊天框，引用MaoBot所推送的【私聊】或【群聊】消息，通过私有指令 **/reply + 主动回复内容** 来激活主动回复功能。
>
>**私有指令：**
>
>/reply + 主动回复内容
>
>------
>
>**使用效果：**
>
>1、正确引用消息并发送指令后，将收到反馈【**✅ 私聊信息已发送成功**】
>
>2、错误引用消息，将收到失败反馈。
>
>3、主动回复可支持回复 私聊消息 及 群聊消息，群聊消息支持针对性引用式回复。
>
>------
>
>------
>
>**新特性补充-1.3** 
>
>群管功能：封禁用户、解封用户 ；更新日期[**20250508**] 版本 ***V1.33***
>
>**使用方法：**
>
>与主动回复功能类似，支持权限下放群管，支持群聊中引用用户消息进行指令操作，当前版本为永久封禁。
>
>**私有指令：**
>
>【封禁用户】/ban
>
>- 【自更新日期[20230629] 版本 **@Beta4.4-444**起，封禁功能支持自定义封禁时间】
>
>- 封禁时长分为三种
>
>- 1、N分钟：Nm 如30分钟：30m  例：/ban 30m
>
>- 2、N天：Nd 如30天：30d 例：/ban 30d
>
>- 3、不填：永久封禁 例：/ban
>
>- 【封禁用户】/ban + 时长
>
>
>
>【解封用户】/unban
>
>------
>
>------
>
>**新特性补充-1.4**
>
>群管功能：禁言用户 ；更新日期[**20250508**] 版本 ***V1.33***
>
>**使用方法：**
>
>与主动回复功能类似，支持权限下放群管，支持群聊中引用用户消息进行指令操作，封禁时长规则请见**新特性补充-1.3**。
>
>**私有指令：**
>
>【禁言用户】/restrict + 时长

------



> **新特性补充-2**
>
> 此补充内容**自更新日期[20230322] 版本号@Beta4.3-291 起**。
>
> *新增参数**botIdAlone**，用于识别引用类型消息的回复*
>
> botIdAlone 取机器人的id

------



> **新特性补充-3**
>
> 此补充内容**自更新日期[20230505] 版本号@Beta 4.4-382 起**。
>
> *新增参数**forGotList**，用于过滤需要排除捕捉的群组信息*
>
> forGotList 取*请填入群组id,多个用,间隔 如 ['22222','11111]*

------



> **新特性补充-4**
>
> 此补充内容**自更新日期[**20250326**] 版本号V1.31 起**。
>
> *新增机器人消息定时删除*
>
> *// 缓存过期时间（秒）- 180分钟*
>
> *var* cacheExpirationInSeconds = 180 * 60;
>
> *// 是否强制缓存刷新 -- 启用后将无视缓存实时获取数据*
>
> *var* cacheExpirationStatus = true;

------



> **新特性补充-5**
>
> 此补充内容**自更新日期[20250605] 版本号V1.54 起**。
>
> *更改敏感词逻辑，支持动态配置，但仅支持Bot所有者，「请注意控制敏感词数量，过多将极大影响响应性能」*
>
> 【绝杀用户】/banword + 绝杀词
>
> 【敏感拦截】/sensitiveword + 敏感词

> 

------



> **新特性补充-6**
>
> 此补充内容**自更新日期[20250612] 版本号V1.67 起**。
>
> 群管功能：解禁用户ID；*新增解禁用户操作，于群聊中发起指令*
>
> 【解禁用户ID】/releaseid + 用户ID
>
> ------
>
> 1、敏感词算法优化，针对「非绝杀类」敏感词，3小时内连续触发3次自动激活用户封禁操作。
>
> 2、ban算法优化，针对「群聊类型」主动封禁操作，将自动移除封禁用户24小时内所有发言。



