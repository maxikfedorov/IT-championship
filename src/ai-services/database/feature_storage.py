from database.database import get_database
from datetime import datetime
import uuid
from typing import Dict, Any, Optional, List

class FeatureStorage:
    
    @property
    def collection(self):
        return get_database().feature_extractions
    
    async def save_features(self, user_id: str, features: dict, metadata: dict, batch_id: str = None):
        doc = {
            "_id": str(uuid.uuid4()),
            "batch_id": batch_id,
            "user_id": user_id,
            "features": features,
            "metadata": metadata,
            "created_at": datetime.utcnow(),
            "feature_count": self._count_features(features)
        }
        
        result = await self.collection.insert_one(doc)
        return str(result.inserted_id)

    async def get_features_by_batch_id(self, batch_id: str):
        doc = await self.collection.find_one({"batch_id": batch_id}, {"_id": 0})
        return doc
    
    async def get_features(self, extraction_id: str) -> Optional[Dict[str, Any]]:
        return await self.collection.find_one({"_id": extraction_id})
    
    async def get_user_extractions(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        cursor = self.collection.find(
            {"user_id": user_id}, 
            {"features": 0}
        ).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def delete_extraction(self, extraction_id: str, user_id: str) -> bool:
        result = await self.collection.delete_one({
            "_id": extraction_id, 
            "user_id": user_id
        })
        return result.deleted_count > 0
    
    def _count_features(self, features: Dict[str, Any]) -> int:
        if "windows" in features:
            if features["windows"]:
                first_window = features["windows"][0]
                count = 0
                for group_name, group_features in first_window.items():
                    if isinstance(group_features, dict):
                        count += len([k for k in group_features.keys() if not k.startswith('window_')])
                return count
            return 0
        else:
            count = 0
            for group_name, group_features in features.items():
                if isinstance(group_features, dict):
                    count += len(group_features)
            return count
