import apiClient from './apiClient';
import type { GeneratedQuizResponse } from '@/types/ai';

export type QuizQuestion = { id: number; quiz_id: number; prompt: string; options: string[]; correct_option: number; position: number; explanation?: string };
export type Quiz = { id: number; owner_id: number; module_id: number; title: string; description?: string; questions?: QuizQuestion[]; created_at: string; updated_at: string };
export type Attempt = { id: number; quiz_id: number; owner_id: number; score: number; total: number; answers: Record<string, number>; completed_at: string };
export const getQuizzes = async (moduleId?: number) =>
  (await apiClient.get<Quiz[]>('/quizzes', { params: { module_id: moduleId } })).data;
export const getQuiz = async (id: number) => (await apiClient.get<Quiz>(`/quizzes/${id}`)).data;
export const deleteQuiz = async (id: number): Promise<void> => {
  await apiClient.delete(`/quizzes/${id}`);
};
export const updateQuiz = async (id: number, data: { module_id?: number; title?: string; description?: string }) =>
  (await apiClient.patch<Quiz>(`/quizzes/${id}`, data)).data;
export const createQuiz = async (data: { module_id: number; title: string; description?: string }) => (await apiClient.post<Quiz>('/quizzes', data)).data;
export const addQuestion = async (quizId: number, data: { prompt: string; options: string[]; correct_option: number; position?: number }) => (await apiClient.post<QuizQuestion>(`/quizzes/${quizId}/questions`, data)).data;
export const submitAttempt = async (quizId: number, answers: Record<number, number>) => (await apiClient.post<Attempt>(`/quizzes/${quizId}/attempts`, { answers })).data;
export const getAttemptHistory = async (quizId: number) => (await apiClient.get<Attempt[]>(`/quizzes/${quizId}/attempts`)).data;
export const saveGeneratedQuiz = async (moduleId: number, quiz: GeneratedQuizResponse) =>
  (await apiClient.post<Quiz>('/quizzes/save-generated', { module_id: moduleId, quiz })).data;
