/**
 * Centralized route definitions for type-safe navigation
 */

export const ROUTES = {
  // Auth routes
  WELCOME: '/welcome',
  ONBOARDING: '/onboarding',
  AUTH: '/auth',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',

  // Main app
  HOME: '/(tabs)',
  PROFILE: '/profile',

  // Module routes
  MODULES: '/modules',
  MODULE_DETAIL: (id: number | string) => `/modules/${id}` as const,

  // Note routes
  NOTES: '/notes',
  NOTE_NEW: '/notes/new',
  NOTE_DETAIL: (id: number | string) => `/notes/${id}` as const,

  // Material routes
  MATERIALS: '/materials',

  // Planning routes
  PLANNING: '/planning',

  // Calendar routes
  CALENDAR: '/calendar',

  // Quiz routes
  QUIZZES: '/quizzes',
  QUIZ_DETAIL: (id: number | string) => `/quiz/${id}` as const,

  // AI routes
  AI: '/ai',

  // Notification routes
  NOTIFICATIONS: '/notifications',
} as const;

/**
 * Helper to create routes with query parameters
 */
export function routeWithParams(
  route: string,
  params?: Record<string, string | number | boolean>
): string {
  if (!params) return route;
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  
  return `${route}?${searchParams.toString()}`;
}

/**
 * Module-aware route helpers
 */
export const MODULE_ROUTES = {
  notesForModule: (moduleId: number) =>
    routeWithParams(ROUTES.NOTES, { module_id: moduleId }),

  newNoteForModule: (moduleId: number) => 
    routeWithParams(ROUTES.NOTE_NEW, { module_id: moduleId }),
  
  materialsForModule: (moduleId: number) =>
    routeWithParams(ROUTES.MATERIALS, { module_id: moduleId }),
  
  quizzesForModule: (moduleId: number) =>
    routeWithParams(ROUTES.QUIZZES, { module_id: moduleId }),
  
  planningForModule: (moduleId: number) =>
    routeWithParams(ROUTES.PLANNING, { module_id: moduleId }),
} as const;