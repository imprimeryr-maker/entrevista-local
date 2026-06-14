window.Pages = window.Pages || {};

Pages.matching = {
  state: { clienteId: null, messages: [] },

  async render(el) {
    el.innerHTML = `
      <div class="page-title"><h1>💬 Matching Inteligente</h1><p>Selecciona un cliente y el AI te recomendará el proyecto más adecuado.</p></div>
      <div id="matching-content">
        <div class="loader-container"><div class="loader"></div><p>Cargando datos...</p></div>
      </div>
    `;
    await this.cargarDatos(el);
  },

  async cargarDatos(el) {
    try {
      const [clientes, status] = await Promise.all([API.listarClientes(), API.statusAI()]);
      const content = document.getElementById('matching-content');

      if (!status.ok) {
        content.innerHTML = '<div class="alert alert-error">⚠️ API Key no configurada. Configúrala en las variables de entorno del servidor.</div>';
        return;
      }

      if (!clientes.length) {
        content.innerHTML = '<div class="alert alert-warning">👥 No hay clientes registrados. Ve a <a href="#/clientes">Clientes</a> para agregar uno.</div>';
        return;
      }

      this.state.messages = [];

      content.innerHTML = `
        <div class="form-group">
          <label>1. Selecciona un cliente</label>
          <select id="match-cliente" onchange="Pages.matching.onClienteChange()">
            ${clientes.map(c => `<option value="${c.id}">${c.nombre} - ${c.profesion || 'N/A'}</option>`).join('')}
          </select>
        </div>
        <div id="match-cliente-info"></div>
        <div id="match-capacidad"></div>
        <div style="margin-top:16px;">
          <button class="btn btn-primary" onclick="Pages.matching.recomendar()" id="btn-recomendar" style="width:100%;">💬 Recomendar proyecto</button>
        </div>
        <div id="match-chat" style="margin-top:24px;"></div>
      `;

      this.state.clienteId = clientes[0].id;
      await this.mostrarInfoCliente(clientes[0].id);
    } catch (e) {
      document.getElementById('matching-content').innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  },

  async onClienteChange() {
    this.state.clienteId = document.getElementById('match-cliente').value;
    this.state.messages = [];
    document.getElementById('match-chat').innerHTML = '';
    document.getElementById('btn-recomendar').style.display = 'block';
    await this.mostrarInfoCliente(this.state.clienteId);
  },

  async mostrarInfoCliente(clienteId) {
    try {
      const clientes = await API.listarClientes();
      const c = clientes.find(x => x.id === clienteId);
      if (!c) return;

      const ingresos = c.ingresos || {};
      const total = ingresos.renta + ingresos.dividendos + ingresos.pensiones + ingresos.arriendos;
      const deudas = c.deudas || [];
      const descuento = deudas.filter(d => d.descontar).reduce((s, d) => s + (d.cuota || 0), 0);
      const neto = Math.max(0, total - descuento);
      const capacidad = c.capacidad_inversion || {};

      const infoEl = document.getElementById('match-cliente-info');
      infoEl.innerHTML = `
        <div class="expander open">
          <div class="expander-header" onclick="this.parentElement.classList.toggle('open')">
            <span>📋 ${c.nombre}</span>
            <span class="expander-arrow">▼</span>
          </div>
          <div class="expander-body">
            <p>📧 ${c.correo || 'N/A'} | 📞 ${c.telefono || 'N/A'}</p>
            <p>🎯 ${c.objetivo || 'N/A'}${c.sub_objetivo ? ` (${c.sub_objetivo})` : ''}</p>
          </div>
        </div>
      `;

      const capEl = document.getElementById('match-capacidad');
      capEl.innerHTML = `
        <div class="highlight-grid">
          <div class="highlight-item">
            <div class="num">$${total.toLocaleString()}</div>
            <div class="lbl">Ingresos / Mes</div>
          </div>
          <div class="highlight-item">
            <div class="num">$${capacidad.ahorro_pie?.toLocaleString() || 0}</div>
            <div class="lbl">Ahorro para Pie</div>
          </div>
          <div class="highlight-item">
            <div class="num">${(neto / 625 + 200).toFixed(2)} UF</div>
            <div class="lbl">Límite Máx. Crédito</div>
          </div>
        </div>
        ${descuento > 0 ? `<div class="alert alert-info">📉 Descuento por deudas: -$${descuento.toLocaleString()}/mes. Ingreso neto: $${neto.toLocaleString()}/mes</div>` : ''}
      `;
    } catch (e) {
      console.error(e);
    }
  },

  async recomendar() {
    const btn = document.getElementById('btn-recomendar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-inline"></span> Analizando...';

    const chatEl = document.getElementById('match-chat');
    chatEl.innerHTML = '';

    try {
      const res = await API.recomendar({ cliente_id: this.state.clienteId });
      this.state.messages.push({ role: 'assistant', content: res.recomendacion });
      this.renderChat(chatEl);
      btn.style.display = 'none';
    } catch (e) {
      chatEl.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
      btn.disabled = false;
      btn.innerHTML = '💬 Recomendar proyecto';
    }
  },

  renderChat(container) {
    container.innerHTML = `
      <div class="chat-container">
        ${this.state.messages.map(m => `
          <div class="chat-msg ${m.role}">
            <div class="role">${m.role === 'assistant' ? '🤖 Asesor AI' : '👤 Tú'}</div>
            <div class="content">${m.content}</div>
          </div>
        `).join('')}
      </div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Haz una pregunta sobre el proyecto recomendado..." onkeypress="if(event.key==='Enter') Pages.matching.enviarMensaje()">
        <button class="btn btn-primary" onclick="Pages.matching.enviarMensaje()">Enviar</button>
      </div>
    `;
    container.scrollIntoView({ behavior: 'smooth' });
  },

  async enviarMensaje() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    this.state.messages.push({ role: 'user', content: text });
    const container = document.getElementById('match-chat');
    this.renderChat(container);

    try {
      const response = await fetch('/api/ai/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: this.state.clienteId,
          messages: this.state.messages.slice(-10),
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      const msgDiv = document.createElement('div');
      msgDiv.className = 'chat-msg assistant';
      msgDiv.innerHTML = '<div class="role">🤖 Asesor AI</div><div class="content"></div>';
      container.querySelector('.chat-container').appendChild(msgDiv);
      const contentDiv = msgDiv.querySelector('.content');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                result += parsed.content;
                contentDiv.textContent = result;
              }
            } catch {}
          }
        }
      }

      if (result) {
        this.state.messages.push({ role: 'assistant', content: result });
      }
    } catch (e) {
      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert alert-error';
      alertDiv.textContent = `Error: ${e.message}`;
      container.appendChild(alertDiv);
    }
  },
};
