# src\ai-services\database\autoencoder_storage.py

from database.database import get_database
from typing import Dict, List, Any
import asyncio

_COLLECTION_NAME = "autoencoder_results"

async def save_one_result(result: Dict[str, Any]) -> str:
    db = get_database()
    coll = db[_COLLECTION_NAME]
    insert_res = await coll.insert_one(result)
    print(f"✓ Сводка сохранена: {insert_res.inserted_id}")
    return str(insert_res.inserted_id)

async def save_many_results(results: List[Dict[str, Any]]) -> List[str]:
    db = get_database()
    coll = db[_COLLECTION_NAME]
    insert_res = await coll.insert_many(results)
    print(f"✓ Сохранено {len(insert_res.inserted_ids)} сводок")
    return [str(iid) for iid in insert_res.inserted_ids]

async def get_result_by_id(result_id: str) -> Dict[str, Any]:
    db = get_database()
    coll = db[_COLLECTION_NAME]
    doc = await coll.find_one({"_id": result_id})
    return doc

async def get_last_results(n: int = 10) -> List[Dict[str, Any]]:
    db = get_database()
    coll = db[_COLLECTION_NAME]
    cursor = coll.find({}).sort("_id", -1).limit(n)
    return [doc async for doc in cursor]

async def save_batch_result(batch_object: Dict[str, Any]) -> str:
    db = get_database()
    coll = db[_COLLECTION_NAME]
    insert_res = await coll.insert_one(batch_object)
    print(f"✓ Batch сводка сохранена: {insert_res.inserted_id}")
    return str(insert_res.inserted_id)

async def get_batch_result(batch_id: str) -> Dict[str, Any]:
    db = get_database()
    coll = db[_COLLECTION_NAME]
    doc = await coll.find_one({"batch_id": batch_id}, {"_id": 0})
    return doc