# src/amp_generator/config/environment.py
import os

class Environment:
    @staticmethod
    def is_docker():
        return (
            os.path.exists('/.dockerenv') or 
            os.getenv('DOCKER_ENV') == 'true' or
            os.getenv('ENVIRONMENT') == 'docker'
        )

env = Environment()
