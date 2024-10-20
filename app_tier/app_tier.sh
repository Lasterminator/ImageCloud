#!/bin/bash

cd /home/ec2-user/IRAS/controller
node sqs_receive_app_tier.js
cd /home/ec2-user/IRAS/classifier
image_name=$(find ./ -type f \( -iname \*.jpeg -o -iname \*.jpg -o -iname \*.png \))
python3 image_classification.py $image_name
cd /home/ec2-user/IRAS/controller
node sqs_send_app_tier.js
