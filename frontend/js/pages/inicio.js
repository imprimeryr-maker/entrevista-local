window.Pages = window.Pages || {};

Pages.inicio = {
  async render(el) {
    let proyectos = [], clientes = [];
    try {
      [proyectos, clientes] = await Promise.all([API.listarProyectos(), API.listarClientes()]);
    } catch {}

    el.innerHTML = `
      <div class="page-title">
        <div style="font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">RyR Consultor Inmobiliario</div>
        <h1>🏢 Consultor Inmobiliario</h1>
        <p>Asistente inteligente para matching de clientes con proyectos inmobiliarios</p>
      </div>

      <div class="grid-3">
        <div class="card">
          <h3>📋 Gestionar Proyectos</h3>
          <p>Agrega proyectos inmobiliarios de dos formas:</p>
          <ul>
            <li><strong>Búsqueda web:</strong> Ingresa el nombre y el AI buscará información automáticamente</li>
            <li><strong>Subir PDF:</strong> Carga la presentación del proyecto y el AI la analizará</li>
          </ul>
        </div>
        <div class="card">
          <h3>👥 Registrar Clientes</h3>
          <p>Ingresa la ficha financiera completa de cada cliente:</p>
          <ul>
            <li>Datos personales</li>
            <li>Ingresos y renta</li>
            <li>Capacidad de inversión</li>
            <li>Deudas, activos y cuentas</li>
          </ul>
        </div>
        <div class="card">
          <h3>💬 Matching Inteligente</h3>
          <p>Selecciona un cliente y el AI te recomendará:</p>
          <ul>
            <li>Qué proyecto se adapta mejor a su perfil</li>
            <li>Análisis detallado de capacidad financiera</li>
            <li>Chat interactivo para resolver dudas</li>
          </ul>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
        <div class="card" style="text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#D4AF37;">${proyectos.length}</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Proyectos</div>
          <a href="#/proyectos" class="btn" style="margin-top:12px;">Gestionar →</a>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:32px;font-weight:700;color:#D4AF37;">${clientes.length}</div>
          <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Clientes</div>
          <a href="#/clientes" class="btn" style="margin-top:12px;">Gestionar →</a>
        </div>
      </div>

      <div style="margin-top:24px;padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;border:1px solid rgba(212,175,55,0.1);">
        <h3 style="font-size:15px;color:#D4AF37;margin-bottom:8px;">¿Cómo empezar?</h3>
        <ol style="color:#d1d5db;font-size:14px;line-height:2;">
          <li><strong>Configura tu API Key</strong> en las variables de entorno del servidor</li>
          <li>Ve a <a href="#/proyectos">📋 Proyectos</a> y agrega los proyectos inmobiliarios</li>
          <li>Ve a <a href="#/clientes">👥 Clientes</a> y registra los perfiles financieros</li>
          <li>Ve a <a href="#/matching">💬 Matching</a> para obtener la recomendación del AI</li>
        </ol>
      </div>
    `;
  },
};
