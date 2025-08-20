// backend/src/controllers/motorController.js
import axios from "axios";

const MOTOR_API_BASE = process.env.MOTOR_API_BASE || "http://127.0.0.1:8005";

// Получить статус двигателя/генератора
export const getMotorStatus = async (req, res) => {
  try {
    const r = await axios.get(`${MOTOR_API_BASE}/status`);
    res.json(r.data);
  } catch (err) {
    console.error("[MOTOR] status error", err.message);
    res.status(500).json({ error: "Failed to get motor status" });
  }
};

// Запустить двигатель
export const startMotor = async (req, res) => {
  try {
    const r = await axios.post(`${MOTOR_API_BASE}/start`);
    res.json(r.data);
  } catch (err) {
    console.error("[MOTOR] start error", err.message);
    res.status(500).json({ error: "Failed to start motor" });
  }
};

// Остановить двигатель
export const stopMotor = async (req, res) => {
  try {
    const r = await axios.post(`${MOTOR_API_BASE}/stop`);
    res.json(r.data);
  } catch (err) {
    console.error("[MOTOR] stop error", err.message);
    res.status(500).json({ error: "Failed to stop motor" });
  }
};
