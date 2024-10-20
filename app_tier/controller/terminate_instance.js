const AWS = require('aws-sdk');
const metadata = require('node-ec2-metadata');
const config = require('../../config.json'); // Adjust the path as necessary

// Configure AWS with the region from config.json
AWS.config.update({ region: config.aws.region });

// Initialize EC2 service with credentials from config.json
const ec2 = new AWS.EC2({
  apiVersion: config.aws.apiVersion,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey
});

// Get the instance ID using the metadata service
metadata.getMetadataForInstance('instance-id')
  .then(function(instanceId) {
    console.log("Instance ID: " + instanceId);
    
    // Terminate the instance
    const params = {
      InstanceIds: [ instanceId ]
    };
    
    ec2.terminateInstances(params, function(err, data) {
      if (err) {
        console.log("Error terminating instance:", err, err.stack);
      } else {
        console.log("Instance terminated successfully:", data);
      }
    });
  })
  .fail(function(error) {
    console.log("Error retrieving instance metadata: " + error);
  });
