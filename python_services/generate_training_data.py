"""
Synthetic Training Data Generator for CloudGuard AI models.
Generates labeled datasets for XGBoost abuse detection training.
"""
import pandas as pd
import numpy as np
import os

def generate_normal_metrics(n: int) -> pd.DataFrame:
    """Generate normal cloud workload patterns."""
    return pd.DataFrame({
        "cpu_utilization": np.random.uniform(20, 70, n),
        "memory_usage": np.random.uniform(30, 75, n),
        "network_in": np.random.uniform(10, 500, n),
        "network_out": np.random.uniform(10, 500, n),
        "gpu_utilization": np.random.uniform(0, 30, n),
        "disk_io": np.random.uniform(5, 200, n),
        "label": 0,
    })

def generate_idle_metrics(n: int) -> pd.DataFrame:
    """Generate idle resource patterns."""
    return pd.DataFrame({
        "cpu_utilization": np.random.uniform(0, 5, n),
        "memory_usage": np.random.uniform(2, 15, n),
        "network_in": np.random.uniform(0, 10, n),
        "network_out": np.random.uniform(0, 10, n),
        "gpu_utilization": np.random.uniform(0, 2, n),
        "disk_io": np.random.uniform(0, 5, n),
        "label": 0,
    })

def generate_cryptomining_metrics(n: int) -> pd.DataFrame:
    """Generate cryptomining abuse patterns."""
    return pd.DataFrame({
        "cpu_utilization": np.random.uniform(90, 100, n),
        "memory_usage": np.random.uniform(60, 95, n),
        "network_in": np.random.uniform(10, 100, n),
        "network_out": np.random.uniform(3000, 10000, n),
        "gpu_utilization": np.random.uniform(80, 100, n),
        "disk_io": np.random.uniform(5, 30, n),
        "label": 1,
    })

def generate_cost_spike_data(n: int) -> pd.DataFrame:
    """Generate time-series cost data with spikes for Prophet training."""
    dates = pd.date_range(start="2025-01-01", periods=n, freq="H")
    base_cost = 2.5 + np.random.normal(0, 0.3, n)

    # Inject spikes at random positions
    spike_indices = np.random.choice(n, size=n // 20, replace=False)
    base_cost[spike_indices] = base_cost[spike_indices] * np.random.uniform(5, 15, len(spike_indices))

    return pd.DataFrame({"ds": dates, "y": np.maximum(base_cost, 0)})


def generate_infra_behavior_data(n: int) -> pd.DataFrame:
    """Generate infrastructure deployment patterns for DBSCAN training."""
    normal = pd.DataFrame({
        "region_code": np.random.choice([1, 2, 3, 4], n),
        "instance_count": np.random.poisson(3, n),
        "api_call_rate": np.random.uniform(10, 100, n),
        "timestamp_hour": np.random.uniform(8, 20, n),
    })

    # Add anomalous deployments
    anomalous = pd.DataFrame({
        "region_code": np.random.choice([7, 8, 9], n // 10),
        "instance_count": np.random.poisson(20, n // 10),
        "api_call_rate": np.random.uniform(500, 2000, n // 10),
        "timestamp_hour": np.random.uniform(0, 5, n // 10),
    })

    return pd.concat([normal, anomalous], ignore_index=True)


if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(__file__), "training_data")
    os.makedirs(output_dir, exist_ok=True)

    # Generate abuse detection training data (XGBoost)
    normal = generate_normal_metrics(5000)
    idle = generate_idle_metrics(1000)
    abuse = generate_cryptomining_metrics(500)
    abuse_dataset = pd.concat([normal, idle, abuse], ignore_index=True).sample(frac=1, random_state=42)
    abuse_dataset.to_csv(os.path.join(output_dir, "abuse_training.csv"), index=False)
    print(f"Generated abuse training data: {len(abuse_dataset)} samples")

    # Generate cost time-series data for Prophet
    cost_data = generate_cost_spike_data(2000)
    cost_data.to_csv(os.path.join(output_dir, "cost_timeseries.csv"), index=False)
    print(f"Generated cost time-series: {len(cost_data)} samples")

    # Generate infra behavior data for DBSCAN
    infra_data = generate_infra_behavior_data(1000)
    infra_data.to_csv(os.path.join(output_dir, "infra_behavior.csv"), index=False)
    print(f"Generated infra behavior data: {len(infra_data)} samples")

    print(f"\nAll training data saved to: {output_dir}")
