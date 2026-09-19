import apiClient from './apiClient';

export type Note = {
  id: number;
  owner_id: number;
  module_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type NoteInput = {
  module_id: number;
  title: string;
  content: string;
};

export const getNotes = async (moduleId?: number): Promise<Note[]> =>
  (await apiClient.get<Note[]>('/notes', { params: { module_id: moduleId } })).data;

export const getNoteById = async (id: number): Promise<Note> =>
  (await apiClient.get<Note>(`/notes/${id}`)).data;

export const createNote = async (data: NoteInput): Promise<Note> =>
  (await apiClient.post<Note>('/notes', data)).data;

export const updateNote = async (id: number, data: Partial<NoteInput>): Promise<Note> =>
  (await apiClient.patch<Note>(`/notes/${id}`, data)).data;

export const deleteNote = async (id: number): Promise<void> => {
  await apiClient.delete(`/notes/${id}`);
};
