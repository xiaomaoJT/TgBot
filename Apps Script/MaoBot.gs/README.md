### 🎟 XiaoMao 机器人脚本源码解析

> **作者@XiaoMao**

> **小版本更新请查看更新日志 ｜ 或加入 xiaomao 组织 ⬇️**
> **微信公众号 【小帽集团】**
> **XiaoMao · Tg 频道频道：https://t.me/xiaomaoJT**
>
> ------
>
> Google App Script
> 用于执行 tg 机器人功能
>
> ------
>
> **源码开发不易，使用引用请注明出处！**
>
> **[XiaoMao 机器人](https://t.me/Xiao_MaoMao_bot)**

---

#### 🎟 **源码部分解析**

> 可能需要 javascript 基础。

> 本程序代码基于 Google Apps Script 环境实现，脱离环境将无法运行。

> 【无法通过GAS直接执行问题】机器人通过检测到TG消息方才会响应，直接运行将使得入口函数doPost缺失关键参数而导致失败，若需直接执行，请于本地补全参数e，可作于调试运行。参数e的获取建议于部署完成后，通过私人推送服务获取原始数据。

> 【Address unavailable 问题】导致您问题的原因可能是被阻止的 IP 地址。Google 使用不同的 IP 与服务器通信。有时，服务器会阻止一个或多个 Google 拥有的 IP 地址，从而导致地址不可用错误。每个请求使用不同的 IP 进行通信，因此当我们处理大量 urls 时，有可能会遇到阻塞的 IP 地址，从而导致地址不可用(大数定律)。该问题 Google 暂无解决方案，请更换接口，避免使用公开接口。

> 【预设回复字数过多而造成无响应问题】[问题解析：本问题可能来源于会员限制，非TG会员单次可发送字数限制在1024字符内]当前逻辑，当预设的replyWord字段数量过长时，引用回复将出现无响应现象，建议排查过长的replyWord字段，采取分段方式处理。如【脚本合集】指令的处理方式以解决。

> 【私人推送群聊来源捕获说明】群聊分为公开群组和私聊群组，公开群组才有username方可支持查看来源，私人群组仅可通过邀请链接进入，未获取邀请链接无法查看。


---

#### 🎟 源码使用前准备

> 教程详见首页 [简略配置教程](https://github.com/xiaomaoJT/TgBot#-tg机器人-简略配置教程)

```javascript
//  ==== 必填参数 ====
//  ==== 必填参数 ====
//  ==== 必填参数 ====

// 使用前请注意完善以下三个参数，即可部署运行。
// Google EXEC ID - 谷歌表格ID
var EXECID = ""; // ⚠️必填⚠️
// Google EXEC ID - 谷歌表格 工作表名
var EXECNAME = "";// ⚠️必填⚠️
// Telegram BOT ID - tg机器人Token
var BOTID = "";// ⚠️必填⚠️



//  ==== 选填参数 - 个性化功能项 ====
//  ==== 选填参数 - 个性化功能项 ====
//  ==== 选填参数 - 个性化功能项 ====

// 用于推送主人消息 取主人tg id - 私人消息主动功能必须填写此项
var KingId = ""; // ⚠️建议填写，留空影响推送⚠️
// 1 全部类型
// 2 群聊 + 私聊类型
// 3 私聊类型
// 4 群聊类型
// 5 关闭
var KingType = 1;
// 1 推送详情（原图片、视频、音频、贴纸等）
// 0 仅推送基础消息
var KingInfo = 1;
//填写 bot id 用于识别引用消息
var botIdAlone = ""; // ⚠️建议填写，留空影响引用类型消息⚠️
// 用于过滤需要排除捕捉的群组信息
// 请填入群组id,多个用,间隔 如 ['22222','11111]
var forGotList = [];



//  ==== 默认参数 - 无需改动 ====
//  ==== 默认参数 - 无需改动 ====
//  ==== 默认参数 - 无需改动 ====

// 用于判断消息类型 - inlinekey board回调 or 主动消息
// 1 callback
// 2 new member
// 3 left member
var MESSAGETYPE = 0;
//接入时间戳
var responseTime = "";
// 用于承接返回数据
var dealMessage = {};
```

---

#### 🎟 源码方法与参数解析

##### **🎨 doPost**方法

> 接收参数 e 为 bot 回传的响应参数，字符串格式的 json 串。
>
> 用于接收用户传来的讯息并进行处理

```text
该函数为主函数，当代码部署并与bot建立连接后，将在每次响应后自动调用该方法。
主功能为接收用户讯息，处理用户讯息，回传讯息。

回传时处理：为避免频繁响应，仅对指定关键字、私聊、@类型消息进行回传调用。

注意项：GAS首次部署将会有默认函数，请注意将doPost函数修改为入口函数。
```

---

------

##### **🎨 processData**方法

> 用于定义自定义键盘 及 处理后的用户回复文本格式参数
>
> 用于判断消息类型及处理用户回复文本格式参数
>
> 调用函数对消息进行存储

```text
该函数主要用于配置自定义键盘及格式化回传参数。
自定义键盘分底部键盘及内联键盘两种，可针对不同消息类型进行个性化匹配。

针对用户讯息进行判断，对多类型进行不同处理或进一步处理，可包含文本、图片、语言、回调、视频等类型。
```

##### **🎳 followKeyboard** 参数 聊天窗口底部自定义键盘

> 点击效果为发送预设文字。例如 text: "公众号小帽集团"，则点击自动发送公众号小帽集团
>
> 可通过 keyboardParams 参数进行键盘设定，具体可参考：https://core.telegram.org/bots/api#replykeyboardmarkup

##### **🎳 followMessageKeyboard** 参数 消息跟随在线键盘

> 样式为跟随在回复的消息底部，可通过特定参数进行激活
>
> 一般有两种样式，一是 url 链接形式，点击可实现跳转指定链接；二是 callback 形式，点击进行回调，可执行指定操作。
>
> 可通过 keyboardFollowParams 参数进行键盘设定，具体可参考：https://core.telegram.org/bots/api#inlinekeyboardmarkup

```text
回调参数，经测试Google Apps Script无法直接通过e.postData.contents.callback_query在其他函数内进行判定，故通过doPost函数的MESSAGETYPE参数进行预判定。

判定成功后，激活回调，将收到callback_data预定内容，可根据该内容进行指定回调操作。
```

---

------

##### 🎨 **processReplyWord**方法

> 用于处理用户信息并进行回复文本处理

> [replyWord 参数，针对 html 格式文本回复](https://core.telegram.org/bots/api#formatting-options)

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

##### **🎳 autoReply** 参数 自定义关键字匹配

> **keyword** 参数为某规则关键字列表，请注意使用数组[]格式，请注意关键字不要重复。
>
> **replyWord** 参数为某关键字所对应的回复语句，html 格式或字符串格式，具体规则可参考：https://core.telegram.org/bots/api#formatting-options。
>
> **"\n"**为换行符
>
> **htmlReply** 参数为默认回复语句
>
> **outsideWord** 参数为关键字排除，将优先排除内定的关键字匹配

##### 🎳 **commandWord** 参数 api 指令参数匹配

> 针对 api 接口，进行指定参数指令匹配，将自动匹配设定的 api 接口，函数会自动处理，提取指令后面的查询语句
>
> 接口数据来源于随身助手 API，无需申请 token，但可能存在网络拥挤情况，可稍后再试！

##### 🎳 **returnHtmlReply** 参数 回复状态确认

> 仅针对关键字类型进行回复确认，其余类型默认不回复。优先级低于 doPost 方法。

------

------

##### 🎨 getRelayTime方法

> 响应延迟计算方法
>
> 针对每次机器人响应，进行延迟时间计算

------

------

##### 🎨 **getString**方法

> 用于截取 api 关键字后查询语句

---

------

##### 🎨 **isApi**方法

> 用于判断是否为 api 关键字

---

------

##### 🎨 Api 查询方法

> - getVideo 视频查询
> - getDuJiTang *毒鸡汤*查询
> - getTianGou _舔狗日记生成_
> - getPhoneWhere 查询手机号码归属地
> - getYiYan _一言查询_
> - getMusic _随机歌曲_
> - getLinkShort 短网址生成
> - getWeatherApi 天气 api 查询
> - getHelloBot 聊天机器人
> - getCOVID19 *全国*疫情查询 功能已下架
> - getMiSport 小米运动刷步
> - getLanLink *蓝奏云直链解析*
> - getChatBot chatGPT
> - getHotList 热榜查询
> - getHoroscopeList 星座运势
> - getDouBan 豆瓣电影排行

---

------

##### 🎨 **setStorage**方法

> 用于存储用户讯息

---

------

##### 🎨 **getNowDate**方法

> 用于格式化日期对象

------

------

##### 🎨 **checkSensitiveDFA**方法

> 基于 dfa 算法的关键字过滤，用于过滤敏感词
>
> 敏感词**sensitiveEncodeList**使用 base64 加密

------

------


##### 🎨 **pushDataToKing**方法

> 用于捕捉消息并对主人进行推送
>
> 通过 **KingId & KingType** 控制
>
> 需填写KindId后此方法才能生效

------

------

##### 🎨 getReply方法

> 用于主人对私聊信息进行bot角色回复
>
> **KindId**必填，此方法方可生效
>
> 此功能依赖于**pushDataToKing**推送服务
>
> 私有指令【/reply+内容】

##### 🎨 getBanUser方法

> *封禁用户*
>
> **KindId**必填，此方法方可生效
>
> 此功能依赖于**pushDataToKing**推送服务
>
> 封禁时长分为三种（1、N分钟：Nm 如30分钟：30m ；2、N天：Nd 如30天：30d ；3、不填：永久封禁）
>
> 私有指令【/ban + 时长】

##### 🎨 getUnBanUser方法

> 解封用户
>
> **KindId**必填，此方法方可生效
>
> 此功能依赖于**pushDataToKing**推送服务
>
> 私有指令【/unban】

##### 🎨 getRestrictUser方法

> *限制用户权限*
>
> **KindId**必填，此方法方可生效
>
> 此功能依赖于**pushDataToKing**推送服务
>
> 封禁时长分为三种（1、N分钟：Nm 如30分钟：30m ；2、N天：Nd 如30天：30d ；3、不填：永久封禁）
>
> 私有指令【/restrict + 时长】

🎨 **getUnixTime方法**

> *获取unix时间戳*