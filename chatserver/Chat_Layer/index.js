'use strict';

// libraries and imports
const AWS = require('aws-sdk');
AWS.config.update({
  region: 'us-east-1'
});

const lex_service_params = {
  accessKeyId: 'AKIAIXI6P6RV3Z3WRZ6A',
  secretAccessKey: '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'
};
const lexruntime = new AWS.LexRuntime({lex_service_params});


const uuidv4 = require('uuid/v4');// Security Key
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const bodyParser = require('body-parser');
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');

var tone_analyzer = new ToneAnalyzerV3({
  username: 'e02fe528-d4c4-4922-908d-946b821f6ba1',
  password: 'crtrIzDJHFq2',
  version_date: '2016-05-19'
});


// application-specific variables
const state = {};
const sockets = {};

// helper function for initializing state
const initState = function() {
  return {
    name: '',
    messages: [],
    conversationId: uuidv4() // auto-assign conversationId
  };
};

// wraps a string as a text message
// ready to be sent through socket.io
const textMessage = function(text) {
  if (typeof text !== 'string') {
    throw new Error('text parameter needs to be a string');
  }
  return JSON.stringify({
    text: text
  });
};


var agentProfile;
var bot_params = {
  botAlias: 'Prod', /* required */
  botName: 'OrderFlowers', /* required */
  inputText: '', /* STRING_VALUE, required */
  userId: '', /* STRING_VALUE required */

};
var s3 = new AWS.S3();
var s3_params = {Bucket: 'elasticbeanstalk-us-east-1-255282067602', Key: '', Body: ''};


var conversation = {userId: '', content: '', conversationId: '', username: ''};
function store_dialog(content, tmpId, isfullfilled) {
  if (isfullfilled) {
    conversation.username = username
    conversation.conversationId = tmpId;
    conversation.content = conversation.content + '  ' + content;
    s3_params.Key = tmpId;
    s3_params.Body = JSON.stringify(conversation)
    s3.upload(s3_params, function(err, data) {
    console.log(err, data);
    });
    conversation = {userId: '', content: '', conversationId: ''};
  }
  else {
    if (conversation.userId == '')
      conversation.userId = tmpId;
    conversation.content = conversation.content + '  ' + content;
  }

}

var tone_params = {
  text: '',
  tones: 'emotion'
};
var username = ''
// Send the sentiment analysis back to ElasticBeanstalk to a webhook S3 收集好信息，通过lambda获得sentiment，再emit handshake回server


io.on('connection', function(socket) {

  console.log(`socket ${socket.id} connected ${new Date().toISOString()}`);

  sockets[socket.id] = socket;

  let socketRef = socket;
  socket.on('handshake', function(userObj) {
    console.log(`received handshake for user`, userObj);

    try {
      let user = JSON.parse(userObj);
      let userId = user.userId;
      username = user.name

      if (!state[userId]) {
        state[userId] = initState();
        state[userId].name = user.name;
      }

      // event handler for messages from this particular user
      socketRef.on(userId, function(message) {
        console.log(`received message for ${userId}`, message);

        let currentState = state[userId];

        // track the message
        currentState.messages.push(message);

        // TODO: below, you need to handle the incoming message
        // and use Lex to disambiguate the user utterances

        //begin
        store_dialog(message, userId, false)
        bot_params.inputText = message
        bot_params.userId = userId
        lexruntime.postText(bot_params, function(err, data) {
          if (err)
            console.log(err, err.stack); // an error occurred
          else{
            if (data.dialogState == "Fulfilled" || data.dialogState == "Failed")
              store_dialog(data.message, state[userId].conversationId, true)
            else {
              store_dialog(data.message, state[userId].conversationId, false)
            }
            console.log(data.message);           // successful response
            tone_params.text = data.message
            tone_analyzer.tone(tone_params, function(error, response) {
              if (error){
                console.log('error:', error);
                socket.emit(userId, textMessage(data.message));
              }
              else {
                socket.emit(userId, textMessage(data.message));
                  }
            });
          }
        });
        //end

      });
    } catch (handshakeError) {
      console.log('user handshake error', handshakeError);
    }
  });

  socket.on('agentHandshake', function(agentObj) {
    console.log('received handshake for agent' , agentObj);

    // TODO
    var message = JSON.stringify({text : 'Hi message from server. What can I do for you?'})
    agentProfile = JSON.parse(agentObj);
    console.log('sending to agent');
    socket.emit(agentProfile.agentId, message);
    //end
  });

  socket.on('disconnect', function() {
    console.log(`socket ${socket.id} disconnected at ${new Date().toISOString()}`);
    if (sockets[socket.id]) delete sockets[socket.id];
  });

});

// middleware
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));

http.listen(port, function() {
  console.log('listening on *:' + port);
});

// serve up agent dashboard
app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});
