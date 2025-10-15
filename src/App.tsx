// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/common/ScrollToTop';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { ROUTES } from './config/routes'; // Import hằng số routes

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
import { ForbiddenPage } from './pages/errors/ForbiddenPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { ProfilePage } from './pages/admin/ProfilePage';
import { CompanyInfoPage } from './pages/admin/CompanyInfoPage';
import { VouchersPage } from './pages/admin/VouchersPage';
import { NotFoundPage } from './pages/errors/NotFoundPage';

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
          <Route path={ROUTES.PUBLIC.HOME} element={<HomePage />} />
          <Route path={ROUTES.PUBLIC.EVENT_DETAIL} element={<EventDetailPage />} />
          <Route path={ROUTES.PUBLIC.ARTICLE_DETAIL} element={<ArticleDetailPage />} />
          <Route path={ROUTES.PUBLIC.CHECKOUT} element={<CheckoutPage />} />
          <Route path={ROUTES.PUBLIC.PAYMENT} element={<PaymentPage />} />
          <Route element={<PublicAuthGuard />}>
            <Route path={ROUTES.PUBLIC.MY_TICKETS} element={<MyTicketsPage />} />
          </Route>
        </Route>

        <Route path={ROUTES.PUBLIC.UPDATE_PASSWORD} element={<UpdatePasswordPage />} />

        {/* === ADMIN ROUTES === */}
        <Route path={ROUTES.ADMIN.LOGIN} element={<LoginPage />} />

        <Route element={<AuthGuard />}>
          <Route element={<AdminLayout />}>
            {/* Các trang chung */}
            <Route path={ROUTES.ADMIN.HOME} element={<AdminHomePage />} />
            <Route path={ROUTES.ADMIN.PROFILE} element={<ProfilePage />} />
            <Route path={ROUTES.ERRORS.FORBIDDEN} element={<ForbiddenPage />} />

            {/* Routes được bảo vệ bởi PermissionGuard */}
            <Route element={<PermissionGuard moduleCode="dashboard" />}>
              <Route path={ROUTES.ADMIN.DASHBOARD} element={<AdminDashboardPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="events" />}>
              <Route path={ROUTES.ADMIN.EVENTS} element={<EventsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="articles" />}>
              <Route path={ROUTES.ADMIN.ARTICLES} element={<ArticlesPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="transactions" />}>
              <Route path={ROUTES.ADMIN.TRANSACTIONS} element={<TransactionsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="invited-tickets" />}>
              <Route path={ROUTES.ADMIN.INVITED_TICKETS} element={<InvitedTicketsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="tickets" />}>
              <Route path={ROUTES.ADMIN.ISSUED_TICKETS} element={<IssuedTicketsPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="check-in" />}>
              <Route path={ROUTES.ADMIN.CHECK_IN} element={<CheckInPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="vouchers" />}>
              <Route path={ROUTES.ADMIN.VOUCHERS} element={<VouchersPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="users" />}>
              <Route path={ROUTES.ADMIN.USERS} element={<UsersPage />} />
              <Route path={ROUTES.ADMIN.USER_DETAIL} element={<UserDetailPage />} />
            </Route>
            <Route element={<PermissionGuard moduleCode="settings" />}>
              <Route path={ROUTES.ADMIN.SETTINGS} element={<SettingsPage />} />
              <Route path={ROUTES.ADMIN.SETTINGS_BANK} element={<BankConfigPage />} />
              <Route path={ROUTES.ADMIN.SETTINGS_EMAIL_CONFIG} element={<EmailConfigPage />} />
              <Route path={ROUTES.ADMIN.SETTINGS_EMAIL_TEMPLATES} element={<EmailTemplatesPage />} />
              <Route path={ROUTES.ADMIN.SETTINGS_COMPANY} element={<CompanyInfoPage />} />
            </Route>
          </Route>
        </Route>

        {/* Trang 404 */}
        <Route path={ROUTES.ERRORS.NOT_FOUND} element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}