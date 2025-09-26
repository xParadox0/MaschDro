#!/usr/bin/env python3
"""
Sengon Monitoring System - ML Pipeline
LSTM for Growth Prediction + Random Forest for Health Classification
"""

import numpy as np
import pandas as pd
import psycopg2
from sqlalchemy import create_engine
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.metrics import classification_report, mean_absolute_error, mean_squared_error
import joblib
import json
import logging
from datetime import datetime, timedelta
import warnings
import os

warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ml_pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SengonMLPipeline:
    def __init__(self, db_url="postgresql://sengon_user:sengon_password@localhost:5432/sengon_monitoring"):
        self.db_url = db_url
        self.engine = create_engine(db_url)
        self.models = {}
        self.scalers = {}
        
        # Model parameters
        self.lstm_config = {
            'sequence_length': 72,  # 3 days of hourly data
            'batch_size': 32,
            'epochs': 100,
            'learning_rate': 0.001
        }
        
        self.rf_config = {
            'n_estimators': 200,
            'max_depth': 10,
            'min_samples_split': 5,
            'min_samples_leaf': 2,
            'random_state': 42
        }
        
        logger.info("SengonMLPipeline initialized")

    def fetch_sensor_data(self, device_id=None, hours=168):  # Default 7 days
        """Fetch sensor data from TimescaleDB"""
        try:
            base_query = """
            SELECT 
                time,
                device_id,
                diameter_mm,
                growth_rate_mm_per_hour,
                temperature_c,
                humidity_percent,
                soil_moisture_percent,
                battery_voltage,
                wifi_rssi
            FROM sensor_data 
            WHERE time >= NOW() - INTERVAL '{} hours'
            AND diameter_mm IS NOT NULL
            """.format(hours)
            
            if device_id:
                base_query += f" AND device_id = '{device_id}'"
            
            base_query += " ORDER BY device_id, time ASC"
            
            df = pd.read_sql_query(base_query, self.engine)
            logger.info(f"Fetched {len(df)} sensor records")
            return df
        
        except Exception as e:
            logger.error(f"Error fetching sensor data: {e}")
            return pd.DataFrame()

    def preprocess_data_for_lstm(self, df):
        """Prepare data for LSTM training"""
        if len(df) == 0:
            return None, None, None
            
        # Sort by device and time
        df_sorted = df.sort_values(['device_id', 'time'])
        
        # Forward fill missing values
        df_sorted = df_sorted.fillna(method='ffill').fillna(method='bfill')
        
        # Create features
        features = ['diameter_mm', 'temperature_c', 'humidity_percent', 'soil_moisture_percent']
        
        sequences = []
        targets = []
        
        # Create sequences for each device
        for device_id in df_sorted['device_id'].unique():
            device_data = df_sorted[df_sorted['device_id'] == device_id][features].values
            
            # Create sequences
            for i in range(len(device_data) - self.lstm_config['sequence_length']):
                sequences.append(device_data[i:(i + self.lstm_config['sequence_length'])])
                # Target is the next diameter reading
                targets.append(device_data[i + self.lstm_config['sequence_length'], 0])  # diameter_mm
        
        if len(sequences) == 0:
            logger.warning("No sequences created for LSTM")
            return None, None, None
            
        X = np.array(sequences)
        y = np.array(targets)
        
        # Scale the data
        scaler = MinMaxScaler()
        X_scaled = scaler.fit_transform(X.reshape(-1, X.shape[-1])).reshape(X.shape)
        
        # Scale targets separately
        target_scaler = MinMaxScaler()
        y_scaled = target_scaler.fit_transform(y.reshape(-1, 1)).flatten()
        
        # Store scalers
        self.scalers['lstm_features'] = scaler
        self.scalers['lstm_targets'] = target_scaler
        
        logger.info(f"Prepared {len(X)} sequences for LSTM training")
        return X_scaled, y_scaled, (X.shape[1], X.shape[2])

    def build_lstm_model(self, input_shape):
        """Build LSTM model for growth prediction"""
        model = Sequential([
            LSTM(128, dropout=0.2, recurrent_dropout=0.2, return_sequences=True, 
                 input_shape=input_shape),
            LSTM(64, dropout=0.2, recurrent_dropout=0.2, return_sequences=True),
            LSTM(32, dropout=0.2, recurrent_dropout=0.2),
            Dense(16, activation='relu'),
            Dropout(0.2),
            Dense(1)
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=self.lstm_config['learning_rate']),
            loss='mse',
            metrics=['mae']
        )
        
        logger.info("LSTM model built successfully")
        return model

    def train_lstm_model(self, df):
        """Train LSTM model for growth prediction"""
        X, y, input_shape = self.preprocess_data_for_lstm(df)
        
        if X is None:
            logger.error("Cannot train LSTM: No data available")
            return False
            
        # Split data
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.2, random_state=42, shuffle=True
        )
        
        # Build model
        model = self.build_lstm_model(input_shape)
        
        # Early stopping callback
        early_stop = tf.keras.callbacks.EarlyStopping(
            monitor='val_loss', patience=15, restore_best_weights=True
        )
        
        # Train model
        history = model.fit(
            X_train, y_train,
            batch_size=self.lstm_config['batch_size'],
            epochs=self.lstm_config['epochs'],
            validation_data=(X_val, y_val),
            callbacks=[early_stop],
            verbose=1
        )
        
        # Evaluate model
        val_predictions = model.predict(X_val)
        val_predictions_rescaled = self.scalers['lstm_targets'].inverse_transform(
            val_predictions.reshape(-1, 1)
        ).flatten()
        y_val_rescaled = self.scalers['lstm_targets'].inverse_transform(
            y_val.reshape(-1, 1)
        ).flatten()
        
        mae = mean_absolute_error(y_val_rescaled, val_predictions_rescaled)
        rmse = np.sqrt(mean_squared_error(y_val_rescaled, val_predictions_rescaled))
        
        logger.info(f"LSTM Model Performance - MAE: {mae:.3f}mm, RMSE: {rmse:.3f}mm")
        
        # Save model
        self.models['lstm'] = model
        model.save('models/lstm_growth_prediction.h5')
        
        return True

    def create_health_features(self, df):
        """Create features for health classification"""
        features_list = []
        
        for device_id in df['device_id'].unique():
            device_data = df[df['device_id'] == device_id].copy()
            device_data = device_data.sort_values('time')
            
            # Calculate rolling statistics for different windows
            for window in [24, 72]:  # 24h, 72h windows
                device_data[f'diameter_mean_{window}h'] = device_data['diameter_mm'].rolling(
                    window=window, min_periods=1).mean()
                device_data[f'diameter_std_{window}h'] = device_data['diameter_mm'].rolling(
                    window=window, min_periods=1).std()
                device_data[f'growth_rate_mean_{window}h'] = device_data['growth_rate_mm_per_hour'].rolling(
                    window=window, min_periods=1).mean()
                
            # Environmental correlation features
            device_data['temp_diameter_corr'] = device_data['temperature_c'].rolling(
                window=24, min_periods=1).corr(device_data['diameter_mm'])
            device_data['humidity_diameter_corr'] = device_data['humidity_percent'].rolling(
                window=24, min_periods=1).corr(device_data['diameter_mm'])
            
            # Stress indicators
            device_data['temp_stress'] = (
                (device_data['temperature_c'] > 32) | 
                (device_data['temperature_c'] < 20)
            ).astype(int)
            
            device_data['moisture_stress'] = (
                device_data['soil_moisture_percent'] < 40
            ).astype(int)
            
            # Growth anomaly detection
            growth_mean = device_data['growth_rate_mm_per_hour'].mean()
            growth_std = device_data['growth_rate_mm_per_hour'].std()
            device_data['growth_anomaly'] = (
                np.abs(device_data['growth_rate_mm_per_hour'] - growth_mean) > (2 * growth_std)
            ).astype(int)
            
            features_list.append(device_data)
        
        return pd.concat(features_list, ignore_index=True)

    def create_health_labels(self, df):
        """Create health classification labels based on Sengon characteristics"""
        labels = []
        
        for _, row in df.iterrows():
            growth_rate_daily = row['growth_rate_mm_per_hour'] * 24
            temp = row['temperature_c']
            soil_moisture = row['soil_moisture_percent']
            
            # Sengon optimal growth: 0.14-0.27 mm/day
            if pd.isna(growth_rate_daily):
                labels.append('unknown')
                continue
                
            # Health classification logic for Sengon
            if growth_rate_daily >= 0.1 and growth_rate_daily <= 0.3:  # Normal range
                if temp >= 20 and temp <= 32 and soil_moisture >= 50:
                    labels.append('healthy')
                else:
                    labels.append('stressed')  # Environmental stress
            elif growth_rate_daily < 0.05:  # Very low growth
                labels.append('at_risk')
            elif growth_rate_daily > 0.5:  # Abnormally high (potential measurement error)
                labels.append('anomaly')
            else:
                labels.append('stressed')
                
        return labels

    def train_random_forest_health(self, df):
        """Train Random Forest for health classification"""
        # Create features
        df_features = self.create_health_features(df)
        
        # Create labels
        health_labels = self.create_health_labels(df_features)
        df_features['health_status'] = health_labels
        
        # Remove rows with unknown labels or NaN
        df_clean = df_features[df_features['health_status'] != 'unknown'].dropna()
        
        if len(df_clean) == 0:
            logger.error("No valid data for health classification")
            return False
            
        # Select feature columns
        feature_cols = [col for col in df_clean.columns if col not in 
                       ['time', 'device_id', 'health_status']]
        
        X = df_clean[feature_cols]
        y = df_clean['health_status']
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers['rf_health'] = scaler
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest
        rf_model = RandomForestClassifier(**self.rf_config)
        rf_model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = rf_model.predict(X_test)
        report = classification_report(y_test, y_pred, output_dict=True)
        
        logger.info("Random Forest Health Classification Report:")
        logger.info(f"Accuracy: {report['accuracy']:.3f}")
        for label, metrics in report.items():
            if isinstance(metrics, dict):
                logger.info(f"{label}: precision={metrics['precision']:.3f}, "
                          f"recall={metrics['recall']:.3f}, f1={metrics['f1-score']:.3f}")
        
        # Save model
        self.models['rf_health'] = rf_model
        joblib.dump(rf_model, 'models/rf_health_classification.pkl')
        
        # Save feature columns for prediction
        with open('models/rf_feature_columns.json', 'w') as f:
            json.dump(feature_cols, f)
        
        return True

    def train_anomaly_detection(self, df):
        """Train Isolation Forest for anomaly detection"""
        # Prepare features for anomaly detection
        feature_cols = ['diameter_mm', 'growth_rate_mm_per_hour', 'temperature_c', 
                       'humidity_percent', 'soil_moisture_percent']
        
        X = df[feature_cols].dropna()
        
        if len(X) == 0:
            logger.error("No data for anomaly detection")
            return False
            
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        self.scalers['anomaly'] = scaler
        
        # Train Isolation Forest
        iso_forest = IsolationForest(
            contamination=0.1,  # Expect 10% anomalies
            random_state=42,
            n_estimators=100
        )
        iso_forest.fit(X_scaled)
        
        # Save model
        self.models['anomaly'] = iso_forest
        joblib.dump(iso_forest, 'models/isolation_forest_anomaly.pkl')
        
        logger.info("Anomaly detection model trained successfully")
        return True

    def predict_growth(self, recent_data, steps_ahead=24):
        """Predict growth using LSTM model"""
        if 'lstm' not in self.models:
            logger.error("LSTM model not loaded")
            return None
            
        try:
            # Prepare input data
            features = ['diameter_mm', 'temperature_c', 'humidity_percent', 'soil_moisture_percent']
            X = recent_data[features].values
            
            if len(X) < self.lstm_config['sequence_length']:
                logger.error("Not enough data for prediction")
                return None
                
            # Take last sequence
            X_seq = X[-self.lstm_config['sequence_length']:].reshape(1, self.lstm_config['sequence_length'], len(features))
            
            # Scale input
            X_scaled = self.scalers['lstm_features'].transform(X_seq.reshape(-1, X_seq.shape[-1])).reshape(X_seq.shape)
            
            # Predict
            predictions = []
            current_seq = X_scaled
            
            for _ in range(steps_ahead):
                pred = self.models['lstm'].predict(current_seq, verbose=0)
                predictions.append(pred[0, 0])
                
                # Update sequence (simple approach - use last known environmental values)
                new_row = current_seq[0, -1, :].copy()
                new_row[0] = pred[0, 0]  # Update diameter prediction
                
                current_seq = np.append(current_seq[:, 1:, :], new_row.reshape(1, 1, -1), axis=1)
            
            # Rescale predictions
            predictions_rescaled = self.scalers['lstm_targets'].inverse_transform(
                np.array(predictions).reshape(-1, 1)
            ).flatten()
            
            return predictions_rescaled
            
        except Exception as e:
            logger.error(f"Error in growth prediction: {e}")
            return None

    def predict_health(self, current_data):
        """Predict health status using Random Forest"""
        if 'rf_health' not in self.models:
            logger.error("Random Forest health model not loaded")
            return None
            
        try:
            # Load feature columns
            with open('models/rf_feature_columns.json', 'r') as f:
                feature_cols = json.load(f)
            
            # Create features for current data
            df_features = self.create_health_features(current_data)
            
            if len(df_features) == 0:
                return None
                
            # Get latest reading features
            latest_features = df_features.iloc[-1][feature_cols].values.reshape(1, -1)
            
            # Scale features
            latest_scaled = self.scalers['rf_health'].transform(latest_features)
            
            # Predict
            prediction = self.models['rf_health'].predict(latest_scaled)[0]
            probabilities = self.models['rf_health'].predict_proba(latest_scaled)[0]
            
            # Get class labels
            classes = self.models['rf_health'].classes_
            prob_dict = dict(zip(classes, probabilities))
            
            return {
                'prediction': prediction,
                'probabilities': prob_dict,
                'confidence': max(probabilities)
            }
            
        except Exception as e:
            logger.error(f"Error in health prediction: {e}")
            return None

    def detect_anomalies(self, current_data):
        """Detect anomalies using Isolation Forest"""
        if 'anomaly' not in self.models:
            logger.error("Anomaly detection model not loaded")
            return None
            
        try:
            feature_cols = ['diameter_mm', 'growth_rate_mm_per_hour', 'temperature_c', 
                           'humidity_percent', 'soil_moisture_percent']
            
            X = current_data[feature_cols].dropna()
            
            if len(X) == 0:
                return None
                
            # Scale features
            X_scaled = self.scalers['anomaly'].transform(X)
            
            # Predict anomalies
            anomaly_scores = self.models['anomaly'].decision_function(X_scaled)
            is_anomaly = self.models['anomaly'].predict(X_scaled)
            
            return {
                'anomaly_scores': anomaly_scores,
                'is_anomaly': is_anomaly,
                'anomaly_count': np.sum(is_anomaly == -1)
            }
            
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
            return None

    def save_models(self):
        """Save all trained models and scalers"""
        os.makedirs('models', exist_ok=True)
        
        # Save scalers
        joblib.dump(self.scalers, 'models/scalers.pkl')
        
        logger.info("All models and scalers saved successfully")

    def load_models(self):
        """Load all trained models and scalers"""
        try:
            # Load LSTM model
            if os.path.exists('models/lstm_growth_prediction.h5'):
                self.models['lstm'] = tf.keras.models.load_model('models/lstm_growth_prediction.h5')
                logger.info("LSTM model loaded")
            
            # Load Random Forest model
            if os.path.exists('models/rf_health_classification.pkl'):
                self.models['rf_health'] = joblib.load('models/rf_health_classification.pkl')
                logger.info("Random Forest health model loaded")
            
            # Load Isolation Forest model
            if os.path.exists('models/isolation_forest_anomaly.pkl'):
                self.models['anomaly'] = joblib.load('models/isolation_forest_anomaly.pkl')
                logger.info("Anomaly detection model loaded")
            
            # Load scalers
            if os.path.exists('models/scalers.pkl'):
                self.scalers = joblib.load('models/scalers.pkl')
                logger.info("Scalers loaded")
            
            return True
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            return False

    def run_training_pipeline(self, device_id=None):
        """Run complete training pipeline"""
        logger.info("Starting ML training pipeline...")
        
        # Fetch data
        df = self.fetch_sensor_data(device_id=device_id, hours=168)  # 7 days
        
        if len(df) < 100:  # Need minimum data for training
            logger.warning("Insufficient data for training. Need at least 100 records.")
            return False
        
        # Train LSTM model
        logger.info("Training LSTM model for growth prediction...")
        lstm_success = self.train_lstm_model(df)
        
        # Train Random Forest for health classification
        logger.info("Training Random Forest for health classification...")
        rf_success = self.train_random_forest_health(df)
        
        # Train anomaly detection
        logger.info("Training anomaly detection model...")
        anomaly_success = self.train_anomaly_detection(df)
        
        # Save all models
        self.save_models()
        
        success_count = sum([lstm_success, rf_success, anomaly_success])
        logger.info(f"Training pipeline completed. {success_count}/3 models trained successfully.")
        
        return success_count >= 2  # At least 2 models should be trained

