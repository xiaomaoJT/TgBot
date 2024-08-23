/**
 * MarkdownV2格式回复测试
 * 直接运行即可测试 testText 中文案是否符合TG发送标准
 * 正确：正确情况，个人Bot将私聊你并发送文案
 * 错误：错误情况将无反应
 */

let testText = `💊  *QX & Clash & TgBot 图文教程*
  
  🌈 *[XiaoMao推文合集](http://mtw.so/5MH2zy)*
  
  *① 从入门到放弃*
  >*⒈ [入门：QX上手](http://mtw.so/5MH2Um)*
  >*⒉ [进阶：QX配置](http://mtw.so/5UdfZ3)*
  >*⒊ [进阶：QX分流](http://mtw.so/69fduD)*
  >*⒋ [进阶：QX重写](http://mtw.so/6gLqzk)*
  >*⒌ [番外：BoxJs和SubStore](http://mtw.so/6ohDnT)*
  >*⒍ [高阶：Task脚本制作](https://mp.weixin.qq.com/s/8c-tn6OaSGCVXUo2DIWiww)*
  >*⒎ [高阶：广告拦截（抓包）](https://mp.weixin.qq.com/s/B_zMFU6vsAeE_IKyLXddtA)*
  >*⒏ [高阶：会员解锁（抓包）](https://t.me/xiaomaoJT/876)*
  
  
  *② 垂死挣扎*
  >⒈ *[QX本地脚本使用教程](https://github.com/xiaomaoJT/QxScript/blob/main/COURSE.md#-%E6%9C%AC%E5%9C%B0%E8%84%9A%E6%9C%AC%E4%BD%BF%E7%94%A8%E6%96%B9%E6%B3%95)*
  >⒉ *[BoxJS使用教程](https://t.me/xiaomaoJT/951)*
  >⒊ *[Tg机器人搭建](https://github.com/xiaomaoJT/TgBot/blob/main/COURSE.md)*
  >⒋  *[Clash配置](https://github.com/xiaomaoJT/clash/raw/main/%E3%80%90%E5%B8%BD%E6%95%99%E7%A8%8B%E3%80%91Clash%E9%85%8D%E7%BD%AE%E6%95%99%E7%A8%8B.png?raw=true)*
  
  
  *欢迎点赞评论，感谢支持！*`;

function myFunction() {
  let payload = {
    method: "sendMessage",
    chat_id: KingId,
    text: testText,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: true,
  };
  let data = {
    method: "post",
    payload: payload,
  };
  const linkBot = (data) => {
    try {
      UrlFetchApp.fetch("https://api.telegram.org/bot" + BOTID + "/", data);
    } catch (error) {}
  };
  linkBot(data);
}
