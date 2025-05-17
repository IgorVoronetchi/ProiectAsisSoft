<script lang="ts">
  import Router from 'svelte-spa-router';
  import { routes } from './routes';
  import 'bootstrap/dist/css/bootstrap.min.css';
</script>

<main>
  <Router {routes} />
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: Arial, Helvetica, sans-serif;
    background-color: #f8f9fa;
  }
</style>