# AWS Image Recognition Service

This project implements a multi-tier image recognition service using AWS services such as S3, SQS, and EC2. The service allows users to upload images through a web interface. The images are then sent to S3, and their URLs are queued in SQS. The app tier processes these images and returns the results via another SQS queue.

## Prerequisites

- **AWS Account**: You'll need an AWS account with access to S3, SQS, and EC2.
- **Warning**: Be sure to monitor your AWS usage to avoid unexpected charges. (This project will not be fast enough on the free tier.)
- **Node.js**: Ensure that Node.js is installed. You can download it [here](https://nodejs.org/).
- **AWS CLI**: Install the AWS CLI if needed to manage AWS resources. Download it [here](https://aws.amazon.com/cli/).

## Project Setup

1. **Clone the Repository**:

2. **Change the names fo the S3 Buckets in code**:

   - Change the bucket names in the `web-tier` and `app-tier` files to match your S3 bucket names.
   - Also, change the directory names in the code.

3. **Configure AWS Access**:

   - Create a `config.json` file in the root directory to store your AWS credentials and configuration details:
     ```json
     {
       "aws": {
         "accessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
         "secretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
         "region": "us-east-1"
       },
       "s3Bucket": "cc-project-response",
       "queueUrls": {
         "input": "YOUR_SQS_INPUT_QUEUE_URL",
         "response": "YOUR_SQS_RESPONSE_QUEUE_URL"
       }
     }
     ```

4. **Build using the Bash Scripts Inside the Folders**:

## AWS Setup

1. **S3 Bucket**: Create an S3 bucket to store the uploaded images.
2. **SQS Queues**: Create two SQS queues:
   - **Input Queue**: Receives image URLs from the web tier.
   - **Response Queue**: Sends back the results from the app tier.
3. **EC2 Setup**: For auto-scaling and processing, deploy an EC2 instance with the appropriate IAM role, allowing access to S3 and SQS.