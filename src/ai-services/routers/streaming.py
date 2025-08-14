# src\ai-services\routers\streaming.py

from fastapi import APIRouter, HTTPException
import asyncio
import websockets
import json
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from routers.pipeline import pipeline_processor
from utils.logger import log
from config.hosts import hosts

MODULE = 'streaming'
router = APIRouter(prefix="/streaming", tags=["Real-time Pipeline"])

class StreamingPipelineProcessor:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.is_running = False
        self.websocket_uri = hosts.MOTOR_WEBSOCKET_URL # "ws://amp-generator:8005/ws"
        self.data_buffer = {
            'current_R': [],
            'current_S': [], 
            'current_T': [],
            'timestamps': []
        }
        self.window_size = 16384
        self.windows_per_batch = 20
        self.overlap_ratio = 0.75
        self.dual_lstm_steps = 5
        self.processing_task = None
        self.stream_session_id = None
        self.start_time = None
        self.processed_batches = 0
        self.pipeline_stats = {
            'total_features': 0,
            'total_autoencoder': 0,
            'total_lstm': 0,
            'anomalies_detected': 0,
            'healthy_batches': 0
        }
        
    @property
    def required_buffer_size(self):
        step_size = int(self.window_size * (1 - self.overlap_ratio))
        return (self.windows_per_batch - 1) * step_size + self.window_size
        
    async def start_streaming(self):
        if self.is_running:
            return {"status": "already_running", "user_id": self.user_id}
            
        self.is_running = True
        self.start_time = datetime.now()
        self.stream_session_id = f"stream_{self.user_id}_{int(self.start_time.timestamp())}"
        self.processed_batches = 0
        self._reset_stats()
        
        self.processing_task = asyncio.create_task(self._stream_processor())
        log(f"Pipeline streaming started for user: {self.user_id}, session: {self.stream_session_id}", MODULE)
        
        return {
            "status": "started",
            "user_id": self.user_id,
            "session_id": self.stream_session_id,
            "start_time": self.start_time.isoformat(),
            "pipeline_enabled": True
        }
    
    async def stop_streaming(self):
        if not self.is_running:
            return {"status": "already_stopped", "user_id": self.user_id}
            
        self.is_running = False
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass
        
        end_time = datetime.now()
        duration = end_time - self.start_time if self.start_time else None
        
        self._clear_buffer()
        log(f"Pipeline streaming stopped for user: {self.user_id}", MODULE)
        
        return {
            "status": "stopped",
            "user_id": self.user_id,
            "session_id": self.stream_session_id,
            "duration_seconds": duration.total_seconds() if duration else None,
            "processed_batches": self.processed_batches,
            "pipeline_stats": self.pipeline_stats.copy()
        }
    
    def get_status(self):
        buffer_size = len(self.data_buffer['current_R'])
        required_size = self.required_buffer_size
        uptime = (datetime.now() - self.start_time).total_seconds() if self.start_time else None
        
        return {
            "user_id": self.user_id,
            "is_running": self.is_running,
            "session_id": self.stream_session_id,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "uptime_seconds": uptime,
            "buffer_size": buffer_size,
            "required_buffer_size": required_size,
            "progress_percent": round((buffer_size / required_size * 100), 1) if required_size > 0 else 0,
            "processed_batches": self.processed_batches,
            "pipeline_stats": self.pipeline_stats.copy(),
            "config": {
                "window_size": self.window_size,
                "windows_per_batch": self.windows_per_batch,
                "overlap_ratio": self.overlap_ratio,
                "dual_lstm_steps": self.dual_lstm_steps
            },
            "ready_for_processing": buffer_size >= required_size
        }
    
    async def _stream_processor(self):
        while self.is_running:
            try:
                await self._connect_and_process()
            except Exception as e:
                log(f"Stream processing error for user {self.user_id}: {e}", MODULE, level="ERROR")
                if self.is_running:
                    await asyncio.sleep(5)
    
    async def _connect_and_process(self):
        try:
            async with websockets.connect(self.websocket_uri) as websocket:
                log(f"User {self.user_id} connected to motor WebSocket", MODULE)
                
                async for message in websocket:
                    if not self.is_running:
                        break
                        
                    try:
                        data_list = json.loads(message)
                        await self._process_incoming_data(data_list)
                    except json.JSONDecodeError as e:
                        log(f"JSON decode error for user {self.user_id}: {e}", MODULE, level="WARN")
                    except Exception as e:
                        log(f"Data processing error for user {self.user_id}: {e}", MODULE, level="ERROR")
                        
        except websockets.exceptions.ConnectionClosed:
            log(f"WebSocket connection closed for user {self.user_id}", MODULE)
        except Exception as e:
            log(f"WebSocket connection error for user {self.user_id}: {e}", MODULE, level="ERROR")
            raise
    
    async def _process_incoming_data(self, data_list: List[Dict]):
        for data_point in data_list:
            self.data_buffer['current_R'].append(data_point.get('current_R', 0))
            self.data_buffer['current_S'].append(data_point.get('current_S', 0))
            self.data_buffer['current_T'].append(data_point.get('current_T', 0))
            self.data_buffer['timestamps'].append(data_point.get('timestamp', 0))
        
        await self._check_and_process_pipeline()
    
    async def _check_and_process_pipeline(self):
        buffer_size = len(self.data_buffer['current_R'])
        required_size = self.required_buffer_size
        
        if buffer_size >= required_size:
            log(f"Running full pipeline for user: {self.user_id}, batch: {self.processed_batches + 1}", MODULE)
            
            current_r = np.array(self.data_buffer['current_R'][:required_size])
            current_s = np.array(self.data_buffer['current_S'][:required_size])
            current_t = np.array(self.data_buffer['current_T'][:required_size])
            
            from routers.pipeline import MotorDataInput
            
            pipeline_input = MotorDataInput(
                current_R=current_r.tolist(),
                current_S=current_s.tolist(),
                current_T=current_t.tolist(),
                user_id=self.user_id,
                batch_id=f"{self.stream_session_id}_batch_{self.processed_batches + 1}",
                use_windowing=True,
                window_size=self.window_size,
                dual_lstm_steps=self.dual_lstm_steps
            )
            
            try:
                pipeline_result = await pipeline_processor.run_full_pipeline(pipeline_input)
                
                self.processed_batches += 1
                self._update_pipeline_stats(pipeline_result)
                
                log(f"Pipeline completed for user: {self.user_id}", MODULE)
                log(f"  Batch: {self.processed_batches}, Status: {pipeline_result.overall_status}", MODULE)
                log(f"  Batch ID: {pipeline_result.batch_id}", MODULE)
                log(f"  Execution time: {pipeline_result.total_execution_time_ms:.0f}ms", MODULE)
                log(f"  Stages completed: {sum(1 for s in pipeline_result.stages if s.success)}/{len(pipeline_result.stages)}", MODULE)
                
                self._remove_processed_data(required_size)
                
            except Exception as e:
                log(f"Pipeline execution failed for user {self.user_id}: {e}", MODULE, level="ERROR")
                self._remove_processed_data(required_size)
    
    def _update_pipeline_stats(self, pipeline_result):
        for stage in pipeline_result.stages:
            if stage.success:
                if stage.stage == "feature_extraction":
                    self.pipeline_stats['total_features'] += stage.windows_processed or 0
                elif stage.stage == "autoencoder_analysis":
                    self.pipeline_stats['total_autoencoder'] += stage.windows_processed or 0
                elif stage.stage == "dual_lstm_analysis":
                    self.pipeline_stats['total_lstm'] += stage.windows_processed or 0
        
        if pipeline_result.overall_status == "success":
            self.pipeline_stats['healthy_batches'] += 1
        else:
            self.pipeline_stats['anomalies_detected'] += 1
    
    def _remove_processed_data(self, size: int):
        self.data_buffer['current_R'] = self.data_buffer['current_R'][size:]
        self.data_buffer['current_S'] = self.data_buffer['current_S'][size:]
        self.data_buffer['current_T'] = self.data_buffer['current_T'][size:]
        self.data_buffer['timestamps'] = self.data_buffer['timestamps'][size:]
        
        remaining = len(self.data_buffer['current_R'])
        log(f"Buffer updated for user {self.user_id}, remaining samples: {remaining}", MODULE)
    
    def _clear_buffer(self):
        self.data_buffer = {
            'current_R': [],
            'current_S': [], 
            'current_T': [],
            'timestamps': []
        }
    
    def _reset_stats(self):
        self.pipeline_stats = {
            'total_features': 0,
            'total_autoencoder': 0,
            'total_lstm': 0,
            'anomalies_detected': 0,
            'healthy_batches': 0
        }

