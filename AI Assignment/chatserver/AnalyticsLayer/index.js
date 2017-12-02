// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var utf8 = require('utf8');
AWS.config.update({
  region: 'us-east-1'
});
var util = require('util');
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

var tone_analyzer = new ToneAnalyzerV3({
  username: 'e02fe528-d4c4-4922-908d-946b821f6ba1',
  password: 'crtrIzDJHFq2',
  version_date: '2016-05-19'
});

var tone_params = {
  text: '',
  tones: 'emotion'
};

const textMessage = function(text) {
  if (typeof text !== 'string') {
    throw new Error('text parameter needs to be a string');
  }
  return JSON.stringify({
    text: text
  });
};

// get reference to S3 client
var s3 = new AWS.S3();
var ses = new AWS.SES();


exports.handler = function(event, context, callback) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey    =
    decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

    // Download the image from S3, transform, and upload to a different S3 bucket.
    async.waterfall([
        function download(next) {
            // Download the image from S3 into a buffer.
            s3.getObject({
                    Bucket: srcBucket,
                    Key: srcKey
                },
                next);
            },

        function send_sentiment(dialog, next) {
          console.log("dialog content")
          var dialog_content = dialog.Body.toString()
          console.log(dialog_content)
          dialog_content = JSON.parse(dialog_content)
            tone_params.text = dialog_content['content'];
            var userId = dialog_content['userID'];
            var username = dialog_content['username']
            console.log(username)
            var email_address = "sender@example.com";
            var sentiment = "";
            var message = "";
            var cognitoidentityserviceprovider = new AWS.CognitoIdentityServiceProvider({accessKeyId:'AKIAJ64AHWCSS5HG6BDQ' , secretAccessKey:'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' });
            var userparams = {
                  UserPoolId: "us-east-1_RG8NZlX3N", /* required */
                  AttributesToGet: [
                    'email',
                    /* more items */
                  ],
                  Filter:  'name = \"' + username + "\"",
                  Limit: 10
                  //PaginationToken:' '
                };
                cognitoidentityserviceprovider.listUsers(userparams, function(err, data) {
                  if (err) console.log(err, err.stack); // an error occurred
                  else  {
                    console.log(data);
                    email_address = data['Users'][0]['Username'];
                    console.log(email_address)
                  ;}      // successful response
                });
            tone_analyzer.tone(tone_params, function(error, response) {
              if (error){
                console.log('error:', error);
                message = "Could not analyze emotion.";
              }
              else {
                var score = -1
                for (var k in response.document_tone.tone_categories[0].tones) {
                  var setim_clique = response.document_tone.tone_categories[0].tones[k];
                  console.log(setim_clique['score'], setim_clique['tone_name'])
                  if(setim_clique['score'] > score){
                      score = setim_clique['score']
                      sentiment = setim_clique['tone_name']
                    }
                  message = sentiment
                }
                console.log(message)
                 var params = {
                  Destination: {
                   BccAddresses: [
                   email_address
                   ],
                   CcAddresses: [
                   email_address
                   ],
                   ToAddresses: [
                      email_address
                   ]
                  },
                  Message: {
                   Body: {
                    Text: {
                     Charset: "UTF-8",
                     Data: "Sentment: " + message
                    }
                   },
                   Subject: {
                    Charset: "UTF-8",
                    Data: "Sentiment Analysis"
                   }
                  },
                  Source: "nc2734@columbia.edu",
                 };
                 ses.sendEmail(params, function(err, data) {
                   if (err) console.log(err, err.stack); // an error occurred
                   else     console.log(data);           // successful response
                 });
                //socket.emit(userId, textMessage('sentiment:' + sentiment));
                  }
            });
        }]
    );
};
