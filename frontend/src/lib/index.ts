import axios from 'axios';
import type { Writable } from 'svelte/store';

// Define interface for the API instance
export interface ApiInstance {
  api: ReturnType<typeof axios.create>;
  auth: {
    login: (user: string, pass: string) => Promise<any>;
  };
  search: {
    query: (name: string, type: string) => Promise<any>;
  };
}

// Initialize API without immediate token dependency
export const createApi = (tokenStore: Writable<string | null>): ApiInstance => {
  // Get token value from store
  let currentToken: string | null = null;
  tokenStore.subscribe((value: string | null) => {
    currentToken = value;
  });
  
  // API base URL
  const API_URL = 'http://localhost:3000';
  
  // Create axios instance
  const api = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // Add request interceptor to include auth token
  api.interceptors.request.use(
    (config) => {
      if (currentToken) {
        config.headers['Authorization'] = `Bearer ${currentToken}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  // Auth methods
  const auth = {
    login: async (user: string, pass: string) => {
      try {
        const response = await api.post('/login', { user, pass });
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  };
  
  // Search methods
  const search = {
    query: async (name: string, type: string) => {
      try {
        const response = await api.post('/search', { name, type });
        return response.data;
      } catch (error) {
        throw error;
      }
    }
  };
  
  return { api, auth, search };
};

// Export a dummy value to keep TypeScript happy
export default {};