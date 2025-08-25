from motor.motor_asyncio import AsyncIOMotorClient
from minio import Minio
from typing import Optional
import os
from utils.logger import log

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None
    minio_client: Optional[Minio] = None

db = Database()
MODULE = "database"

async def connect_to_mongo():
    """Подключение к MongoDB AI с проверкой"""
    try:
        mongo_user = os.getenv("MONGO_AI_USER")
        mongo_password = os.getenv("MONGO_AI_PASSWORD") 
        mongo_host = os.getenv("MONGO_AI_HOST", "localhost")
        mongo_port = int(os.getenv("MONGO_AI_PORT", 27017))
        mongo_database = os.getenv("MONGO_AI_DATABASE", "ai_services")
        
        if not mongo_user or not mongo_password:
            raise ValueError("MongoDB credentials not found in environment")
        
        connection_string = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:{mongo_port}/{mongo_database}?authSource=admin"
        
        db.client = AsyncIOMotorClient(connection_string)
        db.database = db.client[mongo_database]
        
        # Проверяем подключение
        await db.client.admin.command('ping')
        log(f"Connected to MongoDB AI: {mongo_host}:{mongo_port}/{mongo_database}", MODULE)
        
    except Exception as e:
        log(f"Failed to connect to MongoDB: {e}", MODULE)
        raise

def connect_to_minio():
    """Подключение к MinIO с проверкой"""
    try:
        minio_host = os.getenv("MINIO_HOST", "localhost")
        minio_port = os.getenv("MINIO_API_PORT", "9000")
        minio_user = os.getenv("MINIO_ROOT_USER")
        minio_password = os.getenv("MINIO_ROOT_PASSWORD")
        
        if not minio_user or not minio_password:
            raise ValueError("MinIO credentials not found in environment")
            
        minio_endpoint = f"{minio_host}:{minio_port}"
        
        db.minio_client = Minio(
            minio_endpoint,
            access_key=minio_user,
            secret_key=minio_password,
            secure=False
        )
        
        # Проверяем подключение
        buckets = db.minio_client.list_buckets()
        log(f"Connected to MinIO: {minio_endpoint}", MODULE)
        
    except Exception as e:
        log(f"Failed to connect to MinIO: {e}", MODULE)
        raise

async def close_mongo_connection():
    if db.client:
        db.client.close()
        log("Disconnected from MongoDB", MODULE)

def get_database():
    return db.database

def get_minio_client():
    if db.minio_client is None:
        connect_to_minio()
    return db.minio_client
