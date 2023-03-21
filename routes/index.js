const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const line = require('@line/bot-sdk');
const lineNotify = require('./services/lineNotify');
const _ = require('lodash');



const JSONParseError = require('@line/bot-sdk').JSONParseError
const SignatureValidationFailed = require('@line/bot-sdk').SignatureValidationFailed
const line_config = {
  channelAccessToken: 'gWFJPxflotuFty30ZN5HqUr56fmdwp1nrYh54Mt3iBDH0K03nQ2q1jeR1AlOqNK/kpIyf1JzrhOyNmIUN6F9iSkhBZKsjAVlPdJjjcnA+xpw4H/pcSGrfCWt2KcpGjKLBTuWy/koDThNjViFcbFf0wdB04t89/1O/w1cDnyilFU=',
  channelSecret: '113cf138faef63ebefc697c28337e791'
};
const line_client = new line.Client(line_config);


const line_notify_config = {
  clientId: '2ttpNpwmo9H5DXnGGutyoQ',
  clientSecret: 'IALroQ5hbyb6hzcSvgadCgNgUanElYoNXNY7VXU6xa6',
  redirectUri: 'https://a68b-60-250-126-160.jp.ngrok.io/callback'
}

const subscriptions = ['V6ZYpD5y2nHRvXTBjfo1psCZX7MGSm7xbaed3YBzAX7'];


// console.log('line_client=', line_client)
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});


//lineNotify
router.get('/callback', async (req, res, next) => {

  const code = req.query.code;

  console.log('code=', code)
  try {
    const response = await lineNotify.getToken(code, line_notify_config.redirectUri, line_notify_config.clientId, line_notify_config.clientSecret);
    const token = response.data.access_token;


    //避免重複訂閱後 傳送多個通知
    if(subscriptions.indexOf(token) == -1) {
      subscriptions.push(token);
      await lineNotify.sendNotify(token, "恭喜完成訂閱！");
    } else {
      await lineNotify.sendNotify(token, "已經訂閱囉");
    }

    res.send('恭喜完成訂閱，請關閉此網頁！');
  } catch (e) {
    console.log('[ERROR] =>', e);
    res.status(500).send(e)
  }

})

router.get('/sendMessage', async (req, res, next) => {

  const message = req.query.message;
  const imageFullsize = req.query.imageFullsize;
  console.log(message, subscriptions)
   subscriptions.forEach((token)=>{
     lineNotify.sendNotify(token, message, imageFullsize);
   });
   res.send('推播訊息發送完成，請關閉此網頁！');
})


//line機器人被執行任何一種動作即會觸發此API(需要在line機器人網站設定)
router.post('/webhook', line.middleware(line_config), async (req, res, next) => {

  let destination = req.body.destination

  let event = req.body.events[0]
  console.log(destination, event)

  try {

    let message = event.message;
      let GroupSummary
      if(event.source.type == 'group') {
        GroupSummary = await line_client.getGroupSummary(event.source.groupId);
        console.log('GroupSummary=', GroupSummary)

        if(message.text == '訂閱') {
          const uri = lineNotify.getAuthLink(line_notify_config.clientId, line_notify_config.redirectUri, 'demo');
          console.log('uri=', uri)

          const flexMessage =
          {
            "type": "flex",
            "altText": "this is a flex message",
            "contents": {
              "type": "bubble",
              "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "text": "訂閱通知"
                  },
                  {
                    "type": "text",
                    "text": "請點選下方按鈕訂閱通知，在選擇 「請選擇您要接收通知的聊天室」 時請選擇本群組，並且在訂閱完成後將 LINE Notify 邀請加入本群組。"
                  },
                  {
                    "type": "button",
                    "action": {
                      "type": "uri",
                      "label": "訂閱通知",
                      "uri": uri
                    }
                  }
                ]
              }
            }
          }

            await line_client.pushMessage(GroupSummary.groupId, flexMessage)
        }

      }


    res.json(req.body.events)
  } catch (err) {
    console.log('err=', err)
    lineErrorHandle(err, req, res, next);
  }



})




function lineErrorHandle(err, req, res, next) {
  if (err instanceof SignatureValidationFailed) {
      res.status(401).send(err.signature)

    } else if (err instanceof JSONParseError) {
      res.status(400).send(err.raw)

    }
}





module.exports = router;
