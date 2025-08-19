# src/ai-services/utils/data_cleaner.py
import json
from typing import Any, Dict, List, Union

def clean_nan_values(data: Any) -> Any:
    """
    Рекурсивно очищает данные от NaN, Infinity и других проблемных значений
    """
    if isinstance(data, dict):
        cleaned = {}
        for key, value in data.items():
            cleaned[key] = clean_nan_values(value)
        return cleaned
    
    elif isinstance(data, (list, tuple)):
        return [clean_nan_values(item) for item in data]
    
    elif isinstance(data, float):
        if math.isnan(data):
            return 0.0  # Заменяем NaN на 0
        elif math.isinf(data):
            return 1e6 if data > 0 else -1e6  # Заменяем Infinity на большое число
        else:
            return data
    
    else:
        return data

def safe_json_response(data: Any) -> Dict:
    """
    Безопасно подготавливает данные для JSON ответа
    """
    try:
        # Сначала очищаем от NaN/Inf
        cleaned_data = clean_nan_values(data)
        
        # Проверяем что можно сериализовать
        json.dumps(cleaned_data)
        
        return cleaned_data
    
    except (ValueError, TypeError) as e:
        print(f"⚠️ JSON serialization error: {e}")
        # Возвращаем минимальную структуру в случае критической ошибки
        return {
            "error": "Data serialization failed",
            "original_error": str(e),
            "data_type": str(type(data))
        }
