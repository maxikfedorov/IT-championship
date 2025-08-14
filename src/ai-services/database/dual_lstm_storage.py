from database.database import get_database
from typing import Dict, Any, List
from datetime import datetime, timedelta
import uuid


async def save_inference_result(
    inference_id: str,
    batch_id: str,
    input_data: List[List[float]],
    predictions: Dict[str, Any],
    metadata: Dict[str, Any]
) -> str:
    """
    Сохранение результата инференса в MongoDB
    """
    db = get_database()
    collection = db.dual_lstm_results
    
    document = {
        "_id": inference_id,
        "batch_id": batch_id,
        "input_data": {
            "values": input_data,
            "shape": [len(input_data), len(input_data[0]) if input_data else 0],
            "timestamp": datetime.utcnow()
        },
        "predictions": predictions,
        "metadata": metadata,
        "created_at": datetime.utcnow(),
        "model_version": "dual_lstm_original_20250806_225816"
    }
    
    result = await collection.insert_one(document)
    return str(result.inserted_id)


async def get_inference_result(inference_id: str) -> Dict[str, Any]:
    """
    Получение результата инференса по ID
    """
    db = get_database()
    collection = db.dual_lstm_results
    
    result = await collection.find_one({"_id": inference_id})
    
    if result:
        result["_id"] = str(result["_id"])
        return result
    
    return None


async def get_batch_results(batch_id: str) -> List[Dict[str, Any]]:
    """
    Получение всех результатов для батча
    """
    db = get_database()
    collection = db.dual_lstm_results
    
    cursor = collection.find({"batch_id": batch_id})
    results = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    
    return results


async def get_recent_inferences(limit: int = 100) -> List[Dict[str, Any]]:
    """
    Получение последних инференсов
    """
    db = get_database()
    collection = db.dual_lstm_results
    
    cursor = collection.find().sort("created_at", -1).limit(limit)
    results = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    
    return results


async def delete_old_results(days: int = 30) -> int:
    """
    Удаление старых результатов
    """
    db = get_database()
    collection = db.dual_lstm_results
    
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    result = await collection.delete_many({
        "created_at": {"$lt": cutoff_date}
    })
    
    return result.deleted_count
