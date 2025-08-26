from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import numpy as np
import os

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

import tensorflow as tf
import json
import threading
from minio.error import S3Error
from database.database import get_minio_client
from utils.logger import log


MODULE = "autoencoder"
MODEL_BUCKET = "models"
MODEL_OBJECT = "multihead_attention_autoencoder_20250805_195221.weights.h5"
_MODEL_LOCK = threading.Lock()
_MODEL_CACHE = {}

class AutoencoderInferenceInput(BaseModel):
    input: List[float] = Field(..., description="119 признаков для автоэнкодера")
    data_id: Optional[str] = None
    features: Optional[bool] = True

class AttentionDetails(BaseModel):
    reconstruction_error: float
    is_anomaly: bool
    confidence_score: float
    prediction_uncertainty: float
    attention_stability: float
    attention_focus: float
    top3_features: str
    anomaly_severity: float

class AutoencoderInferenceOutput(BaseModel):
    request_id: str
    data_id: str
    overall: Dict[str, Any]
    bearing: AttentionDetails
    eccentricity: AttentionDetails
    rotor: AttentionDetails
    stator: AttentionDetails
    thresholds: Dict[str, Any]
    autoencoder_features: Optional[Dict[str, Any]] = None

class AutoencoderBatchInferenceInput(BaseModel):
    input: List[List[float]]
    batch_id: str = Field(..., description="ID батча")
    normalization_stats: Optional[dict] = None
    features: Optional[bool] = True

class AutoencoderBatchInferenceOutput(BaseModel):
    results: List[AutoencoderInferenceOutput]

def run_autoencoder_batch_inference(batch: List[List[float]], normalization_stats=None, features: bool = False):
    """Батчевая обработка сэмплов автоэнкодером"""
    outputs = []
    for ix, sample in enumerate(batch):
        data_id = f"sample_{ix}"
        output = run_autoencoder_inference(
            input_values=sample,
            data_id=data_id,
            request_id=f"req_{ix}",
            features=features
        )
        outputs.append(output)
    return AutoencoderBatchInferenceOutput(results=outputs)

def _load_model_and_stats():
    """Загружает модель, статистики нормализации и пороги из S3"""
    with _MODEL_LOCK:
        if "model" in _MODEL_CACHE:
            return _MODEL_CACHE["model"], _MODEL_CACHE["stats"], _MODEL_CACHE["thresholds"]

        minio = get_minio_client()
        tmp_dir = "/tmp"

        weights_fn = MODEL_OBJECT
        thresh_fn = weights_fn.replace(".weights.h5", "_thresholds.json")
        norm_fn = weights_fn.replace(".weights.h5", "_normalization_stats.json")
        
        weights_path = os.path.join(tmp_dir, weights_fn)
        thresh_path = os.path.join(tmp_dir, thresh_fn)
        norm_path = os.path.join(tmp_dir, norm_fn)

        if not os.path.exists(weights_path):
            minio.fget_object(MODEL_BUCKET, weights_fn, weights_path)
        if not os.path.exists(thresh_path):
            minio.fget_object(MODEL_BUCKET, thresh_fn, thresh_path)
        if not os.path.exists(norm_path):
            try:
                minio.fget_object(MODEL_BUCKET, norm_fn, norm_path)
            except S3Error:
                raise RuntimeError(f"Normalization stats file not found: {norm_fn}")

        log(f"Model artifacts loaded: {weights_fn}", MODULE)

        with open(norm_path) as f:
            stats = json.load(f)
            stats = {
                "mean": np.array(stats["mean"]),
                "std": np.array(stats["std"])
            }

        model = _build_autoencoder_model()
        dummy_input = np.zeros((1, 119)).astype(np.float32)
        model(dummy_input)
        model.load_weights(weights_path)
        
        with open(thresh_path) as f:
            loaded_thresholds = json.load(f)
            
        _MODEL_CACHE["model"] = model
        _MODEL_CACHE["thresholds"] = loaded_thresholds
        _MODEL_CACHE["stats"] = stats
        
        log(f"Model loaded successfully, parameters: {model.count_params()}", MODULE)
        return model, stats, loaded_thresholds

