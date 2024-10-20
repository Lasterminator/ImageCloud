const AWS = require('aws-sdk');
const shell = require('shelljs');
const fs = require('fs');
const config = require('../../config.json');

AWS.config.update({ region: 'us-east-1' });

var sqs = new AWS.SQS({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  apiVersion: config.aws.apiVersion
});

const s3 = new AWS.S3({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
});

const sendMessage = (output) => {
  var params = {
    DelaySeconds: 0,
    MessageAttributes: {
      'output': {
        DataType: "String",
        StringValue: output
      }
    },
    MessageBody: "SQS Response.",
    QueueUrl: config.queueUrls.response 
  };

  sqs.sendMessage(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.MessageId);
    }
  });
}

const uploadFile = (fileName) => {
  fs.readFile(fileName, (err, data) => {
    if (err) throw err;
    const params = {
      Bucket: config.s3Bucket,
      Key: fileName,
      Body: data
    };
    s3.upload(params, function (err, data) {
      if (err) {
        throw err;
      }
    });
  });
};

fs.readFile('output.txt', 'utf8', (err, data) => {
  if (err) throw err;

  let key = data.split('#')[0];
  key = key.split('/')[1];
  let value = data.split('#')[1];
  value = value.replace("\n", "").replace("\r", "");
  let file_content = '(' + key + ',' + value + ')';
  let fileName = key.split('.')[0] + '.txt';

  fs.writeFile(fileName, file_content, function (err) {
    if (err) throw err;
  });

  sendMessage(key + '#' + value);
  uploadFile(fileName);

  fs.unlinkSync('output.txt');
  fs.unlinkSync(fileName);

  var receiveParams = {
    AttributeNames: [
      "SentTimestamp"
    ],
    MaxNumberOfMessages: 1,
    MessageAttributeNames: [
      "All"
    ],
    QueueUrl: config.queueUrls.input, 
    VisibilityTimeout: 10,
    WaitTimeSeconds: 20
  };

  sqs.receiveMessage(receiveParams, function (err, data) {
    if (err) {
      console.log("Receive Error", err);
    } else if (data.Messages) {
      shell.exec('/home/ec2-user/IRAS/app_tier.sh');
    } else {
      shell.exec('/home/ec2-user/IRAS/terminate_app_tier.sh');
    }
  });
});