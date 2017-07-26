const
  bodyParser = require('body-parser'),
  crypto = require('crypto'),
  express = require('express'),
  request = require('request');
  FB = require('fb')

  require('dotenv').load();


var app = express();
app.set('port', process.env.PORT || 5000);
app.use(bodyParser.json({ verify: verifyRequestSignature }));

/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables.
 *
 * APP_SECRET can be retrieved from the App Dashboard
 * VERIFY_TOKEN can be any arbitrary value used to validate a webhook
 * ACCESS_TOKEN is generated by creating a new Custom Integration
 *
 */
//
const
  APP_SECRET = "40b0a63b7fbd15af605b86413bb718ef",
  VERIFY_TOKEN = "noknoijibjib",
  ACCESS_TOKEN = "DQVJ2SjJyUE80dHZAfajF6QlpvYm1uT1hvMTRfWEI0UGVUMjVIc2MwVVpCeVA3LXp0TmQ0MHdDU05QeENCbXJVRjVWQnVPVkJkZAVNBMUpMb25zU2Vrd0xKXy1tMmhyQnNWczg4LV9zSDRKOHJ0UlNIdjFRVFBESDlXdHNDb0JGeE1HUjYtREQ5ZATgtX0ZA2NzEzb2JvUzBTYy1YdkJ1ckh2dnFQVEdVdzM3LVh5ZAFdLZAlBM";

if (!(APP_SECRET && VERIFY_TOKEN && ACCESS_TOKEN)) {
  console.log(APP_SECRET);
  console.log(VERIFY_TOKEN);
  console.log(ACCESS_TOKEN);
  console.error('Missing config values');
  process.exit(1);
}


app.get('/', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === VERIFY_TOKEN) {
    console.log('Validating webhook');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error('Failed validation. Make sure the validation tokens match.');
    res.sendStatus(403);
  }
});


/*
 * All callbacks for webhooks are POST-ed. They will be sent to the same
 * webhook. Be sure to subscribe your app to your page to receive callbacks.
 *
 * On Workplace, webhooks can be sent for 'page', 'group' and
 * 'workplace_security' objects:
 *
 * 'Page' webhooks relate to page messages or mentions, where the page ID is
 * the ID of the bot the user is interacting with.
 *
 * 'Group' webhooks relate to updates in a specific Workplace group, including
 * posts, comments and group membership changes.
 *
 * 'Workplace Security' webhooks relate to security-specific events in
 * Workplace, including login, logout, password changes etc.
 *
 * https://developers.facebook.com/docs/workplace/integrations/custom-integrations/webhooks
 *
 */
app.post('/', function (req, res) {
  try{
    var data = req.body;
    // On Workplace, webhooks can be sent for page, group and
		// workplace_security objects
    switch (data.object) {
    case 'page':
      processPageEvents(data);
      break;
    case 'group':
      processGroupEvents(data);
      break;
    case 'workplace_security':
      processWorkplaceSecurityEvents(data);
      break;
    default:
      console.log('Unhandled Webhook Object', data.object);
    }
  } catch (e) {
    // Write out any exceptions for now
    console.error(e);
  } finally {
    // Always respond with a 200 OK for handled webhooks, to avoid retries
		// from Facebook
    res.sendStatus(200);
  }
});

function processPageEvents(data) {
  data.entry.forEach(function(entry){
    let page_id = entry.id;
		// Chat messages sent to the page
    if(entry.messaging) {
      entry.messaging.forEach(function(messaging_event){
        console.log('Page Messaging Event',page_id,messaging_event);
        console.log(messaging_event);
        console.log('--------------------------------------');
        // console.log('senderID', messaging_event.sender.id);
        console.log('--------------------------------------');
        // console.log('text', messaging_event.message.text);

        sendTextMessage(messaging_event.sender.id, messaging_event.message.text )
      });
    }
		// Page related changes, or mentions of the page
    if(entry.changes) {
      entry.changes.forEach(function(change){
        console.log('Page Change',page_id,change);
      });
    }
  });
}


function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
      }
    };
    callSendAPI(messageData);

  }

  function callSendAPI(messageData) {
    console.log('------messageData--------');
    console.log(messageData);
    console.log('receive from', messageData.recipient.id);
    console.log('receive msg' , messageData.message.text);
    console.log('reply back to', messageData.recipient.id);
    console.log('with text', messageData.message.text);


    // GET graph.facebook.com
    //   /me/conversations?fields=messages{message,attachments}
    //
    console.log('-----------ACCESS_TOKEN-----------------');




  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    console.log('response', response);
    // console.log('body', body);
    // console.log('error', error);
    // console.log('statuscode');
    //
    // if (!error && response.statusCode == 200) {
    //
    //
    //   var recipientId = body.recipient_id;
    //   var messageId = body.message_id;
    //   console.log('------recipientId----------');
    //   console.log(recipientId);
    //   console.log("-------messageId---------");
    //   console.log(messageId);
    //
    //   console.log("Successfully sent generic message with id %s to recipient %s",
    //     messageId, recipientId);
    // } else {
    //   console.log('sayhi tome');
    //   console.error("Unable to send message.");
    //   console.error(response);
    //   console.error(error);
    // }
  });
}


/*
 * Verify that the callback came from Facebook. Using the App Secret we
 * can verify the signature that is sent with each callback in the
 * x-hub-signature field, located in the header.
 *
 * More info: https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers['x-hub-signature'];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error('Couldn\'t validate the signature.');
  } else {
    var elements = signature.split('=');
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET).update(buf).digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error('Couldn\'t validate the request signature.');
    }
  }
}



// Start server
// Webhooks must be available via SSL with a certificate signed by a valid
// certificate authority.
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

module.exports = app;
