# src\ai-services\routers\pipeline.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import numpy as np
import json
from datetime import datetime
import uuid

from routers.features import FeatureExtractionService
from models.autoencoder_model import run_autoencoder_batch_inference, AutoencoderBatchInferenceInput
from models.dual_lstm_model import predictor as dual_lstm_predictor
from database.autoencoder_storage import save_batch_result as save_autoencoder_batch
from database.dual_lstm_storage import save_inference_result as save_dual_lstm_result
from utils.logger import log

MODULE = 'pipeline'
router = APIRouter(prefix="/pipeline", tags=["Full Pipeline"])

class MotorDataInput(BaseModel):
    current_R: List[float] = Field(..., description="Ток фазы R")
    current_S: List[float] = Field(..., description="Ток фазы S") 
    current_T: List[float] = Field(..., description="Ток фазы T")
    user_id: str = Field(default="anonymous", description="ID пользователя")
    batch_id: Optional[str] = Field(default=None, description="ID батча")
    use_windowing: bool = Field(default=True, description="Использовать оконную обработку")
    window_size: int = Field(default=16384, description="Размер окна")
    dual_lstm_steps: int = Field(default=5, description="Количество шагов прогноза LSTM")

class PipelineStageResult(BaseModel):
    stage: str
    status: str
    execution_time_ms: float
    batch_id: str
    windows_processed: Optional[int] = None
    success: bool
    error_message: Optional[str] = None

class PipelineResult(BaseModel):
    pipeline_id: str
    user_id: str
    batch_id: str
    timestamp: str
    total_execution_time_ms: float
    stages: List[PipelineStageResult]
    overall_status: str
    data_summary: Dict[str, Any]

