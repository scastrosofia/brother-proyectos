import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import {
  getHomeRouteForRol,
  SessionProvider,
  useSession,
} from './context/SessionContext';
import { AdminCriterios } from './pages/admin/AdminCriterios';
import { AdminCursos } from './pages/admin/AdminCursos';
import { AdminFestivales } from './pages/admin/AdminFestivales';
import { AdminFestivalForm } from './pages/admin/AdminFestivalForm';
import { AdminInscripciones } from './pages/admin/AdminInscripciones';
import { AdminProfesores } from './pages/admin/AdminProfesores';
import { MisInscripciones } from './pages/alumno/MisInscripciones';
import { MisProyectos } from './pages/alumno/MisProyectos';
import { ProyectoDetalle } from './pages/alumno/ProyectoDetalle';
import { ProyectoForm } from './pages/alumno/ProyectoForm';
import { FestivalDetalle } from './pages/festivales/FestivalDetalle';
import { FestivalesList } from './pages/festivales/FestivalesList';
import { EvaluarProyecto } from './pages/profesor/EvaluarProyecto';
import { ProyectosRanking } from './pages/profesor/ProyectosRanking';
import { Dashboard } from './pages/shared/Dashboard';

const RoleHomeRedirect: React.FC = () => {
  const { usuario } = useSession();
  return <Navigate to={getHomeRouteForRol(usuario.rol)} replace />;
};

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<RoleHomeRedirect />} />

          {/* A · Alumno */}
          <Route path="/mis-proyectos" element={<MisProyectos />} />
          <Route path="/proyecto/nuevo" element={<ProyectoForm />} />
          <Route path="/proyecto/:id/editar" element={<ProyectoForm />} />
          <Route path="/proyecto/:id" element={<ProyectoDetalle />} />
          <Route path="/mis-inscripciones" element={<MisInscripciones />} />

          {/* Dashboard compartido (Profesor y Admin) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin/dashboard" element={<Dashboard />} />

          {/* B · Profesor (y Admin en modo lectura) */}
          <Route path="/proyectos" element={<ProyectosRanking />} />
          <Route path="/evaluar/:id" element={<EvaluarProyecto />} />

          {/* C · Festivales (Alumno y Profesor) */}
          <Route path="/festivales" element={<FestivalesList />} />
          <Route path="/festival/:id" element={<FestivalDetalle />} />

          {/* Admin */}
          <Route path="/admin/festivales" element={<AdminFestivales />} />
          <Route
            path="/admin/festivales/nuevo"
            element={<AdminFestivalForm />}
          />
          <Route path="/admin/festivales/:id" element={<AdminFestivalForm />} />
          <Route path="/admin/profesores" element={<AdminProfesores />} />
          <Route path="/admin/cursos" element={<AdminCursos />} />
          <Route path="/admin/criterios" element={<AdminCriterios />} />
          <Route path="/admin/inscripciones" element={<AdminInscripciones />} />

          <Route path="*" element={<RoleHomeRedirect />} />
        </Routes>
      </HashRouter>
    </SessionProvider>
  );
};

export default App;
