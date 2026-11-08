import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudyProvider } from './context/StudyContext';
import { MainLayout } from './components/layout';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import FocusStudio from './pages/FocusStudio';
import StudyTogether from './pages/StudyTogether';
import MyProgress from './pages/MyProgress';
import Welcome from './pages/Welcome';

/**
 * Sends anyone not signed in to the welcome page, remembering where they were headed.
 * Signed-in people get their own study data (a fresh store per account).
 */
function RequireAccount() {
  const { current, exitTo } = useAuth();
  const location = useLocation();
  if (!current) {
    // Just signed out: go where the sign-out asked. Otherwise remember the page they wanted.
    if (exitTo) return <Navigate to={exitTo} replace={true} />;
    const next = `${location.pathname}${location.search}${location.hash}`;
    const query = next === '/' ? '' : `?next=${encodeURIComponent(next)}`;
    return <Navigate to={`/welcome${query}`} replace={true} />;
  }
  return (
    <StudyProvider key={current.id} account={current}>
      <Outlet />
    </StudyProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="welcome" element={<Welcome />} />
      <Route element={<RequireAccount />}>
        <Route element={<MainLayout />}>
          <Route index={true} element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="courses/:courseId" element={<Courses />} />
          <Route path="focus" element={<FocusStudio />} />
          <Route path="together" element={<StudyTogether />} />
          <Route path="together/rooms/:roomId" element={<StudyTogether />} />
          <Route path="progress" element={<MyProgress />} />
          <Route path="*" element={<Navigate to="/" replace={true} />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
