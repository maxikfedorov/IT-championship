from database.database import get_database
from typing import Dict, Any, List
from datetime import datetime


async def save_hybrid_inference_result(
    inference_id: str,
    batch_id: str,
    input_data: List[List[float]],
    predictions: Dict[str, Any],
    metadata: Dict[str, Any]
) -> str:
    db = get_database()
    collection = db.hybrid_lstm_results
    
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
        "model_version": "enhanced_hybrid_20250809_120000",
        "model_type": "hybrid_lstm_attention"
    }
    
    result = await collection.insert_one(document)
    return str(result.inserted_id)


async def get_hybrid_inference_result(inference_id: str) -> Dict[str, Any]:
    db = get_database()
    collection = db.hybrid_lstm_results
    
    result = await collection.find_one({"_id": inference_id})
    
    if result:
        result["_id"] = str(result["_id"])
        return result
    
    return None


async def get_hybrid_batch_results(batch_id: str) -> List[Dict[str, Any]]:
    db = get_database()
    collection = db.hybrid_lstm_results
    
    cursor = collection.find({"batch_id": batch_id})
    results = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    
    return results


async def get_hybrid_recent_inferences(limit: int = 100) -> List[Dict[str, Any]]:
    db = get_database()
    collection = db.hybrid_lstm_results
    
    cursor = collection.find().sort("created_at", -1).limit(limit)
    results = []
    
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        results.append(doc)
    
    return results


async def get_hybrid_attention_analysis(inference_id: str) -> Dict[str, Any]:
    db = get_database()
    collection = db.hybrid_lstm_results
    
    result = await collection.find_one(
        {"_id": inference_id}, 
        {"metadata.attention_analysis": 1, "batch_id": 1, "created_at": 1}
    )
    
    if result:
        return {
            "inference_id": inference_id,
            "batch_id": result.get("batch_id"),
            "created_at": result.get("created_at"),
            "attention_analysis": result.get("metadata", {}).get("attention_analysis", {})
        }
    
    return None
