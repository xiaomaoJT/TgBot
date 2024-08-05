function myFunction() {
  /**
 * 读取表格数据
 * @returns [[],[],...]
 */
const readSpreadsheet = () => {
  // 获取当前活跃的表格
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  // 获取工作表，这里的 "Sheet1" 是工作表的名称
  // 如果您要读取第一个工作表，可以使用 spreadsheet.getSheets()[0]
  var sheet = spreadsheet.getSheetByName("key_params");
  // 获取工作表的数据范围
  var range = sheet.getDataRange();
  // 获取表格内容作为二维数组
  return range.getValues() ?? [];
};

/**
 * 组装关键字回复内容 html
 * @param input
 * @returns html/any
 */
const convertString = (input) => {
  // 检查输入是否是字符串类型
  if (typeof input !== "string") {
    return input.toString();
  }
  // 检查是否是单独的 <a> 标签
  const singleUrlMatch = input.match(/^<a>(.*?)<\/a>$/);
  if (singleUrlMatch) {
    const url = singleUrlMatch[1];
    return `<a href="${url}">${url}</a>`;
  }
  // 检查是否有嵌套的 <a> 标签
  const nestedUrlMatch = input.match(/<a>(.*?)<\/a>/);
  if (nestedUrlMatch) {
    const url = nestedUrlMatch[1];
    // 移除 <a> 标签中的内容
    input = input.replace(/<a>.*?<\/a>/, "");
    // 包裹内容到新的 <a> 标签中，并插入 href
    const result = `<a href="${url}">${input}</a>`;
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
  let keys = readSpreadsheet();
  // 关键字属性集合
  let keyName = [];
  // 函数返回
  let replyList = [];
  if (keys.length > 1) {
    keys.slice(1, keys.length).map((item) => {
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
          replyWordMore: keyValueList.slice(1, keyValueList.length),
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

  let list = getKeyWords()

  let payload = {
    method: "sendMessage",
    chat_id: KingId,
    text: list[0].replyWord,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  let data = {
    method: "post",
    payload: payload,
  };

  const linkBot = (data) => {
    try {
      UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
    } catch (error) { }
  }
  linkBot(data)

}
