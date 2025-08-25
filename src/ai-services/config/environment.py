# src\ai-services\config\environment.py

import os

def is_docker():
    """Проверяет Docker окружение"""
    return os.getenv('DOCKER_ENV', 'false').lower() == 'true'

def get_host(service_name: str):
    """Возвращает хост сервиса в зависимости от окружения"""
    if is_docker():
        return service_name
    else:
        return 'localhost'
