# src\dashboard_service\frontend\Dockerfile

FROM node:22.18.0-alpine

WORKDIR /app

COPY package*.json ./

# ✅ Устанавливаем ВСЕ зависимости (включая devDependencies)
RUN npm ci

COPY . .

# ✅ Теперь vite будет доступен локально
RUN npm run build

# Устанавливаем serve для продакшена
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
