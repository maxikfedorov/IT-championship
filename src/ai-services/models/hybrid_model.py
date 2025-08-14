import tensorflow as tf
from tensorflow.keras import layers, models, regularizers # type: ignore
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
ENHANCED_FEATURES = 187
CONTEXT_FEATURES = 68

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

class CrossAttentionWithWeights(layers.Layer):
    def __init__(self, d_model, num_heads=4, dropout_rate=0.1):
        super(CrossAttentionWithWeights, self).__init__()
        self.num_heads = num_heads
        self.d_model = d_model
        self.depth = d_model // num_heads
        
        self.wq = layers.Dense(d_model, kernel_regularizer=regularizers.l2(0.001))
        self.wk = layers.Dense(d_model, kernel_regularizer=regularizers.l2(0.001))
        self.wv = layers.Dense(d_model, kernel_regularizer=regularizers.l2(0.001))
        self.dense = layers.Dense(d_model, kernel_regularizer=regularizers.l2(0.001))
        self.dropout = layers.Dropout(dropout_rate)
        
    def split_heads(self, x, batch_size):
        x = tf.reshape(x, (batch_size, -1, self.num_heads, self.depth))
        return tf.transpose(x, perm=[0, 2, 1, 3])
        
    def call(self, query, key, value, training=False):
        batch_size = tf.shape(query)[0]
        
        q = self.wq(query)
        k = self.wk(key)
        v = self.wv(value)
        
        q = self.split_heads(q, batch_size)
        k = self.split_heads(k, batch_size)
        v = self.split_heads(v, batch_size)
        
        matmul_qk = tf.matmul(q, k, transpose_b=True)
        dk = tf.cast(tf.shape(k)[-1], tf.float32)
        scaled_attention_logits = matmul_qk / tf.math.sqrt(dk)
        
        attention_weights = tf.nn.softmax(scaled_attention_logits, axis=-1)
        attention_weights = self.dropout(attention_weights, training=training)
        output = tf.matmul(attention_weights, v)
        
        output = tf.transpose(output, perm=[0, 2, 1, 3])
        concat_attention = tf.reshape(output, (batch_size, -1, self.d_model))
        
        output = self.dense(concat_attention)
        return output, attention_weights


def build_hybrid_model():
    input_layer = layers.Input(shape=(SEQUENCE_LENGTH, ENHANCED_FEATURES))
    
    original_features = input_layer[:, :, :ORIGINAL_FEATURES]
    context_features = input_layer[:, :, ORIGINAL_FEATURES:]
    
    original_features = layers.BatchNormalization()(original_features)
    lstm_out = layers.Bidirectional(
        layers.LSTM(128, return_sequences=True, dropout=0.3, recurrent_dropout=0.2,
                   kernel_regularizer=regularizers.l2(0.001))
    )(original_features)
    lstm_out = layers.BatchNormalization()(lstm_out)
    
    context_features = layers.BatchNormalization()(context_features)
    context_dense = layers.TimeDistributed(
        layers.Dense(256, activation='relu', kernel_regularizer=regularizers.l2(0.001))
    )(context_features)
    context_dense = layers.Dropout(0.2)(context_dense)
    context_dense = layers.TimeDistributed(
        layers.Dense(256, activation='relu', kernel_regularizer=regularizers.l2(0.001))
    )(context_dense)
    
    cross_attention = CrossAttentionWithWeights(256, num_heads=4, dropout_rate=0.1)
    attended_features, attention_weights = cross_attention(lstm_out, context_dense, context_dense)
    
    fused_features = layers.Add()([lstm_out, attended_features])
    fused_features = layers.LayerNormalization()(fused_features)
    fused_features = layers.Dropout(0.2)(fused_features)
    
    global_features = layers.GlobalAveragePooling1D()(fused_features)
    
    dense1 = layers.Dense(512, activation='relu', 
                         kernel_regularizer=regularizers.l2(0.001))(global_features)
    dense1 = layers.BatchNormalization()(dense1)
    dense1 = layers.Dropout(0.4)(dense1)
    
    dense2 = layers.Dense(256, activation='relu',
                         kernel_regularizer=regularizers.l2(0.001))(dense1)
    dense2 = layers.BatchNormalization()(dense2)
    dense2 = layers.Dropout(0.3)(dense2)
    
    output = layers.Dense(ORIGINAL_FEATURES, activation='linear',
                         kernel_regularizer=regularizers.l2(0.0005))(dense2)
    
    model = models.Model(inputs=input_layer, outputs=output)
    return model


