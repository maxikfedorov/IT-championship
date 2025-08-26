from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from utils.data_cleaner import safe_json_response  
from datetime import datetime, timezone
from database.batch_storage import batch_storage
from database.feature_storage import FeatureStorage
from database.autoencoder_storage import get_batch_result as get_autoencoder_batch
from database.dual_lstm_storage import get_batch_results as get_lstm_batch
from utils.logger import log

MODULE = 'batches'
router = APIRouter(prefix="/batches", tags=["Batch Management"])

feature_storage = FeatureStorage()

@router.get("/user/{user_id}")
async def get_user_batches(
    user_id: str, 
    limit: int = Query(20, ge=1, le=200, description="Максимальное количество батчей"),  
    offset: int = Query(0, ge=0, description="Смещение для пагинации")
):
    """Получает батчи пользователя с пагинацией"""
    try:
        
        fetch_limit = limit + offset + 50
        
        
        new_batches = await batch_storage.get_user_batches(user_id, fetch_limit)
        
        
        old_batches = await feature_storage.get_user_extractions(user_id, fetch_limit)
        
        
        all_batches = []
        seen_batch_ids = set()
        
        
        for batch in new_batches:
            if batch['_id'] not in seen_batch_ids:
                all_batches.append({
                    "_id": batch['_id'],
                    "user_id": batch['user_id'],
                    "timestamp": batch['timestamp'],
                    "status": batch['status'],
                    "source": "pipeline"
                })
                seen_batch_ids.add(batch['_id'])
        
        
        for extraction in old_batches:
            if extraction.get('batch_id') and extraction['batch_id'] not in seen_batch_ids:
                all_batches.append({
                    "_id": extraction['batch_id'],
                    "user_id": extraction['user_id'],
                    "timestamp": extraction['created_at'].isoformat(),
                    "status": "completed",
                    "source": "streaming"
                })
                seen_batch_ids.add(extraction['batch_id'])
        
        
        all_batches.sort(key=lambda x: x['timestamp'], reverse=True)
        
        
        total_count = len(all_batches)
        paginated_batches = all_batches[offset:offset + limit]
        
        return {
            "user_id": user_id,
            "total": total_count,
            "returned": len(paginated_batches),
            "offset": offset,
            "limit": limit,
            "batches": paginated_batches
        }
        
    except Exception as e:
        log(f"Error getting user batches: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/recent")
async def get_recent_user_batches(
    user_id: str,
    count: int = Query(1, ge=1, description="Количество последних батчей")  
):
    """Получает последние N батчей пользователя"""
    try:
        max_allowed = 200
        actual_count = min(count, max_allowed)
        
        if count > max_allowed:
            log(f"Requested count {count} exceeds maximum {max_allowed}, using {actual_count}", MODULE, level="WARN")
        
        batches_response = await get_user_batches(user_id, limit=actual_count, offset=0)
        
        return {
            "user_id": user_id,
            "requested_count": count,
            "actual_count": len(batches_response.get('batches', [])),
            "max_allowed": max_allowed,
            "batches": batches_response.get('batches', [])
        }
        
    except Exception as e:
        log(f"Error getting recent batches: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/timerange")
async def get_user_batches_by_timerange(
    user_id: str,
    start_date: str = Query(..., description="Начальная дата (ISO 8601)"),
    end_date: str = Query(..., description="Конечная дата (ISO 8601)"),
    limit: int = Query(100, ge=1, le=1000, description="Максимальное количество батчей")  
):
    """Получает батчи пользователя за определенный временной интервал"""
    try:
        
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:MM:SS)"
            )
        
        if start_dt >= end_dt:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before end date"
            )
        
        
        all_batches_response = await get_user_batches(user_id, limit=1000, offset=0)
        all_batches = all_batches_response['batches']
        
        
        filtered_batches = []
        for batch in all_batches:
            try:
                batch_dt = datetime.fromisoformat(batch['timestamp'].replace('Z', '+00:00'))
                if start_dt <= batch_dt <= end_dt:
                    filtered_batches.append(batch)
            except (ValueError, KeyError):
                
                continue
        
        
        limited_batches = filtered_batches[:limit]
        
        return {
            "user_id": user_id,
            "start_date": start_date,
            "end_date": end_date,
            "total_found": len(filtered_batches),
            "returned": len(limited_batches),
            "limit": limit,
            "batches": limited_batches
        }
        
    except HTTPException:
        raise
    except Exception as e:
        log(f"Error getting batches by timerange: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/latest")
async def get_latest_user_batch(user_id: str):
    """Получает последний батч пользователя (deprecated - используйте /recent?count=1)"""
    try:
        recent_response = await get_recent_user_batches(user_id, count=1)
        return recent_response['batches'][0]
        
    except HTTPException:
        raise
    except Exception as e:
        log(f"Error getting latest batch: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{batch_id}/metadata")
async def get_batch_metadata(batch_id: str):
    """Получает метаданные батча (работает для всех типов)"""
    try:
        
        metadata = await batch_storage.get_batch_metadata(batch_id)
        
        if metadata:
            return metadata
        
        
        features = await feature_storage.get_features_by_batch_id(batch_id)
        
        if features:
            return {
                "_id": batch_id,
                "user_id": features['user_id'],
                "timestamp": features['created_at'].isoformat(),
                "status": "completed",
                "source": "reconstructed",
                "data_summary": {
                    "feature_count": features.get('feature_count', 0),
                    "has_windows": "windows" in features.get('features', {})
                }
            }
        
        raise HTTPException(status_code=404, detail="Batch not found")
        
    except HTTPException:
        raise
    except Exception as e:
        log(f"Error getting batch metadata: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{batch_id}/complete")
async def get_complete_batch_results(batch_id: str):
    """Получает все результаты батча (работает для всех типов)"""
    try:
        
        try:
            metadata = await get_batch_metadata(batch_id)
        except HTTPException as e:
            if e.status_code == 404:
                
                metadata = {
                    "_id": batch_id,
                    "status": "unknown",
                    "source": "partial_data"
                }
            else:
                raise
        
        
        results = {
            "batch_id": batch_id,
            "metadata": metadata,
            "features": None,
            "autoencoder": None,
            "dual_lstm": {"count": 0, "results": []}
        }
        
        
        try:
            features = await feature_storage.get_features_by_batch_id(batch_id)
            results["features"] = features
        except Exception as e:
            log(f"Features not found for {batch_id}: {e}", MODULE, level="WARN")
        
        
        try:
            autoencoder_results = await get_autoencoder_batch(batch_id)
            results["autoencoder"] = autoencoder_results
        except Exception as e:
            log(f"Autoencoder not found for {batch_id}: {e}", MODULE, level="WARN")
        
        
        try:
            lstm_results = await get_lstm_batch(batch_id)
            results["dual_lstm"] = {
                "count": len(lstm_results),
                "results": lstm_results
            }
        except Exception as e:
            log(f"LSTM not found for {batch_id}: {e}", MODULE, level="WARN")
        
        
        has_data = any([
            results["features"],
            results["autoencoder"], 
            results["dual_lstm"]["results"]
        ])
        
        if not has_data:
            raise HTTPException(status_code=404, detail="No data found for batch")
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        log(f"Error getting complete batch: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))
