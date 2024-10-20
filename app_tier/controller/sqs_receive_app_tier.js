const AWS = require('aws-sdk');
const shell = require('shelljs');
const fs = require('fs');
const config = require('../../config.json'); // Import the config file

AWS.config.update({ region: config.aws.region });

// SQS Configuration
var sqs = new AWS.SQS({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  apiVersion: config.aws.apiVersion
});

// S3 Configuration
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
    QueueUrl: config.queueUrls.response // Use URL from config
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
      Bucket: config.s3Bucket, // Use bucket name from config
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

  key = data.split('#')[0];
  key = key.split('/')[1];
  value = data.split('#')[1].replace("\n", "").replace("\r", "");
  file_content = '(' + key + ',' + value + ')';
  fileName = key.split('.')[0] + '.txt';

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
    QueueUrl: config.queueUrls.input, // Use URL from config
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
