from google.cloud import monitoring_v3
from google.cloud import compute_v1
import datetime
import json

class GCPCollector:
    """Collect metrics from GCP Compute Engine instances."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.monitoring = monitoring_v3.MetricServiceClient()
        self.compute = compute_v1.InstancesClient()
        self.project_path = f"projects/{project_id}"

    def get_instances(self):
        """List all running Compute Engine instances across zones."""
        request = compute_v1.AggregatedListInstancesRequest(project=self.project_id)
        instances = []
        for zone, response in self.compute.aggregated_list(request=request):
            if response.instances:
                for inst in response.instances:
                    if inst.status == "RUNNING":
                        instances.append({
                            "id": str(inst.id),
                            "name": inst.name,
                            "zone": zone.split("/")[-1],
                            "machine_type": inst.machine_type.split("/")[-1],
                        })
        return instances

    def get_metric(self, instance_id: str, metric_type: str):
        """Query Cloud Monitoring for a specific metric."""
        now = datetime.datetime.utcnow()
        interval = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(now.timestamp())},
            "start_time": {"seconds": int((now - datetime.timedelta(minutes=5)).timestamp())},
        })

        results = self.monitoring.list_time_series(
            request={
                "name": self.project_path,
                "filter": f'metric.type = "{metric_type}" AND resource.labels.instance_id = "{instance_id}"',
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )

        for ts in results:
            for point in ts.points:
                return point.value.double_value
        return 0.0

    def collect_all(self):
        """Collect metrics for all instances."""
        instances = self.get_instances()
        results = []

        for inst in instances:
            cpu = self.get_metric(inst["id"], "compute.googleapis.com/instance/cpu/utilization") * 100
            net_in = self.get_metric(inst["id"], "compute.googleapis.com/instance/network/received_bytes_count")
            net_out = self.get_metric(inst["id"], "compute.googleapis.com/instance/network/sent_bytes_count")

            results.append({
                "resource_id": inst["id"],
                "provider": "GCP",
                "service": "Compute Engine",
                "name": inst["name"],
                "region": inst["zone"],
                "cpu_utilization": cpu,
                "network_in": net_in,
                "network_out": net_out,
                "timestamp": datetime.datetime.utcnow().isoformat(),
            })

        return results


if __name__ == "__main__":
    import os
    project = os.getenv("GCP_PROJECT_ID", "")
    if project:
        collector = GCPCollector(project)
        data = collector.collect_all()
        print(json.dumps(data, indent=2))
    else:
        print("Set GCP_PROJECT_ID to collect GCP metrics")
