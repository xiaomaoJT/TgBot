/**
 * 用于接收讯息并进行exec存储
 * 表字段
 * A1 - 时间
 * B1 - 发送人ID
 * C1 - 接收到的内容
 * 
 * 部署完后替换下面链接botID及部署后的webURL
 * https://api.telegram.org/bot你的botID/setWebhook?url=你的google webURL
 * 
 * 浏览器打开链接，返回下方内容皆为成功
 * {"ok":true,"result":true,"description":"Webhook is set"}
 * {"ok":true,"result":true,"description":"Webhook is already set"}
 * 返回google表格即可看到新内容存储
 * 
 * 返回下面内容则botID失效，通过BotFather重新获取
 * {"ok":false,"error_code":401,"description":"Unauthorized"}
 */

function doPost(e){
  var estringa = JSON.parse(e.postData.contents);
  var d = new Date();
  var e = estringa.message.from.id;
  //取自浏览器顶部路径 
  // https://docs.google.com/spreadsheets/d/表单ID/edit#gid=0
  var SpreadSheet = SpreadsheetApp.openById("表单ID");
  // 注意是表名，底下的表名，不是exec名字
  var Sheet = SpreadSheet.getSheetByName("EXEC工作表名");
  var LastRow = Sheet.getLastRow();
  Sheet.getRange(LastRow+1, 1).setValue(d);  
  Sheet.getRange(LastRow+1, 2).setValue(e);
  Sheet.getRange(LastRow+1, 3).setValue(estringa);
}