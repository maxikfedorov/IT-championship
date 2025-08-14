# src\ai-services\routers\autoencoder.py

"""
FastAPI роуты автокодировщика:
- /predict — 1 сэмпл, аналитика и признаки
- /batch_predict — список сэмплов, групповая аналитика
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException
from models.autoencoder_model import (
    AutoencoderBatchInferenceInput,
    AutoencoderBatchInferenceOutput,
    AutoencoderInferenceInput,
    AutoencoderInferenceOutput,
    run_autoencoder_batch_inference,
    run_autoencoder_inference
)
from uuid import uuid4
from database.autoencoder_storage import save_one_result, save_batch_result
from utils.logger import log

router = APIRouter(prefix="/autoencoder", tags=["autoencoder"])

MODULE = "autoencoder_router"

@router.post("/predict", response_model=AutoencoderInferenceOutput)
async def autoencoder_predict(request: AutoencoderInferenceInput):
    """
    Инференс автокодировщика по одному сэмплу.

    Параметры:
        input: 119 признаков (List[float])
        data_id: (Optional) ID сэмпла
        features: (Optional) True — добавить внутренние признаки модели

    Возвращает:
        Классификация, метрики ошибки, детализация по компонентам,
        а при features=True — latents и attention
    """
    
    log("Получен запрос на инференс", MODULE)
    try:
        request_id = str(uuid4())
        sample_id = request.data_id or str(uuid4())
        log(f"Обработка sample_id={sample_id}, request_id={request_id}", MODULE)
        result = run_autoencoder_inference(
            request.input,
            sample_id,
            request_id,
            features=request.features
        )
        await save_one_result(result.dict() if hasattr(result, "dict") else result)
        log(f"Инференс успешно завершён для sample_id={sample_id}", MODULE)
        return result
    except Exception as e:
        log(f"Ошибка инференса: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail="Autoencoder inference failed")


@router.post("/batch_predict", response_model=AutoencoderBatchInferenceOutput)
async def autoencoder_batch_predict(request: AutoencoderBatchInferenceInput):
    log(f"Batch запрос на инференс, размер: {len(request.input)}", MODULE)
    try:
        results = run_autoencoder_batch_inference(
            request.input,
            normalization_stats=getattr(request, "normalization_stats", None),
            features=request.features
        )
        batch_doc = {
            "batch_id": request.batch_id,
            "timestamp": datetime.utcnow().isoformat(),
            "count": len(results.results),
            "normalization_stats": getattr(request, "normalization_stats", None),
            "results": [res.dict() if hasattr(res, "dict") else res for res in results.results]
        }
        await save_batch_result(batch_doc)
        log("Batch инференс успешно сохранён", MODULE)
        return results
    except Exception as e:
        log(f"Ошибка batch-инференса: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail="Autoencoder batch inference failed")


@router.get("/batch/{batch_id}/results")
async def get_batch_results_endpoint(batch_id: str):
    try:
        from database.autoencoder_storage import get_batch_result
        result = await get_batch_result(batch_id)
        if not result:
            raise HTTPException(status_code=404, detail="Batch results not found")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

