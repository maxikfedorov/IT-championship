## API-карта AI Services API

### Основные системные эндпоинты

**Информация и здоровье:**
- `GET /` - Основная информация о сервисе
- `GET /health` - Проверка работоспособности сервиса
- `GET /config` - Текущая конфигурация хостов
- `GET /dashboard` - Дашборд управления диагностикой двигателя

### Извлечение признаков (Features)
- `POST /features/extract` - Извлечение признаков из данных тока
- `GET /features/extract/{extraction_id}` - Результат извлечения по ID
- `GET /features/history/{user_id}` - История извлечений пользователя
- `GET /features/batch/{batch_id}/results` - Результаты пакетной обработки

### Автоэнкодер (Autoencoder)
- `POST /autoencoder/predict` - Анализ аномалий автоэнкодером
- `POST /autoencoder/batch_predict` - Пакетный анализ автоэнкодером
- `GET /autoencoder/batch/{batch_id}/results` - Результаты пакетного анализа

### Двойной LSTM (Dual LSTM)
- `POST /dual-lstm/predict` - Предсказание двойным LSTM
- `GET /dual-lstm/health` - Состояние модели Dual LSTM
- `POST /dual-lstm/reload` - Перезагрузка модели Dual LSTM
- `GET /dual-lstm/results/{inference_id}` - Результат инференса по ID
- `GET /dual-lstm/batch/{batch_id}/results` - Результаты пакетного анализа

### Гибридный LSTM (Hybrid LSTM)
- `POST /hybrid-lstm/predict` - Предсказание гибридным LSTM
- `GET /hybrid-lstm/health` - Состояние модели Hybrid LSTM
- `POST /hybrid-lstm/reload` - Перезагрузка модели Hybrid LSTM
- `GET /hybrid-lstm/results/{inference_id}` - Результат инференса по ID
- `GET /hybrid-lstm/batch/{batch_id}/results` - Результаты пакетного анализа
- `GET /hybrid-lstm/attention/{inference_id}` - Карты внимания для инференса

### Стриминг в реальном времени (Streaming Pipeline)
- `POST /streaming/pipeline/start/{user_id}` - Запуск пайплайна в реальном времени
- `POST /streaming/pipeline/stop/{user_id}` - Остановка пайплайна для пользователя
- `POST /streaming/pipeline/stop-all` - Остановка всех активных пайплайнов
- `GET /streaming/pipeline/status/{user_id}` - Статус пайплайна пользователя
- `GET /streaming/pipeline/status` - Статус всех активных пайплайнов
- `GET /streaming/pipeline/users` - Пользователи с активными пайплайнами

### Полный пайплайн анализа (Pipeline)
- `POST /pipeline/analyze` - Запуск полного пайплайна анализа
- `GET /pipeline/status` - Статус пайплайна обработки

### Базовые параметры
- **Локально:** `http://127.0.0.1:8000`
- **Docker:** `http://0.0.0.0:8000`
- **База данных:** MongoDB (localhost:27017)
- **Хранилище:** MinIO (localhost:9000)
- **WebSocket двигателя:** `ws://localhost:8005/ws`

### Автодокументация FastAPI
- `/docs` - Swagger UI
- `/redoc` - ReDoc документация  
- `/openapi.json` - OpenAPI спецификация

### Интеграции
- **Подключения:** MongoDB, MinIO
- **WebSocket:** Подключение к генератору трёхфазного двигателя
- **Стриминг:** Обработка данных в реальном времени через WebSocket