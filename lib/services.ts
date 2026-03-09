import api from './api';
import { getStoredTokens } from './auth';

function getToken(): string | undefined {
  const tokens = getStoredTokens();
  return tokens?.accessToken ?? undefined;
}

function authConfig() {
  return { token: getToken() };
}

// ==================== Dashboard ====================

export const dashboardService = {
  getDashboard: () => api.get<any>('/user/dashboard', authConfig()),
  getStreak: () => api.get<any>('/user/streak', authConfig()),
  getActivity: (limit = 10) => api.get<any>(`/user/activity?limit=${limit}`, authConfig()),
  getPerformance: () => api.get<any>('/user/performance', authConfig()),
  getPracticeStats: () => api.get<any>('/user/practice-stats', authConfig()),
};

// ==================== Daily MCQ ====================

export const dailyMcqService = {
  getToday: () => api.get<any>('/daily-mcq/today', authConfig()),
  getQuestions: () => api.get<any>('/daily-mcq/today/questions', authConfig()),
  submit: (answers: any[], timeTaken: number) =>
    api.post<any>('/daily-mcq/today/submit', { answers, timeTaken }, authConfig()),
  getResults: () => api.get<any>('/daily-mcq/today/results', authConfig()),
  getReview: () => api.get<any>('/daily-mcq/today/review', authConfig()),
  getRecommendations: () => api.get<any>('/daily-mcq/today/recommendations', authConfig()),
};

// ==================== Daily Answer ====================

export const dailyAnswerService = {
  getToday: () => api.get<any>('/daily-answer/today', authConfig()),
  getFullQuestion: () => api.get<any>('/daily-answer/today/question', authConfig()),
  submitText: (answerText: string) =>
    api.post<any>('/daily-answer/today/submit-text', { answerText }, authConfig()),
  upload: (fileUrl: string) =>
    api.post<any>('/daily-answer/today/upload', { fileUrl }, authConfig()),
  getEvaluationStatus: () =>
    api.get<any>('/daily-answer/today/evaluation-status', authConfig()),
  getResults: () => api.get<any>('/daily-answer/today/results', authConfig()),
};

// ==================== Editorials ====================

export const editorialService = {
  getToday: (source?: string) =>
    api.get<any>(`/editorials/today${source && source !== 'all' ? `?source=${source}` : ''}`, authConfig()),
  getById: (id: string) => api.get<any>(`/editorials/${id}`, authConfig()),
  markRead: (id: string) => api.post<any>(`/editorials/${id}/mark-read`, {}, authConfig()),
  toggleSave: (id: string) => api.post<any>(`/editorials/${id}/save`, {}, authConfig()),
  summarize: (id: string) => api.post<any>(`/editorials/${id}/summarize`, {}, authConfig()),
  getStats: () => api.get<any>('/editorials/stats', authConfig()),
};

// ==================== Mock Tests ====================

export const mockTestService = {
  getSubjects: () => api.get<any>('/mock-tests/subjects'),
  getConfig: () => api.get<any>('/mock-tests/config'),
  generate: (config: { source: string; subject: string; examMode: string; paperType?: string; questionCount: number; difficulty: string }) =>
    api.post<any>('/mock-tests/generate', config, authConfig()),
  getQuestions: (testId: string) => api.get<any>(`/mock-tests/${testId}/questions`, authConfig()),
  submit: (testId: string, answers: Record<string, string>, timeTaken: number) =>
    api.post<any>(`/mock-tests/${testId}/submit`, { answers, timeTaken }, authConfig()),
  saveProgress: (testId: string, answers: Record<string, string>) =>
    api.put<any>(`/mock-tests/${testId}/save-progress`, { answers }, authConfig()),
  getResults: (testId: string) => api.get<any>(`/mock-tests/${testId}/results`, authConfig()),
  getRecommendations: (testId: string) => api.get<any>(`/mock-tests/${testId}/recommendations`, authConfig()),
};

