import { spawn } from "child_process";
import path from "path";
import fs from "fs";

console.log("==================================================");
console.log("⚠️ Iniciando RutaSegura (Backend FastAPI + Frontend Vite)");
console.log("==================================================");

const envPath = path.join(process.cwd(), "backend", ".env");
const envExamplePath = path.join(process.cwd(), "backend", ".env.example");

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log("⚠️  backend/.env no encontrado. Asegúrate de configurar tus credenciales de Supabase.");
}

// 1. Iniciar Backend (FastAPI + Uvicorn) en puerto 8000
console.log("⚠️ Iniciando Servidor Backend en http://127.0.0.1:8000 ...");
const backend = spawn("python", ["-m", "uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000", "--app-dir", "backend"], {
  stdio: "inherit",
  shell: true
});

backend.on("error", (err) => {
  console.error("? Error al iniciar backend:", err);
});

// 2. Iniciar Frontend (Vite)
console.log("⚠️ Iniciando Frontend en http://localhost:5173 ...");
const frontend = spawn("npx", ["vite"], {
  stdio: "inherit",
  shell: true
});

frontend.on("error", (err) => {
  console.error("? Error al iniciar frontend:", err);
});

const cleanup = () => {
  console.log("\n⚠️ Cerrando servidores...");
  try { backend.kill(); } catch (e) {}
  try { frontend.kill(); } catch (e) {}
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
