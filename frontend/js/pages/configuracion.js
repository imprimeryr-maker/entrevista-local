window.Pages = window.Pages || {};
var cfgCountdownInterval = null;

Pages.configuracion = {
  async render(el) {
    if (cfgCountdownInterval) clearInterval(cfgCountdownInterval);
    el.innerHTML = `
      <div class="page-title"><h1>⚙️ Configuración</h1><p>Gestiona el proveedor AI, modelo y respaldos.</p></div>
      <div style="display:grid;gap:24px;max-width:700px;">
        <div class="card">
          <h3>🧠 Proveedor AI</h3>
          <p style="font-size:13px;color:#9ca3af;margin-bottom:16px;">Selecciona el proveedor de inteligencia artificial. Debes tener la API Key configurada en las variables de entorno del servidor.</p>
          <div class="form-group">
            <label>Proveedor activo</label>
            <select id="cfg-provider" onchange="Pages.configuracion.onProviderChange()"></select>
          </div>
          <div id="cfg-provider-status"></div>
        </div>

          <div class="card">
            <h3>🎯 Modelo</h3>
            <p id="cfg-tier-desc" style="font-size:13px;color:#9ca3af;margin-bottom:16px;">Premium usa el modelo de 70B (mayor calidad). Rápido usa el modelo de 8B (menos tokens, más veloz).</p>
          <div style="display:flex;gap:12px;">
            <label class="radio-card" id="cfg-tier-super">
              <input type="radio" name="cfg-tier" value="super" onchange="Pages.configuracion.onTierChange()">
              <div class="radio-card-content">
                <div class="radio-card-title">Premium</div>
                <div class="radio-card-desc">70B · Mayor calidad</div>
              </div>
            </label>
            <label class="radio-card" id="cfg-tier-nano">
              <input type="radio" name="cfg-tier" value="nano" onchange="Pages.configuracion.onTierChange()">
              <div class="radio-card-content">
                <div class="radio-card-title">Rápido</div>
                <div class="radio-card-desc">8B · Menos tokens</div>
              </div>
            </label>
          </div>
          <div id="cfg-tier-result" style="margin-top:12px;"></div>
        </div>

        <div class="card">
          <h3>📊 Consumo de tokens</h3>
          <div id="cfg-tokens">
            <div class="loader-container"><div class="loader"></div></div>
          </div>
          <div style="margin-top:12px;">
            <button class="btn btn-sm" onclick="Pages.configuracion.resetTokens()">🔄 Reiniciar contador</button>
          </div>
        </div>

        <div class="card">
          <h3>💾 Backup a GitHub</h3>
          <p style="font-size:13px;color:#9ca3af;margin-bottom:16px;">Sube los datos (clientes, proyectos, promociones) a GitHub como respaldo de seguridad.</p>
          <button class="btn btn-primary" onclick="Pages.configuracion.backup()" id="cfg-backup-btn" style="width:100%;">📤 Subir a GitHub</button>
          <div id="cfg-backup-result" style="margin-top:12px;"></div>
          <div id="cfg-backup-log" style="margin-top:12px;"></div>
        </div>
      </div>
    `;
    await this.cargarConfig();
    await this.cargarTokens();
    this.cargarBackupLog();
  },

  async cargarConfig() {
    try {
      const data = await API.get('/ai/config');
      const select = document.getElementById('cfg-provider');
      select.innerHTML = Object.entries(data.available_providers || {}).map(([key, p]) =>
        `<option value="${key}" ${key === data.provider ? 'selected' : ''}>${p.name} ${p.configured ? '✅' : '⚠️ Sin API Key'}</option>`
      ).join('');

      document.querySelectorAll('input[name="cfg-tier"]').forEach(el => {
        el.checked = el.value === data.tier;
      });

      const desc = document.getElementById('cfg-tier-desc');
      const superDesc = document.querySelector('#cfg-tier-super .radio-card-desc');
      const nanoDesc = document.querySelector('#cfg-tier-nano .radio-card-desc');
      if (data.provider === 'aurelius') {
        desc.textContent = 'Premium y Rápido usan el mismo modelo local (7B). No hay límite de tokens.';
        if (superDesc) superDesc.textContent = '7B · Mismo modelo';
        if (nanoDesc) nanoDesc.textContent = '7B · Mismo modelo';
      }
      await this.mostrarStatusProveedor(data.provider);
    } catch (e) {
      document.getElementById('cfg-provider-status').innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  },

  async mostrarStatusProveedor(provider) {
    try {
      const res = await API.post('/ai/config/check-key', { provider });
      const div = document.getElementById('cfg-provider-status');
      div.innerHTML = res.ok
        ? '<div class="alert alert-success">✅ API Key configurada correctamente</div>'
        : '<div class="alert alert-error">⚠️ API Key no configurada. Agrégala en las variables de entorno del servidor.</div>';
    } catch {
      document.getElementById('cfg-provider-status').innerHTML = '<div class="alert alert-error">Error al verificar API Key</div>';
    }
  },

  async onProviderChange() {
    const provider = document.getElementById('cfg-provider').value;
    document.getElementById('cfg-provider-status').innerHTML = '<span class="spinner-inline"></span> Cambiando proveedor...';
    const desc = document.getElementById('cfg-tier-desc');
    const superDesc = document.querySelector('#cfg-tier-super .radio-card-desc');
    const nanoDesc = document.querySelector('#cfg-tier-nano .radio-card-desc');
    if (provider === 'aurelius') {
      desc.textContent = 'Usa el agente Aurelius vía OpenClaw Gateway. Sin límite de tokens.';
      if (superDesc) superDesc.textContent = 'Aurelius';
      if (nanoDesc) nanoDesc.textContent = 'Aurelius';
    } else {
      desc.textContent = 'Premium usa el modelo de 70B (mayor calidad). Rápido usa el modelo de 8B (menos tokens, más veloz).';
      if (superDesc) superDesc.textContent = '70B · Mayor calidad';
      if (nanoDesc) nanoDesc.textContent = '8B · Menos tokens';
    }
    try {
      await API.post('/ai/config', { provider });
      await this.mostrarStatusProveedor(provider);
    } catch (e) {
      document.getElementById('cfg-provider-status').innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  },

  async onTierChange() {
    const tier = document.querySelector('input[name="cfg-tier"]:checked')?.value;
    if (!tier) return;
    const div = document.getElementById('cfg-tier-result');
    const provider = document.getElementById('cfg-provider')?.value;
    div.innerHTML = '<span class="spinner-inline"></span> Cambiando modelo...';
    try {
      await API.post('/ai/config', { tier });
      const label = provider === 'aurelius' ? '7B' : (tier === 'super' ? '70B' : '8B');
      div.innerHTML = `<div class="alert alert-success">✅ Modelo cambiado a ${tier === 'super' ? 'Premium' : 'Rápido'} (${label})</div>`;
      setTimeout(() => div.innerHTML = '', 3000);
    } catch (e) {
      div.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  },

  async cargarTokens() {
    try {
      const data = await API.getTokenUsage();
      const uso = data.usage || {};
      const limite = data.active_limit || 1000000;
      const provider = data.active_provider || 'groq';
      const tier = data.active_tier || 'super';
      const nextReset = data.next_reset_utc;
      const total = uso.total || 0;
      const prompt = uso.prompt || 0;
      const completion = uso.completion || 0;
      const pct = Math.min(total / limite, 1);
      const providerLabels = { groq: 'Groq', openrouter: 'OpenRouter', gemini: 'Gemini', aurelius: 'Aurelius' };
      const pName = providerLabels[provider] || provider;
      const tLabel = provider === 'aurelius' ? '7B' : (tier === 'super' ? '70B' : '8B');

      const diff = nextReset ? new Date(nextReset) - new Date() : 0;
      const cd = diff > 0
        ? `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
        : '🔄';

      document.getElementById('cfg-tokens').innerHTML = `
        <div style="margin-bottom:12px;">
          <div style="font-size:24px;font-weight:700;color:#D4AF37;">${total.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280;">tokens totales usados</div>
        </div>
        <div style="font-size:13px;color:#9ca3af;margin-bottom:8px;">
          ⬆️ ${prompt.toLocaleString()} enviados · ⬇️ ${completion.toLocaleString()} recibidos
        </div>
        <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Límite diario (${pName} ${tLabel}): ${limite.toLocaleString()} tokens</div>
        <div class="token-bar-bg" style="width:100%;height:8px;"><div class="token-bar-fill" style="width:${(pct * 100).toFixed(1)}%;height:100%;"></div></div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;text-align:right;">${(pct * 100).toFixed(1)}%</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:8px;">⏰ Reinicio en: <strong id="cfg-countdown">${cd}</strong></div>
      `;

      if (nextReset) {
        cfgCountdownInterval = setInterval(function() {
          var el = document.getElementById('cfg-countdown');
          if (!el) return;
          var d = new Date(nextReset) - new Date();
          if (d <= 0) { el.textContent = '\u{1F504}'; return; }
          var h = Math.floor(d / 3600000);
          var m = Math.floor((d % 3600000) / 60000);
          var s = Math.floor((d % 60000) / 1000);
          el.textContent = h + 'h ' + m + 'm ' + s + 's';
        }, 1000);
      }
    } catch {
      document.getElementById('cfg-tokens').innerHTML = '<div class="alert alert-error">Error al cargar uso de tokens</div>';
    }
  },

  async resetTokens() {
    try {
      await API.resetTokenUsage();
      await this.cargarTokens();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  },

  async backup() {
    const btn = document.getElementById('cfg-backup-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span> Subiendo...';
    const div = document.getElementById('cfg-backup-result');
    div.innerHTML = '';

    try {
      const res = await API.post('/ai/backup/github', {});
      div.innerHTML = res.ok
        ? `<div class="alert alert-success">✅ ${res.mensaje}</div>`
        : `<div class="alert alert-error">⚠️ ${res.mensaje}</div>`;
      this.cargarBackupLog();
    } catch (e) {
      div.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '📤 Subir a GitHub';
    }
  },

  async cargarBackupLog() {
    const div = document.getElementById('cfg-backup-log');
    try {
      const res = await API.get('/ai/backup/log');
      const text = res.log || '';
      if (text.trim()) {
        div.innerHTML = `
          <div class="expander">
            <div class="expander-header" onclick="this.parentElement.classList.toggle('open')">
              <span>📋 Historial de backups</span>
              <span class="expander-arrow">▼</span>
            </div>
            <div class="expander-body"><pre style="font-size:11px;color:#9ca3af;white-space:pre-wrap;max-height:200px;overflow-y:auto;">${text}</pre></div>
          </div>`;
      } else {
        div.innerHTML = '<p style="font-size:12px;color:#6b7280;">No hay registros de backup aún.</p>';
      }
    } catch {
      div.innerHTML = '<p style="font-size:12px;color:#6b7280;">No hay registros de backup aún.</p>';
    }
  },
};
