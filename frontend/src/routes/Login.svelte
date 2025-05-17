<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { token, user, auth } from '../stores/auth';
  
  let username = '';
  let password = '';
  let error = '';
  let isLoading = false;
  
  async function handleLogin() {
    error = '';
    isLoading = true;
    
    try {
      const result = await auth.login(username, password);
      
      if (result.token) {
        // Store the token
        $token = result.token;
        
        // Navigate to home page
        push('/');
      } else {
        error = 'Login failed. No token received.';
      }
    } catch (err: any) { // Type the catch parameter as 'any'
      error = err.response?.data?.message || 'Login failed. Please try again.';
    } finally {
      isLoading = false;
    }
  }
</script>

<!-- Template remains the same -->

<!-- Template remains the same -->
<!-- ... -->

<!-- Template remains the same -->
<div class="login-container">
  <div class="card">
    <div class="card-header">
      <h2>Login</h2>
    </div>
    <div class="card-body">
      {#if error}
        <div class="alert alert-danger">{error}</div>
      {/if}
      
      <form on:submit|preventDefault={handleLogin}>
        <div class="form-group">
          <label for="username">Username</label>
          <input 
            type="text" 
            id="username"
            class="form-control" 
            bind:value={username} 
            required 
            disabled={isLoading}
          />
        </div>
        
        <div class="form-group mt-3">
          <label for="password">Password</label>
          <input 
            type="password" 
            id="password"
            class="form-control" 
            bind:value={password} 
            required 
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary mt-4 w-100" 
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f8f9fa;
  }
  
  .card {
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .card-header {
    background-color: #fff;
    border-bottom: 1px solid #eee;
    padding: 1.5rem;
    text-align: center;
  }
  
  .card-body {
    padding: 2rem;
  }
</style>