from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
import numpy as np
from models.hybrid_model import predictor
from database.hybrid_storage import get_hybrid_batch_results, get_hybrid_inference_result, save_hybrid_inference_result
import uuid

router = APIRouter(prefix="/hybrid-lstm", tags=["Hybrid LSTM"])


class HybridPredictionRequest(BaseModel):
    data: List[List[float]] = Field(..., description="Input sequence data (10 x 187 features)")
    n_steps: int = Field(default=5, ge=1, le=50, description="Number of prediction steps")
    batch_id: str = Field(..., description="Unique ID for the input batch")

    class Config:
        schema_extra = {
            "example": {
                "data": [[0.1, 0.2, 0.3] + [0.0] * 184] * 10,
                "n_steps": 5,
                "batch_id": "hybrid_batch_123456"
            }
        }


class HybridPredictionResponse(BaseModel):
    predictions: Dict[str, Any]
    inference_id: str
    batch_id: str
    status: str


def validate_hybrid_input_data(data: List[List[float]]) -> np.ndarray:
    try:
        data_array = np.array(data)
        
        if data_array.shape != (10, 187):
            raise ValueError(f"Expected shape (10, 187), got {data_array.shape}")
        
        if np.any(np.isnan(data_array)) or np.any(np.isinf(data_array)):
            raise ValueError("Data contains NaN or infinite values")
        
        return data_array
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid input data: {str(e)}")


@router.post("/predict", response_model=HybridPredictionResponse)
async def predict_hybrid_multistep(request: HybridPredictionRequest):
    try:
        input_data = validate_hybrid_input_data(request.data)
        result = predictor.predict_multistep(input_data, request.n_steps)
        inference_id = str(uuid.uuid4())
        
        await save_hybrid_inference_result(
            inference_id=inference_id,
            batch_id=request.batch_id,
            input_data=request.data,
            predictions=result["predictions"],
            metadata=result["metadata"]
        )
        
        return HybridPredictionResponse(
            predictions=result["predictions"],
            inference_id=inference_id,
            batch_id=request.batch_id,
            status="success"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid prediction failed: {str(e)}")


@router.get("/health")
async def hybrid_health_check():
    try:
        if predictor.model is None:
            predictor.load_model()
        
        return {
            "status": "healthy",
            "model_loaded": predictor.model is not None,
            "attention_model_loaded": predictor.attention_model is not None,
            "scalers_loaded": predictor.scaler_enhanced is not None and predictor.scaler_original is not None,
            "parameters": int(predictor.model.count_params()) if predictor.model else 0,
            "energy_features": len(predictor.energy_features) if predictor.energy_features else 0
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@router.post("/reload")
async def reload_hybrid_model():
    try:
        predictor.load_model()
        return {
            "status": "reloaded",
            "parameters": int(predictor.model.count_params()),
            "energy_features": len(predictor.energy_features),
            "message": "Hybrid model successfully reloaded from S3"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hybrid reload failed: {str(e)}")

@router.get("/results/{inference_id}")
async def get_hybrid_result(inference_id: str):
    result = await get_hybrid_inference_result(inference_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result


@router.get("/batch/{batch_id}/results")
async def get_hybrid_batch_results_endpoint(batch_id: str):
    results = await get_hybrid_batch_results(batch_id)
    return {"batch_id": batch_id, "results": results, "count": len(results)}


@router.get("/attention/{inference_id}")
async def get_attention_analysis(inference_id: str):
    from database.hybrid_storage import get_hybrid_attention_analysis
    result = await get_hybrid_attention_analysis(inference_id)
    if not result:
        raise HTTPException(status_code=404, detail="Attention analysis not found")
    return result