import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import DBSCAN
import xgboost as xgb
from prophet import Prophet

class CloudGuardMLEngine:
    def __init__(self):
        # Model 2: Resource Behavior Anomaly Detection
        self.iso_forest = IsolationForest(contamination=0.05, random_state=42)
        
        # Model 3: Resource Abuse Detection (Cryptomining)
        self.xgb_model = xgb.XGBClassifier(n_estimators=100, max_depth=3, use_label_encoder=False, eval_metric='logloss')
        
        # Model 4: Infrastructure Behavior Detection (Cluster Launches)
        self.dbscan = DBSCAN(eps=0.5, min_samples=5)

    def detect_cost_anomaly(self, df: pd.DataFrame):
        """
        Model 1: Prophet Time Series Forecasting
        Detects abnormal cost spikes based on historical billing data.
        df must contain 'ds' (datetime) and 'y' (cost).
        """
        if len(df) < 10:
            return None # Not enough data
            
        m = Prophet(daily_seasonality=True, yearly_seasonality=False)
        m.fit(df)
        
        future = m.make_future_dataframe(periods=24, freq='H')
        forecast = m.predict(future)
        
        # Merge actuals with forecast to find anomalies
        results = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].copy()
        results = results.merge(df, on='ds', how='left')
        
        # Anomaly if actual cost (y) is greater than the upper confidence interval
        results['is_anomaly'] = results['y'] > results['yhat_upper']
        return results

    def detect_resource_behavior(self, features: np.ndarray):
        """
        Model 2: Isolation Forest
        Detects idle or abnormal resource usage (CPU, Memory, Network).
        Returns -1 for anomalies, 1 for normal.
        """
        self.iso_forest.fit(features)
        return self.iso_forest.predict(features)

    def train_abuse_model(self, features: np.ndarray, labels: np.ndarray):
        """
        Model 3: XGBoost Classifier (Training)
        Trains the model to detect cryptomining or abuse patterns.
        """
        self.xgb_model.fit(features, labels)

    def detect_abuse(self, features: np.ndarray):
        """
        Model 3: XGBoost Classifier (Inference)
        Predicts probability of abuse.
        """
        return self.xgb_model.predict_proba(features)[:, 1] # Return probability of class 1 (abuse)

    def detect_infrastructure_behavior(self, features: np.ndarray):
        """
        Model 4: DBSCAN Clustering
        Detects unusual infrastructure deployment patterns (e.g., sudden region spawns).
        Returns cluster labels. -1 indicates an anomaly (noise).
        """
        return self.dbscan.fit_predict(features)
