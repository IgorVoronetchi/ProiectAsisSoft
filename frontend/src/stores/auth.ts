import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { createApi } from '../lib';

// Create interface for user
export interface User {
  user: string;
  role?: string;
  [key: string]: any;
}

// Check if token exists in localStorage (safely)
const getStoredToken = (): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('token');
    }
  } catch (e) {
    console.error('localStorage is not available:', e);
  }
  return null;
};

// Create writable stores
export const token: Writable<string | null> = writable<string | null>(getStoredToken());
export const user: Writable<User | null> = writable<User | null>(null);
export const isAuthenticated: Writable<boolean> = writable<boolean>(!!getStoredToken());

// Initialize API with the token store
const apiInstance = createApi(token);
export const api = apiInstance.api;
export const auth = apiInstance.auth;
export const search = apiInstance.search;

// Save token to localStorage whenever it changes (safely)
token.subscribe(value => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (value) {
        window.localStorage.setItem('token', value);
        isAuthenticated.set(true);
      } else {
        window.localStorage.removeItem('token');
        isAuthenticated.set(false);
      }
    }
  } catch (e) {
    console.error('localStorage is not available:', e);
  }
});

// Function to log out
export function logout() {
  token.set(null);
  user.set(null);
}