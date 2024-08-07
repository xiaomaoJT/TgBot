/**
 * 核心能力类
 * 
 * 无需改动
 */

/**
 * tg api服务
 * @param data
 */
const linkBot = (data) => {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
  } catch (error) {}
};

/**
 * 读取表格数据
 * @returns [[],[],...]
 */
const readSpreadsheet = (key) => {
  // 获取当前活跃的表格
  let spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(key);
  // 获取工作表的数据范围
  let range = sheet.getDataRange();
  // 获取表格内容作为二维数组
  return range.getValues() ?? [];
};

/**
 * 组装关键字回复内容 html
 * @param input
 * a标签不可再次嵌套标签
 * @returns html/any
 */
const convertString = (input) => {
  // 检查输入是否是字符串类型
  if (typeof input !== "string") {
    return input.toString();
  }
  // 检查是否有嵌套的 <a> 标签
  const nestedUrlMatch = input.match(/<a>(.*?)<\/a>/);
  if (nestedUrlMatch) {
    const url = nestedUrlMatch[1];
    // 提取 <a> 标签之前的内容和之后的内容
    const [before, after] = input.split(/<a>.*?<\/a>/);
    // 包裹整个输入内容到新的 <a> 标签中，并插入 href
    const result = `<a href="${url}">${before}${after}</a>`;
    return result;
  }

  // 如果不匹配 <a> 标签，则直接返回输入
  return input;
};

/**
 * 构建关键字列表
 * @param readSpreadsheet()
 * @returns replyList:[{keyword: [],replyWord: '',replyWordMore: [])},...]
 */
const getKeyWords = () => {
  let keys = readSpreadsheet(KEYPARAMS);
  // 关键字属性集合
  let keyName = [];
  // 函数返回
  let replyList = [];
  if (keys.length > 3) {
    keys.slice(3, keys.length).map((item) => {
      // 获取到对象key
      keyName = item[0].split(",");
      //   获取内容项 value list
      let itemWords = item.splice(1, item.length);
      if (itemWords.length) {
        // 当前单元格内容
        let keyValueList = [];
        itemWords.map((word) => {
          // 切割换行
          let wordsList = word.toString().split("\n");
          let keyValue = "";
          if (wordsList.length) {
            // 处理为通用html text
            wordsList.map((list, listIndex) => {
              keyValue = keyValue + convertString(list) + "\n";
            });
            keyValueList.push(keyValue);
          }
        });
        replyList.push({
          keyword: keyName,
          replyWord: keyValueList[0],
          replyWordMore: keyValueList
            .slice(1, keyValueList.length)
            .filter((item) => item !== "\n"),
        });
      } else {
        replyList.push({
          keyword: keyName,
          replyWord: "关键字内容为空，或获取失败，请检查关键字表单内容格式!",
          replyWordMore: [],
        });
      }
    });
  }
  return replyList;
};

/**
 * 使用脚本级别缓存服务
 * 获取关键字
 */
let Cache = CacheService.getScriptCache();
const getCacheData = () => {
  if (cacheExpirationStatus) {
    Cache.remove("keyParamsList");
  }
  let replayList = Cache.get("keyParamsList");
  if (!replayList) {
    replayList = getKeyWords();
    Cache.put(
      "keyParamsList",
      JSON.stringify(replayList),
      cacheExpirationInSeconds
    );
    autoReply = replayList;
  } else {
    autoReply = JSON.parse(replayList);
  }
};

/**
 * 获取屏蔽群组及管理员列表
 */
