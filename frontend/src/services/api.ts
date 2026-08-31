import axios from 'axios';
import type { AxiosAdapter, AxiosResponse } from 'axios';

// When VITE_API_URL is unset (e.g. on GitHub Pages), run in DEMO mode:
// intercept API calls locally so the UI is browsable without a backend (no 405).
export const IS_DEMO = !import.meta.env.VITE_API_URL;

const TOKEN_KEY = 'brainarena_token';
const USER_KEY = 'brainarena_user';

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const mockAdapter: AxiosAdapter = async (config): Promise<AxiosResponse> => {
  const base = config.baseURL || '';
  const rawUrl = config.url || '';
  const url = (rawUrl.startsWith('http') ? rawUrl : base + rawUrl).replace(base, '');
  let payload: any = {};
  try {
    payload = config.data ? JSON.parse(config.data) : {};
  } catch {
    payload = {};
  }

  await delay(250);

  let body: any = { success: true, data: {} };

  if (url.includes('/auth/login') || url.includes('/auth/register')) {
    const allowed = ['teacher', 'student', 'admin'];
    const role = allowed.includes(payload.role) ? payload.role : 'student';
    const user = {
      id: 'demo-user',
      name: payload.name || (role === 'teacher' ? 'Demo Teacher' : role === 'admin' ? 'Demo Admin' : 'Demo Student'),
      email: payload.email || 'demo@brainarena.app',
      role,
    };
    localStorage.setItem(TOKEN_KEY, 'demo-token');
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    body = { token: 'demo-token', user };
  } else if (url.includes('/auth/me')) {
    const raw = localStorage.getItem(USER_KEY);
    body = { user: raw ? JSON.parse(raw) : null };
  } else if (url.includes('/auth/logout')) {
    body = { success: true };
  } else if (url.includes('/quizzes')) {
    body = { quizzes: [], quiz: null };
  } else if (url.includes('/banks')) {
    body = { banks: [], bank: null };
  } else if (url.includes('/results')) {
    body = { results: [], result: null };
  } else if (url.includes('/sessions') || url.includes('/live')) {
    body = { sessions: [], session: null, leaderboard: [], participants: [] };
  } else if (url.includes('/analysis') || url.includes('/insights')) {
    body = { analysis: null, insights: [] };
  } else if (url.includes('/import') || url.includes('/export')) {
    body = { jobId: 'demo', status: 'done', url: '#' };
  } else if (url.includes('/admin/users')) {
    if (url.includes('/approve') || url.includes('/reject')) {
      body = { user: { _id: 'demo', name: 'Demo User', email: 'demo@brainarena.app', role: 'teacher', status: url.includes('/approve') ? 'approved' : 'rejected' } };
    } else {
      body = { users: [] };
    }
  } else if (url.includes('/admin/stats')) {
    body = { total: 0, pending: 0, approved: 0, rejected: 0, teachers: 0, students: 0, admins: 1 };
  } else if (url.includes('/ai/')) {
    body = {
      questions: [
        {
          text: 'Sample question (demo mode)',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0,
          explanation: 'Demo explanation — connect a backend for real AI generation.',
          difficulty: 'medium',
          topic: 'Demo',
        },
      ],
    };
  } else {
    body = { data: [] };
  }

  return {
    data: body,
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  } as AxiosResponse;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  adapter: IS_DEMO ? mockAdapter : undefined,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return Promise.reject(error);
  },
);
