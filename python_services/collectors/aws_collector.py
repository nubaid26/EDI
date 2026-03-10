import boto3
import datetime
import json
from kafka import KafkaProducer

class AWSCollector:
    def __init__(self, region_name='us-east-1'):
        self.cloudwatch = boto3.client('cloudwatch', region_name=region_name)
        self.ec2 = boto3.client('ec2', region_name=region_name)
        self.producer = KafkaProducer(
            bootstrap_servers=['kafka:9092'],
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )

    def get_ec2_instances(self):
        """Fetch all running EC2 instances."""
        instances = self.ec2.describe_instances(Filters=[{'Name': 'instance-state-name', 'Values': ['running']}])
        return [i['InstanceId'] for r in instances['Reservations'] for i in r['Instances']]

    def get_metric(self, instance_id, metric_name):
        """Fetch CloudWatch metrics for a specific instance."""
        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(minutes=5)
        
        response = self.cloudwatch.get_metric_statistics(
            Namespace='AWS/EC2',
            MetricName=metric_name,
            Dimensions=[{'Name': 'InstanceId', 'Value': instance_id}],
            StartTime=start_time,
            EndTime=end_time,
            Period=300,
            Statistics=['Average']
        )
        
        datapoints = response.get('Datapoints', [])
        return datapoints[0]['Average'] if datapoints else 0.0

    def collect_and_publish(self):
        """Collect metrics and publish to Kafka."""
        instances = self.get_ec2_instances()
        
        for instance_id in instances:
            cpu = self.get_metric(instance_id, 'CPUUtilization')
            net_in = self.get_metric(instance_id, 'NetworkIn')
            net_out = self.get_metric(instance_id, 'NetworkOut')
            
            payload = {
                "resource_id": instance_id,
                "provider": "AWS",
                "service": "EC2",
                "cpu_utilization": cpu,
                "network_in": net_in,
                "network_out": net_out,
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
            
            # Send to Kafka Ingestion Pipeline
            self.producer.send('cloudguard-metrics', payload)
            print(f"Published metrics for {instance_id}")

if __name__ == "__main__":
    collector = AWSCollector()
    collector.collect_and_publish()
