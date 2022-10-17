**[TgBot@XiaoMao](https://github.com/xiaomaoJT/TgBot)**
***https://github.com/xiaomaoJT/TgBot***

------------
------------

## Telegram机器人，基于Google Apps Script实现.
- 作者@XiaoMao
- 当前版本：@Beta3.2
- 可实现接口查询、自定义键盘、私聊与@自动回复、关键字回复等功能
- 最近更新时间：2022年10月16日
> 资源来源于网络，仅供学习参考，请于下载后24小时内删除

------------
------------

#### [更新日志](#update)

#### [XiaoMao机器人源码](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot.gs/maoBot.gs)
#### [XiaoMao机器人源码部分参数解析](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/MaoBot.gs)

------------
------------

## 🌟🌟🌟🌟 tg机器人 简略配置教程
> - 轻松上手，带你打造属于自己的tg机器人
> - 有js基础的或想完整学习部署的，可参考[@toikusen](https://ithelp.ithome.com.tw/users/20130283/ironman/3553)教程


### 🚇 第一步：创建\登陆谷歌账号，并打开[谷歌云端硬盘](https://drive.google.com/drive/my-drive?ths=true)
> - 1、Google账号请自行创建，此处不作详细说明～
> - 2、登陆Google账号，并打开Google Drive
> - 3、谷歌云端硬盘地址：https://drive.google.com/drive/my-drive?ths=true

------------

### 🚇🚇 第二步：新建 Google 表格
> - 1、左上角新建，选择Google 表格即可。
> - 2、浏览器地址栏，记下表格ID 
```text
例如：https://docs.google.com/spreadsheets/d/XXXXXXX这一串就是表格IDXXXXXXXXXXX/edit#gid=0
```
> - 3、修改表格名称及表格底部工作表名（右键，重命名）
> - 4、至此，表格新建完毕。
```text
    注意事项：
    1、表格ID很重要，需记下来❕
    2、工作表名很重要，需记下来❕
    3、注意工作表名和表格名的区别，工作表名是表格底下的名称，不是顶上的❕❕❕
```

------------

### 🚇🚇🚇 第三步：[创建个人tg机器人](https://ithelp.ithome.com.tw/articles/10244411)
> -  1、telegram搜索 @BotFather 机器人
> -  2、点击 @BotFather 菜单 /newbot 或 自行输入
> -  3、待机器人响应后 按要求输入 自己的机器人名称，注意名称要求小写字母，且以bot结尾，例如maobot或者mao_bot 等等
> -  4、如果提示被使用，则继续重新输入新名称，直到可用为止
> -  5、创建成功后，将自动生成一串token代码，即为你的机器人ID码
```text
    注意事项：
    1、机器人token很重要，需记下来❕
    2、如果泄漏，可以通过@BotFather进行重置。
    3、机器人可通过 @BotFather 发送 /mybots 指令进行类似描述、头像、关于、指令等基本设定，这里不做深究
    教程：https://ithelp.ithome.com.tw/articles/10245264
```
> -  6、通过 @BotFather 菜单 /setjoingroups ，选择机器人后，点击Enable按钮打开机器人加群功能，开启后可通过机器人详情页，实现新增到群组或频道功能。
> -  7、至此机器人创建完成。

------------

### 🚇🚇🚇🚇 第四步：创建Google Apps Script函数，完成机器人部署
> -  1、打开刚刚创建的Google表格，点击工具栏 扩展程序 > Apps脚本
> -  2、复制 [maoBot.gs](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot.gs/maoBot.gs) 代码，并全部覆盖粘贴到脚本内
> -  3、完善EXECID - 谷歌表格ID；在引号内填入自己的谷歌表格ID
> -  4、完善EXECNAME - 谷歌表格 工作表名；在引号内填入自己的谷歌表格工作表名
> -  5、完善BOTID - tg机器人Token；在引号内填入自己的tg机器人Token
> -  6、保存代码，文件名可随意自定义
> -  7、点击部署 > 新建部署；[配置图解 点击查看](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/配置图解) **图解配置教程**
> -  8、选择部署类型 > web应用
> -  9、描述自行随意填写，有访问权限的人员 选择 任何人
> -  10、点击部署，进行全部授权，全部允许（左下角小字点开，选择展开后最下面的按钮）
> -  11、部署成功后，复制web应用网址，替换下面链接，并复制到浏览器打开进行机器人激活
```text
https://api.telegram.org/bot 你的tg机器人Token /setWebhook?url=你的web应用网址
上面链接替换 你的tg机器人Token和你的web应用网址 内容即可，注意链接不要留空格

替换完成后，复制链接到浏览器打开，返回下方内容皆为成功
{"ok":true,"result":true,"description":"Webhook is set"}
{"ok":true,"result":true,"description":"Webhook is already set"}

返回下面内容，则tg机器人Token失效，请通过 @BotFather 进行重置，然后再次执行第四步 重新部署
{"ok":false,"error_code":401,"description":"Unauthorized"}
```
> -  12、完成，可以通过群聊或者私聊自己的机器人进行消息回复了，并且交互的信息将会自动存于Google表格中，nice～

------------
------------

## 🌟🌟 <span id="update">更新日志</span>
##### [XiaoMao机器人源码](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/MaoBot.gs/maoBot.gs)
##### [XiaoMao机器人源码部分参数解析](https://github.com/xiaomaoJT/TgBot/tree/main/Apps%20Script/MaoBot.gs)
> 如何更新？在Google表格的Apps脚本中，替换maobot代码，保存并部署即可。

> 如何更新部署？右上角部署 > 管理部署 > 编辑 > 选择新版本，输入版本描述 > 部署即可生效。

> 旧部署将自动归档；请注意保留前三行 EXECID 、 EXECNAME 、 BOTID参数。

+ ### 20221017
    * > 更新maobot源码参数详解。
+ ### 20221016
    * > 免费节点订阅地址开放 [XiaoMao-Forever](https://gist.githubusercontent.com/xiaomaoJT/921025f761277153bebb30abde7f784f/raw/XiaoMao-Forever)。
    * > 内部测试版本号 MaoBot @Beta3.2
+ ### 20221014
    * > 更新maoBot.gs存储优化，避免id串自动格式化。
    * > 优化自动回复逻辑，仅对 私聊消息、关键字、@消息 三种类型进行回复。
    * > 内部测试版本号 MaoBot @Beta3.1
+ ### 20221013
    * > 更新maoBot.gs回复内容设定及语句换行样式优化。
    * > 内部测试版本号 MaoBot @Beta2.3
+ ### 20221009
    * > MaoBot @Beta2.0
    * > 新增maoBot参数描述
    * > 升级功能，增加接口查询：天气状况查询、短链接生成、抖音热搜榜、手机号码查询、网站测速、酷狗音乐、腾讯视频、中国农历查询
+ ### 20221008
    * > MaoBot @Beta1.1
    * > 增加关键字回复功能，优化自动回复配置
    * > 增加使用教程
+ ### 20221001
    * > MaoBot @Beta1.0 第一测试版
    * > 可实现自定义键盘、消息跟随键盘、自动回复、消息存储等功能
+ ### 20220930
    * > bot基础代码