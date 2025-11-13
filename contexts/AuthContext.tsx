import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, LoginCredentials, RegisterCredentials } from '../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
}

interface AuthContextData {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('@mirsui:user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      
      const userData: User = {
        id: response.user.id,
        email: response.user.email,
        username: response.user.user_metadata.username,
        display_name: response.user.user_metadata.display_name,
        avatar_url: response.user.user_metadata.avatar_url,
      };

      await AsyncStorage.setItem('@mirsui:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@mirsui:token', response.session.access_token);
      await AsyncStorage.setItem('@mirsui:refresh_token', response.session.refresh_token);
      
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erro ao fazer login');
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      const response = await authService.register(credentials);
      
      const userData: User = {
        id: response.user.id,
        email: response.user.email,
        username: response.user.user_metadata.username,
        display_name: response.user.user_metadata.display_name,
        avatar_url: response.user.user_metadata.avatar_url,
      };

      await AsyncStorage.setItem('@mirsui:user', JSON.stringify(userData));
      await AsyncStorage.setItem('@mirsui:token', response.session.access_token);
      await AsyncStorage.setItem('@mirsui:refresh_token', response.session.refresh_token);
      
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erro ao criar conta');
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem('@mirsui:token');
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      await AsyncStorage.multiRemove(['@mirsui:user', '@mirsui:token', '@mirsui:refresh_token']);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
