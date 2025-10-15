// src/types/users.ts
export type UserRole = 'admin' | 'staff' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  status: 'active' | 'disabled';
}

export interface Permission {
  moduleCode: string;
  canView: boolean;
  canEdit: boolean;
}