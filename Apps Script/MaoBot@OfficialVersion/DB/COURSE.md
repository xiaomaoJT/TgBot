**[TgBot](https://github.com/xiaomaoJT/TgBot)**   ***https://github.com/xiaomaoJT/TgBot***  **@XiaoMao**

**[<< 回到首页](https://github.com/xiaomaoJT/TgBot)** 



##### 🌠 DB数据库 V1.20+

```text
初始化数据表
1、新建Google表格
2、选择「文件」-「导入」-「上传本地文件XiaoMaoBot_DB.xlsx」-「替换电子表格」-「导入数据」

数据表结构介绍
· db_telegram -- 主体储存表
「无需操作，自动写入」

· key_params -- 关键字配置表
「自动回复关键字内容，按表头要求填写，支持无限多个，支持多段文本持续回复」
「⚠️数据缓存默认3小时刷新一次」

· authority_management -- 权限控制表
「群组消息屏蔽、管理员权限释放」
```



#### 🎟 db_telegram - 主体储存表

> 用于存储数据，无需操作，自动写入

> 建议定期清理，避免因部分查询操作反复读表而造成BOT性能损失

##### 🧩 基础表结构

| 发起时间 | 用户ID | 用户名称 | 用户昵称 | 消息类型 | 消息来源 | 来源ID | 消息内容 | 消息JSON |
| -------- | ------ | -------- | -------- | -------- | -------- | ------ | -------- | -------- |



#### 🎟 key_params - 关键字配置表

##### 🧩 基础表结构

| 关键字块 | 标识块 | 内容块  |            |
| -------- | ------ | ------- | ---------- |
| 关键字   | 标识块 | 内容块1 | 内容块2... |

> 关键字回复列表按「行」为单位进行记录，根据标识块对关键字进行回复内容块文本

> 为避免无效响应，建议删除多余空白行，「右键选中 - 删除行」

##### 🎲 关键字 - 必填

> 关键字列，支持多关键字，以英文逗号「 , 」来间隔。

> 如：懒人规则,懒人配置

##### 🎲 标识块 - 必填

> 标识块列，当前「V1.20」版本以上支持「HTML」、「MarkdownV2」、「GraphicMessage」、「VideoMessage」模式。

```
📋HTML
HTML格式，标签仅支持官方示例内标签，非官方示例标签可能出现回复失败问题。【官方示例：https://core.telegram.org/bots/api#html-style】
使用HTML格式，需在标识块指定填写「HTML」以激活
请注意特殊转换，<a> 标签将会自动转换为可点击链接，不可再嵌套其他标签
⚠️内容块文本请严格按照官方「HTML」格式要求进行填写，填写逻辑错误将无法响应！！

📋MarkdownV2
MarkdownV2格式【官方示例：https://core.telegram.org/bots/api#markdownv2-style】
使用MarkdownV2格式，需在标识块指定填写「MarkdownV2」以激活
⚠️内容块文本请严格按照官方「MarkdownV2」格式要求进行填写，填写逻辑错误将无法响应！！


📋GraphicMessage
使用GraphicMessage格式，需在标识块指定填写「GraphicMessage」以激活
内容块1填写图片文件ID或图片URL，多条按「换行」填写
内容块2填写需要跟随的文本内容，暂仅支持「MarkdownV2」格式
🚨 图片ID查询(上传图片并附带文字指令以激活) 「 #photoid 」
⚠️ 官方建议以ID方式调用，性能更佳

📋VideoMessage
使用VideoMessage格式，需在标识块指定填写「VideoMessage」以激活
内容块1填写视频文件ID或视频URL，多条按「换行」填写
内容块2填写需要跟随的文本内容，暂仅支持「MarkdownV2」格式
🚨视频ID查询(上传视频并附带文字指令以激活)「 #videoid 」
⚠️ 官方建议以ID方式调用，性能更佳
```

###### 🎲 内容块 - 必填

 **[文本格式响应逻辑测试代码](https://raw.githubusercontent.com/xiaomaoJT/TgBot/main/Apps%20Script/BotTest/parseTextTest.gs)**

> 理论上，内容块支持无限多个，不同内容块将分开消息体连续发送，建议单内容块文本字符数控制在1024字以内

> ⚠️内容块文本请严格按照官方格式要求进行填写，填写逻辑错误将无法响应！！



##### 🎟authority_management - 权限控制表

> 理论上，IDs支持无限多个，均为全数字

>  群组ID带有 - 号 
>
> 管理员ID可私聊@Xiao_MaoMao_bot 回复【/myid】获取

##### 🧩 基础表结构

| 类型         | IDs  |      |
| ------------ | ---- | ---- |
| 群组屏蔽列表 | -111 | -222 |
| 管理员列表   | 111  | 222  |

