// src/config/routes.ts

export const ROUTES = {
  PUBLIC: {
    HOME: '/',
    EVENT_DETAIL: '/events/:slug',
    ARTICLE_DETAIL: '/articles/:slug',
    CHECKOUT: '/checkout',
    PAYMENT: '/payment/:transactionId',
    MY_TICKETS: '/my-tickets',
    UPDATE_PASSWORD: '/update-password',
  },
  ADMIN: {
    LOGIN: '/admin/login',
    HOME: '/admin/home',
    PROFILE: '/admin/profile',
    DASHBOARD: '/admin/dashboard',
    EVENTS: '/admin/events',
    ARTICLES: '/admin/articles',
    TRANSACTIONS: '/admin/transactions',
    INVITED_TICKETS: '/admin/invited-tickets',
    ISSUED_TICKETS: '/admin/tickets',
    CHECK_IN: '/admin/check-in',
    VOUCHERS: '/admin/vouchers',
    USERS: '/admin/users',
    USER_DETAIL: '/admin/users/:userId',
    SETTINGS: '/admin/settings',
    SETTINGS_BANK: '/admin/settings/bank',
    SETTINGS_EMAIL_CONFIG: '/admin/settings/email-config',
    SETTINGS_EMAIL_TEMPLATES: '/admin/settings/email-templates',
    SETTINGS_COMPANY: '/admin/settings/company',
  },
  ERRORS: {
    FORBIDDEN: '/admin/forbidden',
    NOT_FOUND: '*', // Dùng cho route mặc định của React Router
  },
} as const;