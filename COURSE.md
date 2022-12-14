**[TgBot](https://github.com/xiaomaoJT/TgBot)**   ***https://github.com/xiaomaoJT/TgBot***  **@XiaoMao**

**[<< 回到首页](https://github.com/xiaomaoJT/TgBot)** 



------------

#### 🎟 Telegram Bot 快速使用教程

> 1. 关注并激活[XiaoMaoBot机器人](https://t.me/Xiao_MaoMao_bot)。
> 2. 将XiaoMaoBot机器人拉入群聊。
> 3. 授予XiaoMaoBot机器人管理员权限。
> 4. 至此即可自动开启XiaoMaoBot机器人所有功能。

#### <span id="couse">🎟 Telegram Bot 搭建教程</span>

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

源码开发不易，使用引用请注明出处！遇到问题欢迎留言～
```

