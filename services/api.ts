import axios from 'axios';

// Configure your backend URL here
const API_URL = 'http://localhost:3000'; // dev: http://localhost:3000

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    user_metadata: {
      username: string;
      display_name: string;
      avatar_url: string;
    };
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/signup', credentials);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordData): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', data);
    return response.data;
  },

  logout: async (token: string): Promise<void> => {
    await api.post('/auth/logout', {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export default api;
