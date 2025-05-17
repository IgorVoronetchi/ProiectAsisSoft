<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { isAuthenticated, logout, search } from '../stores/auth';
  
  // Define an interface for search results
  interface SearchResult {
    name: string;
    wealth?: string;
    position?: string;
    value?: string;
    employees?: string;
  }
  
  let searchName = '';
  let searchType = 'client'; // Default to client
  let searchResult: SearchResult | null = null;
  let error = '';
  let isLoading = false;
  let searchPerformed = false;
  
  // Check authentication
  if (!$isAuthenticated) {
    push('/login');
  }
  
  async function handleSearch() {
    error = '';
    isLoading = true;
    searchResult = null;
    searchPerformed = true;
    
    try {
      const result = await search.query(searchName, searchType);
      searchResult = result;
    } catch (error: any) { // Type the error as 'any' to access its properties
      if (error.response?.status === 404) {
        error = 'Nu s-a găsit niciun rezultat în baza de date.';
      } else {
        error = error.response?.data?.message || 'Search failed. Please try again.';
      }
    } finally {
      isLoading = false;
    }
  }
  
  function handleLogout() {
    logout();
    push('/login');
  }
</script>

<!-- Template remains the same -->

<!-- Template remains the same -->
<div class="container mt-5">
  <div class="card">
    <div class="card-header d-flex justify-content-between align-items-center">
      <h2>Search Information</h2>
      <button class="btn btn-outline-secondary" on:click={handleLogout}>Logout</button>
    </div>
    <div class="card-body">
      <form on:submit|preventDefault={handleSearch}>
        <div class="mb-3">
          <label for="searchName" class="form-label">Nume:</label>
          <input 
            type="text" 
            id="searchName"
            class="form-control" 
            bind:value={searchName} 
            required 
            disabled={isLoading}
          />
        </div>
        
        <div class="mb-3">
          <label for="searchType" class="form-label">Tip:</label>
          <select 
            id="searchType"
            class="form-select" 
            bind:value={searchType} 
            disabled={isLoading}
          >
            <option value="client">Client</option>
            <option value="company">Companie</option>
          </select>
        </div>
        
        <button 
          type="submit" 
          class="btn btn-primary w-100" 
          disabled={isLoading}
        >
          {isLoading ? 'Searching...' : 'Obține informații'}
        </button>
      </form>
      
      {#if searchPerformed}
        <div class="mt-4">
          {#if error}
            <div class="alert alert-warning">
              {error}
            </div>
          {:else if searchResult}
            <div class="card">
              <div class="card-header">
                <h4>{searchResult.name}</h4>
              </div>
              <div class="card-body">
                <ul class="list-group list-group-flush">
                  {#if searchType === 'client'}
                    <li class="list-group-item">{searchResult.wealth}</li>
                    <li class="list-group-item">{searchResult.position}</li>
                  {:else}
                    <li class="list-group-item">{searchResult.value}</li>
                    <li class="list-group-item">{searchResult.employees}</li>
                  {/if}
                </ul>
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .container {
    max-width: 800px;
  }
</style>