// ==================== Study Planner ====================

export const studyPlannerService = {
  getTodayTasks: () => api.get<any>('/study-plan/today', authConfig()),
  createTask: (task: { title: string; description?: string; subject?: string; type?: string; date?: string; startTime?: string; endTime?: string; duration?: number }) =>
    api.post<any>('/study-plan/tasks', task, authConfig()),
  updateTask: (id: string, updates: any) =>
    api.put<any>(`/study-plan/tasks/${id}`, updates, authConfig()),
  deleteTask: (id: string) => api.delete<any>(`/study-plan/tasks/${id}`, authConfig()),
  getStreak: () => api.get<any>('/study-plan/streak', authConfig()),
  getWeeklyGoals: () => api.get<any>('/study-plan/weekly-goals', authConfig()),
  saveWeeklyGoals: (goals: { title: string; completed: boolean }[]) =>
    api.put<any>('/study-plan/weekly-goals', { goals }, authConfig()),
  getSyllabusCoverage: () => api.get<any>('/study-plan/syllabus-coverage', authConfig()),
  getMonthlyActivity: (year: number, month: number) =>
    api.get<any>(`/study-plan/monthly-activity?year=${year}&month=${month}`, authConfig()),
};

// ==================== Video Lectures ====================

export const videoService = {
  getSubjects: () => api.get<any>('/videos/subjects'),
  getVideosBySubject: (subject: string) => api.get<any>(`/videos/${encodeURIComponent(subject)}`),
  getStats: () => api.get<any>('/videos/stats'),
  askMentor: (question: string) =>
    api.post<any>('/videos/mentor/ask', { question }, authConfig()),
};

// ==================== Library ====================

export const libraryService = {
  getSubjects: () => api.get<any>('/library/subjects'),
  getChapters: (subjectId: string) => api.get<any>(`/library/subjects/${subjectId}/chapters`),
  getDownloadUrl: (chapterId: string) => api.get<any>(`/library/download/${chapterId}`, authConfig()),
};

// ==================== Pricing & Mentorship ====================

export const pricingService = {
  getPlans: () => api.get<any>('/pricing/plans'),
  bookCall: (data: { name: string; email: string; phone?: string; message?: string }) =>
    api.post<any>('/mentorship/book-call', data, authConfig()),
  getTestimonials: () => api.get<any>('/mentorship/testimonials'),
};

// ==================== Admin ====================

