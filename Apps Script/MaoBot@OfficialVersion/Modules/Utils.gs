/**
 * 工具类
 *
 * 无需改动
 */

/**
 * 用于截取api关键字后查询内容
 * @param key
 * @param keyApi
 * @returns
 */
const getString = (key, keyApi) => {
  const apiString = key.split(keyApi)[1] || "";
  return apiString.replace(/\s*/g, "").replace("@Xiao_MaoMao_bot", "");
};

/**
 * 用于api接口参数识别
 * @param commandList
 * @param key
 * @returns
 */
const isApi = (commandList, key) => {
  let isApiStatus = {
    status: false,
    id: null,
    api: "",
  };
  commandList.forEach((command) => {
    if (key.indexOf(command.api) != -1) {
      isApiStatus.status = true;
      isApiStatus.id = command.apiId;
      isApiStatus.api = command.api;
    }
  });
  return isApiStatus;
};

/**
 * 格式化日期对象
 * @returns
 */
const getNowDate = () => {
  let date = new Date();
  let sign2 = ":";
  let year = date.getFullYear(); // 年
  let month = date.getMonth() + 1; // 月
  let day = date.getDate(); // 日
  let hour = date.getHours(); // 时
  let minutes = date.getMinutes(); // 分
  let seconds = date.getSeconds(); //秒
  let weekArr = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  let week = weekArr[date.getDay()];
  // 给一位数的数据前面加 “0”
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (day >= 0 && day <= 9) {
    day = "0" + day;
  }
  if (hour >= 0 && hour <= 9) {
    hour = "0" + hour;
  }
  if (minutes >= 0 && minutes <= 9) {
    minutes = "0" + minutes;
  }
  if (seconds >= 0 && seconds <= 9) {
    seconds = "0" + seconds;
  }
  return (
    year +
    "/" +
    month +
    "/" +
    day +
    " " +
    hour +
    sign2 +
    minutes +
    sign2 +
    seconds
  );
};

/**
 * 获取unix时间戳
 * @param t N分钟后 Nm ; N天后 Nd
 * @returns
 */
const getUnixTime = (t = "") => {
  let text = t.toLowerCase().replace(/\s*/g, "");
  if (text.indexOf("d") != -1) {
    let dealText = text.replace("d", "") * -1;
    return getGoneDay(dealText);
  } else if (text.indexOf("m") != -1) {
    let dealText = text.replace("m", "") * 1;
    return getGoneMinutes(dealText);
  } else {
    return 0;
  }

  // 获取N分钟后的时间
  function getGoneMinutes(params = 0) {
    let date = new Date();
    let min = date.getMinutes() + 1;
    date.setMinutes(min + params);
    let y = date.getFullYear();
    let m =
      date.getMonth() + 1 < 10
        ? "0" + (date.getMonth() + 1)
        : date.getMonth() + 1;
    let d = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
    let h = date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
    let f =
      date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
    let s =
      date.getSeconds() < 10 ? "0" + date.getseconds() : date.getSeconds();
    let formatDate = y + "-" + m + "-" + d + " " + h + ":" + f + ":" + s;
    return Math.floor(new Date(formatDate).getTime() / 1000);
  }

  // 获取N天后的时间
  function getGoneDay(n = 0, yearFlag = true) {
    let myDate = new Date();
    myDate.setDate(myDate.getDate() - n);
    let month = myDate.getMonth() + 1;
    let day = myDate.getDate();
    let result =
      "" +
      (yearFlag ? myDate.getFullYear() : "") +
      "/" +
      (month < 10 ? "0" + month : month) +
      "/" +
      (day < 10 ? "0" + day : day);
    return Math.floor(new Date(result).getTime() / 1000);
  }
};

/**
 *
 * 敏感词过滤算法
 * 敏感词已放置于代码前置
 * 因gas性能有限，暂只收录124条常用敏感词
 */