def _build_autoencoder_model():
    """Создает архитектуру MultiHead Attention Autoencoder"""
    from tensorflow.keras import layers, Model # type: ignore
    
    SHARED_ENCODER_DIMS = [128, 64]
    ATTENTION_HEADS = 4
    ATTENTION_KEY_DIM = 17
    COMPONENT_LATENT_DIM = 32
    BEARING_DECODER_DIMS = [48, 24, 30]
    ECC_DECODER_DIMS = [32, 29]
    ROTOR_DECODER_DIMS = [64, 32, 15]
    STATOR_DECODER_DIMS = [40, 28]

    class MultiHeadAttentionAutoencoder(Model):
        def __init__(self):
            super().__init__()
            self.shared_encoder = tf.keras.Sequential([
                layers.Dense(SHARED_ENCODER_DIMS[0], activation='relu'),
                layers.BatchNormalization(),
                layers.Dense(SHARED_ENCODER_DIMS[1], activation='relu'),
                layers.BatchNormalization()
            ])
            self.bearing_encoder = layers.Dense(COMPONENT_LATENT_DIM, activation='tanh')
            self.eccentricity_encoder = layers.Dense(COMPONENT_LATENT_DIM, activation='selu')
            self.rotor_encoder = layers.Dense(COMPONENT_LATENT_DIM, activation='relu')
            self.stator_encoder = layers.Dense(COMPONENT_LATENT_DIM, activation='relu')
            self.bearing_attention = layers.MultiHeadAttention(num_heads=ATTENTION_HEADS, key_dim=ATTENTION_KEY_DIM, dropout=0.1)
            self.eccentricity_attention = layers.MultiHeadAttention(num_heads=ATTENTION_HEADS, key_dim=ATTENTION_KEY_DIM, dropout=0.1)
            self.rotor_attention = layers.MultiHeadAttention(num_heads=ATTENTION_HEADS, key_dim=ATTENTION_KEY_DIM, dropout=0.1)
            self.stator_attention = layers.MultiHeadAttention(num_heads=ATTENTION_HEADS, key_dim=ATTENTION_KEY_DIM, dropout=0.1)
            self.common_key_projection = layers.Dense(COMPONENT_LATENT_DIM, activation='linear')
            self.common_value_projection = layers.Dense(COMPONENT_LATENT_DIM, activation='linear')
            self.common_physics_projection = layers.Dense(17, activation='linear')
            self.bearing_decoder = tf.keras.Sequential([
                layers.Dense(BEARING_DECODER_DIMS[1], activation='relu'),
                layers.Dense(BEARING_DECODER_DIMS[2], activation='linear')])
            self.eccentricity_decoder = tf.keras.Sequential([layers.Dense(ECC_DECODER_DIMS[1], activation='linear')])
            self.rotor_decoder = tf.keras.Sequential([
                layers.Dense(ROTOR_DECODER_DIMS[1], activation='relu'),
                layers.Dense(ROTOR_DECODER_DIMS[2], activation='linear')])
            self.stator_decoder = tf.keras.Sequential([
                layers.Dense(STATOR_DECODER_DIMS[0], activation='relu'),
                layers.Dropout(0.2),
                layers.Dense(STATOR_DECODER_DIMS[1], activation='linear')])

        def call(self, inputs, training=False, return_attention=False):
            common_features = inputs[:, :17]
            shared_latent = self.shared_encoder(inputs, training=training)
            common_features_expanded = tf.expand_dims(common_features, -1)
            common_keys = self.common_key_projection(tf.broadcast_to(common_features_expanded, [tf.shape(common_features)[0], 17, 1]))
            common_values = self.common_value_projection(tf.broadcast_to(common_features_expanded, [tf.shape(common_features)[0], 17, 1]))
            position_encoding = tf.cast(tf.range(17), tf.float32) / 17.0
            position_encoding = tf.expand_dims(tf.expand_dims(position_encoding, 0), -1)
            common_keys = common_keys + tf.broadcast_to(position_encoding, tf.shape(common_keys))
            common_values = common_values + tf.broadcast_to(position_encoding, tf.shape(common_values))
            attention_weights = {}
            predictions = []
            components = [
                ('bearing', self.bearing_encoder, self.bearing_attention, self.bearing_decoder),
                ('eccentricity', self.eccentricity_encoder, self.eccentricity_attention, self.eccentricity_decoder),
                ('rotor', self.rotor_encoder, self.rotor_attention, self.rotor_decoder),
                ('stator', self.stator_encoder, self.stator_attention, self.stator_decoder)
            ]
            for component_name, encoder, attention, decoder in components:
                component_latent = encoder(shared_latent)
                component_query = tf.expand_dims(component_latent, 1)
                if return_attention:
                    attended_features, attention_scores = attention(query=component_query, key=common_keys, value=common_values, return_attention_scores=True, training=training)
                    attention_weights[component_name] = tf.reduce_mean(tf.squeeze(attention_scores, axis=2), axis=1)
                else:
                    attended_features = attention(query=component_query, key=common_keys, value=common_values, training=training)
                attended_features = tf.squeeze(attended_features, 1)
                combined_features = component_latent + 0.5 * attended_features
                output = decoder(combined_features, training=training if component_name == 'stator' else False)
                predictions.append(output)
            if return_attention:
                return predictions, attention_weights
            return predictions
        
        def extract_component_latents(self, inputs, training=False):
            shared_latent = self.shared_encoder(inputs, training=training)
            component_latents = {
                'bearing': self.bearing_encoder(shared_latent),
                'eccentricity': self.eccentricity_encoder(shared_latent),
                'rotor': self.rotor_encoder(shared_latent),
                'stator': self.stator_encoder(shared_latent)
            }
            return shared_latent, component_latents

    return MultiHeadAttentionAutoencoder()