@contextmanager
def download_hybrid_model_files_temp(bucket_name: str, model_prefix: str):
    client = get_minio_client()
    temp_dir = tempfile.gettempdir()
    
    weights_object_name = f"{model_prefix}.keras"
    scalers_object_name = f"{model_prefix}.pkl"
    
    weights_local_path = os.path.join(temp_dir, weights_object_name)
    scalers_local_path = os.path.join(temp_dir, scalers_object_name)
    
    client.fget_object(bucket_name, weights_object_name, weights_local_path)
    client.fget_object(bucket_name, scalers_object_name, scalers_local_path)
    
    try:
        yield weights_local_path, scalers_local_path
    finally:
        for path in [weights_local_path, scalers_local_path]:
            if os.path.exists(path):
                os.remove(path)


class HybridLSTMPredictor:
    def __init__(self, bucket_name: str = "models", model_prefix: str = "enhanced_hybrid_20250806_213456"):
        self.bucket_name = bucket_name
        self.model_prefix = model_prefix
        self.model = None
        self.attention_model = None
        self.scaler_enhanced = None
        self.scaler_original = None
        self.energy_features = None
    
    def load_model(self):
        with download_hybrid_model_files_temp(self.bucket_name, self.model_prefix) as (weights_path, scalers_path):
            with open(scalers_path, 'rb') as f:
                scalers_data = pickle.load(f)
            
            self.scaler_enhanced = scalers_data['enhanced']
            self.scaler_original = scalers_data['original']
            self.energy_features = scalers_data['energy_features']
            
            self.model = build_hybrid_model()
            self.model.load_weights(weights_path)
            
            self.attention_model = models.Model(
                inputs=self.model.input,
                outputs=self.model.get_layer(index=-8).output
            )
    
    def preprocess_data(self, input_data: np.ndarray) -> np.ndarray:
        data_processed = input_data.copy()
        
        for i, feature in enumerate(self.energy_features):
            if i < data_processed.shape[1]:
                data_processed[:, i] = np.log1p(data_processed[:, i])
        
        return self.scaler_enhanced.transform(data_processed)
    
    def predict_multistep(self, input_data: np.ndarray, n_steps: int) -> Dict[str, Any]:
        if self.model is None:
            self.load_model()
        
        start_time = time.time()
        
        test_sequence_norm = self.preprocess_data(input_data)
        current_sequence = test_sequence_norm.copy()
        
        all_predictions = []
        all_attention_weights = []
        
        for step in range(n_steps):
            test_input = current_sequence.reshape(1, SEQUENCE_LENGTH, ENHANCED_FEATURES)
            
            prediction_norm = self.model.predict(test_input, verbose=0)
            attention_weights = self.attention_model.predict(test_input, verbose=0)
            
            prediction_full = np.zeros((1, ENHANCED_FEATURES))
            prediction_full[0, :ORIGINAL_FEATURES] = prediction_norm[0]
            prediction_full[0, ORIGINAL_FEATURES:] = test_input[0, -1, ORIGINAL_FEATURES:]
            
            prediction = self.scaler_original.inverse_transform(prediction_norm)
            
            all_predictions.append(prediction.flatten())
            all_attention_weights.append(attention_weights.tolist())
            
            current_sequence = np.roll(current_sequence, -1, axis=0)
            current_sequence[-1] = self.scaler_enhanced.transform(prediction_full)[0]
        
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
                    "architecture": "Enhanced Hybrid LSTM + Cross-Attention",
                    "sequence_length": SEQUENCE_LENGTH,
                    "input_features": ENHANCED_FEATURES,
                    "output_features": ORIGINAL_FEATURES,
                    "energy_features_count": len(self.energy_features),
                    "source": f"S3: {self.bucket_name}/{self.model_prefix}"
                },
                "inference_stats": {
                    "prediction_steps": n_steps,
                    "inference_time_ms": round(inference_time * 1000, 1),
                    "avg_time_per_step_ms": round(inference_time * 1000 / n_steps, 1),
                    "preprocessing_applied": ["log1p_energy_features", "robust_scaling"]
                },
                "attention_analysis": {
                    "weights_per_step": all_attention_weights,
                    "mean_attention": [float(np.mean(w)) for w in all_attention_weights],
                    "max_attention": [float(np.max(w)) for w in all_attention_weights],
                    "attention_std": [float(np.std(w)) for w in all_attention_weights]
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        }


predictor = HybridLSTMPredictor()
