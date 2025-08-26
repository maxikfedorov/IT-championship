from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import numpy as np
from models.dual_lstm_model import predictor
from database.dual_lstm_storage import get_batch_results, get_inference_result, save_inference_result
import uuid

router = APIRouter(prefix="/dual-lstm", tags=["Dual LSTM"])


class PredictionRequest(BaseModel):
    data: List[List[float]] = Field(..., description="Input sequence data (10 x 119 features)")
    n_steps: int = Field(default=5, ge=1, le=50, description="Number of prediction steps")
    batch_id: str = Field(..., description="Unique ID for the input batch")

    class Config:
        schema_extra = {
            "example": {
                "data": [[0.1, 0.2, 0.3] + [0.0] * 116] * 10,  
                "n_steps": 5,
                "batch_id": "batch_123456"
            }
        }


class PredictionResponse(BaseModel):
    predictions: Dict[str, Any]
    inference_id: str
    batch_id: str
    status: str


def validate_input_data(data: List[List[float]]) -> np.ndarray:
    """Валидация входных данных"""
    try:
        data_array = np.array(data)
        
        if data_array.shape != (10, 119):
            raise ValueError(f"Expected shape (10, 119), got {data_array.shape}")
        
        if np.any(np.isnan(data_array)) or np.any(np.isinf(data_array)):
            raise ValueError("Data contains NaN or infinite values")
        
        return data_array
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input data: {str(e)}")


@router.post("/predict", response_model=PredictionResponse)
async def predict_multistep(request: PredictionRequest):
    """
    Многошаговое прогнозирование с помощью Dual LSTM модели
    """
    try:
        
        input_data = validate_input_data(request.data)
        
        
        result = predictor.predict_multistep(input_data, request.n_steps)
        
        
        inference_id = str(uuid.uuid4())
        
        
        await save_inference_result(
            inference_id=inference_id,
            batch_id=request.batch_id,
            input_data=request.data,
            predictions=result["predictions"],
            metadata=result["metadata"]
        )
        
        return PredictionResponse(
            predictions=result["predictions"],
            inference_id=inference_id,
            batch_id=request.batch_id,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Проверка состояния модели"""
    try:
        if predictor.model is None:
            predictor.load_model()
        
        return {
            "status": "healthy",
            "model_loaded": predictor.model is not None,
            "scaler_loaded": predictor.scaler is not None,
            "parameters": int(predictor.model.count_params()) if predictor.model else 0
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@router.post("/reload")
async def reload_model():
    """Перезагрузка модели из S3"""
    try:
        predictor.load_model()
        return {
            "status": "reloaded",
            "parameters": int(predictor.model.count_params()),
            "message": "Model successfully reloaded from S3"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reload failed: {str(e)}")


@router.get("/results/{inference_id}")
async def get_result(inference_id: str):
    """Получение результата по ID"""
    result = await get_inference_result(inference_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/batch/{batch_id}/results")
async def get_batch_results_endpoint(batch_id: str):
    """Получение всех результатов для батча"""
    results = await get_batch_results(batch_id)
    return {"batch_id": batch_id, "results": results, "count": len(results)}