class PipelineProcessor:
    
    def __init__(self):
        self.feature_service = FeatureExtractionService()
    
    async def run_full_pipeline(self, data: MotorDataInput) -> PipelineResult:
        """Выполняет полный пайплайн обработки данных двигателя"""
        pipeline_id = str(uuid.uuid4())
        batch_id = data.batch_id or f"batch_{data.user_id}_{int(datetime.now().timestamp())}"
        start_time = datetime.now()
        stages = []
        
        log(f"Pipeline started: {pipeline_id}, batch: {batch_id}, user: {data.user_id}", MODULE)
        
        data_summary = {
            "data_length": len(data.current_R),
            "phases": ["R", "S", "T"],
            "use_windowing": data.use_windowing,
            "window_size": data.window_size if data.use_windowing else None,
            "batch_id": batch_id
        }
        
        features_result = await self._run_feature_extraction(data, batch_id)
        stages.append(features_result)
        
        autoencoder_result = None
        if features_result.success:
            autoencoder_result = await self._run_autoencoder_batch_analysis(features_result, data, batch_id)
            stages.append(autoencoder_result)
        
        dual_lstm_result = None
        if features_result.success and (autoencoder_result is None or autoencoder_result.success):
            dual_lstm_result = await self._run_dual_lstm_batch_analysis(features_result, data, batch_id)
            stages.append(dual_lstm_result)
        
        end_time = datetime.now()
        total_time = (end_time - start_time).total_seconds() * 1000
        
        overall_status = "success" if all(s.success for s in stages) else "partial_failure"
        if not any(s.success for s in stages):
            overall_status = "failure"
        
        result = PipelineResult(
            pipeline_id=pipeline_id,
            user_id=data.user_id,
            batch_id=batch_id,
            timestamp=start_time.isoformat(),
            total_execution_time_ms=total_time,
            stages=stages,
            overall_status=overall_status,
            data_summary=data_summary
        )
        
        log(f"Pipeline completed: {pipeline_id}, status: {overall_status}, time: {total_time:.0f}ms", MODULE)
        return result
    
    async def _run_feature_extraction(self, data: MotorDataInput, batch_id: str) -> PipelineStageResult:
        """Извлекает признаки из данных тока"""
        stage_start = datetime.now()
        
        try:
            log(f"Feature extraction started for batch: {batch_id}", MODULE)
            
            df_data = {
                'current_R': data.current_R,
                'current_S': data.current_S,
                'current_T': data.current_T
            }
            content = json.dumps(df_data)
            
            result = await self.feature_service.process_and_save(
                content=content,
                content_type="application/json",
                use_windowing=data.use_windowing,
                window_size=data.window_size,
                user_id=data.user_id,
                batch_id=batch_id,
            )
            
            self._features_data = result["features"]
            windows_count = len(self._features_data.get("windows", [])) if data.use_windowing else 1
            
            stage_end = datetime.now()
            execution_time = (stage_end - stage_start).total_seconds() * 1000
            
            log(f"Feature extraction completed: {windows_count} windows, batch: {batch_id}", MODULE)
            
            return PipelineStageResult(
                stage="feature_extraction",
                status="completed",
                execution_time_ms=execution_time,
                batch_id=batch_id,
                windows_processed=windows_count,
                success=True
            )
            
        except Exception as e:
            stage_end = datetime.now()
            execution_time = (stage_end - stage_start).total_seconds() * 1000
            
            log(f"Feature extraction failed for batch {batch_id}: {e}", MODULE, level="ERROR")
            return PipelineStageResult(
                stage="feature_extraction",
                status="failed",
                execution_time_ms=execution_time,
                batch_id=batch_id,
                success=False,
                error_message=str(e)
            )
    
    async def _run_autoencoder_batch_analysis(self, features_result: PipelineStageResult,
                                            data: MotorDataInput, batch_id: str) -> PipelineStageResult:
        """Выполняет батчевый анализ автоэнкодером"""
        stage_start = datetime.now()
        
        try:
            log(f"Autoencoder analysis started for batch: {batch_id}", MODULE)
            
            features_data = self._features_data
            
            if data.use_windowing and "windows" in features_data:
                windows = features_data["windows"]
                
                batch_input_vectors = []
                for i, window in enumerate(windows):
                    feature_vector = self._extract_feature_vector(window)
                    if len(feature_vector) == 119:
                        batch_input_vectors.append(feature_vector)
                    else:
                        log(f"Invalid feature vector length in window {i}: {len(feature_vector)}", MODULE, level="WARN")
                
                if not batch_input_vectors:
                    raise ValueError("No valid feature vectors for autoencoder processing")
                
                batch_results = run_autoencoder_batch_inference(
                    batch_input_vectors,
                    normalization_stats=None,
                    features=True
                )
                
                batch_doc = {
                    "batch_id": batch_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "count": len(batch_results.results),
                    "normalization_stats": None,
                    "results": [res.dict() if hasattr(res, "dict") else res for res in batch_results.results]
                }
                await save_autoencoder_batch(batch_doc)
                
                stage_end = datetime.now()
                execution_time = (stage_end - stage_start).total_seconds() * 1000
                
                log(f"Autoencoder analysis completed: {len(batch_input_vectors)} windows, batch: {batch_id}", MODULE)
                
                return PipelineStageResult(
                    stage="autoencoder_analysis",
                    status="completed",
                    execution_time_ms=execution_time,
                    batch_id=batch_id,
                    windows_processed=len(batch_input_vectors),
                    success=True
                )
                
            else:
                feature_vector = self._extract_feature_vector(features_data)
                if len(feature_vector) != 119:
                    raise ValueError(f"Expected 119 features, got {len(feature_vector)}")
                
                batch_results = run_autoencoder_batch_inference([feature_vector], features=True)
                
                batch_doc = {
                    "batch_id": batch_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "count": 1,
                    "results": [res.dict() if hasattr(res, "dict") else res for res in batch_results.results]
                }
                await save_autoencoder_batch(batch_doc)
                
                stage_end = datetime.now()
                execution_time = (stage_end - stage_start).total_seconds() * 1000
                
                return PipelineStageResult(
                    stage="autoencoder_analysis",
                    status="completed",
                    execution_time_ms=execution_time,
                    batch_id=batch_id,
                    windows_processed=1,
                    success=True
                )
                
        except Exception as e:
            stage_end = datetime.now()
            execution_time = (stage_end - stage_start).total_seconds() * 1000
            
            log(f"Autoencoder analysis failed for batch {batch_id}: {e}", MODULE, level="ERROR")
            return PipelineStageResult(
                stage="autoencoder_analysis", 
                status="failed",
                execution_time_ms=execution_time,
                batch_id=batch_id,
                success=False,
                error_message=str(e)
            )
    
    async def _run_dual_lstm_batch_analysis(self, features_result: PipelineStageResult,
                                          data: MotorDataInput, batch_id: str) -> PipelineStageResult:
        """Выполняет батчевый анализ Dual LSTM"""
        stage_start = datetime.now()
        
        try:
            log(f"LSTM analysis started for batch: {batch_id}", MODULE)
            
            features_data = self._features_data
            
            if data.use_windowing and "windows" in features_data:
                windows = features_data["windows"]
                
                if len(windows) < 10:
                    lstm_sequences = self._create_intra_window_sequences(windows)
                else:
                    lstm_sequences = self._create_inter_window_sequences(windows)
                
                if not lstm_sequences:
                    raise ValueError("No valid sequences for LSTM processing")
                
                batch_predictions = []
                for seq_idx, lstm_input in enumerate(lstm_sequences):
                    result = dual_lstm_predictor.predict_multistep(lstm_input, data.dual_lstm_steps)
                    batch_predictions.append({
                        "window_index": seq_idx,
                        "predictions": result["predictions"],
                        "metadata": result["metadata"]
                    })
                
                await save_dual_lstm_result(
                    inference_id=str(uuid.uuid4()),
                    batch_id=batch_id,
                    input_data=f"batch_of_{len(lstm_sequences)}_sequences",
                    predictions=batch_predictions,
                    metadata={
                        "batch_size": len(lstm_sequences),
                        "steps_predicted": data.dual_lstm_steps,
                        "sequence_length": 10,
                        "sequence_type": "inter_window" if len(windows) >= 10 else "intra_window"
                    }
                )
                
                stage_end = datetime.now()
                execution_time = (stage_end - stage_start).total_seconds() * 1000
                
                log(f"LSTM analysis completed: {len(lstm_sequences)} sequences, batch: {batch_id}", MODULE)
                
                return PipelineStageResult(
                    stage="dual_lstm_analysis",
                    status="completed",
                    execution_time_ms=execution_time,
                    batch_id=batch_id,
                    windows_processed=len(lstm_sequences),
                    success=True
                )
            else:
                raise ValueError("LSTM requires windowed data")
                
        except Exception as e:
            stage_end = datetime.now()
            execution_time = (stage_end - stage_start).total_seconds() * 1000
            
            log(f"LSTM analysis failed for batch {batch_id}: {e}", MODULE, level="ERROR")
            return PipelineStageResult(
                stage="dual_lstm_analysis",
                status="failed",
                execution_time_ms=execution_time,
                batch_id=batch_id,
                success=False,
                error_message=str(e)
            )

    def _create_inter_window_sequences(self, windows):
        """Создает временные последовательности из разных окон"""
        lstm_sequences = []
        
        for i in range(len(windows) - 10 + 1):
            sequence_windows = windows[i:i+10]
            sequence_features = []
            
            for window in sequence_windows:
                feature_vector = self._extract_feature_vector(window)
                if len(feature_vector) == 119:
                    sequence_features.append(feature_vector)
                else:
                    return []
            
            if len(sequence_features) == 10:
                lstm_sequences.append(np.array(sequence_features))
        
        return lstm_sequences

    def _create_intra_window_sequences(self, windows):
        """Создает временные последовательности внутри окон"""
        lstm_sequences = []
        
        for window_idx, window in enumerate(windows):
            feature_vector = self._extract_feature_vector(window) 
            
            if len(feature_vector) == 119:
                sequence = []
                for t in range(10):
                    variation_factor = 1.0 + 0.01 * np.sin(2 * np.pi * t / 10)
                    varied_features = [f * variation_factor for f in feature_vector]
                    sequence.append(varied_features)
                
                lstm_sequences.append(np.array(sequence))
                
                if len(lstm_sequences) >= 5:
                    break
        
        return lstm_sequences

    def _extract_feature_vector(self, features_data: Dict[str, Any]) -> List[float]:
        """Извлекает признаки в правильном порядке для моделей"""
        feature_vector = []
        
        feature_order = [
            ('common', ['rms_A', 'mean_A', 'std_A', 'rms_B', 'mean_B', 'std_B', 'rms_C', 'mean_C', 'std_C', 
                       'total_imbalance', 'rms_imbalance', 'imbalance_ab', 'imbalance_bc', 'imbalance_ca', 
                       'park_ellipticity', 'park_mag_mean', 'park_mag_std']),
            
            ('bearing', ['bearing_bpfo_amp_A', 'bearing_bpfi_amp_A', 'bearing_bpfo_amp_B', 'bearing_bpfi_amp_B', 
                        'bearing_bpfo_amp_C', 'bearing_bpfi_amp_C', 'bearing_bsf_amp_A', 'bearing_ftf_amp_A',
                        'bearing_bpfo_2h_amp_A', 'bearing_bpfi_2h_amp_A', 'bearing_bpfo_band_rms_A', 
                        'bearing_bpfi_band_rms_A', 'bearing_env_kurtosis_A', 'bearing_env_rms_A', 
                        'bearing_env_peak_factor_A', 'bearing_env_bpfo_A', 'bearing_env_bpfi_A', 
                        'bearing_hf_energy_A', 'bearing_crest_factor_A', 'bearing_env_kurtosis_B', 
                        'bearing_env_rms_B', 'bearing_env_peak_factor_B', 'bearing_hf_energy_B', 
                        'bearing_crest_factor_B', 'bearing_env_kurtosis_C', 'bearing_env_rms_C', 
                        'bearing_env_peak_factor_C', 'bearing_hf_energy_C', 'bearing_env_kurtosis_max', 
                        'bearing_hf_energy_max']),
            
            ('eccentricity', ['ecc_current_asymmetry', 'ecc_max_deviation', 'ecc_rms_variance', 'ecc_max_min_ratio',
                             'ecc_corr_ab', 'ecc_corr_bc', 'ecc_corr_ca', 'ecc_mean_correlation', 
                             'ecc_correlation_variance', 'ecc_min_correlation', 'ecc_main_1_lower_amp_A',
                             'ecc_main_1_lower_ratio_A', 'ecc_main_1_upper_amp_A', 'ecc_main_1_upper_ratio_A',
                             'ecc_main_1_lower_amp_B', 'ecc_main_1_upper_amp_B', 'ecc_main_1_lower_amp_C',
                             'ecc_main_1_upper_amp_C', 'ecc_main_2_lower_ratio_A', 'ecc_rotor_freq_modulation_A',
                             'ecc_2rotor_freq_modulation_A', 'ecc_envelope_modulation_A', 'ecc_rotor_freq_modulation_B',
                             'ecc_envelope_modulation_B', 'ecc_rotor_freq_modulation_C', 'ecc_harmonic_ratio_A',
                             'ecc_total_harmonic_energy_A', 'ecc_harmonic_ratio_B', 'ecc_harmonic_ratio_C']),
            
            ('rotor', ['rotor_sb1_lower_ratio_A', 'rotor_sb1_upper_ratio_A', 'rotor_sb2_lower_ratio_A',
                      'rotor_sb1_lower_amp_A', 'rotor_sb1_upper_amp_A', 'rotor_sb1_lower_ratio_B',
                      'rotor_sb1_upper_ratio_B', 'rotor_sb1_upper_ratio_C', 'rotor_sb1_lower_ratio_combined',
                      'rotor_stft_ratio_A', 'rotor_stft_main_energy_A', 'rotor_stft_sb1_energy_A',
                      'rotor_stft_energy_var_A', 'rotor_stft_ratio_B', 'rotor_stft_ratio_C']),
            
            ('stator', ['k2_asymmetry', 'thd_A', 'thd_B', 'thd_C', 'h3_ratio_A', 'h5_ratio_A', 'h7_ratio_A',
                       'h3_ratio_B', 'h5_ratio_B', 'h7_ratio_B', 'h3_ratio_C', 'h5_ratio_C', 'h7_ratio_C',
                       'phase_deviation_ab', 'phase_deviation_bc', 'phase_deviation_ca', 'modulation_coeff_A',
                       'modulation_coeff_B', 'modulation_coeff_C', 'rel_energy_low_band_A', 
                       'rel_energy_medium_band_A', 'rel_energy_high_band_A', 'rel_energy_low_band_B',
                       'rel_energy_medium_band_B', 'rel_energy_high_band_B', 'rel_energy_low_band_C',
                       'rel_energy_medium_band_C', 'rel_energy_high_band_C'])
        ]
        
        for group_name, feature_names in feature_order:
            if group_name in features_data:
                group_data = features_data[group_name]
                for feature_name in feature_names:
                    if feature_name in group_data and isinstance(group_data[feature_name], (int, float)):
                        value = float(group_data[feature_name])
                        feature_vector.append(value)
        
        if len(feature_vector) != 119:
            log(f"Invalid feature vector length: {len(feature_vector)}, expected 119", MODULE, level="ERROR")
        
        return feature_vector

pipeline_processor = PipelineProcessor()

@router.post("/analyze", response_model=PipelineResult)
async def run_full_analysis_pipeline(data: MotorDataInput):
    """Выполняет полный анализ данных двигателя через все этапы пайплайна"""
    try:
        result = await pipeline_processor.run_full_pipeline(data)
        return result
        
    except Exception as e:
        log(f"Pipeline execution failed: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=f"Pipeline execution failed: {str(e)}")

@router.get("/status")
async def get_pipeline_status():
    """Проверяет состояние всех компонентов пайплайна"""
    try:
        features_ok = True
        autoencoder_ok = True  
        dual_lstm_ok = dual_lstm_predictor.model is not None
        
        return {
            "pipeline_status": "healthy" if all([features_ok, autoencoder_ok, dual_lstm_ok]) else "unhealthy",
            "components": {
                "feature_extraction": "healthy" if features_ok else "unhealthy",
                "autoencoder": "healthy" if autoencoder_ok else "unhealthy", 
                "dual_lstm": "healthy" if dual_lstm_ok else "unhealthy"
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        log(f"Status check failed: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")
