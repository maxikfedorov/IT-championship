import os
from .environment import get_host

class Hosts:
    # MongoDB AI
    MONGO_AI_HOST = get_host('mongodb_ai')
    MONGO_AI_PORT = int(os.getenv('MONGO_AI_PORT', 27017))
    
    # MinIO
    MINIO_HOST = get_host('minio')
    MINIO_PORT = int(os.getenv('MINIO_API_PORT', 9000))
    
    # Motor WebSocket - для streaming pipeline
    MOTOR_HOST = get_host('amp_generator')
    MOTOR_PORT = int(os.getenv('AMP_PORT', 8005))
    
    @property
    def MOTOR_WEBSOCKET_URL(self):
        return f"ws://{self.MOTOR_HOST}:{self.MOTOR_PORT}/ws"
    
    # URLs
    @property
    def MONGO_AI_URL(self):
        return f"mongodb://{os.getenv('MONGO_AI_USER')}:{os.getenv('MONGO_AI_PASSWORD')}@{self.MONGO_AI_HOST}:{self.MONGO_AI_PORT}/{os.getenv('MONGO_AI_DATABASE')}?authSource=admin"
    
    @property
    def MINIO_ENDPOINT(self):
        return f"{self.MINIO_HOST}:{self.MINIO_PORT}"

hosts = Hosts()