def run_autoencoder_inference(input_values: List[float], data_id: str, request_id: str, features: bool = False):
    """Выполняет инференс автоэнкодера для одного сэмпла"""
    tf.random.set_seed(42)
    np.random.seed(42)
    
    if not isinstance(input_values, list) or len(input_values) != 119:
        raise ValueError("Input should be a list of 119 floats")
    
    x = np.array(input_values, dtype=np.float32).reshape(1, -1)
    model, stats, fixed_thresholds = _load_model_and_stats()

    normalized_x = (x - stats["mean"]) / stats["std"]
    normalized_x_tf = tf.convert_to_tensor(normalized_x.astype(np.float32))

    components = ['bearing', 'eccentricity', 'rotor', 'stator']
    feature_ranges = [(17, 47), (47, 76), (76, 91), (91, 119)]
    common_feature_names = [
        'rms_A', 'mean_A', 'std_A', 'rms_B', 'mean_B', 'std_B',
        'rms_C', 'mean_C', 'std_C', 'total_imb', 'rms_imb',
        'imb_ab', 'imb_bc', 'imb_ca', 'park_ell', 'park_mean', 'park_std'
    ]

    bn_states = {}
    
    def save_bn_states(model, prefix=""):
        for i, layer in enumerate(model.layers):
            layer_name = f"{prefix}layer_{i}"
            if isinstance(layer, tf.keras.layers.BatchNormalization):
                bn_states[layer_name] = {
                    'moving_mean': layer.moving_mean.numpy().copy(),
                    'moving_variance': layer.moving_variance.numpy().copy()
                }
            elif hasattr(layer, 'layers'):
                save_bn_states(layer, f"{layer_name}_")
    
    def restore_bn_states(model, prefix=""):
        for i, layer in enumerate(model.layers):
            layer_name = f"{prefix}layer_{i}"
            if isinstance(layer, tf.keras.layers.BatchNormalization) and layer_name in bn_states:
                layer.moving_mean.assign(bn_states[layer_name]['moving_mean'])
                layer.moving_variance.assign(bn_states[layer_name]['moving_variance'])
            elif hasattr(layer, 'layers'):
                restore_bn_states(layer, f"{layer_name}_")

    save_bn_states(model)

    baseline_pred, baseline_att = model(normalized_x_tf, training=False, return_attention=True)
    
    features_out = None
    if features:
        shared_latent, component_latents = model.extract_component_latents(normalized_x_tf)
        features_out = {
            'shared_latent': shared_latent.numpy().tolist(),
            'component_latents': {k: v.numpy().tolist() for k, v in component_latents.items()},
            'attention_weights': {k: v[0].numpy().tolist() for k, v in baseline_att.items()}
        }
    
    baseline_pred_np = [p.numpy() for p in baseline_pred]
    baseline_att_np = {k: v.numpy() for k, v in baseline_att.items()}

    n_monte_carlo = 5
    mc_predictions, mc_attention_weights = [], []
    
    for mc_run in range(n_monte_carlo):
        restore_bn_states(model)
        preds, att = model(normalized_x_tf, training=True, return_attention=True)
        mc_predictions.append([p.numpy() for p in preds])
        mc_attention_weights.append({k: v.numpy() for k, v in att.items()})
    
    restore_bn_states(model)

    overall_errors, component_anomalies, component_confidences = [], [], []
    result_obj = {}

    for i, (comp, (start, end)) in enumerate(zip(components, feature_ranges)):
        true_val = normalized_x[0, start:end]
        base_pred = baseline_pred_np[i][0]
        base_err = float(np.mean((true_val - base_pred) ** 2))
        threshold = fixed_thresholds[comp]['threshold']
        is_anomaly = bool(base_err > threshold)
        
        if is_anomaly:
            confidence = max(0.1, 1.0 - (base_err - threshold) / threshold)
        else:
            confidence = min(0.9, (threshold - base_err) / threshold)
            
        mc_pred = np.array([mc_run[i][0] for mc_run in mc_predictions])
        mc_errors = [float(np.mean((true_val - pred) ** 2)) for pred in mc_pred]
        prediction_uncertainty = float(np.std(mc_errors))
        uncertainty_confidence = 1.0 / (1.0 + prediction_uncertainty * 20)
        composite_confidence = 0.7 * confidence + 0.3 * uncertainty_confidence
        
        mc_att = np.array([mc_att_run[comp][0] for mc_att_run in mc_attention_weights])
        mean_att = np.mean(mc_att, axis=0)
        att_stability = float(1.0 - np.mean(np.std(mc_att, axis=0)))
        att_entropy = float(-np.sum(mean_att * np.log(mean_att + 1e-8)))
        max_ent = np.log(len(mean_att))
        att_focus = float(1.0 - (att_entropy / max_ent))
        top_ids = np.argsort(mean_att)[-3:][::-1]
        top_feat = ", ".join([f"{common_feature_names[idx]}({mean_att[idx]:.3f})" for idx in top_ids])
        anomaly_severity = float(base_err / threshold) if is_anomaly else 0.0
        
        ad = AttentionDetails(
            reconstruction_error=round(base_err, 6),
            is_anomaly=is_anomaly,
            confidence_score=round(composite_confidence, 4),
            prediction_uncertainty=round(prediction_uncertainty, 6),
            attention_stability=round(att_stability, 4),
            attention_focus=round(att_focus, 4),
            top3_features=top_feat,
            anomaly_severity=round(anomaly_severity, 2)
        )
        result_obj[comp] = ad
        overall_errors.append(base_err)
        component_anomalies.append(is_anomaly)
        component_confidences.append(composite_confidence)

    weights = [1.2, 1.0, 1.1, 1.3]
    err = sum(e * w for e, w in zip(overall_errors, weights)) / sum(weights)
    conf = sum(c * w for c, w in zip(component_confidences, weights)) / sum(weights)
    anomaly_count = sum(1 for a in component_anomalies if a)
    crit_anom = component_anomalies[0] or component_anomalies[3]
    
    if anomaly_count == 0:
        system_health = "Healthy"
    elif anomaly_count == 1 and not crit_anom:
        system_health = "Monitor"
    elif anomaly_count <= 2:
        system_health = "Anomalous"
    else:
        system_health = "Critical"
        
    is_sys_anom = system_health in ["Anomalous", "Critical"]

    overall_data = dict(
        system_is_anomaly=is_sys_anom,
        system_health_status=system_health,
        overall_reconstruction_error=round(err, 6),
        overall_confidence_score=round(conf, 4),
        anomaly_count=anomaly_count,
        most_uncertain_component=components[int(np.argmin(component_confidences))],
        highest_error_component=components[int(np.argmax(overall_errors))]
    )

    # TODO: Отрефаторить - выделение модели в отдельный модуль, 
    # всю логику с реквестами перенести в сервис
    return AutoencoderInferenceOutput(
        request_id=request_id,
        data_id=data_id,
        overall=overall_data,
        bearing=result_obj["bearing"],
        eccentricity=result_obj["eccentricity"],
        rotor=result_obj["rotor"],
        stator=result_obj["stator"],
        thresholds=fixed_thresholds,
        autoencoder_features=features_out,
    )
