// Shared TypeScript definitions for Learnova Mobile App

export interface UserProfile {
  id: number;
  full_name: string;
  email: string;
  email_verified_at?: string | null;
  university?: string;
  degree?: string;
  graduation_year?: number;
  created_at: string;
  updated_at: string;
}

export interface RegisterFormData {
  full_name: string;
  email: string;
  password: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
}
