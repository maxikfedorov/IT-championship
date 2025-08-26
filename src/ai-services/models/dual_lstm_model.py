import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers, regularizers # type: ignore
import numpy as np
import pandas as pd
import pickle
import tempfile
import os
import time
from typing import Dict, List, Any, Tuple
from datetime import datetime
from database.database import get_minio_client
from contextlib import contextmanager


SEQUENCE_LENGTH = 10
ORIGINAL_FEATURES = 119


class SimplifiedDualChannelLSTM(keras.Model):
    def __init__(self, l2_reg=0.001):
        super().__init__()
        
        self.main_bn1 = layers.BatchNormalization()
        self.main_lstm1 = layers.LSTM(
            160, return_sequences=True, dropout=0.25, recurrent_dropout=0.15,
            kernel_regularizer=regularizers.l2(l2_reg),
            bias_regularizer=regularizers.l1(l2_reg/10)
        )
        self.main_bn2 = layers.BatchNormalization()
        self.main_lstm2 = layers.LSTM(
            80, dropout=0.25, recurrent_dropout=0.15,
            kernel_regularizer=regularizers.l2(l2_reg)
        )
        self.main_dense = layers.Dense(
            96, activation='relu',
            kernel_regularizer=regularizers.l2(l2_reg)
        )
        self.main_dropout = layers.Dropout(0.3)
        
        self.aux_bn1 = layers.BatchNormalization()
        self.aux_lstm1 = layers.LSTM(
            80, return_sequences=True, dropout=0.2, recurrent_dropout=0.1,
            kernel_regularizer=regularizers.l2(l2_reg)
        )
        self.aux_bn2 = layers.BatchNormalization()
        self.aux_lstm2 = layers.LSTM(
            40, dropout=0.2, recurrent_dropout=0.1,
            kernel_regularizer=regularizers.l2(l2_reg)
        )
        self.aux_dense = layers.Dense(
            48, activation='relu',
            kernel_regularizer=regularizers.l2(l2_reg)
        )
        self.aux_dropout = layers.Dropout(0.25)
        
        self.fusion_bn = layers.BatchNormalization()
        self.fusion_dense1 = layers.Dense(
            144, activation='relu',
            kernel_regularizer=regularizers.l2(l2_reg)
        )
        self.fusion_dropout1 = layers.Dropout(0.3)
        self.fusion_dense2 = layers.Dense(
            72, activation='relu',
            kernel_regularizer=regularizers.l2(l2_reg/2)
        )
        self.fusion_dropout2 = layers.Dropout(0.2)
        
        self.output_dense = layers.Dense(
            ORIGINAL_FEATURES,
            kernel_regularizer=regularizers.l2(l2_reg/5)
        )
    
    def call(self, inputs, training=False):
        main_x = self.main_bn1(inputs, training=training)
        main_x = self.main_lstm1(main_x, training=training)
        main_x = self.main_bn2(main_x, training=training)
        main_x = self.main_lstm2(main_x, training=training)
        main_x = self.main_dense(main_x)
        main_x = self.main_dropout(main_x, training=training)
        
        aux_x = self.aux_bn1(inputs, training=training)
        aux_x = self.aux_lstm1(aux_x, training=training)
        aux_x = self.aux_bn2(aux_x, training=training)
        aux_x = self.aux_lstm2(aux_x, training=training)
        aux_x = self.aux_dense(aux_x)
        aux_x = self.aux_dropout(aux_x, training=training)
        
        fused = tf.concat([main_x, aux_x], axis=-1)
        fused = self.fusion_bn(fused, training=training)
        fused = self.fusion_dense1(fused)
        fused = self.fusion_dropout1(fused, training=training)
        fused = self.fusion_dense2(fused)
        fused = self.fusion_dropout2(fused, training=training)
        
        output = self.output_dense(fused)
        return tf.reshape(output, (-1, 1, ORIGINAL_FEATURES))


@contextmanager
def download_model_files_temp(bucket_name: str, model_prefix: str):
    client = get_minio_client()
    temp_dir = tempfile.gettempdir()
    
    weights_object_name = f"{model_prefix}.keras"
    scaler_object_name = f"{model_prefix}.pkl"
    
    weights_local_path = os.path.join(temp_dir, weights_object_name)
    scaler_local_path = os.path.join(temp_dir, scaler_object_name)
    
    client.fget_object(bucket_name, weights_object_name, weights_local_path)
    client.fget_object(bucket_name, scaler_object_name, scaler_local_path)
    
    try:
        yield weights_local_path, scaler_local_path
    finally:
        for path in [weights_local_path, scaler_local_path]:
            if os.path.exists(path):
                os.remove(path)


class DualLSTMPredictor:
    def __init__(self, bucket_name: str = "models", model_prefix: str = "dual_lstm_original_20250806_225816"):
        self.bucket_name = bucket_name
        self.model_prefix = model_prefix
        self.model = None
        self.scaler = None
    
    def load_model(self):
        with download_model_files_temp(self.bucket_name, self.model_prefix) as (weights_path, scaler_path):
            self.model = SimplifiedDualChannelLSTM(l2_reg=0.001)
            dummy_input = tf.random.normal((1, SEQUENCE_LENGTH, ORIGINAL_FEATURES))
            _ = self.model(dummy_input)
            
            self.model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3, clipnorm=1.0),
                loss=tf.keras.losses.Huber(delta=0.5),
                metrics=['mae', 'mse']
            )
            
            self.model.load_weights(weights_path)
            
            with open(scaler_path, 'rb') as f:
                self.scaler = pickle.load(f)
    
    def predict_multistep(self, input_data: np.ndarray, n_steps: int) -> Dict[str, Any]:
        if self.model is None or self.scaler is None:
            self.load_model()
        
        start_time = time.time()
        
        test_sequence_norm = self.scaler.transform(input_data)
        current_sequence = test_sequence_norm.copy()
        all_predictions = []
        
        for step in range(n_steps):
            test_input = current_sequence.reshape(1, SEQUENCE_LENGTH, ORIGINAL_FEATURES)
            prediction_norm = self.model.predict(test_input, verbose=0)
            prediction = self.scaler.inverse_transform(prediction_norm.reshape(1, -1))
            
            all_predictions.append(prediction.flatten())
            
            current_sequence = np.roll(current_sequence, -1, axis=0)
            current_sequence[-1] = prediction_norm.flatten()
        
        inference_time = time.time() - start_time
        
        predictions_array = np.array(all_predictions)
        
        return {
            "predictions": {
                "values": predictions_array.tolist(),
                "steps": n_steps,
                "features": ORIGINAL_FEATURES
            },
            "metadata": {
                "model_info": {
                    "total_parameters": int(self.model.count_params()),
                    "input_shape": [SEQUENCE_LENGTH, ORIGINAL_FEATURES],
                    "model_type": "Dual-LSTM",
                    "source": f"S3: {self.bucket_name}/{self.model_prefix}"
                },
                "inference_stats": {
                    "total_steps": n_steps,
                    "features_per_step": ORIGINAL_FEATURES,
                    "total_predictions": n_steps * ORIGINAL_FEATURES,
                    "inference_time_ms": round(inference_time * 1000, 1),
                    "avg_time_per_step_ms": round(inference_time * 1000 / n_steps, 1)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        }


predictor = DualLSTMPredictor()