class StreamingPipelineManager:
    def __init__(self):
        self.active_processors: Dict[str, StreamingPipelineProcessor] = {}
    
    async def start_pipeline_stream(self, user_id: str) -> dict:
        if user_id in self.active_processors:
            return {
                "status": "already_running",
                "user_id": user_id,
                "message": f"Pipeline stream already exists for user: {user_id}"
            }
        
        processor = StreamingPipelineProcessor(user_id)
        result = await processor.start_streaming()
        self.active_processors[user_id] = processor
        
        log(f"Pipeline processor added for user {user_id}, total active: {len(self.active_processors)}", MODULE)
        return result
    
    async def stop_pipeline_stream(self, user_id: str) -> dict:
        if user_id not in self.active_processors:
            return {
                "status": "not_found",
                "user_id": user_id,
                "message": f"No active pipeline stream for user: {user_id}"
            }
        
        processor = self.active_processors[user_id]
        result = await processor.stop_streaming()
        del self.active_processors[user_id]
        
        log(f"Pipeline processor removed for user {user_id}, total active: {len(self.active_processors)}", MODULE)
        return result
    
    async def stop_all_streams(self) -> dict:
        stopped_users = []
        for user_id in list(self.active_processors.keys()):
            result = await self.stop_pipeline_stream(user_id)
            if result["status"] != "not_found":
                stopped_users.append(user_id)
        
        return {
            "status": "all_stopped",
            "stopped_users": stopped_users,
            "count": len(stopped_users)
        }
    
    def get_user_status(self, user_id: str) -> Optional[dict]:
        if user_id not in self.active_processors:
            return None
        return self.active_processors[user_id].get_status()
    
    def get_all_statuses(self) -> dict:
        statuses = {}
        for user_id, processor in self.active_processors.items():
            statuses[user_id] = processor.get_status()
        
        return {
            "active_pipeline_streams": len(self.active_processors),
            "streams": statuses
        }
    
    def get_active_users(self) -> List[str]:
        return list(self.active_processors.keys())

