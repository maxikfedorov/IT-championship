# src/ai-services/config/environment.py
import os

class Environment:
    """Минималистичное определение окружения и хостов"""
    
    @staticmethod
    def is_docker():
        """Проверяет Docker окружение"""
        return (
            os.path.exists('/.dockerenv') or 
            os.getenv('DOCKER_ENV') == 'true' or
            os.getenv('ENVIRONMENT') == 'docker'
        )
    
    @staticmethod
    def get_host(service_name: str, local_host: str = 'localhost'):
        """Возвращает хост сервиса в зависимости от окружения"""
        return service_name if Environment.is_docker() else local_host
    
    @staticmethod
    def get_url(service_name: str, port: int, protocol: str = 'http', path: str = '', local_host: str = 'localhost'):
        """Строит полный URL сервиса"""
        host = Environment.get_host(service_name, local_host)
        return f"{protocol}://{host}:{port}{path}"

# Экземпляр для использования
env = Environment()
