import axios from 'axios';
import type { Writable } from 'svelte/store';

// Define token type explicitly (will be imported properly later)
let tokenStore: Writable<string | null>;

// Will be imported properly once the auth store is fixed
const initApi = (token: Writable<string | null>) => {
  tokenStore = token;
  
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

export default initApi;