streaming_pipeline_manager = StreamingPipelineManager()

@router.post("/pipeline/start/{user_id}")
async def start_realtime_pipeline(user_id: str):
    """Запуск полного пайплайна в реальном времени"""
    try:
        result = await streaming_pipeline_manager.start_pipeline_stream(user_id)
        return result
    except Exception as e:
        log(f"Failed to start pipeline streaming for user {user_id}: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pipeline/stop/{user_id}")
async def stop_realtime_pipeline(user_id: str):
    """Остановка пайплайна для пользователя"""
    try:
        result = await streaming_pipeline_manager.stop_pipeline_stream(user_id)
        return result
    except Exception as e:
        log(f"Failed to stop pipeline streaming for user {user_id}: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/pipeline/stop-all")
async def stop_all_pipeline_processing():
    """Остановка всех активных пайплайнов"""
    try:
        result = await streaming_pipeline_manager.stop_all_streams()
        return result
    except Exception as e:
        log(f"Failed to stop all pipeline streams: {e}", MODULE, level="ERROR")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pipeline/status/{user_id}")
async def get_pipeline_streaming_status(user_id: str):
    """Статус пайплайна для пользователя"""
    status = streaming_pipeline_manager.get_user_status(user_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"No active pipeline stream for user: {user_id}")
    return status

@router.get("/pipeline/status")
async def get_all_pipeline_statuses():
    """Статус всех активных пайплайнов"""
    return streaming_pipeline_manager.get_all_statuses()

@router.get("/pipeline/users")
async def get_active_pipeline_users():
    """Пользователи с активными пайплайнами"""
    return {
        "active_users": streaming_pipeline_manager.get_active_users(),
        "count": len(streaming_pipeline_manager.get_active_users())
    }
