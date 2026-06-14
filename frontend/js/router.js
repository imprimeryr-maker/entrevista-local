const Router = {
  routes: {},

  register(path, handler) {
    this.routes[path] = handler;
  },

  async navigate(path) {
    path = path || '/';
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="loader-container"><div class="loader"></div><p>Cargando...</p></div>';

    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.route === path);
    });

    const handler = this.routes[path];
    if (handler) {
      try {
        await handler(main);
      } catch (e) {
        main.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
      }
    }
  },

  init() {
    window.addEventListener('hashchange', () => {
      const path = window.location.hash.slice(1) || '/';
      this.navigate(path);
    });
    const path = window.location.hash.slice(1) || '/';
    this.navigate(path);
  },
};
