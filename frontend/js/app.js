let tokenNextReset = null;

function actualizarCountdown() {
  const el = document.getElementById('token-countdown');
  if (!el || !tokenNextReset) return;
  const diff = new Date(tokenNextReset) - new Date();
  if (diff <= 0) { el.textContent = '🔄'; return; }
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  el.textContent = `⏰ ${h}h ${m}m ${s}s`;
}

async function actualizarTokenCounter() {
  try {
    const data = await API.getTokenUsage();
    const uso = data.usage;
    const limite = data.active_limit || 1000000;
    const pct = Math.min(uso.total / limite, 1);
    tokenNextReset = data.next_reset_utc;

    document.getElementById('token-counter').style.display = 'flex';
    document.getElementById('token-text').textContent = `${uso.total.toLocaleString()} / ${limite.toLocaleString()}`;
    document.getElementById('token-bar').style.width = `${(pct * 100).toFixed(1)}%`;
    actualizarCountdown();
  } catch {
    // ignora errores silenciosamente
  }
}

(async function init() {
  // Verificar estado AI
  try {
    const [st, cfg] = await Promise.all([API.statusAI(), API.get('/ai/config')]);
    const dot = document.getElementById('ai-status-dot');
    const text = document.getElementById('ai-status-text');
    const providerName = (cfg.available_providers || {})[cfg.provider]?.name || cfg.provider;
    if (st.ok) {
      dot.className = 'status-dot online';
      text.textContent = `${providerName} ✅`;
    } else {
      dot.className = 'status-dot offline';
      text.textContent = 'API Key no configurada';
    }
  } catch {
    document.getElementById('ai-status-dot').className = 'status-dot offline';
    document.getElementById('ai-status-text').textContent = 'Error de conexión';
  }

  // Token counter
  await actualizarTokenCounter();
  setInterval(actualizarTokenCounter, 15000);
  setInterval(actualizarCountdown, 1000);

  // Registrar rutas
  Router.register('/', (el) => Pages.inicio.render(el));
  Router.register('/proyectos', (el) => Pages.proyectos.render(el));
  Router.register('/clientes', (el) => Pages.clientes.render(el));
  Router.register('/matching', (el) => Pages.matching.render(el));
  Router.register('/promociones', (el) => Pages.promociones.render(el));
  Router.register('/configuracion', (el) => Pages.configuracion.render(el));

  Router.init();
})();
