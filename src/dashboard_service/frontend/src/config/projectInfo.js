export const PROJECT_INFO = {
  // Основная информация
  name: "AI Motor Monitoring System",
  version: "v0.0.1",
  description: "Интеллектуальная система мониторинга и диагностики трёхфазных электродвигателей с использованием технологий машинного обучения для раннего обнаружения аномалий и предотвращения отказов оборудования.",
  
  // Технологии
  technologies: [
    { name: "Python 3.12.10", color: "blue", icon: "api" },
    { name: "TensorFlow", color: "green" },
    { name: "FastAPI", color: "purple" },
    { name: "React + Vite", color: "orange" },
    { name: "Node.js v22.18.0", color: "cyan" },
    { name: "Docker", color: "red" },
    { name: "MongoDB", color: "geekblue", icon: "database" },
    { name: "Redis", color: "volcano" },
  ],

  // Микросервисы
  services: [
    {
      name: "AI Service",
      port: "8000",
      icon: "api",
      color: "var(--accent-primary)",
      description: "ML/AI операции"
    },
    {
      name: "Motor Sim",
      port: "8005", 
      icon: "database",
      color: "var(--accent-secondary)",
      description: "Симуляция двигателя"
    },
    {
      name: "Dashboard",
      port: "8010",
      icon: "monitor",
      color: "var(--accent-tertiary)", 
      description: "Веб-интерфейс"
    }
  ],

  // ИИ модели
  aiModels: [
    {
      name: "Автоэнкодер",
      description: "детекция аномалий по ошибке реконструкции",
      status: "processing",
      statusText: "Active"
    },
    {
      name: "Dual LSTM", 
      description: "временное прогнозирование и предикт отказов",
      status: "processing",
      statusText: "Active"
    },
    {
      name: "Feature Extractor",
      description: "извлечение вторичных признаков", 
      status: "success",
      statusText: "Ready"
    }
  ],

  // Информация для футера
  footer: {
    event: "IT-чемпионат 2025",
    purpose: "Система диагностики двигателей"
  }
};
