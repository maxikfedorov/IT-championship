# src\ai-services\database\database.py

from motor.motor_asyncio import AsyncIOMotorClient
from minio import Minio
from typing import Optional
import os
from dotenv import load_dotenv
from utils.logger import log

load_dotenv()

class Database:
    client: Optional[AsyncIOMotorClient] = None
    database = None
    minio_client: Optional[Minio] = None

db = Database()

MODULE = "database"

async def connect_to_mongo():
    mongo_user = os.getenv("MONGO_ROOT_USERNAME", "admin")
    mongo_password = os.getenv("MONGO_ROOT_PASSWORD", "SecurePass123!")
    mongo_host = os.getenv("MONGO_HOST", "localhost")
    mongo_port = os.getenv("MONGO_PORT", "27017")
    mongo_auth_db = os.getenv("MONGO_AUTH_DB", "admin")
    mongo_app_db = os.getenv("MONGO_APP_DATABASE", "ai_services")
    connection_string = f"mongodb://{mongo_user}:{mongo_password}@{mongo_host}:{mongo_port}/{mongo_auth_db}"
    db.client = AsyncIOMotorClient(connection_string)
    db.database = db.client[mongo_app_db]
    log(f"Подключено к MongoDB: {mongo_host}:{mongo_port}/{mongo_app_db}", MODULE)

def connect_to_minio():
    # Для Docker используем имя сервиса, для локальной разработки - localhost
    minio_host_raw = os.getenv('MONGO_HOST', 'localhost')  # Используем MONGO_HOST как индикатор окружения
    if minio_host_raw == 'mongodb':
        minio_host = f"minio:{os.getenv('MINIO_API_PORT', '9000')}"
    else:
        minio_host = f"{minio_host_raw}:{os.getenv('MINIO_API_PORT', '9000')}"
    
    minio_user = os.getenv("MINIO_ROOT_USER", "minioadmin")
    minio_password = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin123")
    db.minio_client = Minio(
        minio_host,
        access_key=minio_user,
        secret_key=minio_password,
        secure=False
    )
    log(f"Подключено к MinIO: {minio_host}", MODULE)


async def close_mongo_connection():
    if db.client:
        db.client.close()
        log("Отключено от MongoDB", MODULE)

def get_database():
    return db.database

def get_minio_client():
    if db.minio_client is None:
        connect_to_minio()
    return db.minio_client
