window.Pages = window.Pages || {};

Pages.proyectos = {
  async render(el) {
    el.innerHTML = `
      <div class="page-title"><h1>📋 Proyectos Inmobiliarios</h1><p>Agrega y gestiona los proyectos que quieres ofrecer a tus clientes.</p></div>
      <div class="expander" id="add-proyecto-expander">
        <div class="expander-header" onclick="this.parentElement.classList.toggle('open')">
          <span>➕ Agregar nuevo proyecto</span>
          <span class="expander-arrow">▼</span>
        </div>
        <div class="expander-body">
          <div style="display:flex;gap:16px;margin-bottom:16px;">
            <button class="btn btn-primary" onclick="Pages.proyectos.showTab('web')" id="tab-web-btn">🌐 Buscar en web</button>
            <button class="btn" onclick="Pages.proyectos.showTab('pdf')" id="tab-pdf-btn">📄 Subir PDF</button>
          </div>
          <div id="tab-web">
            <div class="form-row">
              <div class="form-group"><label>Nombre del proyecto</label><input type="text" id="proy-nombre-web" placeholder="Ej: Torres del Parque"></div>
              <div style="display:flex;align-items:flex-end;"><button class="btn btn-primary" onclick="Pages.proyectos.buscarWeb()" style="width:100%;">🔍 Buscar y analizar</button></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>💰 Precio (UF)</label><input type="number" id="proy-precio-web" step="100" min="0" value="0"></div>
              <div class="form-group"><label>🏷️ Etiquetas</label><select id="proy-etiquetas-web" multiple style="height:80px;"><option value="Rentabilidad">Rentabilidad</option><option value="Libertad financiera">Libertad financiera</option><option value="Jubilación">Jubilación</option></select></div>
            </div>
            <div id="web-resultados"></div>
          </div>
          <div id="tab-pdf" style="display:none;">
            <div class="form-group"><label>Nombre del proyecto</label><input type="text" id="proy-nombre-pdf" placeholder="Ej: Edificio Marina"></div>
            <div class="form-row">
              <div class="form-group"><label>💰 Precio (UF)</label><input type="number" id="proy-precio-pdf" step="100" min="0" value="0"></div>
              <div class="form-group"><label>🏷️ Etiquetas</label><select id="proy-etiquetas-pdf" multiple style="height:80px;"><option value="Rentabilidad">Rentabilidad</option><option value="Libertad financiera">Libertad financiera</option><option value="Jubilación">Jubilación</option></select></div>
            </div>
            <div class="form-group"><label>Subir PDF</label><input type="file" id="proy-pdf-file" accept=".pdf"></div>
            <button class="btn btn-primary" onclick="Pages.proyectos.analizarPDF()">📄 Analizar PDF</button>
            <div id="pdf-resultados"></div>
          </div>
        </div>
      </div>
      <div style="margin-top:24px;">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">Proyectos registrados</h2>
        <div id="lista-proyectos"></div>
      </div>
      <div id="edit-proyecto-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;overflow-y:auto;padding:40px;">
        <div style="max-width:900px;margin:0 auto;background:#1a1a2e;border-radius:16px;padding:32px;border:1px solid rgba(212,175,55,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
            <h2 style="color:#D4AF37;">✏️ Editar Proyecto</h2>
            <button class="btn btn-sm" onclick="Pages.proyectos.cerrarEditar()">✕ Cerrar</button>
          </div>
          <div id="edit-proyecto-body"></div>
        </div>
      </div>
    `;
    this.cargarProyectos();
  },

  showTab(tab) {
    document.getElementById('tab-web').style.display = tab === 'web' ? 'block' : 'none';
    document.getElementById('tab-pdf').style.display = tab === 'pdf' ? 'block' : 'none';
    document.getElementById('tab-web-btn').className = tab === 'web' ? 'btn btn-primary' : 'btn';
    document.getElementById('tab-pdf-btn').className = tab === 'pdf' ? 'btn btn-primary' : 'btn';
  },

  async cargarProyectos() {
    const container = document.getElementById('lista-proyectos');
    try {
      const proyectos = await API.listarProyectos();
      if (!proyectos.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No hay proyectos registrados.</p></div>';
        return;
      }
      container.innerHTML = proyectos.map(p => {
        const etiquetas = (p.etiquetas || []).map(e => `<span class="chip">${e}</span>`).join('');
        const precio = p.precio_uf > 0 ? `${p.precio_uf.toLocaleString()} UF` : '—';
        return `
          <div class="item-row">
            <div class="item-icon">${p.fuente === 'web' ? '🌐' : '📄'}</div>
            <div class="item-body">
              <h3>${p.nombre}</h3>
              <div class="meta">${p.fuente === 'web' ? 'Búsqueda web' : 'PDF'} • ${(p.created_at || '').slice(0,10)}</div>
              <div style="margin-top:4px;">${etiquetas}</div>
            </div>
            <div style="text-align:right;min-width:100px;"><div style="font-size:14px;font-weight:600;color:#D4AF37;">${precio}</div></div>
            <div class="item-actions">
              <button class="btn btn-icon btn-sm" onclick="Pages.proyectos.verDetalle('${p.id}')" title="Ver ficha">📄</button>
              <button class="btn btn-icon btn-sm" onclick="Pages.proyectos.mostrarEditar('${p.id}')" title="Editar">✏️</button>
              <button class="btn btn-icon btn-sm btn-danger" onclick="Pages.proyectos.eliminar('${p.id}')" title="Eliminar">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
    } catch (e) { container.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  async verDetalle(id) {
    try {
      const p = await API.get(`/proyectos/${id}`);
      const cotizaciones = p.cotizaciones || {};
      const tipos = ['Studio', '1D1B', '1.5D1B', '2D1B', '2D2B', '3D2B', '3D3B'];
      const modal = document.getElementById('edit-proyecto-modal');

      const cotRows = tipos.map(t => {
        const c = cotizaciones[t] || {};
        return `
          <div class="form-row" style="margin-bottom:8px;padding:8px;background:rgba(255,255,255,0.02);border-radius:8px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;font-weight:600;color:#D4AF37;font-size:14px;width:100%;margin-bottom:6px;">${t}</div>
            <div class="form-group">
              <label>Precio UF</label>
              <input type="number" class="cot-precio" value="${c.precio || 0}" step="100" data-tipo="${t}" style="width:120px;">
            </div>
            <div class="form-group" style="flex:1;min-width:150px;">
              <label>Detalles / Notas</label>
              <input type="text" class="cot-detalles" value="${(c.detalles || '').replace(/"/g, '&quot;')}" placeholder="Bono pie, bodega, etc." data-tipo="${t}">
            </div>
            <div class="form-group" style="flex-shrink:0;">
              <label>PDF Cotización</label>
              <input type="file" accept=".pdf" class="cot-pdf-input" data-tipo="${t}" style="font-size:12px;max-width:140px;" onchange="Pages.proyectos.extraerCotizacionDePDF('${t}')">
            </div>
            ${c.has_pdf ? `<span style="font-size:11px;color:#10b981;align-self:flex-end;margin-bottom:4px;">✓ PDF cargado</span>` : ''}
          </div>
        `;
      }).join('');

      document.getElementById('edit-proyecto-body').innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <h3 style="font-size:22px;font-family:'Playfair Display',serif;color:#fff;">${p.nombre}</h3>
            <p style="color:#6b7280;font-size:13px;">${p.fuente === 'web' ? '🌐 Búsqueda web' : '📄 PDF subido'} • ${(p.created_at || '').slice(0,10)}</p>
          </div>
          <button class="btn btn-primary" onclick="Pages.proyectos.descargarFicha('${id}')">📥 Descargar Ficha</button>
        </div>
        <div class="card" style="margin-bottom:16px;">
          <h3>📖 Descripción</h3>
          <p style="font-size:13px;line-height:1.7;">${p.descripcion || 'Sin descripción'}</p>
        </div>
        <div class="section-title">📝 Cotizaciones</div>
        <div id="cotizaciones-form">${cotRows}</div>
        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" onclick="Pages.proyectos.guardarCotizaciones('${id}')" style="flex:1;">💾 Guardar y Analizar Cotizaciones</button>
          <button class="btn" onclick="Pages.proyectos.cerrarEditar()" style="flex:1;">Cerrar</button>
        </div>
        <div id="cot-resultado" style="margin-top:12px;"></div>
        ${p.analisis_cotizaciones ? `<div class="card" style="margin-top:16px;"><h3>🤖 Análisis AI</h3><p style="font-size:13px;line-height:1.7;color:#d1d5db;white-space:pre-wrap;">${p.analisis_cotizaciones}</p></div>` : ''}
      `;
      modal.style.display = 'block';
      modal.onclick = (e) => { if (e.target === modal) Pages.proyectos.cerrarEditar(); };
    } catch (e) { alert('Error: ' + e.message); }
  },

  async guardarCotizaciones(id) {
    const cotizaciones = {};
    document.querySelectorAll('.cot-precio').forEach(el => {
      const tipo = el.dataset.tipo;
      const detalles = document.querySelector(`.cot-detalles[data-tipo="${tipo}"]`)?.value || '';
      const pdfTexto = document.querySelector(`.cot-pdf-input[data-tipo="${tipo}"]`)?.dataset?.pdfTexto || '';
      cotizaciones[tipo] = { precio: +el.value || 0, detalles };
      if (pdfTexto) {
        cotizaciones[tipo].has_pdf = true;
        cotizaciones[tipo].pdf_content = pdfTexto;
      }
    });
    try {
      const res = await API.post('/ai/analizar-cotizaciones', { nombre_proyecto: '', cotizaciones });
      await API.actualizarProyecto(id, { cotizaciones, analisis_cotizaciones: res.analisis });
      document.getElementById('cot-resultado').innerHTML = '<div class="alert alert-success">✅ Cotizaciones guardadas y analizadas</div>';
      this.verDetalle(id);
    } catch (e) { document.getElementById('cot-resultado').innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  async extraerCotizacionDePDF(tipo) {
    const input = document.querySelector(`.cot-pdf-input[data-tipo="${tipo}"]`);
    if (!input || !input.files[0]) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      const div = document.getElementById('cot-resultado');
      div.innerHTML = `<span class="spinner-inline"></span> Extrayendo ${tipo}...`;
      try {
        const res = await API.post('/ai/extraer-cotizacion-de-pdf', { tipo, contenido_base64: base64 });
        if (res.precio > 0) {
          document.querySelector(`.cot-precio[data-tipo="${tipo}"]`).value = res.precio;
        }
        if (res.detalles) {
          const detEl = document.querySelector(`.cot-detalles[data-tipo="${tipo}"]`);
          if (detEl) detEl.value = res.detalles;
        }
        if (res.pdf_texto) {
          input.dataset.pdfTexto = res.pdf_texto;
        }
        div.innerHTML = `<div class="alert alert-success">✅ ${tipo}: ${res.precio > 0 ? res.precio + ' UF' : 'sin precio detectado'}${res.detalles ? ' — ' + res.detalles : ''}</div>`;
      } catch (err) { div.innerHTML = `<div class="alert alert-error">Error: ${err.message}</div>`; }
    };
    reader.readAsDataURL(file);
  },

  async descargarFicha(id) {
    try {
      const p = await API.get(`/proyectos/${id}`);
      const esc = v => { const d = document.createElement('div'); d.textContent = v || 'N/A'; return d.innerHTML; };
      const etiquetas = (p.etiquetas || []).map(e => `<span style="display:inline-block;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:500;text-transform:uppercase;color:#D4AF37;border:1px solid rgba(212,175,55,0.3);background:rgba(212,175,55,0.06);margin-right:4px;">${esc(e)}</span>`).join('');

      const cotizaciones = p.cotizaciones || {};
      const cotRows = Object.entries(cotizaciones).filter(([_, d]) => d.precio > 0).map(([tipo, d]) =>
        `<tr><td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-weight:500;">${esc(tipo)}</td><td style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);color:#D4AF37;font-weight:600;">${d.precio.toLocaleString()} UF${d.detalles ? `<br><span style="font-size:13px;color:#9ca3af;">${esc(d.detalles)}</span>` : ''}</td></tr>`
      ).join('');

      const htmlStr = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Ficha Técnica - ${esc(p.nombre)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:#121212;font-family:'Inter',sans-serif;color:#fff;padding:48px 56px}
.page{max-width:1200px;margin:0 auto}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:60px}
.brand{font-family:'Playfair Display',serif;font-size:22px;font-weight:600;color:#D4AF37;letter-spacing:0.5px}
.brand-sub{font-size:11px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-top:4px}
.header-right{text-align:right}
.header-right .line{font-size:11px;color:#9ca3af;letter-spacing:1.5px;text-transform:uppercase}
.layout{display:grid;grid-template-columns:320px 1fr;gap:48px}
.project-title{font-family:'Playfair Display',serif;font-size:42px;font-weight:700;color:#fff;line-height:1.2;margin-bottom:8px}
.project-sub{font-size:14px;color:#6b7280;font-weight:300;margin-bottom:28px}
.desc{font-size:15px;line-height:1.9;color:#d1d5db;text-align:justify}
.divider{width:60px;height:2px;background:linear-gradient(90deg,#D4AF37,rgba(212,175,55,0.2));margin-bottom:24px}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 32px;margin-top:28px;padding:24px;background:rgba(255,255,255,0.02);border-radius:12px}
.meta-item .label{font-size:10px;color:#6b7280;letter-spacing:1.5px;text-transform:uppercase;font-weight:600}
.meta-item .value{font-size:18px;font-weight:600;color:#fff;margin-top:4px}
.meta-item .value.gold{color:#D4AF37}
.section{margin-top:40px}
.section-title{font-family:'Playfair Display',serif;font-size:16px;color:#D4AF37;letter-spacing:2px;text-transform:uppercase;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
th{padding:10px 16px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;background:rgba(255,255,255,0.03)}
.footer{margin-top:60px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;font-size:11px;color:#4b5563}
@media(max-width:768px){body{padding:24px}.layout{grid-template-columns:1fr}.project-title{font-size:28px}}
</style></head>
<body><div class="page">
<div class="header"><div><div class="brand">RyR Consultor Inmobiliario</div><div class="brand-sub">Ficha Técnica Privada</div></div><div class="header-right"><div class="line">División Residencial Premium</div><div class="line">15 Años de Experiencia</div></div></div>
<div class="layout"><div>
<div class="divider"></div>
<div class="project-title">${esc(p.nombre)}</div>
<div class="project-sub">${p.fuente === 'web' ? 'Búsqueda web' : 'PDF subido'} · ${(p.created_at || '').slice(0,10)}</div>
<div class="desc">${esc(p.descripcion)}</div>
${etiquetas ? `<div style="margin-top:12px;">${etiquetas}</div>` : ''}
<div class="meta-grid">
<div class="meta-item"><div class="label">Precio</div><div class="value gold">${p.precio_uf > 0 ? `${p.precio_uf.toLocaleString()} UF` : '—'}</div></div>
<div class="meta-item"><div class="label">Fuente</div><div class="value">${p.fuente === 'web' ? 'Web' : 'PDF'}</div></div>
</div>
${cotRows ? `<div class="section"><div class="section-title">Cotizaciones</div><table><tr><th>Tipo</th><th>Precio</th></tr>${cotRows}</table></div>` : ''}
${p.analisis_cotizaciones ? `<div class="section"><div class="section-title">Análisis</div><div style="font-size:14px;line-height:1.8;color:#d1d5db;padding:20px;background:rgba(255,255,255,0.02);border-radius:12px;border-left:3px solid #D4AF37;">${esc(p.analisis_cotizaciones)}</div></div>` : ''}
</div></div>
<div class="footer"><span>RyR Consultor Inmobiliario — Documento Confidencial</span><span>Generado el ${(p.created_at || '').slice(0,10)}</span></div>
</div></body></html>`;

      const blob = new Blob([htmlStr], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ficha_${p.nombre.replace(/\s+/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error: ' + e.message); }
  },

  async mostrarEditar(id) {
    const p = await API.get(`/proyectos/${id}`);
    const modal = document.getElementById('edit-proyecto-modal');
    document.getElementById('edit-proyecto-body').innerHTML = `
      <div class="form-group"><label>Nombre</label><input type="text" id="e-p-nombre" value="${p.nombre.replace(/"/g, '&quot;')}"></div>
      <div class="form-group"><label>Descripción</label><textarea id="e-p-desc" style="min-height:120px;">${(p.descripcion || '').replace(/</g, '&lt;')}</textarea></div>
      <div class="form-row">
        <div class="form-group"><label>Precio UF</label><input type="number" id="e-p-precio" step="100" min="0" value="${p.precio_uf || 0}"></div>
        <div class="form-group"><label>Etiquetas</label><select id="e-p-etiquetas" multiple style="height:80px;">
          <option value="Rentabilidad" ${(p.etiquetas || []).includes('Rentabilidad') ? 'selected' : ''}>Rentabilidad</option>
          <option value="Libertad financiera" ${(p.etiquetas || []).includes('Libertad financiera') ? 'selected' : ''}>Libertad financiera</option>
          <option value="Jubilación" ${(p.etiquetas || []).includes('Jubilación') ? 'selected' : ''}>Jubilación</option>
        </select></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" onclick="Pages.proyectos.guardarEditar('${id}')" style="flex:1;">💾 Guardar cambios</button>
        <button class="btn" onclick="Pages.proyectos.cerrarEditar()" style="flex:1;">Cancelar</button>
      </div>
      <div id="e-p-resultado"></div>
    `;
    modal.style.display = 'block';
    modal.onclick = (e) => { if (e.target === modal) Pages.proyectos.cerrarEditar(); };
  },

  async guardarEditar(id) {
    const etiquetasSelect = document.getElementById('e-p-etiquetas');
    const etiquetas = Array.from(etiquetasSelect.selectedOptions).map(o => o.value);
    try {
      await API.actualizarProyecto(id, {
        nombre: document.getElementById('e-p-nombre').value,
        descripcion: document.getElementById('e-p-desc').value,
        precio_uf: +document.getElementById('e-p-precio').value || 0,
        etiquetas,
      });
      document.getElementById('e-p-resultado').innerHTML = '<div class="alert alert-success">✅ Proyecto actualizado</div>';
      Pages.proyectos.cerrarEditar();
      Pages.proyectos.cargarProyectos();
    } catch (e) { document.getElementById('e-p-resultado').innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  cerrarEditar() {
    document.getElementById('edit-proyecto-modal').style.display = 'none';
  },

  async buscarWeb() {
    const nombre = document.getElementById('proy-nombre-web').value;
    if (!nombre) return;
    const div = document.getElementById('web-resultados');
    div.innerHTML = '<span class="spinner-inline"></span> Buscando...';
    try {
      const res = await API.buscarProyecto({ nombre });
      const etiquetasSelect = document.getElementById('proy-etiquetas-web');
      const etiquetas = Array.from(etiquetasSelect.selectedOptions).map(o => o.value);
      await API.crearProyecto({
        nombre,
        descripcion: res.descripcion || 'Sin descripción',
        fuente: 'web',
        detalles_web: res.contexto_web || '',
        precio_uf: +document.getElementById('proy-precio-web').value || 0,
        etiquetas,
      });
      div.innerHTML = '<div class="alert alert-success">✅ Proyecto agregado exitosamente</div>';
      this.cargarProyectos();
    } catch (e) { div.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  async analizarPDF() {
    const nombre = document.getElementById('proy-nombre-pdf').value;
    const fileInput = document.getElementById('proy-pdf-file');
    if (!nombre || !fileInput.files[0]) return;
    const div = document.getElementById('pdf-resultados');
    div.innerHTML = '<span class="spinner-inline"></span> Analizando PDF...';
    try {
      const base64 = await this.fileToBase64(fileInput.files[0]);
      const res = await API.analizarPDF({ nombre, contenido_base64: base64 });
      const etiquetasSelect = document.getElementById('proy-etiquetas-pdf');
      const etiquetas = Array.from(etiquetasSelect.selectedOptions).map(o => o.value);
      await API.crearProyecto({
        nombre,
        descripcion: res.descripcion || 'Sin descripción',
        fuente: 'pdf',
        pdf_content: res.texto || '',
        precio_uf: +document.getElementById('proy-precio-pdf').value || 0,
        etiquetas,
      });
      div.innerHTML = '<div class="alert alert-success">✅ Proyecto agregado exitosamente</div>';
      this.cargarProyectos();
    } catch (e) { div.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`; }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar este proyecto?')) return;
    await API.eliminarProyecto(id);
    this.cargarProyectos();
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