const checkSensitiveDFA = (content, userJson) => {
  // 特殊符号过滤逻辑
  let ignoreChars =
    " \t\r\n~!@#$%^&*()_+-=【】、{}|;':\"，。、《》？αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛㈠㈡㈢㈣㈤㈥㈦㈧㈨㈩①②③④⑤⑥⑦⑧⑨⑩⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇≈≡≠＝≤≥＜＞≮≯∷±＋－×÷／∫∮∝∞∧∨∑∏∪∩∈∵∴⊥∥∠⌒⊙≌∽√§№☆★○●◎◇◆□℃‰€■△▲※→←↑↓〓¤°＃＆＠＼︿＿￣―♂♀┌┍┎┐┑┒┓─┄┈├┝┞┟┠┡┢┣│┆┊┬┭┮┯┰┱┲┳┼┽┾┿╀╁╂╃└┕┖┗┘┙┚┛━┅┉┤┥┦┧┨┩┪┫┃┇┋┴┵┶┷┸┹┺┻╋╊╉╈╇╆╅╄";
  let ignoreObj = {};
  for (let i = 0, j = ignoreChars.length; i < j; i++) {
    ignoreObj[ignoreChars.charCodeAt(i)] = true;
  }

  //有限机构建方法
  function buildMap(wordList) {
    const result = {};
    for (let i = 0, len = wordList.length; i < len; ++i) {
      let map = result;
      const word = wordList[i];
      for (let j = 0; j < word.length; ++j) {
        const ch = word.charAt(j).toLowerCase();
        if (map[ch]) {
          map = map[ch];
          if (map.empty) {
            break;
          }
        } else {
          if (map.empty) {
            delete map.empty;
          }
          map[ch] = {
            empty: true,
          };
          map = map[ch];
        }
      }
    }
    return result;
  }

  const sensitiveWords = getSensitiveAndBanWords() || [];
  let map = buildMap(sensitiveWords) || {};

  //检测机制
  function check(content) {
    const result = [];
    let stack = [];
    let point = map;
    for (let i = 0, len = content.length; i < len; ++i) {
      const code = content.charCodeAt(i); //转Unicode
      if (ignoreObj[code]) {
        continue;
      }
      const ch = content.charAt(i);
      const item = point[ch.toLowerCase()]; //转小写
      if (!item) {
        i = i - stack.length;
        stack = [];
        point = map;
      } else if (item.empty) {
        stack.push(ch);
        result.push(stack.join(""));
        stack = [];
        point = map;
      } else {
        stack.push(ch);
        point = item;
      }
    }
    return result;
  }

  let sensitiveCheckWords = {
    words: [],
    wordLength: 0,
  };
  let userText = content;
  if (
    userJson.hasOwnProperty("quote") &&
    userJson.quote.hasOwnProperty("text")
  ) {
    userText = userText + userJson.quote.text;
  }
  sensitiveCheckWords.words = check(userText);
  sensitiveCheckWords.wordLength = sensitiveCheckWords.words.length;

  return sensitiveCheckWords;
};

/**
 * 判断时间是否是今天
 * @param givenTimeString
 * @returns
 */
function isSameDay(givenTimeString) {
  // 将字符串转换为日期对象
  const givenTime = new Date(givenTimeString);
  // 获取当前日期
  const currentTime = new Date();
  // 比较年份、月份和日期
  return (
    givenTime.getFullYear() === currentTime.getFullYear() &&
    givenTime.getMonth() === currentTime.getMonth() &&
    givenTime.getDate() === currentTime.getDate()
  );
}

/**
 * 对象根据total排序
 * @param obj
 * @returns
 */
function sortByTotalDescending(obj) {
  return Object.entries(obj)
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([key, value]) => value);
}

/**
 * 判断消息类型
 * @param MESSAGE 原始消息体
 * @param typeParams 消息类型
 * @returns
 */
function getMessageType(MESSAGE, typeParams) {
  return MESSAGE[typeParams].hasOwnProperty("text")
    ? "[文本消息]"
    : MESSAGE[typeParams].hasOwnProperty("sticker")
    ? "[表情消息]"
    : MESSAGE[typeParams].hasOwnProperty("photo")
    ? "[图片消息]"
    : MESSAGE[typeParams].hasOwnProperty("video")
    ? "[视频消息]"
    : MESSAGE[typeParams].hasOwnProperty("document")
    ? "[文件消息]"
    : MESSAGE[typeParams].hasOwnProperty("voice")
    ? "[音频消息]"
    : "[未知消息类型]";
}

/**
 * 获取敏感词
 * sensitive: 敏感词
 * ban: 绝杀词
 * @returns
 */
function getSensitiveAndBanWords(type = "sensitive") {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SENSITIVEWORDS);
  const lastRow = sheet.getLastRow();

  if (type == "ban") {
    // 获取绝杀词
    const rangeBan = sheet.getRange(3, 1, lastRow); // 参数：起始行、起始列、行数
    const valuesBan = rangeBan.getValues();
    const columnAValues = valuesBan.flat().filter((e) => e);

    return getSensitiveWords(columnAValues);
  } else {
    // 获取绝杀词
    const rangeBan = sheet.getRange(3, 1, lastRow); // 参数：起始行、起始列、行数
    const valuesBan = rangeBan.getValues();
    const columnAValues = valuesBan.flat().filter((e) => e);

    // 获取敏感词
    const rangeSensitive = sheet.getRange(3, 2, lastRow); // 参数：起始行、起始列、行数
    const valuesSensitive = rangeSensitive.getValues();
    const columnBValues = valuesSensitive.flat().filter((e) => e);
    return getSensitiveWords(columnBValues).concat(
      getSensitiveWords(columnAValues)
    );
  }
}

