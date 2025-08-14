from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from models.motor_features import MotorDefectFeatures
from database.feature_storage import FeatureStorage

import pandas as pd
import numpy as np
import json
import io
from typing import Dict, Any, Union, Tuple

def parse_input_data(data: Union[str, bytes, dict], content_type: str) -> pd.DataFrame:
    if content_type == "application/json":
        if isinstance(data, dict):
            df = pd.DataFrame(data)
        else:
            json_data = json.loads(data)
            df = pd.DataFrame(json_data)
    elif content_type == "text/csv" or content_type == "application/csv":
        if isinstance(data, bytes):
            data = data.decode('utf-8')
        df = pd.read_csv(io.StringIO(data))
    else:
        raise ValueError(f"Unsupported content type: {content_type}")
    
    return df

def extract_phase_data(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    possible_names = {
        'phase_a': ['current_R', 'current_r', 'R', 'phase_R', 'phase_a', 'A'],
        'phase_b': ['current_S', 'current_s', 'S', 'phase_S', 'phase_b', 'B'], 
        'phase_c': ['current_T', 'current_t', 'T', 'phase_T', 'phase_c', 'C']
    }

    phase_columns = {}
    for phase, candidates in possible_names.items():
        for candidate in candidates:
            if candidate in df.columns:
                phase_columns[phase] = candidate
                break

    if len(phase_columns) != 3:
        raise ValueError(f"Could not find 3-phase current columns. Found: {list(phase_columns.keys())}")
        
    current_a = df[phase_columns['phase_a']].values
    current_b = df[phase_columns['phase_b']].values  
    current_c = df[phase_columns['phase_c']].values
    
    return current_a, current_b, current_c

def format_output(features: Dict[str, Any], output_format: str) -> Union[Dict, str]:
    if output_format == "json":
        return features
    elif output_format == "csv":
        df = pd.DataFrame([features])
        return df.to_csv(index=False)
    else:
        raise ValueError(f"Unsupported output format: {output_format}")

def create_windowed_features(current_a, current_b, current_c, extractor, window_size=16384, overlap_ratio=0.75):
    step_size = int(window_size * (1 - overlap_ratio))
    all_features = []
    
    for window_idx, start_idx in enumerate(range(0, len(current_a) - window_size + 1, step_size)):
        end_idx = start_idx + window_size
        
        feature_groups = extractor.extract_all_features(
            current_a[start_idx:end_idx],
            current_b[start_idx:end_idx],
            current_c[start_idx:end_idx]
        )
        
        # ✅ МЕТАДАННЫЕ НА ВЕРХНЕМ УРОВНЕ, НЕ В ГРУППАХ
        window_result = {
            **feature_groups,  # Сами признаки
            'window_metadata': {  # Метаданные отдельно
                'window_index': window_idx,
                'window_start_sample': start_idx,
                'window_end_sample': end_idx
            }
        }
        
        all_features.append(window_result)
    
    return all_features


router = APIRouter(prefix="/features", tags=["Motor Features"])

class FeatureExtractionService:
    def __init__(self):
        self.extractor = MotorDefectFeatures()
        self.storage = FeatureStorage()
    
    async def process_data(self, content, content_type, use_windowing, window_size):
        df = parse_input_data(content, content_type)
        current_a, current_b, current_c = extract_phase_data(df)
        
        if use_windowing:
            features_list = create_windowed_features(current_a, current_b, current_c, self.extractor, window_size)
            return {"windows": features_list, "total_windows": len(features_list)}
        return self.extractor.extract_all_features(current_a, current_b, current_c)
    
    async def process_and_save(self, content, content_type, use_windowing, window_size, user_id: str, batch_id: str = None):
        df = parse_input_data(content, content_type)
        current_a, current_b, current_c = extract_phase_data(df)
        
        if use_windowing:
            features_list = create_windowed_features(current_a, current_b, current_c, self.extractor, window_size)
            result = {"windows": features_list, "total_windows": len(features_list)}
        else:
            result = self.extractor.extract_all_features(current_a, current_b, current_c)
        
        metadata = {
            "use_windowing": use_windowing,
            "window_size": window_size if use_windowing else None,
            "data_length": len(current_a),
            "content_type": content_type
        }
        
        extraction_id = await self.storage.save_features(user_id, result, metadata, batch_id)
        
        return {
            "extraction_id": extraction_id,
            "features": result,
            "metadata": metadata
        }
    
    async def get_saved_features(self, extraction_id: str):
        return await self.storage.get_features(extraction_id)
    
    async def get_user_history(self, user_id: str, limit: int = 10):
        return await self.storage.get_user_extractions(user_id, limit)

@router.post("/extract")
async def extract_features(
    file: UploadFile = File(None),
    raw_data: str = Form(None),
    output_format: str = Form("json"),
    use_windowing: bool = Form(False),
    window_size: int = Form(16384),
    user_id: str = Form("anonymous"),
    save_results: bool = Form(True)
):
    try:
        content, content_type = await _resolve_input(file, raw_data)
        service = FeatureExtractionService()
        
        if save_results:
            result = await service.process_and_save(content, content_type, use_windowing, window_size, user_id)
            response_data = {
                "extraction_id": result["extraction_id"],
                "metadata": result["metadata"],
                "features": result["features"]
            }
            return _format_response(response_data, output_format)
        else:
            features = await service.process_data(content, content_type, use_windowing, window_size)
            return _format_response(features, output_format)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/extract/{extraction_id}")
async def get_saved_features(extraction_id: str, output_format: str = "json"):
    try:
        service = FeatureExtractionService()
        doc = await service.get_saved_features(extraction_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Features not found")
        
        return _format_response(doc["features"], output_format)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/{user_id}")
async def get_user_history(user_id: str, limit: int = 10):
    try:
        service = FeatureExtractionService()
        history = await service.get_user_history(user_id, limit)
        return {"user_id": user_id, "extractions": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _resolve_input(file, raw_data):
    if file:
        return await file.read(), ("application/json" if file.filename.endswith('.json') else "text/csv")
    if raw_data:
        return raw_data, "application/json"
    raise HTTPException(status_code=400, detail="No data provided")

def _format_response(result, output_format):
    formatted_result = format_output(result, output_format)
    return (Response(content=formatted_result, media_type="text/csv", 
                    headers={"Content-Disposition": "attachment; filename=features.csv"})
            if output_format == "csv" else formatted_result)

@router.get("/batch/{batch_id}/results")
async def get_batch_features(batch_id: str):
    try:
        service = FeatureExtractionService()
        doc = await service.storage.get_features_by_batch_id(batch_id)
        
        if not doc:
            raise HTTPException(status_code=404, detail="Batch features not found")
        
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
