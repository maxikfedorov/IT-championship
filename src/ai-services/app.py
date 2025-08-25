# src\ai-services\app.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

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

app = FastAPI(
    title="AI Services API", 
    version="1.0.0",
    description="Motor diagnostics AI pipeline"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    log('=== AI Services Starting ===', MODULE)
    await connect_to_mongo()
    connect_to_minio()
    log('=== Startup Complete ===', MODULE)

@app.on_event("shutdown")
async def shutdown_event():
    log('=== Shutting Down ===', MODULE)
    await close_mongo_connection()

app.include_router(features_router)
app.include_router(autoencoder_router)
app.include_router(dual_lstm_router)
app.include_router(streaming_router)
app.include_router(pipeline_router) 
app.include_router(batches_router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-services",
        "environment": os.getenv('ENVIRONMENT', 'local')
    }

@app.get("/")
async def root():
    return {
        "service": "AI Services API",
        "version": app.version
    }

if __name__ == "__main__":
    HOST = os.getenv('AI_SERVICE_HOST', '0.0.0.0')
    PORT = int(os.getenv('AI_PORT', 8000))
    
    uvicorn.run(
        "app:app",
        host=HOST,
        port=PORT,
        reload=os.getenv('ENVIRONMENT') != 'docker',
        log_level="info"
    )
