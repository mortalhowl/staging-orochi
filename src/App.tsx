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
import { EventDetailPage } from './pages/EventDetailPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { BankConfigPage } from './pages/admin/BankConfigPage';
import { CheckoutPage } from './pages/CheckoutPage';

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* === PUBLIC ROUTES === */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
        </Route>

        {/* === ADMIN ROUTES === */}
        <Route path="/admin/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/events" element={<EventsPage />} />
            <Route path="/admin/articles" element={<ArticlesPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/settings/bank" element={<BankConfigPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}