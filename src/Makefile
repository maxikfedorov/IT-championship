# Makefile
.PHONY: up down mongo-up mongo-down logs clean status mongo-shell

# Запуск всех сервисов
up:
	docker-compose --env-file .env.dashboard up -d

# Остановка всех сервисов
down:
	docker-compose --env-file .env.dashboard down

# Запуск только MongoDB
mongo-up:
	docker-compose --env-file .env.dashboard up -d mongodb

# Остановка MongoDB
mongo-down:
	docker-compose --env-file .env.dashboard stop mongodb

# Просмотр логов
logs:
	docker-compose --env-file .env.dashboard logs -f

# Логи только MongoDB
mongo-logs:
	docker-compose --env-file .env.dashboard logs -f mongodb

# Очистка (удаление контейнеров и volumes)
clean:
	docker-compose --env-file .env.dashboard down -v
	docker volume rm dashboard_service_dashboard_mongodb_data 2>/dev/null || true
	docker system prune -f

# Полная очистка включая старые volumes
clean-all: clean
	docker volume ls -q -f name=dashboard | xargs -r docker volume rm

# Проверка статуса
status:
	docker-compose --env-file .env.dashboard ps

# Подключение к MongoDB shell
mongo-shell:
	docker exec -it dashboard_mongodb mongosh -u admin -p dashboard_admin_2024 --authenticationDatabase admin dashboard_db

# Проверка портов
check-ports:
	@echo "Checking if ports are available..."
	@netstat -an | findstr :27018 || echo "Port 27018 is free"
	@netstat -an | findstr :8010 || echo "Port 8010 is free"

# Быстрый старт
start: mongo-up
	@echo "Waiting for MongoDB to start..."
	@timeout 10 bash -c 'until docker exec dashboard_mongodb mongosh --eval "db.adminCommand(\"ping\")" >/dev/null 2>&1; do sleep 1; done' || echo "MongoDB ready"
	python -m app.main
