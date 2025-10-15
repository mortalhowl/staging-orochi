// src/services/api/settings.ts
import { ApiService } from './base';
import type { BankConfig, CompanyInfo, EmailConfig, EmailTemplate, EmailTemplateType } from '@/types';

/**
 * Lớp dịch vụ để quản lý các cấu hình hệ thống.
 */
export class SettingsApiService extends ApiService {
  
  // --- Bank Config ---
  public async getBankConfig(): Promise<BankConfig | null> {
    try {
      const { data, error } = await this.client.from('bank_configs').select('*').limit(1).single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Không có bản ghi nào, trả về null
        throw error;
      }
      return data;
    } catch (error) {
      throw this.handleError(error, 'lấy cấu hình ngân hàng');
    }
  }

  public async upsertBankConfig(config: BankConfig): Promise<BankConfig | null> {
    try {
        // SỬA LỖI: Gửi trực tiếp toàn bộ object 'config'. 
        // Supabase upsert sẽ tự động tìm 'id' để quyết định UPDATE hay INSERT.
        const { data, error } = await this.client
            .from('bank_configs')
            .upsert(config) 
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        throw this.handleError(error, 'lưu cấu hình ngân hàng');
    }
  }

  // --- Company Info ---
  public async getCompanyInfo(): Promise<CompanyInfo | null> {
    try {
        const { data, error } = await this.client.from('company_info').select('*').limit(1).single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    } catch (error) {
        throw this.handleError(error, 'lấy thông tin công ty');
    }
  }
  
  private async uploadCompanyLogo(file: File): Promise<string> {
    try {
        const fileName = `logo_${Date.now()}`;
        const { data: uploadData, error: uploadError } = await this.client.storage
            .from('company-assets')
            .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = this.client.storage.from('company-assets').getPublicUrl(uploadData.path);
        return urlData.publicUrl;
    } catch (error) {
        throw this.handleError(error, 'tải lên logo công ty');
    }
  }

  public async saveCompanyInfo(info: CompanyInfo, logoFile: File | null): Promise<CompanyInfo | null> {
    try {
        let finalLogoUrl = info.logo_url;

        if (logoFile) {
            finalLogoUrl = await this.uploadCompanyLogo(logoFile);
        }
        
        const submissionData = { ...info, logo_url: finalLogoUrl };

        // SỬA LỖI: Gửi trực tiếp toàn bộ object 'submissionData'.
        const { data, error } = await this.client
            .from('company_info')
            .upsert(submissionData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        throw this.handleError(error, 'lưu thông tin công ty');
    }
  }

  // --- Email Config ---
  public async getEmailConfig(): Promise<EmailConfig | null> {
    try {
        const { data, error } = await this.client.from('email_configs').select('*').limit(1).single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    } catch (error) {
        throw this.handleError(error, 'lấy cấu hình email');
    }
  }

  public async upsertEmailConfig(config: EmailConfig): Promise<EmailConfig | null> {
    try {
        const submissionData = { ...config, use_tls: true };
        // SỬA LỖI: Gửi trực tiếp toàn bộ object 'submissionData'.
        const { data, error } = await this.client
            .from('email_configs')
            .upsert(submissionData)
            .select()
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        throw this.handleError(error, 'lưu cấu hình email');
    }
  }

  // --- Email Templates ---
  public async getEmailTemplate(type: EmailTemplateType): Promise<EmailTemplate | null> {
    try {
        const { data, error } = await this.client.from('email_templates').select('*').eq('type', type).single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw error;
        }
        return data;
    } catch (error) {
        throw this.handleError(error, `lấy mẫu email loại "${type}"`);
    }
  }

  public async upsertEmailTemplate(template: EmailTemplate): Promise<EmailTemplate | null> {
      try {
          const { data, error } = await this.client
              .from('email_templates')
              .upsert(template, { onConflict: 'type' })
              .select()
              .single();
          if (error) throw error;
          return data;
      } catch (error) {
          throw this.handleError(error, 'lưu mẫu email');
      }
  }
}

export const SettingsApi = new SettingsApiService();