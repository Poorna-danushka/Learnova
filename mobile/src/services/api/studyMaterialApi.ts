import { Platform } from 'react-native';
import apiClient from './apiClient';

export type StudyMaterial = {
  id: number;
  owner_id: number;
  module_id: number;
  original_filename: string;
  content_type: string;
  file_size: number;
  created_at: string;
};

export const getStudyMaterials = async (moduleId?: number): Promise<StudyMaterial[]> =>
  (await apiClient.get<StudyMaterial[]>('/study-materials', { params: { module_id: moduleId } })).data;

export const uploadStudyMaterial = async (
  moduleId: number,
  uri: string,
  name: string,
  type: string
): Promise<StudyMaterial> => {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const fileBlob = await fetch(uri).then((response) => response.blob());
    const webFile = new File([fileBlob], name || 'upload.txt', { type: type || 'application/octet-stream' });
    formData.append('file', webFile);
  } else {
    formData.append('file', { uri, name, type } as unknown as Blob);
  }

  return (await apiClient.post<StudyMaterial>(`/study-materials?module_id=${moduleId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};

export const deleteStudyMaterial = async (id: number): Promise<void> => {
  await apiClient.delete(`/study-materials/${id}`);
};

export const downloadStudyMaterial = async (id: number): Promise<Blob> =>
  (await apiClient.get<Blob>(`/study-materials/${id}/download`, { responseType: 'blob' })).data;
