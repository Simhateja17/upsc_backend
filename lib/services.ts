import api from './api';
import { getStoredTokens } from './auth';

function getToken(): string | undefined {
  const tokens = getStoredTokens();
  return tokens?.accessToken ?? undefined;
}

function authConfig() {
  return { token: getToken() };
}

// ==================== Jeet AI Chat ====================

export const jeetAIService = {
  sendMessage: (message: string, conversationId?: string) =>
    api.post<{ conversationId: string; reply: string }>(
      '/ai/chat',
      { message, conversationId },
      { ...authConfig(), timeout: 60000 }
    ),

  getConversations: () =>
    api.get<{
      today: { id: string; title: string; updatedAt: string }[];
      yesterday: { id: string; title: string; updatedAt: string }[];
      earlier: { id: string; title: string; updatedAt: string }[];
    }>('/ai/conversations', authConfig()),

  getConversation: (conversationId: string) =>
    api.get<{
      id: string;
      title: string;
      messages: { id: string; role: string; content: string; createdAt: string }[];
    }>(`/ai/conversations/${conversationId}`, authConfig()),

  deleteConversation: (conversationId: string) =>
    api.delete<{ message: string }>(`/ai/conversations/${conversationId}`, authConfig()),
};

// ==================== Dashboard ====================

export const dashboardService = {
  getDashboard: () => api.get<any>('/user/dashboard', authConfig()),
  getStreak: () => api.get<any>('/user/streak', authConfig()),
  getActivity: (limit = 10) => api.get<any>(`/user/activity?limit=${limit}`, authConfig()),
  getPerformance: () => api.get<any>('/user/performance', authConfig()),
  getPracticeStats: () => api.get<any>('/user/practice-stats', authConfig()),
  getTestAnalytics: () => api.get<any>('/user/test-analytics', authConfig()),
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
  getLiveNews: (source?: string) =>
    api.get<any>(`/editorials/live-news${source && source !== 'all' ? `?source=${source}` : ''}`, authConfig()),
  getById: (id: string) => api.get<any>(`/editorials/${id}`, authConfig()),
  markRead: (id: string) => api.post<any>(`/editorials/${id}/mark-read`, {}, authConfig()),
  toggleSave: (id: string) => api.post<any>(`/editorials/${id}/save`, {}, authConfig()),
  summarize: (id: string) => api.post<any>(`/editorials/${id}/summarize`, {}, authConfig()),
  syncNews: () => api.post<any>('/editorials/sync-news', {}, authConfig()),
  getStats: () => api.get<any>('/editorials/stats', authConfig()),
};

// ==================== Mock Tests ====================

