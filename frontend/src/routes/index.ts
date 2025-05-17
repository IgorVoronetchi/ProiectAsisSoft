import Home from './Home.svelte';
import Login from './Login.svelte';

// We'll use a simple record without complex types
export const routes = {
  '/': Home,
  '/login': Login
};