from database.database import get_database
from datetime import datetime
import uuid
from typing import Dict, Any, Optional, List

class BatchStorage:
    
    @property
    def collection(self):
        return get_database().batch_metadata
    
    async def save_batch_metadata(self, batch_id: str, user_id: str, 
                                 pipeline_result: dict, data_summary: dict):
        """Сохраняет метаданные батча"""
        doc = {
            "_id": batch_id,
            "user_id": user_id,
            "timestamp": datetime.utcnow(),
            "status": pipeline_result.get("overall_status", "unknown"),
            "data_summary": data_summary,
            "stages": pipeline_result.get("stages", []),
            "total_execution_time_ms": pipeline_result.get("total_execution_time_ms", 0),
            "created_at": datetime.utcnow()
        }
        
        await self.collection.replace_one(
            {"_id": batch_id}, 
            doc, 
            upsert=True
        )
        return batch_id
    
    async def get_user_batches(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Получает все батчи пользователя"""
        cursor = self.collection.find(
            {"user_id": user_id}
        ).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def get_latest_user_batch(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Получает последний батч пользователя"""
        return await self.collection.find_one(
            {"user_id": user_id}, 
            sort=[("created_at", -1)]
        )
    
    async def get_batch_metadata(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """Получает метаданные батча"""
        return await self.collection.find_one({"_id": batch_id})

batch_storage = BatchStorage()
