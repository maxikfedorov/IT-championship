# src/amp_generator/app_motor.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
import asyncio
import os
import time
from three_phase_generator import ThreePhaseGenerator
from config.environment import env

HOST = '0.0.0.0' if env.is_docker() else '127.0.0.1'
PORT = int(os.getenv('PORT', '8005'))

app = FastAPI(
    title="Three Phase Generator API",
    description="Motor data generator for AI diagnostics",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

generator = ThreePhaseGenerator()

@app.get("/", summary="Информация о сервисе и конфигурация")
async def root():
    return {
        "service": "Three Phase Generator",
        "status": "running",
        "environment": "docker" if env.is_docker() else "local",
        "motor_running": generator.is_running,
        "websocket_endpoint": f"ws://{HOST}:{PORT}/ws",
        "config": generator.config.__dict__
    }

@app.get("/health", summary="Проверка работоспособности сервиса")
async def health_check():
    return {
        "status": "healthy",
        "service": "amp-generator",
        "motor_running": generator.is_running,
        "timestamp": asyncio.get_event_loop().time()
    }

@app.get("/motor", summary="Информация о параметрах электродвигателя")
async def get_motor_info():
    """Возвращает детальную информацию о параметрах электродвигателя"""
    return {
        "motor_type": "Асинхронный электродвигатель 3 кВт",
        "speeds": {
            "motor": "1770 об/мин",
            "output": "3010 об/мин",
            "ratio": 1.7
        },
        "bearings": "NSK6205DDU (опоры А и В)",
        "load_system": "Электрический тормоз + муфты",
        
        "monitoring": {
            "sensors": "Токовые датчики 3 фазы",
            "sampling_rate": f"{generator.config.sampling_rate} Hz",
            "adc": "Многоканальный модуль, 16-bit",
            "recording": "Синхронная запись CSV"
        },
        
        "electrical": {
            "frequency": f"{generator.config.frequency} Hz",
            "current": f"{generator.config.amplitude} A",
            "phases": "R-S-T, 120°",
            "imbalance": f"{generator.config.voltage_imbalance * 100}%"
        },
        
        "data_status": {
            "source": "CSV replay (current_1.csv + current_4.csv)",
            "samples": len(generator.data),
            "duration": f"{len(generator.data) / generator.config.sampling_rate:.1f} sec",
            "position": f"{generator.current_index}/{len(generator.data)}",
            "running": generator.is_running
        },
        
        "bearing_frequencies_hz": {
            "bpfo": 158.7,
            "bpfi": 196.3, 
            "bsf": 67.4,
            "ftf": 20.9
        },
        
        "quality": {
            "thd": "< 5%",
            "accuracy": "±0.1%",
            "frequency_range": "DC - 12.8 kHz"
        }
    }


@app.get("/config", summary="Получение текущей конфигурации генератора")
async def get_config():
    """Возвращает текущую конфигурацию генератора"""
    return {
        "config": generator.config.__dict__,
        "data_info": {
            "samples_loaded": len(generator.data),
            "current_index": generator.current_index,
            "loop_progress": f"{generator.current_index}/{len(generator.data)}" if generator.data else "0/0"
        }
    }

@app.post("/start", summary="Запуск трёхфазного двигателя")
async def start_motor():
    generator.start()
    return {
        "status": "Motor started",
        "config": generator.config.__dict__
    }

@app.post("/stop", summary="Остановка трёхфазного двигателя")
async def stop_motor():
    generator.stop()
    return {"status": "Motor stopped"}

@app.post("/config", summary="Обновление конфигурации генератора")
async def update_config(config: dict):
    generator.update_config(**config)
    return {
        "status": "Config updated", 
        "config": generator.config.__dict__
    }

@app.get("/status", summary="Полный статус сервиса и двигателя")
async def get_status():
    return {
        "service": "amp-generator",
        "environment": "docker" if env.is_docker() else "local",
        "host": HOST,
        "port": PORT,
        "running": generator.is_running,
        "config": generator.config.__dict__,
        "websocket_url": f"ws://{HOST}:{PORT}/ws"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Реально-временная передача данных трёхфазного тока"""
    await websocket.accept()
    client_address = websocket.client.host if websocket.client else "unknown"
    
    # Инициализация переменных для дебага
    last_debug_time = time.time()
    last_sent_data = None
    messages_sent = 0
    
    print(f"WebSocket client connected: {client_address}")
    
    try:
        while True:
            data = await generator.generate_realtime()
            if data:
                await websocket.send_text(json.dumps(data))
                last_sent_data = data
                messages_sent += 1
                
                # Дебаг каждые 10 секунд
                current_time = time.time()
                if current_time - last_debug_time >= 10.0:
                    print(f"🔄 WebSocket Debug [{client_address}]:")
                    print(f"   Messages sent: {messages_sent}")
                    print(f"   Motor running: {generator.is_running}")
                    print(f"   Data position: {generator.current_index}/{len(generator.data)}")
                    if last_sent_data:
                        sample = last_sent_data[0] if isinstance(last_sent_data, list) else last_sent_data
                        print(f"   Last sample: R={sample.get('current_R', 0):.4f}, S={sample.get('current_S', 0):.4f}, T={sample.get('current_T', 0):.4f}")
                        print(f"   Timestamp: {sample.get('timestamp', 0):.6f}")
                    
                    last_debug_time = current_time
                    
            else:
                await asyncio.sleep(0.1)
                
    except WebSocketDisconnect:
        print(f"WebSocket client disconnected: {client_address} (sent {messages_sent} messages)")
    except Exception as e:
        print(f"WebSocket error for {client_address}: {e}")

def print_endpoints():
    print(f"\n= Three Phase Generator API =")
    print(f"Environment: {'docker' if env.is_docker() else 'local'}")
    print(f"Host: {HOST}:{PORT}")
    print(f"WebSocket: ws://{HOST}:{PORT}/ws")
    print(f"\nEndpoints:")
    
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            methods = [m for m in route.methods if m not in ['HEAD', 'OPTIONS']]
            if methods:
                method_str = ', '.join(methods)
                summary = ""
                if hasattr(route, 'summary') and route.summary:
                    summary = route.summary
                elif hasattr(route, 'endpoint') and hasattr(route.endpoint, '__doc__') and route.endpoint.__doc__:
                    summary = route.endpoint.__doc__.strip().split('\n')[0]

                if route.path not in ['/openapi.json', '/docs', '/docs/oauth2-redirect', '/redoc']:
                    print(f"  {method_str:<8} {route.path:<15} - {summary}")
                    
        elif hasattr(route, 'path') and route.path.startswith('/ws'):
            doc = route.endpoint.__doc__.strip() if route.endpoint.__doc__ else 'WebSocket endpoint'
            print(f"  {'WS':<8} {route.path:<15} - {doc}")

if __name__ == "__main__":
    print_endpoints()
    
    if env.is_docker() or os.getenv('AUTO_START_MOTOR', 'false').lower() == 'true':
        print("Auto-starting motor...")
        generator.start()
    
    import uvicorn
    uvicorn.run(
        app, 
        host=HOST, 
        port=PORT,
        log_level="info" if env.is_docker() else "warning"
    )
