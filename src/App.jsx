import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Registro from './pages/Registro';
import Conductor from './pages/Conductor';
import Apoderado from './pages/Apoderado';

/**
 * App.jsx — Enrutador principal de RutaSegura.
 *
 * Rutas:
 *  /login      → Login
 *  /registro   → Registro
 *  /conductor  → Panel del conductor
 *  /apoderado  → Monitoreo del apoderado
 *  /           → Redirige a /login
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/conductor" element={<Conductor />} />
        <Route path="/apoderado" element={<Apoderado />} />
      </Routes>
    </BrowserRouter>
  );
}