# CLI Interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Sengon ML Pipeline")
    parser.add_argument("--train", action="store_true", help="Train all models")
    parser.add_argument("--predict", action="store_true", help="Run predictions")
    parser.add_argument("--device-id", type=str, help="Specific device ID to process")
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = SengonMLPipeline()
    
    if args.train:
        logger.info("Starting training mode...")
        success = pipeline.run_training_pipeline(device_id=args.device_id)
        if success:
            logger.info("Training completed successfully!")
        else:
            logger.error("Training failed!")
    
    elif args.predict:
        logger.info("Starting prediction mode...")
        
        # Load models
        if not pipeline.load_models():
            logger.error("Failed to load models. Run training first.")
            exit(1)
        
        # Get recent data
        df = pipeline.fetch_sensor_data(device_id=args.device_id, hours=24)
        
        if len(df) > 0:
            device_id = args.device_id or df['device_id'].iloc[0]
            device_data = df[df['device_id'] == device_id]
            
            # Growth prediction
            growth_pred = pipeline.predict_growth(device_data)
            if growth_pred is not None:
                logger.info(f"Growth prediction for next 24 hours: {growth_pred[:24]}")
            
            # Health prediction
            health_pred = pipeline.predict_health(device_data)
            if health_pred:
                logger.info(f"Health prediction: {health_pred}")
            
            # Anomaly detection
            anomalies = pipeline.detect_anomalies(device_data)
            if anomalies:
                logger.info(f"Anomaly detection: {anomalies['anomaly_count']} anomalies found")
        
        else:
            logger.error("No data available for predictions")
    
    else:
        parser.print_help()