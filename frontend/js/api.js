const API = {
  async request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || `Error ${res.status}`);
    }
    if (path === '/ai/chat-stream') return res;
    return res.json();
  },

  get(path) { return this.request('GET', path); },
  post(path, body) { return this.request('POST', path, body); },
  put(path, body) { return this.request('PUT', path, body); },
  del(path) { return this.request('DELETE', path); },

  // Proyectos
  listarProyectos() { return this.get('/proyectos'); },
  crearProyecto(data) { return this.post('/proyectos', data); },
  actualizarProyecto(id, data) { return this.put(`/proyectos/${id}`, data); },
  eliminarProyecto(id) { return this.del(`/proyectos/${id}`); },

  // Clientes
  listarClientes() { return this.get('/clientes'); },
  crearCliente(data) { return this.post('/clientes', data); },
  actualizarCliente(id, data) { return this.put(`/clientes/${id}`, data); },
  eliminarCliente(id) { return this.del(`/clientes/${id}`); },

  // Promociones
  listarPromociones() { return this.get('/promociones'); },
  listarMeses() { return this.get('/promociones/meses'); },
  crearPromocion(data) { return this.post('/promociones', data); },
  eliminarPromocion(id) { return this.del(`/promociones/${id}`); },
  analizarExcel(data) { return this.post('/promociones/analizar-excel', data); },

  // AI
  statusAI() { return this.get('/ai/status'); },
  recomendar(data) { return this.post('/ai/recomendar', data); },
  chatStream(data) { return this.post('/ai/chat-stream', data); },
  analizarPDF(data) { return this.post('/ai/analizar-pdf', data); },
  buscarProyecto(data) { return this.post('/ai/buscar-proyecto', data); },
  getUF() { return this.get('/ai/uf'); },
  getTokenUsage() { return this.get('/ai/token-usage'); },
  resetTokenUsage() { return this.post('/ai/token-usage/reset'); },
};
