# mao 机器人脚本源码
- 当前版本：@Beta3.2
- 可实现接口查询、自定义键盘、私聊与@自动回复、关键字回复等功能
- 最近更新时间：2022 年 10 月 16 日
- 作者@XiaoMao

------------
------------

## **源码部分解析**
- 可能需要部分javascript基础

#### 源码使用教程，详见首页 [简略配置教程](https://github.com/xiaomaoJT/TgBot#-tg机器人-简略配置教程)
```javascript
// 使用前请注意完善参数
// Google EXEC ID - 谷歌表格ID
var EXECID = "";
// Google EXEC ID - 谷歌表格 工作表名
var EXECNAME = "";
// Telegram BOT ID - tg机器人Token
var BOTID = "";
```

------------

#### [replyWord 参数，针对 html 格式文本回复](https://core.telegram.org/bots/api#formatting-options)
```javascript
    // 官方目前仅兼容以下标签
    <b>bold</b>, <strong>bold</strong>
    <i>italic</i>, <em>italic</em>
    <u>underline</u>, <ins>underline</ins>
    <s>strikethrough</s>, <strike>strikethrough</strike>, <del>strikethrough</del>
    <span class="tg-spoiler">spoiler</span>, <tg-spoiler>spoiler</tg-spoiler>
    <b>bold <i>italic bold <s>italic bold strikethrough <span class="tg-spoiler">italic bold strikethrough spoiler</span></s> <u>underline italic bold</u></i> bold</b>
    <a href="http://www.example.com/">inline URL</a>
    <a href="tg://user?id=123456789">inline mention of a user</a>
    <code>inline fixed-width code</code>
    <pre>pre-formatted fixed-width code block</pre>
    <pre><code class="language-python">pre-formatted fixed-width code block written in the Python programming language</code></pre>
```
```text
    # 显示效果
    *bold \*text*
    _italic \*text_
    __underline__
    ~strikethrough~
    ||spoiler||
    *bold _italic bold ~italic bold strikethrough ||italic bold strikethrough spoiler||~ __underline italic bold___ bold*
    [inline URL](http://www.example.com/)
    [inline mention of a user](tg://user?id=123456789)
    `inline fixed-width code`
    ```
    pre-formatted fixed-width code block
    ````
    ```python
    pre-formatted fixed-width code block written in the Python programming language
    ````
    ```
```

------------

#### **followKeyboard** 参数 聊天窗口底部自定义键盘
> - 点击效果为发送预设文字。例如text: "公众号小帽集团"，则点击自动发送公众号小帽集团
> - 可通过 keyboardParams 参数进行键盘设定，具体可参考：https://core.telegram.org/bots/api#replykeyboardmarkup

------------

#### **followMessageKeyboard** 参数 消息跟随在线键盘
> - 样式为跟随在回复的消息底部，可通过特定参数进行激活
> - 一般有两种样式，一是url链接形式，点击可实现跳转指定链接；二是callback形式，点击进行回调，可执行指定操作。
> - 可通过 keyboardFollowParams 参数进行键盘设定，具体可参考：https://core.telegram.org/bots/api#inlinekeyboardmarkup
```text
    回调参数，经测试Google Apps Script无法直接通过e.postData.contents.callback_query在其他函数内进行判定，故通过doPost函数的MESSAGETYPE参数进行预判定。

    判定成功后，激活回调，将收到callback_data预定内容，可根据该内容进行指定回调操作。
```

------------

#### **autoReply** 参数 自定义关键字匹配
> - **keyword** 参数为某规则关键字列表，请注意使用数组[]格式，请注意关键字不要重复。
> - **replyWord** 参数为某关键字所对应的回复语句，html格式或字符串格式，具体规则可参考：https://core.telegram.org/bots/api#formatting-options。
> - **"\n"**为换行符
> - **htmlReply** 参数为默认回复语句
> - **outsideWord** 参数为关键字排除，将优先排除内定的关键字匹配

------------

#### **commandWord** 参数 api指令参数匹配
> - 针对api接口，进行指定参数指令匹配，将自动匹配设定的api接口，函数会自动处理，提取指令后面的查询语句
> - 接口数据来源于随身助手API，无需申请token，但可能存在网络拥挤情况，可稍后再试！