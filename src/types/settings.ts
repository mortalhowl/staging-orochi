// src/types/settings.ts

export type EmailTemplateType =
  | 'purchase_confirmation'
  | 'invitation_ticket'
  | 'resend_ticket'
  | 'reset_password';

export interface BankConfig {
  id?: string;
  bank_bin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  qr_template: string;
}

export interface CompanyInfo {
  id?: string;
  name: string;
  logo_url: string;
  tax_code: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  facebook_url: string;
  instagram_url: string;
  x_url: string;
  tiktok_url: string;
  youtube_url: string;
}

export interface EmailConfig {
  id?: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
}

export interface EmailTemplate {
  id?: string;
  type: EmailTemplateType;
  subject: string;
  content: string;
}