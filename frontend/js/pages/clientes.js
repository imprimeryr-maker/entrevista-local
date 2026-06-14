window.Pages = window.Pages || {};

Pages.clientes = {
  async render(el) {
    el.innerHTML = `
      <div class="page-title"><h1>👥 Clientes</h1><p>Registra la ficha financiera completa de tus clientes.</p></div>
      <div class="expander" id="add-cliente-expander">
        <div class="expander-header" onclick="this.parentElement.classList.toggle('open')">
          <span>➕ Registrar nuevo cliente</span>
          <span class="expander-arrow">▼</span>
        </div>
        <div class="expander-body" id="form-cliente-body">
          <div class="section-title">📋 Datos del Cliente</div>
          <div class="form-row">
            <div class="form-group"><label>Nombre completo</label><input type="text" id="c-nombre" placeholder="Ej: Juan Pérez"></div>
            <div class="form-group"><label>Teléfono</label><input type="text" id="c-telefono" placeholder="+56 9 1234 5678"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Correo electrónico</label><input type="email" id="c-correo" placeholder="juan@email.com"></div>
            <div class="form-group"><label>RUT</label><input type="text" id="c-rut" placeholder="12.345.678-9"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Estado Civil</label><select id="c-estado-civil"><option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option><option>Conviviente</option></select></div>
            <div class="form-group"><label>Profesión / Ocupación</label><input type="text" id="c-profesion" placeholder="Ingeniero Comercial"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Objetivo</label><select id="c-objetivo" onchange="Pages.clientes.toggleEstrategia()"><option value="Vivir">Vivir</option><option value="Invertir">Invertir</option></select></div>
            <div class="form-group" id="c-estrategia-group" style="display:none;"><label>Estrategia de inversión</label><select id="c-estrategia"><option>Rentabilidad</option><option>Jubilación</option><option>Libertad financiera</option></select></div>
          </div>
          <div class="form-group"><label>Dirección</label><input type="text" id="c-direccion" placeholder="Av. Siempre Viva 123, Santiago"></div>

          <div class="section-title" style="margin-top:24px;">💰 Ingresos y Renta</div>
          <div class="form-row">
            <div class="form-group"><label>Renta mensual ($)</label><input type="number" id="c-renta" min="0" step="100000" value="0"></div>
            <div class="form-group"><label>Dividendos ($)</label><input type="number" id="c-dividendos" min="0" step="10000" value="0"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Pensiones ($)</label><input type="number" id="c-pensiones" min="0" step="10000" value="0"></div>
            <div class="form-group"><label>Arriendos ($)</label><input type="number" id="c-arriendos" min="0" step="10000" value="0"></div>
          </div>

          <div class="section-title" style="margin-top:24px;">🏦 Capacidad de Inversión</div>
          <div class="form-row">
            <div class="form-group"><label>Ahorro para pie ($)</label><input type="number" id="c-ahorro-pie" min="0" step="1000000" value="0"></div>
            <div class="form-group"><label>CAM - Cap. Ahorro Mensual ($)</label><input type="number" id="c-cam" min="0" step="1000000" value="0"></div>
          </div>

          <div class="section-title" style="margin-top:24px;">📊 Deudas Vigentes</div>
          <div class="form-group"><label>Número de deudas</label><input type="number" id="c-num-deudas" min="0" max="10" value="0" onchange="Pages.clientes.renderDeudas()"></div>
          <div id="c-deudas-container"></div>

          <div class="section-title" style="margin-top:24px;">🏠 Activos</div>
          <div class="form-group"><label>Número de activos</label><input type="number" id="c-num-activos" min="0" max="10" value="0" onchange="Pages.clientes.renderActivos()"></div>
          <div id="c-activos-container"></div>

          <div class="section-title" style="margin-top:24px;">🏛️ Cuentas Bancarias</div>
          <div class="form-group"><label>Número de cuentas</label><input type="number" id="c-num-cuentas" min="0" max="10" value="0" onchange="Pages.clientes.renderCuentas()"></div>
          <div id="c-cuentas-container"></div>

          <div style="margin-top:24px;">
            <button class="btn btn-primary" onclick="Pages.clientes.guardar()" style="width:100%;">💾 Guardar Cliente</button>
          </div>
          <div id="c-resultado"></div>
        </div>
      </div>
      <div style="margin-top:24px;">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">Clientes registrados</h2>
        <div id="lista-clientes"></div>
      </div>
      <div id="edit-cliente-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;overflow-y:auto;padding:40px;">
        <div style="max-width:800px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:32px;border:1px solid rgba(212,175,55,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2 style="color:#D4AF37;">✏️ Editar Cliente</h2>
            <button class="btn btn-sm" onclick="Pages.clientes.cerrarEditar()">✕ Cerrar</button>
          </div>
          <div id="edit-cliente-body"></div>
        </div>
      </div>
    `;
    this.cargarClientes();
  },

  toggleEstrategia() {
    const obj = document.getElementById('c-objetivo').value;
    document.getElementById('c-estrategia-group').style.display = obj === 'Invertir' ? 'block' : 'none';
  },

  renderDeudas() {
    const n = parseInt(document.getElementById('c-num-deudas').value) || 0;
    const container = document.getElementById('c-deudas-container');
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `
        <div style="padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:8px;">
          <div style="font-size:13px;color:#D4AF37;margin-bottom:8px;">Deuda #${i + 1}</div>
          <div class="form-row">
            <div class="form-group"><label>Tipo</label><input type="text" class="d-tipo" placeholder="Hipotecario"></div>
            <div class="form-group"><label>Institución</label><input type="text" class="d-inst" placeholder="Banco Chile"></div>
          </div>
          <div class="form-row-3">
            <div class="form-group"><label>Cuota mensual</label><input type="number" class="d-cuota" min="0" step="10000" value="0"></div>
            <div class="form-group"><label>Saldo total</label><input type="number" class="d-total" min="0" step="100000" value="0"></div>
            <div class="form-group"><label>Cuotas rest.</label><input type="number" class="d-nro" min="0" value="0"></div>
          </div>
          <label style="font-size:13px;color:#9ca3af;display:flex;align-items:center;gap:8px;"><input type="checkbox" class="d-descontar"> ¿Descontar de ingresos?</label>
        </div>
      `;
    }
    container.innerHTML = html;
  },

  renderActivos() {
    const n = parseInt(document.getElementById('c-num-activos').value) || 0;
    const container = document.getElementById('c-activos-container');
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `
        <div style="padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:8px;">
          <div style="font-size:13px;color:#D4AF37;margin-bottom:8px;">Activo #${i + 1}</div>
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input type="text" class="a-nombre" placeholder="Depto en Viña"></div>
            <div class="form-group"><label>Valor estimado</label><input type="number" class="a-valor" min="0" step="1000000" value="0"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  },

  renderCuentas() {
    const n = parseInt(document.getElementById('c-num-cuentas').value) || 0;
    const container = document.getElementById('c-cuentas-container');
    let html = '';
    for (let i = 0; i < n; i++) {
      html += `
        <div style="padding:12px;background:rgba(255,255,255,0.02);border-radius:8px;margin-bottom:8px;">
          <div style="font-size:13px;color:#D4AF37;margin-bottom:8px;">Cuenta #${i + 1}</div>
          <div class="form-row">
            <div class="form-group"><label>Tipo de cuenta</label><input type="text" class="c-tipo" placeholder="Corriente"></div>
            <div class="form-group"><label>Banco / Institución</label><input type="text" class="c-banco" placeholder="Santander"></div>
          </div>
        </div>
      `;
    }
    container.innerHTML = html;
  },

  async guardar() {
    const data = {
      nombre: document.getElementById('c-nombre').value,
      telefono: document.getElementById('c-telefono').value,
      correo: document.getElementById('c-correo').value,
      rut: document.getElementById('c-rut').value,
      estado_civil: document.getElementById('c-estado-civil').value,
      profesion: document.getElementById('c-profesion').value,
      objetivo: document.getElementById('c-objetivo').value,
      sub_objetivo: document.getElementById('c-objetivo').value === 'Invertir' ? document.getElementById('c-estrategia').value : null,
      direccion: document.getElementById('c-direccion').value,
      ingresos: { renta: +document.getElementById('c-renta').value, dividendos: +document.getElementById('c-dividendos').value, pensiones: +document.getElementById('c-pensiones').value, arriendos: +document.getElementById('c-arriendos').value },
      capacidad_inversion: { ahorro_pie: +document.getElementById('c-ahorro-pie').value, cam: +document.getElementById('c-cam').value },
      deudas: [], activos: [], cuentas: [],
    };
    document.querySelectorAll('#c-deudas-container > div').forEach(div => {
      const tipo = div.querySelector('.d-tipo')?.value;
      if (tipo) data.deudas.push({ tipo, institucion: div.querySelector('.d-inst')?.value || '', cuota: +div.querySelector('.d-cuota')?.value || 0, total: +div.querySelector('.d-total')?.value || 0, nro_cuota: +div.querySelector('.d-nro')?.value || 0, descontar: div.querySelector('.d-descontar')?.checked || false });
    });
    document.querySelectorAll('#c-activos-container > div').forEach(div => {
      const nombre = div.querySelector('.a-nombre')?.value;
      if (nombre) data.activos.push({ nombre, valor: +div.querySelector('.a-valor')?.value || 0 });
    });
    document.querySelectorAll('#c-cuentas-container > div').forEach(div => {
      const tipo = div.querySelector('.c-tipo')?.value;
      if (tipo) data.cuentas.push({ tipo, banco: div.querySelector('.c-banco')?.value || '' });
    });
    const div = document.getElementById('c-resultado');
    try {
      await API.crearCliente(data);
      div.innerHTML = '<div class="alert alert-success">✅ Cliente registrado correctamente</div>';
      this.cargarClientes();
    } catch (e) { div.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  async cargarClientes() {
    const container = document.getElementById('lista-clientes');
    try {
      const clientes = await API.listarClientes();
      if (!clientes.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No hay clientes registrados.</p></div>';
        return;
      }
      container.innerHTML = clientes.map(c => {
        const ing = c.ingresos || {};
        const total = ing.renta + ing.dividendos + ing.pensiones + ing.arriendos;
        return `
          <div class="item-row">
            <div class="item-icon">👤</div>
            <div class="item-body">
              <h3>${c.nombre}</h3>
              <div class="meta">📅 ${(c.created_at || '').slice(0,10)} • ${c.profesion || 'N/A'} • ${c.objetivo || 'N/A'}${c.sub_objetivo ? ` (${c.sub_objetivo})` : ''}</div>
              <div class="meta">💰 $${total.toLocaleString()}/mes 🏦 Pie: $${(c.capacidad_inversion?.ahorro_pie || 0).toLocaleString()}</div>
            </div>
            <div class="item-actions">
              <button class="btn btn-icon btn-sm" onclick="Pages.clientes.verDetalle('${c.id}')" title="Ver ficha">📄</button>
              <button class="btn btn-icon btn-sm" onclick="Pages.clientes.mostrarEditar('${c.id}')" title="Editar">✏️</button>
              <button class="btn btn-icon btn-sm btn-danger" onclick="Pages.clientes.eliminar('${c.id}')" title="Eliminar">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) { container.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  async verDetalle(id) {
    try {
      const c = await API.get(`/clientes/${id}`);
      const ing = c.ingresos || {};
      const total = ing.renta + ing.dividendos + ing.pensiones + ing.arriendos;
      const deudas = c.deudas || [];
      const descuento = deudas.filter(d => d.descontar).reduce((s, d) => s + (d.cuota || 0), 0);
      const neto = Math.max(0, total - descuento);
      const limite = (neto / 625 + 200).toFixed(2);

      const html = `
        <div style="padding:24px;max-width:900px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <div>
              <div style="font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">RyR Consultor Inmobiliario</div>
              <h1 style="font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:#fff;margin-top:4px;">${c.nombre}</h1>
              <p style="color:#6b7280;font-size:14px;">${c.profesion || ''} • ${(c.created_at || '').slice(0,10)}</p>
            </div>
            <button class="btn btn-primary" onclick="Pages.clientes.descargarFicha('${id}')">📥 Descargar Ficha</button>
          </div>

          <div class="highlight-grid">
            <div class="highlight-item"><div class="num">$${total.toLocaleString()}</div><div class="lbl">Ingresos / Mes</div></div>
            <div class="highlight-item"><div class="num">$${(c.capacidad_inversion?.ahorro_pie || 0).toLocaleString()}</div><div class="lbl">Ahorro para Pie</div></div>
            <div class="highlight-item"><div class="num">${limite} UF</div><div class="lbl">Límite Máx.</div></div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
            <div class="card">
              <h3>📋 Datos Personales</h3>
              <p style="font-size:13px;line-height:2;">📧 ${c.correo || 'N/A'}<br>📞 ${c.telefono || 'N/A'}<br>🆔 ${c.rut || 'N/A'}<br>💍 ${c.estado_civil || 'N/A'}<br>🎯 ${c.objetivo || 'N/A'}${c.sub_objetivo ? ` (${c.sub_objetivo})` : ''}</p>
            </div>
            <div class="card">
              <h3>💰 Ingresos</h3>
              <p style="font-size:13px;line-height:2;">Renta: $${ing.renta.toLocaleString()}<br>Dividendos: $${ing.dividendos.toLocaleString()}<br>Pensiones: $${ing.pensiones.toLocaleString()}<br>Arriendos: $${ing.arriendos.toLocaleString()}<br><strong>Total: $${total.toLocaleString()}</strong></p>
            </div>
          </div>

          ${deudas.length ? `<div class="card" style="margin-bottom:16px;"><h3>📊 Deudas</h3>${deudas.map(d => `<p style="font-size:13px;">• ${d.tipo} en ${d.institucion}: $${(d.cuota || 0).toLocaleString()}/mes ${d.descontar ? '(⚠️ descuenta de ingresos)' : ''}<br><span style="color:#6b7280;">Saldo: $${(d.total || 0).toLocaleString()} • ${d.nro_cuota || 0} cuotas</span></p>`).join('')}</div>` : ''}

          ${(c.activos || []).length ? `<div class="card" style="margin-bottom:16px;"><h3>🏠 Activos</h3>${c.activos.map(a => `<p style="font-size:13px;">• ${a.nombre}: $${(a.valor || 0).toLocaleString()}</p>`).join('')}</div>` : ''}

          ${(c.cuentas || []).length ? `<div class="card" style="margin-bottom:16px;"><h3>🏛️ Cuentas</h3>${c.cuentas.map(ct => `<p style="font-size:13px;">• ${ct.tipo} en ${ct.banco || ct.institucion || ''}</p>`).join('')}</div>` : ''}
        </div>
      `;

      const modal = document.getElementById('edit-cliente-modal');
      document.getElementById('edit-cliente-body').innerHTML = html;
      modal.style.display = 'block';
      modal.onclick = (e) => { if (e.target === modal) Pages.clientes.cerrarEditar(); };
    } catch (e) { alert('Error: ' + e.message); }
  },

  async descargarFicha(id) {
    try {
      const c = await API.get(`/clientes/${id}`);
      const esc = v => { const d = document.createElement('div'); d.textContent = v || 'N/A'; return d.innerHTML; };
      const fmt = v => `$${(v || 0).toLocaleString()}`;
      const ing = c.ingresos || {};
      const cap = c.capacidad_inversion || {};
      const total = ing.renta + ing.dividendos + ing.pensiones + ing.arriendos;
      const deudas = c.deudas || [];
      const descuento = deudas.filter(d => d.descontar).reduce((s, d) => s + (d.cuota || 0), 0);
      const neto = Math.max(0, total - descuento);
      const limite = (neto / 625 + 200).toFixed(2);
      const fecha = (c.created_at || '').slice(0,10) || 'N/A';

      const deudasRows = deudas.map(d => `<tr><td>${esc(d.tipo)}</td><td>${esc(d.institucion)}</td><td>${fmt(d.cuota)}</td><td>${fmt(d.total)}</td><td>${d.nro_cuota || 0}</td><td>${d.descontar ? 'Sí' : 'No'}</td></tr>`).join('');
      const activosRows = (c.activos || []).map(a => `<tr><td>${esc(a.nombre)}</td><td>${fmt(a.valor)}</td></tr>`).join('');
      const cuentasRows = (c.cuentas || []).map(ct => `<tr><td>${esc(ct.tipo)}</td><td>${esc(ct.banco || ct.institucion)}</td></tr>`).join('');

      const fichas = [
        ['Ingresos Totales', fmt(total)],
        ['Ingresos Netos', fmt(neto)],
        ['Límite Máx. Crédito', `${limite} UF`],
      ];

      const htmlStr = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ficha Financiera - ${esc(c.nombre)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#121212;font-family:'Inter',sans-serif;color:#fff;padding:48px 56px}
.page{max-width:1100px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px}
.brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:#D4AF37}
.brand-sub{font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
.header-right{text-align:right}
.header-right .line{font-size:11px;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase}
.divider{width:60px;height:2px;background:linear-gradient(90deg,#D4AF37,rgba(212,175,55,0.2));margin-bottom:28px}
.client-name{font-family:'Playfair Display',serif;font-size:36px;font-weight:700;color:#fff;margin-bottom:4px}
.client-sub{font-size:14px;color:#6b7280;margin-bottom:32px}
.highlight{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:40px}
.highlight-item{background:rgba(255,255,255,0.03);border:1px solid rgba(212,175,55,0.12);border-radius:12px;padding:20px 24px;text-align:center}
.highlight-item .num{font-size:22px;font-weight:700;color:#D4AF37}
.highlight-item .lbl{font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1.5px;margin-top:6px}
.section{margin-bottom:32px}
.section-title{font-family:'Playfair Display',serif;font-size:15px;color:#D4AF37;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid rgba(212,175,55,0.15)}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px 32px}
.grid-2 .label{font-size:11px;color:#6b7280;font-weight:500;text-transform:uppercase}
.grid-2 .value{font-size:15px;font-weight:500;color:#fff;margin-top:2px}
table{width:100%;border-collapse:collapse}
th{font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;padding:10px 14px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02)}
td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:14px;color:#d1d5db}
tr.total td{font-weight:600;color:#fff;background:rgba(212,175,55,0.06)}
.footer{margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;font-size:11px;color:#4b5563}
.badge{display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:500;color:#D4AF37;border:1px solid rgba(212,175,55,0.25);background:rgba(212,175,55,0.06)}
@media(max-width:768px){body{padding:24px}.highlight{grid-template-columns:1fr}.grid-2{grid-template-columns:1fr}.client-name{font-size:26px}}
</style></head>
<body><div class="page">
<div class="header"><div><div class="brand">RyR Consultor Inmobiliario</div><div class="brand-sub">Ficha Financiera Privada</div></div><div class="header-right"><div class="line">División Residencial Premium</div><div class="line">15 Años de Experiencia</div></div></div>
<div class="divider"></div>
<div class="client-name">${esc(c.nombre)}</div>
<div class="client-sub">Registrado el ${fecha} · ${esc(c.profesion)}</div>
<div class="highlight">${fichas.map(f => `<div class="highlight-item"><div class="num">${f[1]}</div><div class="lbl">${f[0]}</div></div>`).join('')}</div>
<div class="section"><div class="section-title">Datos Personales</div><div class="grid-2">
<div><div class="label">Nombre</div><div class="value">${esc(c.nombre)}</div></div>
<div><div class="label">RUT</div><div class="value">${esc(c.rut)}</div></div>
<div><div class="label">Teléfono</div><div class="value">${esc(c.telefono)}</div></div>
<div><div class="label">Correo</div><div class="value">${esc(c.correo)}</div></div>
<div><div class="label">Estado Civil</div><div class="value">${esc(c.estado_civil)}</div></div>
<div><div class="label">Profesión</div><div class="value">${esc(c.profesion)}</div></div>
<div><div class="label">Objetivo</div><div class="value">${esc(c.objetivo)}${c.sub_objetivo ? ` (${esc(c.sub_objetivo)})` : ''}</div></div>
</div></div>
<div class="section"><div class="section-title">Ingresos Mensuales</div>
<table><tr><th>Fuente</th><th>Monto</th></tr>
<tr><td>Renta</td><td>${fmt(ing.renta)}</td></tr>
<tr><td>Dividendos</td><td>${fmt(ing.dividendos)}</td></tr>
<tr><td>Pensiones</td><td>${fmt(ing.pensiones)}</td></tr>
<tr><td>Arriendos</td><td>${fmt(ing.arriendos)}</td></tr>
<tr class="total"><td>TOTAL</td><td>${fmt(total)}</td></tr>
</table></div>
<div class="section"><div class="section-title">Capacidad de Inversión</div><div class="grid-2">
<div><div class="label">Límite Máx. Crédito</div><div class="value"><span class="badge">${limite} UF</span></div></div>
<div><div class="label">CAM</div><div class="value">${fmt(cap.cam)}</div></div>
</div></div>
${deudas.length ? `<div class="section"><div class="section-title">Deudas Vigentes</div><table><tr><th>Tipo</th><th>Institución</th><th>Cuota</th><th>Saldo Total</th><th>Cuotas Rest.</th><th>Descuenta</th></tr>${deudasRows}</table></div>` : ''}
${activosRows ? `<div class="section"><div class="section-title">Activos</div><table><tr><th>Nombre</th><th>Valor Estimado</th></tr>${activosRows}</table></div>` : ''}
${cuentasRows ? `<div class="section"><div class="section-title">Cuentas Bancarias</div><table><tr><th>Tipo</th><th>Banco</th></tr>${cuentasRows}</table></div>` : ''}
<div class="footer"><span>RyR Consultor Inmobiliario — Documento Confidencial</span><span>Generado el ${fecha}</span></div>
</div></body></html>`;

      const blob = new Blob([htmlStr], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${c.nombre.replace(/\s+/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error: ' + e.message); }
  },

  async mostrarEditar(id) {
    const c = await API.get(`/clientes/${id}`);
    const ing = c.ingresos || {};
    const cap = c.capacidad_inversion || {};
    const modal = document.getElementById('edit-cliente-modal');

    document.getElementById('edit-cliente-body').innerHTML = `
      <div class="form-group"><label>Nombre</label><input type="text" id="e-nombre" value="${c.nombre.replace(/"/g, '&quot;')}"></div>
      <div class="form-row">
        <div class="form-group"><label>Teléfono</label><input type="text" id="e-telefono" value="${c.telefono || ''}"></div>
        <div class="form-group"><label>Correo</label><input type="text" id="e-correo" value="${c.correo || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>RUT</label><input type="text" id="e-rut" value="${c.rut || ''}"></div>
        <div class="form-group"><label>Profesión</label><input type="text" id="e-profesion" value="${c.profesion || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Objetivo</label><select id="e-objetivo"><option value="Vivir" ${c.objetivo === 'Vivir' ? 'selected' : ''}>Vivir</option><option value="Invertir" ${c.objetivo === 'Invertir' ? 'selected' : ''}>Invertir</option></select></div>
        <div class="form-group"><label>Dirección</label><input type="text" id="e-direccion" value="${c.direccion || ''}"></div>
      </div>
      <div class="section-title">💰 Ingresos</div>
      <div class="form-row">
        <div class="form-group"><label>Renta</label><input type="number" id="e-renta" value="${ing.renta || 0}"></div>
        <div class="form-group"><label>Dividendos</label><input type="number" id="e-dividendos" value="${ing.dividendos || 0}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Pensiones</label><input type="number" id="e-pensiones" value="${ing.pensiones || 0}"></div>
        <div class="form-group"><label>Arriendos</label><input type="number" id="e-arriendos" value="${ing.arriendos || 0}"></div>
      </div>
      <div class="section-title">🏦 Capacidad de Inversión</div>
      <div class="form-row">
        <div class="form-group"><label>Ahorro para pie</label><input type="number" id="e-ahorro-pie" value="${cap.ahorro_pie || 0}"></div>
        <div class="form-group"><label>CAM</label><input type="number" id="e-cam" value="${cap.cam || 0}"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" onclick="Pages.clientes.guardarEditar('${id}')" style="flex:1;">💾 Guardar cambios</button>
        <button class="btn" onclick="Pages.clientes.cerrarEditar()" style="flex:1;">❌ Cancelar</button>
      </div>
      <div id="e-resultado"></div>
    `;
    modal.style.display = 'block';
    modal.onclick = (e) => { if (e.target === modal) Pages.clientes.cerrarEditar(); };
  },

  async guardarEditar(id) {
    const data = {
      nombre: document.getElementById('e-nombre').value,
      telefono: document.getElementById('e-telefono').value,
      correo: document.getElementById('e-correo').value,
      rut: document.getElementById('e-rut').value,
      profesion: document.getElementById('e-profesion').value,
      objetivo: document.getElementById('e-objetivo').value,
      direccion: document.getElementById('e-direccion').value,
      ingresos: { renta: +document.getElementById('e-renta').value, dividendos: +document.getElementById('e-dividendos').value, pensiones: +document.getElementById('e-pensiones').value, arriendos: +document.getElementById('e-arriendos').value },
      capacidad_inversion: { ahorro_pie: +document.getElementById('e-ahorro-pie').value, cam: +document.getElementById('e-cam').value },
    };
    try {
      await API.actualizarCliente(id, data);
      document.getElementById('e-resultado').innerHTML = '<div class="alert alert-success">✅ Cliente actualizado</div>';
      Pages.clientes.cerrarEditar();
      Pages.clientes.cargarClientes();
    } catch (e) { document.getElementById('e-resultado').innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  cerrarEditar() {
    document.getElementById('edit-cliente-modal').style.display = 'none';
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    await API.eliminarCliente(id);
    this.cargarClientes();
  },
};