/**
 * 敏感词解密
 * @returns
 */
function getSensitiveWords(list) {
  // GAS 解密方法
  let words =
    list.map((word) =>
      Utilities.newBlob(Utilities.base64Decode(word)).getDataAsString()
    ) || [];

  return words;
}

/**
 * 敏感词加密
 * @param word
 * @returns
 */
function setSensitiveWords(word) {
  return Utilities.base64Encode(Utilities.newBlob(word).getBytes());
}

/**
 * 新增敏感词
 * @param word
 * @param type
 */
function setSensitiveAndBanWords(word, type = "sensitive") {
  const encodedWords = setSensitiveWords(word);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SENSITIVEWORDS);
  let column = type == "ban" ? 1 : 2;
  const lastRow = getLastRowInColumn(sheet, column);
  sheet.getRange(lastRow + 1, column).setValue(encodedWords);
}

/**
 * 获取指定列的最后一行（非空行）
 * @param Sheet
 * @param number
 * @returns number 最后一行的行号
 */
function getLastRowInColumn(sheet, column) {
  // 获取该列所有已使用的行
  const range = sheet.getRange(1, column, sheet.getMaxRows(), 1);
  const values = range.getValues();
  // 反向遍历，找到最后一个非空单元格
  for (let row = values.length - 1; row >= 0; row--) {
    if (values[row][0] !== "") {
      return row + 1; // 返回行号（从 1 开始）
    }
  }
  return 0; // 如果列为空，返回 0
}

/**
 * 获取指定列的消息ID数据
 * @returns
 */
function getFilteredColumnMessageIdValues(UserID, GroupID) {
  // @ts-ignore
  const sheet = SpreadsheetApp.openById(EXECID).getSheetByName(EXECNAME);
  const data = sheet.getDataRange().getValues();

  const now = new Date();
  const nodeHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const result = [];
  // 逆序遍历
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    // 处理时间列
    let timestamp;
    try {
      timestamp = new Date(row[0]);
    } catch (e) {
      continue;
    }
    // 时间过滤（超过节点时间前的数据直接终止循环）
    if (timestamp < nodeHoursAgo) break;
    // 条件过滤
    if (row[1] == UserID && row[6] == GroupID) {
      const value = row[9];
      if (value !== undefined && value !== "") {
        result.push(value);
      }
    }
  }
  return result;
}

/**
 * 获取指定列的用户ID数据 - 敏感词触发3次激活ban
 * @param UserID
 * @param GroupID
 */
function getFilteredColumnUserIdValues(UserID, GroupID) {
  // @ts-ignore
  const sheet = SpreadsheetApp.openById(EXECID).getSheetByName(EXECNAME);
  const data = sheet.getDataRange().getValues();

  const now = new Date();
  const nodeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  let resultIndex = 0;
  // 逆序遍历
  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    // 处理时间列
    let timestamp;
    try {
      timestamp = new Date(row[0]);
    } catch (e) {
      continue;
    }
    // 时间过滤（超过节点时间前的数据直接终止循环）
    if (timestamp < nodeHoursAgo) break;
    // 条件过滤
    if (
      row[1] == UserID &&
      row[6] == GroupID &&
      row[4].includes("敏感词触发删除")
    ) {
      resultIndex++;
    }
  }

  if (resultIndex >= 2) {
    let payloadPostData = {
      method: "banChatMember",
      chat_id: GroupID,
      user_id: UserID,
      until_date: getUnixTime("").toString(),
    };

    try {
      linkBot({
        method: "post",
        payload: payloadPostData,
      });
    } catch (e) {}

    let payloadPostData2 = {
      method: "sendMessage",
      chat_id: GroupID,
      text:
        "<b>📣来自XiaoMaoBot管理员的违规提醒</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n" +
        "\n" +
        "<b>" +
        payloadPostData.user_id +
        " 因连续违规3次，您已被管理员封禁（封禁时长：永久" +
        "），申诉请私聊" +
        "<a href='https://t.me/Xiao_MaoMao_bot'> XiaoMao机器人 </a>" +
        "</b>" +
        "\n" +
        "\n" +
        "<b>===========================</b>" +
        "\n",
      parse_mode: "HTML",
      reply_markup: JSON.stringify(keyboardFollowManageParams),
      disable_web_page_preview: true,
    };

    try {
      linkBot({
        method: "post",
        payload: payloadPostData2,
      });
    } catch (e) {}
  }
}
