# src\ai-services\models\motor_features.py

import numpy as np
import pandas as pd
from scipy import signal
from scipy.fft import fft, fftfreq
from scipy.signal import hilbert
import pywt

class MotorDefectFeatures:
    def __init__(self, fs=25600, f_supply=50, n_nominal=1770, n_sync=1800, 
                 window_size=16384, window_step=4096, window_function='hann', n_poles=4):
        self.fs = fs
        self.f_supply = f_supply
        self.n_nominal = n_nominal
        self.n_sync = n_sync
        self.window_size = window_size
        self.window_step = window_step
        self.window_function = window_function
        self.n_poles = n_poles
        self.p = n_poles // 2
        
        self.slip = (n_sync - n_nominal) / n_sync
        self.f_rotor = n_nominal / 60
        
        self.f_sb1_lower = f_supply * (1 - 2 * self.slip)
        self.f_sb1_upper = f_supply * (1 + 2 * self.slip)
        self.f_sb2_lower = f_supply * (1 - 4 * self.slip)
        
        self.f_bpfo = 105.4  
        self.f_bpfi = 160.1  
        self.f_bsf = 28.2   
        self.f_ftf = 11.7
        
        self.f_ecc_main_1_lower = f_supply - self.f_rotor
        self.f_ecc_main_1_upper = f_supply + self.f_rotor
        self.f_ecc_main_2_lower = f_supply - 2 * self.f_rotor

    def apply_window_function(self, data):
        if self.window_function == 'hann':
            window = np.hanning(len(data))
        elif self.window_function == 'hamming':
            window = np.hamming(len(data))
        else:
            window = np.ones(len(data))
        return data * window

    def get_fft_spectrum(self, current_a, current_b, current_c):
        windowed_a = self.apply_window_function(current_a)
        windowed_b = self.apply_window_function(current_b)
        windowed_c = self.apply_window_function(current_c)
        
        fft_a = fft(windowed_a)
        fft_b = fft(windowed_b)
        fft_c = fft(windowed_c)
        freqs = fftfreq(len(windowed_a), 1/self.fs)
        
        return fft_a, fft_b, fft_c, freqs

    def common_features(self, current_a, current_b, current_c):
        features = {}
        
        for phase, current in [('A', current_a), ('B', current_b), ('C', current_c)]:
            features[f'rms_{phase}'] = np.sqrt(np.mean(current**2))
            features[f'mean_{phase}'] = np.mean(current)
            features[f'std_{phase}'] = np.std(current)
        
        rms_a = features['rms_A']
        rms_b = features['rms_B'] 
        rms_c = features['rms_C']
        
        total_rms = rms_a + rms_b + rms_c
        if total_rms > 1e-10:
            features['total_imbalance'] = (abs(rms_a - rms_b) + abs(rms_b - rms_c) + abs(rms_c - rms_a)) / total_rms
            features['rms_imbalance'] = features['total_imbalance']
            features['imbalance_ab'] = abs(rms_a - rms_b) / (rms_a + rms_b)
            features['imbalance_bc'] = abs(rms_b - rms_c) / (rms_b + rms_c)
            features['imbalance_ca'] = abs(rms_c - rms_a) / (rms_c + rms_a)
        else:
            features['total_imbalance'] = 0
            features['rms_imbalance'] = 0
            features['imbalance_ab'] = 0
            features['imbalance_bc'] = 0
            features['imbalance_ca'] = 0
        
        i_d = (2/3) * (current_a - 0.5*current_b - 0.5*current_c)
        i_q = (1/np.sqrt(3)) * (current_b - current_c)
        
        park_magnitude = np.sqrt(i_d**2 + i_q**2)
        park_mean = np.mean(park_magnitude)
        features['park_ellipticity'] = np.std(park_magnitude) / park_mean if park_mean > 1e-10 else 0
        features['park_mag_mean'] = park_mean
        features['park_mag_std'] = np.std(park_magnitude)
        
        return features

    def rotor_features(self, current_a, current_b, current_c):
        features = {}
        
        fft_a, fft_b, fft_c, freqs = self.get_fft_spectrum(current_a, current_b, current_c)
        
        idx_main = np.argmin(np.abs(freqs - self.f_supply))
        idx_sb1_l = np.argmin(np.abs(freqs - self.f_sb1_lower))
        idx_sb1_u = np.argmin(np.abs(freqs - self.f_sb1_upper))
        idx_sb2_l = np.argmin(np.abs(freqs - self.f_sb2_lower))
        
        combined_ratio = 0
        
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            amp_main = np.abs(fft_phase[idx_main])
            
            if amp_main > 1e-10:
                sb1_lower_ratio = np.abs(fft_phase[idx_sb1_l]) / amp_main
                combined_ratio += sb1_lower_ratio
                
                if phase == 'A':
                    features['rotor_sb1_lower_ratio_A'] = sb1_lower_ratio
                    features['rotor_sb1_upper_ratio_A'] = np.abs(fft_phase[idx_sb1_u]) / amp_main
                    features['rotor_sb2_lower_ratio_A'] = np.abs(fft_phase[idx_sb2_l]) / amp_main
                    features['rotor_sb1_lower_amp_A'] = np.abs(fft_phase[idx_sb1_l])
                    features['rotor_sb1_upper_amp_A'] = np.abs(fft_phase[idx_sb1_u])
                elif phase == 'B':
                    features['rotor_sb1_lower_ratio_B'] = sb1_lower_ratio
                    features['rotor_sb1_upper_ratio_B'] = np.abs(fft_phase[idx_sb1_u]) / amp_main
                elif phase == 'C':
                    features['rotor_sb1_upper_ratio_C'] = np.abs(fft_phase[idx_sb1_u]) / amp_main
            else:
                if phase == 'A':
                    features['rotor_sb1_lower_ratio_A'] = 0
                    features['rotor_sb1_upper_ratio_A'] = 0
                    features['rotor_sb2_lower_ratio_A'] = 0
                    features['rotor_sb1_lower_amp_A'] = 0
                    features['rotor_sb1_upper_amp_A'] = 0
                elif phase == 'B':
                    features['rotor_sb1_lower_ratio_B'] = 0
                    features['rotor_sb1_upper_ratio_B'] = 0
                elif phase == 'C':
                    features['rotor_sb1_upper_ratio_C'] = 0
                    
        features['rotor_sb1_lower_ratio_combined'] = combined_ratio / 3
        
        overlap = self.window_size - self.window_step
        
        for phase, current in [('A', current_a), ('B', current_b), ('C', current_c)]:
            f, t, Zxx = signal.stft(current, fs=self.fs, window=self.window_function, 
                                   nperseg=self.window_size, noverlap=overlap)
            
            psd = np.abs(Zxx)**2
            mean_psd = np.mean(psd, axis=1)
            
            idx_main_stft = np.argmin(np.abs(f - self.f_supply))
            idx_sb1_l_stft = np.argmin(np.abs(f - self.f_sb1_lower))
            idx_sb1_u_stft = np.argmin(np.abs(f - self.f_sb1_upper))
            
            if mean_psd[idx_main_stft] > 1e-10:
                features[f'rotor_stft_ratio_{phase}'] = (mean_psd[idx_sb1_l_stft] + mean_psd[idx_sb1_u_stft]) / mean_psd[idx_main_stft]
            else:
                features[f'rotor_stft_ratio_{phase}'] = 0
                
            if phase == 'A':
                features['rotor_stft_main_energy_A'] = mean_psd[idx_main_stft]
                features['rotor_stft_sb1_energy_A'] = mean_psd[idx_sb1_l_stft] + mean_psd[idx_sb1_u_stft]
                features['rotor_stft_energy_var_A'] = np.var(np.sum(psd, axis=0))
        
        return features

    def stator_features(self, current_a, current_b, current_c):
        features = {}
        
        a = np.exp(1j * 2 * np.pi / 3)
        I_a = np.mean(current_a + 0j)
        I_b = np.mean(current_b + 0j)
        I_c = np.mean(current_c + 0j)
        I1 = (1/3) * (I_a + a * I_b + a**2 * I_c)
        I2 = (1/3) * (I_a + a**2 * I_b + a * I_c)
        features['k2_asymmetry'] = np.abs(I2) / np.abs(I1) if np.abs(I1) > 1e-10 else 0
        
        fft_a, fft_b, fft_c, freqs = self.get_fft_spectrum(current_a, current_b, current_c)
        
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            idx_fundamental = np.argmin(np.abs(freqs - self.f_supply))
            fundamental_amp = np.abs(fft_phase[idx_fundamental])
            harmonics_power = 0
            
            for h in range(2, 11):
                harmonic_freq = self.f_supply * h
                if harmonic_freq < self.fs / 2:
                    idx_harmonic = np.argmin(np.abs(freqs - harmonic_freq))
                    harmonics_power += np.abs(fft_phase[idx_harmonic])**2
                    
            features[f'thd_{phase}'] = np.sqrt(harmonics_power) / fundamental_amp if fundamental_amp > 1e-10 else 0
        
        idx_fundamental = np.argmin(np.abs(freqs - self.f_supply))
        
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            fundamental_amp = np.abs(fft_phase[idx_fundamental])
            for h in [3, 5, 7]:
                harmonic_freq = self.f_supply * h
                if harmonic_freq < self.fs / 2:
                    idx_harmonic = np.argmin(np.abs(freqs - harmonic_freq))
                    harmonic_amp = np.abs(fft_phase[idx_harmonic])
                    features[f'h{h}_ratio_{phase}'] = harmonic_amp / fundamental_amp if fundamental_amp > 1e-10 else 0
                else:
                    features[f'h{h}_ratio_{phase}'] = 0
        
        analytic_a = hilbert(current_a)
        analytic_b = hilbert(current_b)
        analytic_c = hilbert(current_c)
        phase_a = np.angle(analytic_a)
        phase_b = np.angle(analytic_b)
        phase_c = np.angle(analytic_c)
        phase_diff_ab = np.mean(np.unwrap(phase_a - phase_b))
        phase_diff_bc = np.mean(np.unwrap(phase_b - phase_c))
        phase_diff_ca = np.mean(np.unwrap(phase_c - phase_a))
        ideal_phase_diff = 2 * np.pi / 3
        features['phase_deviation_ab'] = abs(phase_diff_ab - ideal_phase_diff)
        features['phase_deviation_bc'] = abs(phase_diff_bc - ideal_phase_diff)
        features['phase_deviation_ca'] = abs(phase_diff_ca - ideal_phase_diff)
        
        for phase, current in [('A', current_a), ('B', current_b), ('C', current_c)]:
            analytic_signal = hilbert(current)
            envelope = np.abs(analytic_signal)
            mean_env = np.mean(envelope)
            features[f'modulation_coeff_{phase}'] = np.std(envelope) / mean_env if mean_env > 1e-10 else 0
        
        bands = {'low': (0, 25), 'medium': (25, 100), 'high': (100, 500)}
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            spectrum_magnitude = np.abs(fft_phase)**2
            total_energy = np.sum(spectrum_magnitude)
            for band_name, (f_low, f_high) in bands.items():
                band_indices = np.where((np.abs(freqs) >= f_low) & (np.abs(freqs) <= f_high))
                band_energy = np.sum(spectrum_magnitude[band_indices])
                features[f'rel_energy_{band_name}_band_{phase}'] = band_energy / total_energy if total_energy > 1e-10 else 0
        
        return features

    def bearing_features(self, current_a, current_b, current_c):
        features = {}
        
        fft_a, fft_b, fft_c, freqs = self.get_fft_spectrum(current_a, current_b, current_c)
        
        bearing_freqs = {'bpfo': self.f_bpfo, 'bpfi': self.f_bpfi}
        
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            spectrum_magnitude = np.abs(fft_phase)
            
            for freq_name, freq_val in bearing_freqs.items():
                idx = np.argmin(np.abs(freqs - freq_val))
                features[f'bearing_{freq_name}_amp_{phase}'] = spectrum_magnitude[idx]
        
        for freq_name, freq_val in [('bsf', self.f_bsf), ('ftf', self.f_ftf)]:
            idx = np.argmin(np.abs(freqs - freq_val))
            features[f'bearing_{freq_name}_amp_A'] = np.abs(fft_a[idx])
        
        for freq_name, freq_val in [('bpfo', self.f_bpfo), ('bpfi', self.f_bpfi)]:
            harm_freq = freq_val * 2
            if harm_freq < self.fs / 2:
                idx_harm = np.argmin(np.abs(freqs - harm_freq))
                features[f'bearing_{freq_name}_2h_amp_A'] = np.abs(fft_a[idx_harm])
            else:
                features[f'bearing_{freq_name}_2h_amp_A'] = 0
                
        for freq_name, freq_val in [('bpfo', self.f_bpfo), ('bpfi', self.f_bpfi)]:
            freq_band = 0.1 * freq_val
            band_indices = np.where((np.abs(freqs) >= freq_val - freq_band) & 
                                  (np.abs(freqs) <= freq_val + freq_band))
            if len(band_indices[0]) > 0:
                features[f'bearing_{freq_name}_band_rms_A'] = np.sqrt(np.mean(np.abs(fft_a[band_indices])**2))
            else:
                features[f'bearing_{freq_name}_band_rms_A'] = 0
        
        kurtosis_values = []
        hf_energy_values = []
        
        for phase, current in [('A', current_a), ('B', current_b), ('C', current_c)]:
            nyquist = self.fs / 2
            low_cut = 500 / nyquist
            high_cut = 5000 / nyquist
            
            if high_cut < 1.0:
                b, a = signal.butter(4, [low_cut, high_cut], btype='band')
                filtered_signal = signal.filtfilt(b, a, current)
                
                analytic_signal = hilbert(filtered_signal)
                envelope = np.abs(analytic_signal)
                
                kurtosis_val = self._kurtosis(envelope)
                features[f'bearing_env_kurtosis_{phase}'] = kurtosis_val
                kurtosis_values.append(kurtosis_val)
                
                features[f'bearing_env_rms_{phase}'] = np.sqrt(np.mean(envelope**2))
                
                rms_val = features[f'bearing_env_rms_{phase}']
                features[f'bearing_env_peak_factor_{phase}'] = np.max(envelope) / rms_val if rms_val > 1e-10 else 0
                
                if phase == 'A':
                    envelope_fft = fft(envelope)
                    envelope_freqs = fftfreq(len(envelope), 1/self.fs)
                    envelope_magnitude = np.abs(envelope_fft)
                    
                    for freq_name, freq_val in [('bpfo', self.f_bpfo), ('bpfi', self.f_bpfi)]:
                        idx = np.argmin(np.abs(envelope_freqs - freq_val))
                        features[f'bearing_env_{freq_name}_A'] = envelope_magnitude[idx]
            else:
                features[f'bearing_env_kurtosis_{phase}'] = 0
                features[f'bearing_env_rms_{phase}'] = 0
                features[f'bearing_env_peak_factor_{phase}'] = 0
                kurtosis_values.append(0)
                if phase == 'A':
                    features['bearing_env_bpfo_A'] = 0
                    features['bearing_env_bpfi_A'] = 0
            
            fft_current = fft(self.apply_window_function(current))
            freqs_current = fftfreq(len(current), 1/self.fs)
            
            hf_indices = np.where((np.abs(freqs_current) >= 1000) & (np.abs(freqs_current) <= 5000))
            hf_energy = np.sum(np.abs(fft_current[hf_indices])**2)
            total_energy = np.sum(np.abs(fft_current)**2)
            
            hf_ratio = hf_energy / total_energy if total_energy > 1e-10 else 0
            features[f'bearing_hf_energy_{phase}'] = hf_ratio
            hf_energy_values.append(hf_ratio)
            
            if phase in ['A', 'B']:
                rms_val = np.sqrt(np.mean(current**2))
                features[f'bearing_crest_factor_{phase}'] = np.max(np.abs(current)) / rms_val if rms_val > 1e-10 else 0
        
        features['bearing_env_kurtosis_max'] = max(kurtosis_values) if kurtosis_values else 0
        features['bearing_hf_energy_max'] = max(hf_energy_values) if hf_energy_values else 0
        
        return features

    def eccentricity_features(self, current_a, current_b, current_c):
        features = {}
        
        rms_a = np.sqrt(np.mean(current_a**2))
        rms_b = np.sqrt(np.mean(current_b**2))
        rms_c = np.sqrt(np.mean(current_c**2))
        
        currents_rms = np.array([rms_a, rms_b, rms_c])
        mean_rms = np.mean(currents_rms)
        
        if mean_rms > 1e-10:
            features['ecc_current_asymmetry'] = np.sqrt(np.sum((currents_rms - mean_rms)**2)) / mean_rms
            features['ecc_max_deviation'] = np.max(np.abs(currents_rms - mean_rms)) / mean_rms
            features['ecc_rms_variance'] = np.var(currents_rms) / (mean_rms**2)
        else:
            features['ecc_current_asymmetry'] = 0
            features['ecc_max_deviation'] = 0
            features['ecc_rms_variance'] = 0
            
        min_rms = np.min(currents_rms)
        features['ecc_max_min_ratio'] = np.max(currents_rms) / min_rms if min_rms > 1e-10 else 0
        
        features['ecc_corr_ab'] = np.corrcoef(current_a, current_b)[0, 1]
        features['ecc_corr_bc'] = np.corrcoef(current_b, current_c)[0, 1]
        features['ecc_corr_ca'] = np.corrcoef(current_c, current_a)[0, 1]
        
        corr_values = [features['ecc_corr_ab'], features['ecc_corr_bc'], features['ecc_corr_ca']]
        features['ecc_mean_correlation'] = np.mean(corr_values)
        features['ecc_correlation_variance'] = np.var(corr_values)
        features['ecc_min_correlation'] = np.min(corr_values)
        
        fft_a, fft_b, fft_c, freqs = self.get_fft_spectrum(current_a, current_b, current_c)
        
        idx_main = np.argmin(np.abs(freqs - self.f_supply))
        
        ecc_freqs = {
            'main_1_lower': self.f_ecc_main_1_lower,
            'main_1_upper': self.f_ecc_main_1_upper,
            'main_2_lower': self.f_ecc_main_2_lower
        }
        
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            amp_main = np.abs(fft_phase[idx_main])
            spectrum_magnitude = np.abs(fft_phase)
            
            if self.f_ecc_main_1_lower > 0:
                idx_lower = np.argmin(np.abs(freqs - self.f_ecc_main_1_lower))
                features[f'ecc_main_1_lower_amp_{phase}'] = spectrum_magnitude[idx_lower]
                if phase == 'A':
                    features['ecc_main_1_lower_ratio_A'] = spectrum_magnitude[idx_lower] / amp_main if amp_main > 1e-10 else 0
            else:
                features[f'ecc_main_1_lower_amp_{phase}'] = 0
                if phase == 'A':
                    features['ecc_main_1_lower_ratio_A'] = 0
            
            idx_upper = np.argmin(np.abs(freqs - self.f_ecc_main_1_upper))
            features[f'ecc_main_1_upper_amp_{phase}'] = spectrum_magnitude[idx_upper]
            if phase == 'A':
                features['ecc_main_1_upper_ratio_A'] = spectrum_magnitude[idx_upper] / amp_main if amp_main > 1e-10 else 0
        
        if self.f_ecc_main_2_lower > 0:
            idx_2_lower = np.argmin(np.abs(freqs - self.f_ecc_main_2_lower))
            amp_main_a = np.abs(fft_a[idx_main])
            features['ecc_main_2_lower_ratio_A'] = np.abs(fft_a[idx_2_lower]) / amp_main_a if amp_main_a > 1e-10 else 0
        else:
            features['ecc_main_2_lower_ratio_A'] = 0
        
        for phase, current in [('A', current_a), ('B', current_b), ('C', current_c)]:
            analytic_signal = hilbert(current)
            envelope = np.abs(analytic_signal)
            
            envelope_fft = fft(envelope)
            envelope_freqs = fftfreq(len(envelope), 1/self.fs)
            envelope_magnitude = np.abs(envelope_fft)
            
            idx_rotor = np.argmin(np.abs(envelope_freqs - self.f_rotor))
            features[f'ecc_rotor_freq_modulation_{phase}'] = envelope_magnitude[idx_rotor]
            
            if phase == 'A':
                idx_2rotor = np.argmin(np.abs(envelope_freqs - 2 * self.f_rotor))
                features['ecc_2rotor_freq_modulation_A'] = envelope_magnitude[idx_2rotor]
            
            if phase in ['A', 'B']:
                mean_env = np.mean(envelope)
                features[f'ecc_envelope_modulation_{phase}'] = np.std(envelope) / mean_env if mean_env > 1e-10 else 0
        
        idx_fund = np.argmin(np.abs(freqs - self.f_supply))
        
        for phase, fft_phase in [('A', fft_a), ('B', fft_b), ('C', fft_c)]:
            spectrum_magnitude = np.abs(fft_phase)
            fund_amp = spectrum_magnitude[idx_fund]
            
            ecc_harmonics_energy = 0
            for freq_name, freq_val in ecc_freqs.items():
                if freq_val > 0 and freq_val < self.fs / 2:
                    idx = np.argmin(np.abs(freqs - freq_val))
                    ecc_harmonics_energy += spectrum_magnitude[idx]**2
            
            features[f'ecc_harmonic_ratio_{phase}'] = ecc_harmonics_energy / (fund_amp**2) if fund_amp > 1e-10 else 0
            
            if phase == 'A':
                features['ecc_total_harmonic_energy_A'] = ecc_harmonics_energy
        
        return features

    def extract_all_features(self, current_a, current_b, current_c):
        common_features = self.common_features(current_a, current_b, current_c)
        rotor_features = self.rotor_features(current_a, current_b, current_c)
        stator_features = self.stator_features(current_a, current_b, current_c)
        bearing_features = self.bearing_features(current_a, current_b, current_c)
        eccentricity_features = self.eccentricity_features(current_a, current_b, current_c)
        
        return {
            "common": common_features,
            "rotor": rotor_features, 
            "stator": stator_features,
            "bearing": bearing_features,
            "eccentricity": eccentricity_features
        }


    def _kurtosis(self, x):
        mean_x = np.mean(x)
        std_x = np.std(x)
        if std_x < 1e-10:
            return 0
        return np.mean(((x - mean_x) / std_x) ** 4) - 3
