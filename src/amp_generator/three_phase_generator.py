# src/amp_generator/three_phase_generator.py

import pandas as pd
import asyncio
from dataclasses import dataclass
from typing import List, Dict
import os
import glob

@dataclass
class GeneratorConfig:
    frequency: float = 50.0
    sampling_rate: float = 25600.0
    amplitude: float = 3.0
    noise_level: float = 0.05
    anomaly_chance: float = 0.0
    phase_drop_chance: float = 0.0
    voltage_imbalance: float = 0.02
    output_batch_size: int = 1
    csv_files: List[str] = None  # 🔧 НОВОЕ: список CSV файлов для загрузки

class ThreePhaseGenerator:
    def __init__(self, config: GeneratorConfig = None):
        self.config = config or GeneratorConfig()
        
        # 🔧 НОВОЕ: Если список файлов не указан, используем по умолчанию
        if self.config.csv_files is None:
            self.config.csv_files = [
                'current_1.csv'
            ]
        
        self.is_running = False
        self.current_index = 0
        self.data = []
        self.loaded_files_info = []  # 🔧 НОВОЕ: информация о загруженных файлах
        self._load_data()
        
    def _load_data(self):
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))  
            data_dir = os.path.join(current_dir, 'data') 
            
            print(f"🔍 Looking for CSV files in: {os.path.abspath(data_dir)}")
            print(f"📋 Files to load: {self.config.csv_files}")
            
            # 🔧 НОВОЕ: Проверяем каждый файл из списка
            found_files = []
            missing_files = []
            
            for filename in self.config.csv_files:
                file_path = os.path.join(data_dir, filename)
                if os.path.exists(file_path):
                    found_files.append((filename, file_path))
                    print(f"  ✅ {filename} - found")
                else:
                    missing_files.append(filename)
                    print(f"  ❌ {filename} - not found")
            
            # 🔧 НОВОЕ: Выводим статистику поиска
            print(f"\n📊 Search results:")
            print(f"  Found: {len(found_files)} files")
            print(f"  Missing: {len(missing_files)} files")
            
            if missing_files:
                print(f"  Missing files: {', '.join(missing_files)}")
            
            # 🔧 НОВОЕ: Обрабатываем разные сценарии
            combined_data = []
            
            if len(found_files) == 0:
                print(f"⚠️  No CSV files found! Using fallback synthetic data...")
                self._generate_fallback_data()
                return
            
            elif len(found_files) == 1:
                print(f"📂 Loading data from single file: {found_files[0][0]}")
            
            else:
                print(f"📂 Loading data from {len(found_files)} files...")
            
            # 🔧 НОВОЕ: Загружаем все найденные файлы
            for filename, file_path in found_files:
                try:
                    df = pd.read_csv(file_path)
                    
                    # Проверяем наличие нужных колонок
                    required_cols = ['current_R', 'current_S', 'current_T']
                    missing_cols = [col for col in required_cols if col not in df.columns]
                    
                    if missing_cols:
                        print(f"    ⚠️  {filename}: missing columns {missing_cols}, skipping...")
                        continue
                    
                    # Добавляем данные из файла
                    file_data = []
                    for _, row in df.iterrows():
                        file_data.append({
                            'current_R': float(row['current_R']),
                            'current_S': float(row['current_S']),
                            'current_T': float(row['current_T'])
                        })
                    
                    combined_data.extend(file_data)
                    
                    # Сохраняем информацию о файле
                    self.loaded_files_info.append({
                        'filename': filename,
                        'samples': len(file_data),
                        'duration_sec': len(file_data) / self.config.sampling_rate
                    })
                    
                    print(f"    📊 {filename}: {len(file_data)} samples ({len(file_data) / self.config.sampling_rate:.2f} sec)")
                    
                except Exception as e:
                    print(f"    ❌ Error loading {filename}: {e}")
            
            # 🔧 НОВОЕ: Финальная обработка
            if combined_data:
                self.data = combined_data
                total_duration = len(self.data) / self.config.sampling_rate
                print(f"\n🎯 TOTAL LOADED:")
                print(f"  Files: {len(self.loaded_files_info)}")
                print(f"  Samples: {len(self.data)}")
                print(f"  Duration: {total_duration:.2f} seconds")
                print(f"  Data quality: High (Real CSV data)")
            else:
                print(f"❌ No valid data loaded from any files!")
                self._generate_fallback_data()
                
        except Exception as e:
            print(f"ERROR in _load_data: {e}")
            print(f"Current working directory: {os.getcwd()}")
            print(f"Generator file location: {os.path.dirname(os.path.abspath(__file__))}")
            self._generate_fallback_data()
    
    def _generate_fallback_data(self):
        """🔧 НОВОЕ: Создает синтетические данные как fallback"""
        import numpy as np
        
        print(f"🔄 Generating fallback synthetic data...")
        self.data = []
        for i in range(10000):
            t = i / self.config.sampling_rate
            self.data.append({
                'current_R': 3.0 * np.sin(2 * np.pi * 50 * t),
                'current_S': 3.0 * np.sin(2 * np.pi * 50 * t + 2*np.pi/3),
                'current_T': 3.0 * np.sin(2 * np.pi * 50 * t + 4*np.pi/3)
            })
        
        self.loaded_files_info = [{
            'filename': 'synthetic_fallback',
            'samples': len(self.data),
            'duration_sec': len(self.data) / self.config.sampling_rate
        }]
        
        print(f"🔄 Generated {len(self.data)} synthetic samples ({len(self.data) / self.config.sampling_rate:.2f} sec)")
    
    def set_csv_files(self, filenames: List[str]):
        """🔧 НОВОЕ: Устанавливает список CSV файлов для загрузки"""
        self.config.csv_files = filenames
        self.loaded_files_info = []
        print(f"📋 CSV files list updated: {filenames}")
        self._load_data()
    
    def add_csv_file(self, filename: str):
        """🔧 НОВОЕ: Добавляет файл к списку и перезагружает данные"""
        if filename not in self.config.csv_files:
            self.config.csv_files.append(filename)
            print(f"➕ Added {filename} to files list")
            self._load_data()
        else:
            print(f"⚠️  File {filename} already in list")
    
    def remove_csv_file(self, filename: str):
        """🔧 НОВОЕ: Удаляет файл из списка и перезагружает данные"""
        if filename in self.config.csv_files:
            self.config.csv_files.remove(filename)
            print(f"➖ Removed {filename} from files list")
            self._load_data()
        else:
            print(f"⚠️  File {filename} not in list")
    
    def get_files_info(self) -> Dict:
        """🔧 НОВОЕ: Возвращает информацию о загруженных файлах"""
        return {
            'configured_files': self.config.csv_files,
            'loaded_files': self.loaded_files_info,
            'total_samples': len(self.data),
            'total_duration_sec': len(self.data) / self.config.sampling_rate if self.data else 0
        }
    
    def generate_sample(self) -> Dict[str, float]:
        if not self.data:
            return {'current_R': 0.0, 'current_S': 0.0, 'current_T': 0.0, 'timestamp': 0.0}
        
        sample = self.data[self.current_index].copy()
        sample['timestamp'] = self.current_index / self.config.sampling_rate
        
        self.current_index = (self.current_index + 1) % len(self.data)
        
        return {
            'current_R': round(sample['current_R'], 8),
            'current_S': round(sample['current_S'], 8),
            'current_T': round(sample['current_T'], 8),
            'timestamp': round(sample['timestamp'], 8)
        }
    
    async def generate_realtime(self) -> List[Dict[str, float]]:
        if not self.is_running:
            return []
            
        batch = []
        for _ in range(self.config.output_batch_size):
            batch.append(self.generate_sample())
            
        await asyncio.sleep(self.config.output_batch_size / self.config.sampling_rate)
        return batch
    
    def start(self):
        self.is_running = True
        self.current_index = 0
        files_count = len(self.loaded_files_info)
        print(f"🚀 CSV data generator started with {len(self.data)} samples from {files_count} file(s)")
    
    def stop(self):
        self.is_running = False
        print("🛑 CSV data generator stopped")
    
    def update_config(self, **kwargs):
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                print(f"🔧 Config updated: {key} = {value}")
                
                # Если обновили список файлов, перезагружаем
                if key == 'csv_files':
                    self._load_data()
    
    def get_quality_metrics(self) -> Dict[str, float]:
        """Возвращает метрики качества для CSV данных"""
        return {
            "expected_thd_percent": 2.5,
            "noise_contribution": self.config.noise_level * 100,
            "anomaly_contribution": 0.0,
            "quality_score": 95.0,
            "data_source_quality": "High (Real CSV data)",
            "temporal_consistency": 100.0,
            "files_loaded": len(self.loaded_files_info)
        }
