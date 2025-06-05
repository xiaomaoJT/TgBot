#### 🎟 XiaoMaoBot 正式版源码解析



##### 目录代码结构

- MaoBot@OfficialVersion -- 正式版目录
  - DB -- 表格数据库
    - XiaoMaoBot_DB.xlsx -- 数据库初始化表格
  - Modules -- 模块化代码
    - MaoBot.gs -- 主体响应脚本
    - Params.gs -- 参数配置脚本
    - Core.gs -- 核心逻辑脚本
    - Manage.gs -- 群管逻辑脚本
    - Api.gs -- 接口逻辑脚本
    - Utils.gs -- 工具类脚本



##### 🌠 DB数据库

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
「群组消息屏蔽、管理员权限释放（管理员权限V1.33起已支持自动下放）」

· sensitive_words -- 敏感词列表
「绝杀词（拦截、删除、封禁）、敏感词（拦截、删除）」
「Base64加密」
「支持指令新增，详见 - 正式版文字教程新特性5」
```



##### 🎇 Modules模块代码

###### 部署时请按目录结构顺序放置模块代码！！「MaoBot.gs」务必放置于第一位！！！

###### 仅标注「 ✅ 」代码需要填写



**「MaoBot.gs」**

```text
主体响应脚本

doPost -- TG消息接收函数
processData -- 消息处理函数
processReplyWord -- 关键字处理函数
pushDataToKing -- 消息推送函数
deleteClockTriggers、getClockTriggersNum、cyclicDeleteTrigger、createDelayedTriggerWithParams、executeAfterDelay - 消息触发器、机器人消息自动删除相关函数
```



**「Params.gs」✅**

```javascript
// 参数配置脚本

// 务必完善 EXECID 和 BOTID
var EXECID = ""; // Google EXEC ID - 谷歌表格ID
var BOTID = ""; // Telegram BOT ID key - tg机器人Token

// 建议补全 KingId 和 botIdAlone
var KingId = ""; // 取主人tg id - 私人消息主动功能必须填写此项
var botIdAlone = ""; // 取 bot id 用于识别引用消息

// 其余参数无需改动，参数声明请见脚本内注释
```



**「Core.gs」**

```text
核心逻辑脚本

linkBot -- TG连通函数
readSpreadsheet -- 表格数据读取函数
convertString -- 关键字内容处理函数
getKeyWords -- 关键字列表构建函数
getCacheData -- 关键字缓存函数
getCacheAuthorityList -- 权限列表缓存函数
setStorage -- 消息存储函数
```



**「Manage.gs」**

```text
群管逻辑脚本

getUnBanUser -- 解禁用户函数
deleteUserMessage、deleteMessageApi -- 删除信息相关函数
getPermissionList - 获取管理员列表
getBanUser -- 封禁用户函数
getRestrictUser -- 禁言用户函数
getReply -- 主动回复函数
setBanOrSensitiveWords - 设置敏感词
```



**「Api.gs」**

```text
接口逻辑脚本

apiReply -- 接口前置函数
getSao -- 骚话大全
getLanLink -- 蓝奏云解析
getChatBot -- ChatGPT
getHelloBot -- 聊天机器人
getVideo -- 随机视频
getDuJiTang -- 毒鸡汤
getTianGou -- 舔狗日记
getYiYan -- 一言
getPhoneWhere -- 号码归属地
getMusic -- 随机音乐
getLinkShort -- 短链接生成
getWeatherApi -- 天气查询
getHotList -- 热榜查询
getHoroscopeList -- 星座运势
getDouBan -- 豆瓣电影查询
```





**「Utils.gs」**

```text
工具类脚本

getString -- api内容处理函数
isApi -- api响应逻辑函数
getNowDate、getUnixTime、getNowDate、isSameDay -- 日期处理相关函数
checkSensitiveDFA -- 敏感词过滤函数
getMessageType -- 获取消息类型
sortByTotalDescending -- 对象排序函数
getSensitiveWords、setSensitiveWords、setSensitiveAndBanWords、getLastRowInColumn -- 敏感词处理相关函数
```