export const mockTestService = {
  getSubjects: () => api.get<any>('/mock-tests/subjects'),
  getConfig: () => api.get<any>('/mock-tests/config'),
  getPlatformStats: () => api.get<any>('/mock-tests/platform-stats'),
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
  getVideoQuestions: (videoId: string) => api.get<any>(`/videos/${videoId}/questions`),
  submitVideoQuiz: (videoId: string, answers: Record<string, number>) =>
    api.post<any>(`/videos/${videoId}/submit`, { answers }),
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

// ==================== Jeet AI Chat ====================

export const aiService = {
  chat: (message: string, conversationId?: string) =>
    api.post<any>('/ai/chat', { message, conversationId }, authConfig()),
  getConversations: () => api.get<any>('/ai/conversations', authConfig()),
  getConversation: (conversationId: string) =>
    api.get<any>(`/ai/conversations/${conversationId}`, authConfig()),
  deleteConversation: (conversationId: string) =>
    api.delete<any>(`/ai/conversations/${conversationId}`, authConfig()),
};

// ==================== CMS (Public) ====================

export const cmsService = {
  getPageContent: (slug: string) => api.get<any>(`/cms/${encodeURIComponent(slug)}`),
};

// ==================== PYQ (Public) ====================

export const pyqService = {
  getQuestions: (params?: {
    mode?: 'prelims' | 'mains';
    year?: number;
    subject?: string;
    paper?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.mode) query.set('mode', params.mode);
    if (params?.year) query.set('year', String(params.year));
    if (params?.subject) query.set('subject', params.subject);
    if (params?.paper) query.set('paper', params.paper);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<any>(`/pyq/questions${qs ? `?${qs}` : ''}`);
  },
};

// ==================== Flashcards ====================

export const flashcardService = {
  getSubjects: () => api.get<any>('/flashcards/subjects', authConfig()),
  getTopics: (subjectId: string) => api.get<any>(`/flashcards/${subjectId}/topics`, authConfig()),
  getCards: (subjectId: string, topicId: string) =>
    api.get<any>(`/flashcards/${subjectId}/${topicId}`, authConfig()),
  createCard: (data: {
    subjectId: string;
    subject?: string;
    topicId?: string;
    topic?: string;
    question: string;
    answer: string;
    difficulty?: string;
  }) => api.post<any>('/flashcards', data, authConfig()),
  updateProgress: (cardId: string, mastered: boolean) =>
    api.patch<any>(`/flashcards/${cardId}/progress`, { mastered }, authConfig()),
};

// ==================== Spaced Repetition ====================

export const spacedRepService = {
  getItems: (sourceType?: string) => {
    const qs = sourceType ? `?sourceType=${sourceType}` : '';
    return api.get<any>(`/spaced-repetition${qs}`, authConfig());
  },
  addItem: (data: {
    questionText: string;
    subject: string;
    source?: string;
    sourceType?: string;
    scheduleDay?: number;
    remindEnabled?: boolean;
  }) => api.post<any>('/spaced-repetition', data, authConfig()),
  updateItem: (id: string, data: { scheduleDay?: number; remindEnabled?: boolean; addedToFlashcard?: boolean }) =>
    api.patch<any>(`/spaced-repetition/${id}`, data, authConfig()),
  deleteItem: (id: string) => api.delete<any>(`/spaced-repetition/${id}`, authConfig()),
};

// ==================== Mindmap ====================

export const mindmapService = {
  getSubjects: () => api.get<any>('/mindmaps/subjects', authConfig()),
  getMindmaps: (subjectId: string) => api.get<any>(`/mindmaps/${subjectId}`, authConfig()),
  getMindmap: (subjectId: string, mindmapId: string) =>
    api.get<any>(`/mindmaps/${subjectId}/${mindmapId}`, authConfig()),
  updateProgress: (mindmapId: string, mastery: number, viewed?: boolean) =>
    api.patch<any>(`/mindmaps/${mindmapId}/progress`, { mastery, viewed }, authConfig()),
};

// ==================== User Profile & Settings ====================

export const userService = {
  getProfile: () => api.get<any>('/user/profile', authConfig()),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; bio?: string }) =>
    api.put<any>('/user/profile', data, authConfig()),
  updateSettings: (data: { notifications?: any; preferences?: any; privacy?: any }) =>
    api.put<any>('/user/settings', data, authConfig()),
  submitFeedback: (data: { rating: number; category?: string; workingWell?: string; couldBeBetter?: string }) =>
    api.post<any>('/user/feedback', data, authConfig()),
  getSyllabusTracker: () => api.get<any>('/user/syllabus-tracker', authConfig()),
  saveSyllabusTracker: (data: { mode: string; states: any }) =>
    api.put<any>('/user/syllabus-tracker', data, authConfig()),
};

// ==================== Syllabus Data ====================

export const syllabusService = {
  getSyllabus: () => api.get<any>('/syllabus'),
};

// ==================== Contact ====================

