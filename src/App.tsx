import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Title, Stack, Paper, Center } from '@mantine/core';
import ScrollToTop from './components/common/ScrollToTop';
import { AuthGuard } from './components/auth/AuthGuard';
import { AdminLayout } from './layouts/AdminLayout';

// import pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { EventsPage } from './pages/admin/EventsPage';
import { LoginPage } from './pages/admin/LoginPage';

// Component giả lập cho Trang chủ
function HomePage() {
  return (
    <Stack>
      <Title order={1}>Đây là Trang Chủ</Title>
      <div style={{ height: '150vh', background: '#f0f0f0' }}>
        <Center h="100%">Nội dung rất dài để có thể cuộn trang...</Center>
      </div>
    </Stack>
  );
}

// Component giả lập cho trang Giới thiệu
function AboutPage() {
  return <Title order={1}>Đây là Trang Giới Thiệu</Title>;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admin/login" element={<LoginPage />} />

        {/* === CẬP NHẬT CẤU TRÚC ADMIN ROUTES === */}
        <Route element={<AuthGuard />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/events" element={<EventsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;