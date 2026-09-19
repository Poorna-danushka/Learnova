import apiClient from './apiClient';

export type Module = {
  id: number;
  owner_id: number;
  name: string;
  description?: string;
  color: string;
  progress: number;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type ModuleInput = {
  name: string;
  description?: string;
  color?: string;
  progress?: number;
  is_completed?: boolean;
};

export const getModules = async (): Promise<Module[]> =>
  (await apiClient.get<Module[]>('/modules')).data;

export const createModule = async (data: ModuleInput): Promise<Module> =>
  (await apiClient.post<Module>('/modules', data)).data;

export const updateModule = async (id: number, data: Partial<ModuleInput>): Promise<Module> =>
  (await apiClient.patch<Module>(`/modules/${id}`, data)).data;

export const deleteModule = async (id: number): Promise<void> => {
  await apiClient.delete(`/modules/${id}`);
};

// Legacy exports for backward compatibility during migration
export type Subject = Module;
export type SubjectInput = ModuleInput;
export const getSubjects = getModules;
export const createSubject = createModule;
export const updateSubject = updateModule;
export const deleteSubject = deleteModule;
