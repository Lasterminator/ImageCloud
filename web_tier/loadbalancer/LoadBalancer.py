import boto3
import time
import json
from botocore.exceptions import ClientError

# Load configuration from file
def load_config(file_path):
    with open(file_path, 'r') as config_file:
        config = json.load(config_file)
    return config

# Initialize AWS clients
def init_clients(config):
    ec2 = boto3.client(
        'ec2',
        region_name=config['aws']['region'],
        aws_access_key_id=config['aws']['accessKeyId'],
        aws_secret_access_key=config['aws']['secretAccessKey']
    )
    sqs = boto3.client(
        'sqs',
        region_name=config['aws']['region'],
        aws_access_key_id=config['aws']['accessKeyId'],
        aws_secret_access_key=config['aws']['secretAccessKey']
    )
    return ec2, sqs

# Create EC2 instance
def create_instance(ec2, image_id, max_instances, cnt):
    min_instances = max(1, max_instances - 1)  # Ensure at least 1 instance
    security_group_ids = ["cc_security_group"]
    
    tags = [{'Key': 'Name', 'Value': f'app-instance{cnt}'}]
    tag_specification = [{'ResourceType': 'instance', 'Tags': tags}]
    
    try:
        response = ec2.run_instances(
            ImageId=image_id,
            MinCount=min_instances,
            MaxCount=max_instances,
            InstanceType='t2.micro',
            SecurityGroupIds=security_group_ids,
            KeyName='cc_project',
            TagSpecifications=tag_specification
        )
        return cnt
    except ClientError as e:
        print(f"Error creating instance: {e}")
        return cnt

# Get approximate number of messages from SQS
def get_approx_total_msgs(sqs, queue_url):
    try:
        response = sqs.get_queue_attributes(
            QueueUrl=queue_url,
            AttributeNames=['ApproximateNumberOfMessages']
        )
        total_msgs = int(response['Attributes'].get('ApproximateNumberOfMessages', 0))
        return total_msgs
    except ClientError as e:
        print(f"Error fetching SQS messages: {e}")
        return 0

# Get number of running EC2 instances
def get_num_of_instances(ec2):
    try:
        response = ec2.describe_instance_status(IncludeAllInstances=True)
        running_instances = 0
        for instance in response['InstanceStatuses']:
            state = instance['InstanceState']['Name']
            if state in ['pending', 'running']:
                running_instances += 1
        return running_instances
    except ClientError as e:
        print(f"Error describing instances: {e}")
        return 0

# Scaling logic
def scale_in_scale_out(config, ec2, sqs):
    cnt = 0
    while True:
        total_msgs = get_approx_total_msgs(sqs, config['queueUrls']['input'])
        total_running_instances = get_num_of_instances(ec2)
        total_app_instances = total_running_instances - 1

        print(f"Messages in Input Queue: {total_msgs}")
        print(f"Total app-instances: {total_app_instances}")

        if total_msgs > 0 and total_msgs > total_app_instances:
            available_slots = 19 - total_app_instances
            if available_slots > 0:
                instances_to_create = min(available_slots, total_msgs - total_app_instances)
                for i in range(instances_to_create):
                    cnt = create_instance(ec2, "ami-0d8c4699047118969", 1, i + 1)
                cnt += 1

        try:
            time.sleep(3)
        except KeyboardInterrupt:
            print("Scaling process interrupted.")
            break

if __name__ == "__main__":
    # Load config from file
    config_path = '../../config.json' 
    config = load_config(config_path)

    # Initialize AWS clients
    ec2, sqs = init_clients(config)

    # Start scaling process
    scale_in_scale_out(config, ec2, sqs)