export const contactService = {
  submit: (data: { firstName: string; lastName: string; email: string; subject: string; message: string }) =>
    api.post<any>('/contact', data),
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
  getVideoQuestions: (videoId: string) => api.get<any>(`/admin/videos/${videoId}/questions`, authConfig()),
  createVideoQuestion: (videoId: string, data: { question: string; options: string[]; correctOption: number; explanation?: string; order?: number }) =>
    api.post<any>(`/admin/videos/${videoId}/questions`, data, authConfig()),
  deleteVideoQuestion: (videoId: string, qid: string) => api.delete<any>(`/admin/videos/${videoId}/questions/${qid}`, authConfig()),

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

  // CMS
  getCmsPages: () => api.get<any>('/admin/cms/pages', authConfig()),
  getCmsPage: (slug: string) => api.get<any>(`/admin/cms/pages/${encodeURIComponent(slug)}`, authConfig()),
  bulkUpdateCmsSections: (slug: string, sections: any[]) =>
    api.put<any>(`/admin/cms/pages/${encodeURIComponent(slug)}/bulk`, { sections }, authConfig()),
  createCmsSection: (data: any) => api.post<any>('/admin/cms/sections', data, authConfig()),
  updateCmsSection: (id: string, data: any) => api.put<any>(`/admin/cms/sections/${id}`, data, authConfig()),
  deleteCmsSection: (id: string) => api.delete<any>(`/admin/cms/sections/${id}`, authConfig()),
  uploadCmsMedia: async (file: File): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const token = getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/admin/cms/upload`,
      {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Upload failed');
    return json.data;
  },

  // Flashcard Management
  getFlashcardDecks: () => api.get<any>('/admin/flashcards/decks', authConfig()),
  createFlashcardDeck: (data: { subject: string; subjectId: string; icon?: string }) =>
    api.post<any>('/admin/flashcards/decks', data, authConfig()),
  updateFlashcardDeck: (id: string, data: { subject?: string; subjectId?: string; icon?: string }) =>
    api.put<any>(`/admin/flashcards/decks/${id}`, data, authConfig()),
  deleteFlashcardDeck: (id: string) => api.delete<any>(`/admin/flashcards/decks/${id}`, authConfig()),
  getFlashcardCards: (deckId?: string) =>
    api.get<any>(`/admin/flashcards/cards${deckId ? `?deckId=${deckId}` : ''}`, authConfig()),
  createFlashcardCard: (data: { deckId: string; topic: string; topicId: string; question: string; answer: string; difficulty?: string }) =>
    api.post<any>('/admin/flashcards/cards', data, authConfig()),
  updateFlashcardCard: (id: string, data: any) =>
    api.put<any>(`/admin/flashcards/cards/${id}`, data, authConfig()),
  deleteFlashcardCard: (id: string) => api.delete<any>(`/admin/flashcards/cards/${id}`, authConfig()),

  // Mindmap Management
  getMindmapSubjects: () => api.get<any>('/admin/mindmaps/subjects', authConfig()),
  createMindmapSubject: (data: { name: string; slug: string; icon?: string }) =>
    api.post<any>('/admin/mindmaps/subjects', data, authConfig()),
  updateMindmapSubject: (id: string, data: { name?: string; slug?: string; icon?: string }) =>
    api.put<any>(`/admin/mindmaps/subjects/${id}`, data, authConfig()),
  deleteMindmapSubject: (id: string) => api.delete<any>(`/admin/mindmaps/subjects/${id}`, authConfig()),
  getAdminMindmaps: () => api.get<any>('/admin/mindmaps', authConfig()),
  createAdminMindmap: (data: { subjectSlug: string; subjectName?: string; subjectIcon?: string; title: string; slug: string; branches: any; nodes: any; quizData?: any }) =>
    api.post<any>('/admin/mindmaps', data, authConfig()),
  updateAdminMindmap: (id: string, data: { title?: string; slug?: string; branches?: any; nodes?: any; quizData?: any }) =>
    api.put<any>(`/admin/mindmaps/${id}`, data, authConfig()),
  deleteAdminMindmap: (id: string) => api.delete<any>(`/admin/mindmaps/${id}`, authConfig()),

  // Spaced Rep Seeds
  getSpacedRepSeeds: (subject?: string) =>
    api.get<any>(`/admin/spaced-rep/seeds${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`, authConfig()),
  createSpacedRepSeed: (data: { subject: string; topic?: string; questionText: string; difficulty?: string }) =>
    api.post<any>('/admin/spaced-rep/seeds', data, authConfig()),
  updateSpacedRepSeed: (id: string, data: any) =>
    api.put<any>(`/admin/spaced-rep/seeds/${id}`, data, authConfig()),
  deleteSpacedRepSeed: (id: string) => api.delete<any>(`/admin/spaced-rep/seeds/${id}`, authConfig()),

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

// ==================== Test Series ====================

export const testSeriesService = {
  getStats: () => api.get<any>('/test-series/stats'),
  listSeries: () => api.get<any>('/test-series'),
  getEnrolled: () => api.get<any>('/test-series/enrolled', authConfig()),
  enroll: (seriesId: string) => api.post<any>(`/test-series/${seriesId}/enroll`, {}, authConfig()),
  unenroll: (seriesId: string) => api.delete<any>(`/test-series/${seriesId}/enroll`, authConfig()),
  // Admin
  createSeries: (data: any) => api.post<any>('/test-series', data, authConfig()),
  updateSeries: (seriesId: string, data: any) => api.put<any>(`/test-series/${seriesId}`, data, authConfig()),
  deleteSeries: (seriesId: string) => api.delete<any>(`/test-series/${seriesId}`, authConfig()),
};

// ==================== Study Materials (RAG) ====================

export const studyMaterialService = {
  list: (params?: { subject?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.subject) query.set('subject', params.subject);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return api.get<any>(`/admin/study-materials${qs ? `?${qs}` : ''}`, authConfig());
  },
  upload: async (file: File, subject: string, topic?: string, source?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    if (topic) formData.append('topic', topic);
    if (source) formData.append('source', source);
    const token = getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/admin/study-materials/upload`,
      { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Upload failed');
    return json;
  },
  delete: (id: string) => api.delete<any>(`/admin/study-materials/${id}`, authConfig()),

  listMockMaterials: (params?: { subject?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.subject) query.set('subject', params.subject);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return api.get<any>(`/admin/mock-test-materials${qs ? `?${qs}` : ''}`, authConfig());
  },
  uploadMockMaterial: async (file: File, subject: string, topic?: string, source?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('subject', subject);
    if (topic) formData.append('topic', topic);
    if (source) formData.append('source', source);
    const token = getToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}/admin/mock-test-materials/upload`,
      { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: formData }
    );
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Upload failed');
    return json;
  },
  deleteMockMaterial: (id: string) => api.delete<any>(`/admin/mock-test-materials/${id}`, authConfig()),
};
