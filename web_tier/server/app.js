var express = require("express");
var bodyParser = require("body-parser");
var multer = require('multer');
var path = require('path');

var app = express();
app.set('views', path.join(__dirname, 'views'));

app.engine('html', require('ejs').renderFile);
app.use(express.static('public'))
app.set("view engine", "ejs");
app.use(bodyParser.json());

const fs = require('fs');
const AWS = require('aws-sdk');
const BUCKET_NAME = 'cc-project-input-image';
AWS.config.update({region: 'us-east-1'});
var sqs = new AWS.SQS({accessKeyId: config.aws.accessKeyId, secretAccessKey: config.aws.secretAccessKey, apiVersion: config.aws.apiVersion});


const s3 = new AWS.S3({
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
});

// Global variables
var dataDict = {}
var dictSize = 0;

const uploadFile = (fileName) => {

    const path = require("path");
    const fileContent = fs.readFileSync(path.resolve(__dirname, "./uploads/"+fileName));
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: fileContent
    };

    s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        sendMessage(data.Location)
        fs.unlinkSync('uploads/'+fileName);
      });  

};

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) 
  }
})

var upload = multer({ storage: storage }).array('userPhoto',1000);

  
var receiveMessage = function() {
  var receiveParams = {
    AttributeNames: ["SentTimestamp"],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: ["All"],
    QueueUrl: config.queueUrls.response,
    VisibilityTimeout: 1,
    WaitTimeSeconds: 0
    };
  
  sqs.receiveMessage(receiveParams, function(err, data) {
      if(err){
          console.log(err);
          }
      if (data.Messages) {
          console.log("inside data.messages");
          for (var i = 0; i < data.Messages.length; i++) {
            console.log("--------------------  inside For Loop --------------------" +i);
              var message = data.Messages[i];              
              NumOfMessages = data.Messages.length;               
              
              const recvData = data.Messages[i];                            
              result = recvData['MessageAttributes']['output']['StringValue'].split("#");
              imageName = result[0];
              ans = result[1];            
              dataDict[imageName] = ans;
              removeFromQueue(message);
          }
          receiveMessage();
      } else {
          setTimeout(function() {
              receiveMessage();
          }, 10 * 1000);
        // dataDict = {}
      }
  });
};

var removeFromQueue = function(message) {
  console.log("Remove message from Queue")
  sqs.deleteMessage({
      QueueUrl : config.queueUrls.response,
      ReceiptHandle : message.ReceiptHandle
  }, function(err, data) {
      err && console.log(err);
  });
};

const sendMessage = (url) => {
    var params = {
       DelaySeconds: 0,
       MessageAttributes: {
         "S3_URL": {
           DataType: "String",
           StringValue: url
         }
       },
       MessageBody: "S3 URLs.",
       QueueUrl: config.queueUrls.input
     };
     
     sqs.sendMessage(params, function(err, data) {
       if (err) {
         console.log("Error", err);
       } else {
         console.log("Success", data.MessageId);
       }
     });
}


app.get('/',function(req,res){
  // res.sendFile(__dirname + "/index.html");
  res.render('index', {dataDict:dataDict, dictSize: dictSize})

});

app.post('/api/photo',function(req,res){
upload(req,res,function(err) {

    if(err) {
      console.log(err)
        return res.end("Error uploading file.");
    }
    // Reset the dictionary when user uploads new images.
    dataDict = {};
    for (const index in req.files) {  
      uploadFile(req.files[index].filename)

    }
    res.end("File uploaded! Starting the process...");

});

});

app.get('/receive', function(req, res){
  receiveMessage();
  dictSize = Object.keys(dataDict).length;
  res.render("index", {dataDict:dataDict, dictSize: dictSize});
});

app.listen(3000,function(){
    console.log("Working on port 3000");
});