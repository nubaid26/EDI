from azure.identity import DefaultAzureCredential
from azure.mgmt.monitor import MonitorManagementClient
from azure.mgmt.compute import ComputeManagementClient
import datetime
import json

class AzureCollector:
    """Collect metrics from Azure VMs and AKS nodes."""

    def __init__(self, subscription_id: str):
        credential = DefaultAzureCredential()
        self.monitor = MonitorManagementClient(credential, subscription_id)
        self.compute = ComputeManagementClient(credential, subscription_id)
        self.subscription_id = subscription_id

    def get_vm_list(self):
        """List all running VMs."""
        vms = self.compute.virtual_machines.list_all()
        return [
            {"id": vm.vm_id, "name": vm.name, "location": vm.location, "vm_size": vm.hardware_profile.vm_size}
            for vm in vms if vm.instance_view and vm.instance_view.statuses
        ]

    def get_metric(self, resource_uri: str, metric_name: str, aggregation: str = "Average"):
        """Fetch Azure Monitor metric for a resource."""
        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(minutes=5)

        response = self.monitor.metrics.list(
            resource_uri,
            metricnames=metric_name,
            timespan=f"{start_time.isoformat()}Z/{end_time.isoformat()}Z",
            interval="PT5M",
            aggregation=aggregation,
        )

        for metric in response.value:
            for ts in metric.timeseries:
                for dp in ts.data:
                    val = getattr(dp, aggregation.lower(), None)
                    if val is not None:
                        return val
        return 0.0

    def collect_all(self):
        """Collect metrics for all VMs."""
        vms = self.get_vm_list()
        results = []

        for vm in vms:
            resource_uri = f"/subscriptions/{self.subscription_id}/resourceGroups/*/providers/Microsoft.Compute/virtualMachines/{vm['name']}"
            cpu = self.get_metric(resource_uri, "Percentage CPU")
            net_in = self.get_metric(resource_uri, "Network In Total", "Total")
            net_out = self.get_metric(resource_uri, "Network Out Total", "Total")

            results.append({
                "resource_id": vm["id"],
                "provider": "Azure",
                "service": "VM",
                "name": vm["name"],
                "region": vm["location"],
                "cpu_utilization": cpu,
                "network_in": net_in,
                "network_out": net_out,
                "timestamp": datetime.datetime.utcnow().isoformat(),
            })

        return results


if __name__ == "__main__":
    import os
    sub_id = os.getenv("AZURE_SUBSCRIPTION_ID", "")
    if sub_id:
        collector = AzureCollector(sub_id)
        data = collector.collect_all()
        print(json.dumps(data, indent=2))
    else:
        print("Set AZURE_SUBSCRIPTION_ID to collect Azure metrics")