const getCacheAuthorityList = () => {
  if (cacheExpirationStatus) {
    Cache.remove("authorityManagementGroup");
    Cache.remove("authorityManagement");
  }
  let authorityGroupList = Cache.get("authorityManagementGroup");
  let authorityList = Cache.get("authorityManagement");
  let manageList = [];
  if (!authorityGroupList) {
    manageList = readSpreadsheet(AUTHORITYMANAGEMENT).slice(2);
    authorityGroupList = manageList[0].slice(1).filter(Boolean);
    Cache.put(
      "authorityManagementGroup",
      JSON.stringify(authorityGroupList),
      cacheExpirationInSeconds
    );
    forGotList = authorityGroupList;
  } else {
    forGotList = JSON.parse(authorityGroupList);
  }

  if (!authorityList) {
    manageList.length ? "" : readSpreadsheet(AUTHORITYMANAGEMENT).slice(2);
    authorityList = manageList[1].slice(1).filter(Boolean).concat([KingId]);
    Cache.put(
      "authorityManagement",
      JSON.stringify(authorityList),
      cacheExpirationInSeconds
    );
    PermissionReleaseList = authorityList;
  } else {
    PermissionReleaseList = JSON.parse(authorityList);
  }
};

/**
 * 将讯息进行Google表格内存储
 * @param {*} MESSAGE
 */
const setStorage = (MESSAGE, TYPE) => {
  let time = getNowDate();
  let userID,
    userName,
    userAllName,
    messageSource,
    messageSourceID,
    messageType,
    messageContent = "";
  if (TYPE != "MESSAGEBACK") {
    userID = MESSAGE.message.from.id.toString();

    userName =
      MESSAGE.message.from.username != undefined
        ? "@" + MESSAGE.message.from.username
        : "🈚️用户名";

    userAllName =
      (MESSAGE.message.from.first_name != undefined
        ? MESSAGE.message.from.first_name
        : "") +
      (MESSAGE.message.from.last_name != undefined
        ? MESSAGE.message.from.last_name
        : "");

    if (userAllName == "") {
      userAllName = "该用户未设置昵称";
    }
    let messageInfoType = MESSAGE.message.hasOwnProperty("text")
      ? "[文本消息]"
      : MESSAGE.message.hasOwnProperty("sticker")
      ? "[表情消息]"
      : MESSAGE.message.hasOwnProperty("photo")
      ? "[图片消息]"
      : MESSAGE.message.hasOwnProperty("video")
      ? "[视频消息]"
      : MESSAGE.message.hasOwnProperty("document")
      ? "[文件消息]"
      : MESSAGE.message.hasOwnProperty("voice")
      ? "[音频消息]"
      : "[未知消息类型]";

    messageContent =
      messageInfoType +
      (messageInfoType.indexOf("[文本消息]") != -1 ? MESSAGE.message.text : "");

    messageSource =
      (MESSAGE.message.chat.type == "supergroup"
        ? MESSAGE.message.chat.title
        : "") +
      "(" +
      (MESSAGE.message.chat.type == "supergroup"
        ? "群聊消息"
        : MESSAGE.message.chat.type == "private"
        ? "私聊消息"
        : "未知渠道") +
      ")";

    messageSourceID = MESSAGE.message.chat.id.toString();
  }

  messageType =
    TYPE == "POSTDATA"
      ? "主动发起"
      : TYPE == "CALLBACK"
      ? "键盘回调"
      : "--自动回复";

  let spreadSheet = SpreadsheetApp.openById(EXECID);
  let Sheet = spreadSheet.getSheetByName(EXECNAME);
  let lastSheetRow = spreadSheet.getLastRow();

  //发起时间
  Sheet.getRange(lastSheetRow + 1, 1).setValue(time);
  //用户ID
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 2).setValue(userID)
    : "";
  //用户名称
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 3).setValue(userName)
    : "";
  // 用户昵称
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 4).setValue(userAllName)
    : "";
  // 消息类型
  Sheet.getRange(lastSheetRow + 1, 5).setValue(messageType);
  // 消息来源
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 6).setValue(messageSource)
    : "";
  // 消息来源ID
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 7).setValue(messageSourceID)
    : "";
  // 消息内容
  TYPE != "MESSAGEBACK"
    ? Sheet.getRange(lastSheetRow + 1, 8).setValue(messageContent)
    : "";
  // 消息JSON
  Sheet.getRange(lastSheetRow + 1, 9).setValue(JSON.stringify(MESSAGE));
};
