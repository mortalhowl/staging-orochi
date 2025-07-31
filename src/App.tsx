import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Guards
import { AuthGuard } from './components/auth/AuthGuard';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { EventsPage } from './pages/admin/EventsPage';
import { ArticlesPage } from './pages/admin/ArticlesPage';

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* === PUBLIC ROUTES === */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          {/* <Route path="/events/:slug" element={<EventDetailPage />} /> */}
          {/* Các trang public khác sẽ được thêm vào đây */}
        </Route>

        {/* === ADMIN ROUTES === */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/events" element={<EventsPage />} />
            <Route path="/admin/articles" element={<ArticlesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}