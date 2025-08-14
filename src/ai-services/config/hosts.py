# src/ai-services/config/hosts.py
import os
from .environment import env

class Hosts:
    """Централизованная конфигурация всех хостов"""
    
    # MongoDB
    MONGO_HOST = env.get_host('mongodb')
    MONGO_PORT = 27017
    
    # MinIO
    MINIO_HOST = env.get_host('minio')
    MINIO_PORT = int(os.getenv('MINIO_API_PORT', '9000'))
    MINIO_CONSOLE_PORT = int(os.getenv('MINIO_CONSOLE_PORT', '9001'))
    
    # Motor Generator
    MOTOR_HOST = env.get_host('amp-generator')
    MOTOR_PORT = 8005
    
    # URLs
    MONGO_URL = f"mongodb://{MONGO_HOST}:{MONGO_PORT}"
    MINIO_URL = f"{MINIO_HOST}:{MINIO_PORT}"
    MOTOR_WEBSOCKET_URL = env.get_url('amp-generator', 8005, 'ws', '/ws')
    
    @classmethod
    def info(cls):
        """Отладочная информация"""
        return {
            'environment': 'docker' if env.is_docker() else 'local',
            'mongo': f"{cls.MONGO_HOST}:{cls.MONGO_PORT}",
            'minio': cls.MINIO_URL,
            'motor_ws': cls.MOTOR_WEBSOCKET_URL
        }

hosts = Hosts()
