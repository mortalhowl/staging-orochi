import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Guards
import { AuthGuard } from './components/auth/AuthGuard';
import { PublicAuthGuard } from './components/auth/PublicAuthGuard';
import { PermissionGuard } from './components/auth/PermissionGuard';

// Pages
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/admin/LoginPage';
import { AdminHomePage } from './pages/admin/AdminHomePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { EventsPage } from './pages/admin/EventsPage';
import { ArticlesPage } from './pages/admin/ArticlesPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { BankConfigPage } from './pages/admin/BankConfigPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PaymentPage } from './pages/PaymentPage';
import { EmailConfigPage } from './pages/admin/EmailConfigPage';
import { EmailTemplatesPage } from './pages/admin/EmailTemplatesPage';
import { TransactionsPage } from './pages/admin/TransactionsPage';
import { InvitedTicketsPage } from './pages/admin/InvitedTicketsPage';
import { IssuedTicketsPage } from './pages/admin/IssuedTicketsPage';
import { CheckInPage } from './pages/admin/CheckInPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { UserDetailPage } from './pages/admin/UserDetailPage';
import { ForbiddenPage } from './pages/admin/ForbiddenPage';

export function App() {

  useEffect(() => {
    useAuthStore.getState().checkSession();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* === PUBLIC ROUTES === */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payment/:transactionId" element={<PaymentPage />} />
          <Route element={<PublicAuthGuard />}>
            <Route path="/my-tickets" element={<MyTicketsPage />} />
          </Route>
        </Route>

        {/* === ADMIN ROUTES === */}
        <Route path="/admin/login" element={<LoginPage />} />

        <Route element={<AuthGuard />}>
          <Route element={<AdminLayout />}>
            {/* Các trang chung mà mọi admin/staff đều có thể vào */}
            <Route path="/admin/home" element={<AdminHomePage />} /> 
            <Route path="/admin/forbidden" element={<ForbiddenPage />} />

            {/* Bọc mỗi module trong một PermissionGuard tương ứng */}
            <Route element={<PermissionGuard moduleCode="dashboard" />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="events" />}>
              <Route path="/admin/events" element={<EventsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="articles" />}>
              <Route path="/admin/articles" element={<ArticlesPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="transactions" />}>
              <Route path="/admin/transactions" element={<TransactionsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="invited-tickets" />}>
              <Route path="/admin/invited-tickets" element={<InvitedTicketsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="tickets" />}>
              <Route path="/admin/tickets" element={<IssuedTicketsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="check-in" />}>
              <Route path="/admin/check-in" element={<CheckInPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="users" />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/users/:userId" element={<UserDetailPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="settings" />}>
              <Route path="/admin/settings" element={<SettingsPage />} />
              <Route path="/admin/settings/bank" element={<BankConfigPage />} />
              <Route path="/admin/settings/email-config" element={<EmailConfigPage />} />
              <Route path="/admin/settings/email-templates" element={<EmailTemplatesPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}