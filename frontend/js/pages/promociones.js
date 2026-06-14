window.Pages = window.Pages || {};

Pages.promociones = {
  async render(el) {
    el.innerHTML = `
      <div class="page-title"><h1>🎯 Promociones del Mes</h1><p>Sube un archivo Excel con las promociones mensuales y el AI analizará los proyectos.</p></div>
      <div class="card" style="margin-bottom:24px;">
        <h3>📥 Cargar promociones del mes</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Nombre de la promoción</label>
            <input type="text" id="promo-nombre" placeholder="Ej: Promoción Julio 2026">
          </div>
          <div class="form-group">
            <label>Archivo Excel (.xlsx)</label>
            <input type="file" id="promo-file" accept=".xlsx,.xls">
          </div>
        </div>
        <button class="btn btn-primary" onclick="Pages.promociones.analizar()">🔍 Analizar Excel</button>
        <div id="promo-resultados" style="margin-top:16px;"></div>
      </div>
      <div>
        <h2 style="font-size:18px;font-weight:600;margin-bottom:16px;">📜 Historial de promociones</h2>
        <div id="lista-promociones"></div>
      </div>
    `;
    this.cargarPromociones();
  },

  async analizar() {
    const nombre = document.getElementById('promo-nombre').value;
    const fileInput = document.getElementById('promo-file');
    if (!nombre || !fileInput.files[0]) return;

    const div = document.getElementById('promo-resultados');
    div.innerHTML = '<div class="spinner-inline"></div> Analizando Excel...';

    try {
      const base64 = await this.fileToBase64(fileInput.files[0]);
      const res = await API.analizarExcel({ nombre_mes: nombre, contenido_base64: base64 });

      if (!res.items || !res.items.length) {
        div.innerHTML = '<div class="alert alert-warning">⚠️ No se pudieron extraer promociones del archivo.</div>';
        return;
      }

      let html = '<div class="alert alert-success">✅ Análisis completado</div>';
      let pendientes = 0;

      res.items.forEach(item => {
        if (item.proyecto_id) {
          html += `<div class="alert alert-info" style="font-size:13px;">✅ <strong>${item.nombre_proyecto}</strong> → ${item.promocion || ''}</div>`;
        } else {
          html += `<div class="alert alert-warning" style="font-size:13px;">⚠️ <strong>${item.nombre_proyecto}</strong> — No coincide con ningún proyecto registrado</div>`;
          pendientes++;
        }
      });

      const conMatch = res.items.filter(i => i.proyecto_id);
      if (conMatch.length) {
        html += `<button class="btn btn-primary" onclick="Pages.promociones.guardarTodas('${nombre}')" style="margin-top:12px;">💾 Guardar ${conMatch.length} promociones</button>`;
        window._promoItems = res.items;
        window._promoMes = nombre;
      }

      div.innerHTML = html;
    } catch (e) {
      div.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  },

  async guardarTodas(mes) {
    const items = window._promoItems || [];
    const div = document.getElementById('promo-resultados');
    let count = 0;

    for (const item of items) {
      if (item.proyecto_id && item.promocion) {
        try {
          await API.crearPromocion({
            proyecto_id: item.proyecto_id,
            nombre_proyecto: item.match || item.nombre_proyecto,
            mes: mes,
            descripcion_promocion: item.promocion,
            archivo_original: document.getElementById('promo-file').files[0]?.name || '',
          });
          count++;
        } catch {}
      }
    }

    div.innerHTML += `<div class="alert alert-success">✅ ${count} promociones guardadas exitosamente</div>`;
    this.cargarPromociones();
  },

  async cargarPromociones() {
    const container = document.getElementById('lista-promociones');
    try {
      const meses = await API.listarMeses();
      if (!meses.length) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No hay promociones registradas.</p></div>';
        return;
      }

      const promos = await API.listarPromociones();
      container.innerHTML = promos.map(p => `
        <div class="item-row">
          <div class="item-icon">🎯</div>
          <div class="item-body">
            <h3>${p.nombre_proyecto}</h3>
            <div class="meta">📅 ${p.mes} • ${p.descripcion_promocion}</div>
            ${p.archivo_original ? `<div class="meta">📎 ${p.archivo_original}</div>` : ''}
          </div>
          <div class="item-actions">
            <button class="btn btn-icon btn-sm btn-danger" onclick="Pages.promociones.eliminar('${p.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>
      `).join('');
    } catch (e) {
      container.innerHTML = `<div class="alert alert-error">Error: ${e.message}</div>`;
    }
  },

  async eliminar(id) {
    if (!confirm('¿Eliminar esta promoción?')) return;
    await API.eliminarPromocion(id);
    this.cargarPromociones();
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
