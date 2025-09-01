# IT Championship - AI Motor Diagnostics Platform

Система диагностики двигателей на основе искусственного интеллекта с использованием автоэнкодеров и LSTM сетей для обнаружения аномалий и прогнозирования состояния.

## Описание проекта

Платформа предоставляет комплексное решение для мониторинга состояния электродвигателей в реальном времени с использованием передовых алгоритмов машинного обучения. Система анализирует вибрационные и электрические сигналы для выявления потенциальных неисправностей в компонентах двигателя.

### Основные возможности

- **Обнаружение аномалий** с помощью многоголовых автоэнкодеров
- **Прогнозирование отказов** на основе LSTM нейронных сетей
- **Анализ компонентов**: подшипники, ротор, статор, эксцентриситет
- **Web-dashboard** для визуализации и мониторинга
- **Real-time обработка** потоковых данных
- **Кэширование результатов** для повышения производительности

## Быстрый старт

### Требования

- Docker и Docker Compose
- Минимум 8GB RAM
- Порты: 3000, 8000, 8005, 8010, 27017, 27018, 6379, 9000, 9001

### Установка и запуск

1. **Клонируйте репозиторий**
```bash
git clone <repository-url>
cd IT-championship
```

2. **Настройте переменные окружения**
```bash
cp .env.example .env.docker
# Отредактируйте .env.docker при необходимости
```

3. **Запустите все сервисы**
```bash
docker-compose up -d
```

4. **Проверьте статус сервисов**
```bash
docker-compose ps
```

### Доступ к сервисам

- **Dashboard Frontend**: http://localhost:3000
- **Dashboard Backend**: http://localhost:8010
- **AI Services API**: http://localhost:8000
- **Amp Generator**: http://localhost:8005
- **MinIO Console**: http://localhost:9001
- **Redis Insight**: http://localhost:5540

## Использование Dashboard

### Просмотр данных пользователя
```
GET /dashboard/{user_id}
```
Главная страница с обзором всех батчей пользователя

### Детальный анализ батча
```
GET /details/{user_id}/{batch_id}
```
Подробная статистика по батчу с компонентным анализом

### Анализ конкретного окна
```
GET /details/{user_id}/{batch_id}/window/{window_id}
```
Детальный анализ временного окна с attention weights и LSTM прогнозами

## 🔧 API Endpoints

### AI Services

#### Health Check
```http
GET /health
```

#### Получение батчей пользователя
```http
GET /batches/user/{user_id}/recent?count=10
```

#### Полные данные батча
```http
GET /batches/{batch_id}/complete
```

#### Схема признаков
```http
GET /features/schema
```

### Dashboard API

#### Статистика пользователя
```http
GET /api/user/{user_id}/stats/today
```

#### Обзор батча
```http
GET /api/batch/{batch_id}/overview
```

#### Окна батча
```http
GET /api/batch/{batch_id}/windows
```

#### Детали окна
```http
GET /api/batch/{batch_id}/window/{window_id}
```

## Модели ИИ

### Автоэнкодер с многоголовым вниманием
- **Архитектура**: Multi-head attention autoencoder
- **Назначение**: Обнаружение аномалий в сигналах
- **Компоненты**: bearing, rotor, stator, eccentricity
- **Метрики**: reconstruction error, confidence score, attention weights

### LSTM прогнозирование
- **Dual Channel LSTM**: Основная модель прогнозирования
- **Attention Dual LSTM**: Улучшенная версия с механизмом внимания
- **Temporal Fusion Transformer**: Продвинутая модель для сложных паттернов

### Поддерживаемые признаки
- RMS значения фаз A, B, C
- Статистические метрики (mean, std)
- Дисбаланс фаз
- Park векторы
- Спектральные характеристики ротора

## Конфигурация

### Переменные окружения (.env.docker)

```env
# Порты сервисов
DASHBOARD_PORT=8010
AI_PORT=8000
AMP_PORT=8005

# MongoDB конфигурация
MONGO_AI_USER=admin
MONGO_AI_PASSWORD=password123
MONGO_AI_PORT=27017

MONGO_CACHE_USER=admin
MONGO_CACHE_PASSWORD=password123
MONGO_CACHE_PORT=27018

# Redis
REDIS_PORT=6379

# MinIO
MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=minio123
MINIO_API_PORT=9000
MINIO_CONSOLE_PORT=9001
```

### Кэширование
- **Batch Cache TTL**: 30 минут
- **User Batches TTL**: 2 минуты
- **Processed Summaries TTL**: 60 минут

## Мониторинг и отладка

### Проверка состояния системы
```bash
curl http://localhost:8010/api/system/health
```

### Логи сервисов
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f ai_services
```

### Debug endpoints
```http
GET /debug/test-connection
GET /debug/batch/{batch_id}/structure
GET /debug/mongodb/stats
```

## Разработка

### Структура проекта
```
├── src/
│   ├── ai-services/          # AI backend сервис
│   ├── dashboard_service/    # Dashboard backend
│   │   ├── backend/         # FastAPI backend
│   │   └── frontend/        # React frontend
│   └── amp_generator/       # Генератор сигналов
├── model_weights/           # Веса обученных моделей
├── docker-compose.yaml      # Оркестрация сервисов
└── .env.docker             # Конфигурация
```

### Локальная разработка
```bash
# Запуск только баз данных
docker-compose up -d mongodb_ai mongodb_cache redis minio

# Запуск AI сервиса локально
cd src/ai-services
python -m uvicorn app:app --reload --port 8000

# Запуск Dashboard backend локально  
cd src/dashboard_service
python -m uvicorn app.main:app --reload --port 8010
```

## Производительность

- **Throughput**: до 10 батчей/минуту
- **Latency**: < 100ms для анализа окна
- **Memory usage**: ~2GB для полного стека
- **Storage**: автоочистка старых данных через TTL

## Безопасность

- Базовая аутентификация для MinIO
- Изоляция сервисов через Docker networks
- Валидация входных данных
- Ограничение доступа к debug endpoints

## Поддержка

При возникновении проблем:

1. Проверьте статус всех сервисов: `docker-compose ps`
2. Просмотрите логи: `docker-compose logs`
3. Убедитесь в доступности портов
4. Проверьте health endpoints

***

**Дата сборки**: 1 сентября 2025, 16:30  
**Версия**: IT Championship Edition v0.0.1