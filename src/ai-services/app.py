# src/ai-services/app.py
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from config.hosts import hosts
from config.environment import env

from routers.features import router as features_router
from routers.autoencoder import router as autoencoder_router
from routers.dual_lstm import router as dual_lstm_router
from routers.hybrid_lstm import router as hybrid_lstm_router
from routers.streaming import router as streaming_router
from routers.pipeline import router as pipeline_router
from routers.batches import router as batches_router


from database.database import connect_to_mongo, close_mongo_connection, connect_to_minio
from utils.logger import log

MODULE = 'app'

ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')
HOST = os.getenv('HOST', '0.0.0.0' if ENVIRONMENT == 'docker' else '127.0.0.1')
PORT = int(os.getenv('PORT', '8000'))

app = FastAPI(
    title="AI Services API", 
    version="1.0.0",
    description="Motor diagnostics AI pipeline"
)

# ✅ CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    log('=== AI Services API Starting ===', MODULE)
    log(f'Environment: {ENVIRONMENT}', MODULE)
    log(f'Host: {HOST}:{PORT}', MODULE)

    await connect_to_mongo()
    connect_to_minio()

    # Логирование конфигурации WebSocket
    motor_ws_url = os.getenv('MOTOR_WEBSOCKET_URL', 'ws://localhost:8005/ws')
    log(f'Motor WebSocket URL: {motor_ws_url}', MODULE)

    routes = get_all_routes()
    log('Available endpoints:', MODULE)
    for route in routes:
        log(f'  - {route}', MODULE)
    
    log('Docs available at: /docs', MODULE)
    log('=== Startup Complete ===', MODULE)

def get_all_routes():
    routes_info = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            for method in route.methods:
                if method != 'HEAD':
                    routes_info.append(f"{method} {route.path}")
    return routes_info

@app.on_event("shutdown")
async def shutdown_event():
    log('=== Shutting Down AI Services API ===', MODULE)
    await close_mongo_connection()
    log('=== Shutdown Complete ===', MODULE)


app.include_router(features_router)
app.include_router(autoencoder_router)
app.include_router(dual_lstm_router)
# app.include_router(hybrid_lstm_router)
app.include_router(streaming_router)
app.include_router(pipeline_router) 
app.include_router(batches_router)

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker"""
    return {
        "status": "healthy",
        "service": "ai-services",
        "environment": ENVIRONMENT
    }

@app.get("/")
async def root():
    return {
        "service": "AI Services API",
        "version": app.version,
        "environment_info": hosts.info()
    }

@app.get("/config")
async def get_config():
    """Показать текущую конфигурацию хостов"""
    return hosts.info()

if __name__ == "__main__":
    HOST = '0.0.0.0' if env.is_docker() else '127.0.0.1'
    PORT = int(os.getenv('PORT', '8000'))
    
    log(f'Starting on {HOST}:{PORT}', MODULE)
    log(f'Environment: {hosts.info()}', MODULE)
    
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=not env.is_docker(),
        log_level="info"
    )