export const adminService = {
  // Analytics
  getAnalytics: () => api.get<any>('/admin/analytics', authConfig()),

  // Users
  getUsers: (params?: { page?: number; limit?: number; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return api.get<any>(`/admin/users${qs ? `?${qs}` : ''}`, authConfig());
  },
  updateUser: (id: string, data: { role?: string; status?: string }) =>
    api.put<any>(`/admin/users/${id}`, data, authConfig()),

  // PYQ Management
  uploadPYQ: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const token = getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/admin/pyq/upload`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );
    return res.json();
  },
  getPYQUploads: () => api.get<any>('/admin/pyq/uploads', authConfig()),
  getPYQUploadDetail: (id: string) => api.get<any>(`/admin/pyq/uploads/${id}`, authConfig()),
  getPYQQuestions: (params?: { status?: string; subject?: string; year?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.subject) query.set('subject', params.subject);
    if (params?.year) query.set('year', String(params.year));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<any>(`/admin/pyq/questions${qs ? `?${qs}` : ''}`, authConfig());
  },
  updatePYQQuestion: (id: string, data: any) =>
    api.put<any>(`/admin/pyq/questions/${id}`, data, authConfig()),
  bulkApprovePYQ: (ids: string[], status: string) =>
    api.post<any>('/admin/pyq/questions/bulk-approve', { ids, status }, authConfig()),
  getPYQStats: () => api.get<any>('/admin/pyq/stats', authConfig()),

  // Daily MCQ
  getDailyMCQSets: () => api.get<any>('/admin/daily-mcq', authConfig()),
  createDailyMCQ: (data: any) => api.post<any>('/admin/daily-mcq', data, authConfig()),
  generateDailyMCQ: () => api.post<any>('/admin/daily-mcq/generate', {}, authConfig()),

  // Daily Mains
  getDailyMainsQuestions: () => api.get<any>('/admin/daily-mains', authConfig()),
  createDailyMains: (data: any) => api.post<any>('/admin/daily-mains', data, authConfig()),
  updateDailyMains: (id: string, data: any) => api.put<any>(`/admin/daily-mains/${id}`, data, authConfig()),
  generateDailyMains: () => api.post<any>('/admin/daily-mains/generate', {}, authConfig()),

  // Editorials
  getEditorials: () => api.get<any>('/admin/editorials', authConfig()),
  createEditorial: (data: any) => api.post<any>('/admin/editorials', data, authConfig()),
  updateEditorial: (id: string, data: any) => api.put<any>(`/admin/editorials/${id}`, data, authConfig()),
  deleteEditorial: (id: string) => api.delete<any>(`/admin/editorials/${id}`, authConfig()),
  triggerScrape: () => api.post<any>('/admin/editorials/scrape', {}, authConfig()),
  triggerSummarize: (id: string) => api.post<any>(`/admin/editorials/${id}/summarize`, {}, authConfig()),

  // Video Management
  getVideoSubjects: () => api.get<any>('/admin/videos/subjects', authConfig()),
  createVideoSubject: (data: { name: string; description?: string; iconUrl?: string; order?: number }) =>
    api.post<any>('/admin/videos/subjects', data, authConfig()),
  updateVideoSubject: (id: string, data: any) => api.put<any>(`/admin/videos/subjects/${id}`, data, authConfig()),
  deleteVideoSubject: (id: string) => api.delete<any>(`/admin/videos/subjects/${id}`, authConfig()),
  createVideo: (data: { subjectId: string; title: string; description?: string; videoUrl?: string; thumbnailUrl?: string; duration?: number; instructor?: string; order?: number }) =>
    api.post<any>('/admin/videos', data, authConfig()),
  updateVideo: (id: string, data: any) => api.put<any>(`/admin/videos/${id}`, data, authConfig()),
  deleteVideo: (id: string) => api.delete<any>(`/admin/videos/${id}`, authConfig()),

  // Testimonials Management
  getTestimonials: () => api.get<any>('/admin/testimonials', authConfig()),
  createTestimonial: (data: { name: string; title: string; content: string; avatarUrl?: string; rating?: number; order?: number }) =>
    api.post<any>('/admin/testimonials', data, authConfig()),
  updateTestimonial: (id: string, data: any) => api.put<any>(`/admin/testimonials/${id}`, data, authConfig()),
  deleteTestimonial: (id: string) => api.delete<any>(`/admin/testimonials/${id}`, authConfig()),

  // Pricing Plans Management
  getPricingPlans: () => api.get<any>('/admin/pricing', authConfig()),
  createPricingPlan: (data: { name: string; price: number; duration: string; features?: string[]; isPopular?: boolean; order?: number }) =>
    api.post<any>('/admin/pricing', data, authConfig()),
  updatePricingPlan: (id: string, data: any) => api.put<any>(`/admin/pricing/${id}`, data, authConfig()),
  deletePricingPlan: (id: string) => api.delete<any>(`/admin/pricing/${id}`, authConfig()),

  // Library
  createSubject: (data: any) => api.post<any>('/admin/library/subjects', data, authConfig()),
  createChapter: (data: any) => api.post<any>('/admin/library/chapters', data, authConfig()),
  uploadMaterial: async (file: File, subjectId: string, chapterId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', subjectId);
    formData.append('chapterId', chapterId);

    const token = getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/admin/library/materials/upload`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );
    return res.json();
  },
};
