// src/services/api/users.ts
import { ApiService } from './base';
import { getSupabaseFnError } from '@/utils/supabaseFnError';
import type { UserProfile, UserRole } from '@/types';

interface UserFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
  role?: UserRole | null;
}

interface PermissionData {
    moduleId: string;
    canView: boolean;
    canEdit: boolean;
}

/**
 * Lớp dịch vụ để quản lý các hoạt động liên quan đến người dùng.
 */
export class UsersApiService extends ApiService {
  /**
   * Lấy danh sách người dùng đã phân trang và lọc.
   * @param filters Các tùy chọn lọc và phân trang.
   * @returns Một object chứa danh sách người dùng và tổng số lượng.
   */
  public async getUsers(filters: UserFilters = {}): Promise<{ data: UserProfile[], count: number }> {
    const {
      page = 1,
      limit = 20,
      searchTerm = '',
      role = null
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const rpcParams = {
        search_term: searchTerm,
        p_role: role,
      };

      // Query để lấy dữ liệu
      const dataQuery = this.client
        .rpc('search_users', rpcParams)
        .range(from, to);

      // Query để đếm
      const countQuery = this.client.rpc('count_users', rpcParams);

      const [dataRes, countRes] = await Promise.all([dataQuery, countQuery]);

      if (dataRes.error) throw dataRes.error;
      if (countRes.error) throw countRes.error;

      return {
        data: dataRes.data as UserProfile[],
        count: countRes.data ?? 0,
      };
    } catch (error) {
      throw this.handleError(error, 'lấy danh sách người dùng');
    }
  }

  /**
   * Lấy chi tiết thông tin của một người dùng bằng ID.
   * @param userId ID của người dùng.
   */
  public async getUserById(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.client.from('users').select('*').eq('id', userId).single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Không tìm thấy
        throw error;
      }
      return data as UserProfile;
    } catch (error) {
      throw this.handleError(error, `lấy chi tiết người dùng ${userId}`);
    }
  }

  /**
   * Lấy tất cả các module và quyền hạn hiện tại của một người dùng.
   */
  public async getUserPermissions(userId: string): Promise<{ modules: any[], permissions: any[] }> {
    try {
        const modulesPromise = this.client.from('modules').select('*');
        const permissionsPromise = this.client.from('permissions').select('*').eq('user_id', userId);

        const [modulesRes, permissionsRes] = await Promise.all([modulesPromise, permissionsPromise]);

        if (modulesRes.error) throw modulesRes.error;
        if (permissionsRes.error) throw permissionsRes.error;

        return {
            modules: modulesRes.data,
            permissions: permissionsRes.data,
        };
    } catch (error) {
        throw this.handleError(error, `lấy quyền cho người dùng ${userId}`);
    }
  }

  /**
   * Lưu lại các quyền hạn đã thay đổi cho người dùng.
   * @param userId ID của người dùng.
   * @param permissionsData Mảng các quyền hạn mới.
   */
  public async saveUserPermissions(userId: string, permissionsData: PermissionData[]): Promise<void> {
    try {
        const upsertData = permissionsData.map(p => ({
            user_id: userId,
            module_id: p.moduleId,
            can_view: p.canView,
            can_edit: p.canEdit,
        }));
        const { error } = await this.client.from('permissions').upsert(upsertData, { onConflict: 'user_id, module_id' });
        if (error) throw error;
    } catch (error) {
        throw this.handleError(error, 'lưu quyền người dùng');
    }
  }
  
  /**
   * Thực hiện các hành động quản trị viên đối với người dùng.
   * @param action Hành động cần thực hiện.
   * @param payload Dữ liệu cần thiết cho hành động.
   */
  public async performAdminAction(action: string, payload: { userId: string; newPassword?: string }): Promise<any> {
    try {
        const { data, error } = await this.client.functions.invoke('user-admin-actions', {
            body: { action, payload },
        });
        if (error) {
            const message = await getSupabaseFnError(error);
            throw new Error(message);
        }
        return data;
    } catch (error) {
        throw error;
    }
  }
}

export const UsersApi = new UsersApiService();