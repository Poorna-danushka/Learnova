import apiClient from './apiClient';

export type UserRegisterRequest = {
  full_name: string;
  email: string;
  password: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
  push_notifications_enabled?: boolean;
  reminder_notifications_enabled?: boolean;
};

export type UserRegisterResponse = {
  id: number;
  full_name: string;
  email: string;
  email_verified_at?: string | null;
  university?: string;
  degree?: string;
  graduation_year?: number;
  push_notifications_enabled?: boolean;
  reminder_notifications_enabled?: boolean;
  created_at: string;
  updated_at: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;
  refresh_expires_at: string;
};

export const registerUser = async (
  data: UserRegisterRequest
): Promise<UserRegisterResponse> => {
  const response = await apiClient.post<UserRegisterResponse>('/users', data);
  return response.data;
};

export const loginUser = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const refreshSession = async (refreshToken: string): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
};

export const logoutUser = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

export type PasswordChangeRequest = {
  current_password: string;
  new_password: string;
};

export const changePassword = async (data: PasswordChangeRequest) => {
  const response = await apiClient.post('/users/me/password', data);
  return response.data as { message: string };
};

export const deleteCurrentUser = async (): Promise<void> => {
  await apiClient.delete('/users/me');
};

export const getCurrentUser = async (): Promise<UserRegisterResponse> => {
  const response = await apiClient.get<UserRegisterResponse>('/users/me');
  return response.data;
};

export type UserUpdateRequest = {
  full_name?: string;
  university?: string;
  degree?: string;
  graduation_year?: number;
  push_notifications_enabled?: boolean;
  reminder_notifications_enabled?: boolean;
};

export const updateCurrentUser = async (
  data: UserUpdateRequest
): Promise<UserRegisterResponse> => {
  const response = await apiClient.patch<UserRegisterResponse>('/users/me', data);
  return response.data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (
  token: string,
  newPassword: string
): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/reset-password', {
    token,
    new_password: newPassword,
  });
  return response.data;
};

export const verifyEmail = async (token: string): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/verify-email', { token });
  return response.data;
};

export const resendVerification = async (email: string): Promise<{ message: string }> => {
  const response = await apiClient.post<{ message: string }>('/auth/resend-verification', { email });
  return response.data;
};
