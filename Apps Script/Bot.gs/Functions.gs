// Global
var todayMonth = getMonthToday();
var NEWL = String.fromCharCode(10); // newline

var accId = "<Spreadsheet_ID"; // Accounting Spreadsheet
var acc = SpreadsheetApp.openById(accId);
var sAcc = acc.getSheetByName(todayMonth);
var sBot = acc.getSheetByName("Bot");

// @usernames who have access to the bot
var andreyChatId = sBot.getRange("B2").getValue();
var donyChatId = sBot.getRange("B3").getValue();

// chat_id who have access to the bot
var logins = ["99587408", "155390785"];

// Get current month
function getMonthToday() {
  var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var todayDate = new Date();
  var todayMonth = months[todayDate.getMonth()];

  return todayMonth;
}