# Используем официальный Node.js образ
FROM node:22.18.0-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production && npm cache clean --force

# Копируем исходный код
COPY . .

# Создаем пользователя для безопасности
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Меняем владельца файлов
RUN chown -R nodejs:nodejs /app
USER nodejs

# Открываем порт
EXPOSE 8010

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=8010

# Healthcheck
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD node healthcheck.js || exit 1

# Запускаем приложение
CMD ["node", "index.js"]
