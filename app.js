import { getUsuarioActual, getSociaActual, logout } from './auth.js'
import { getMovimientos, getResumenPeriodo, crearMovimiento, eliminarMovimiento, getProductos, getSocias, periodoActual, formatPeso, formatFecha } from './db.js'

let sociaActual = null
let todasLasSocias = []
let productosList = []

async function init() {
  const user = await getUsuarioActual()
  if (!user) { window.location.href = 'login.html'; return }

  try {
    sociaActual = await getSociaActual(user.id)
  } catch {
    window.location.href = 'login.html'; return
  }

  document.getElementById('avatar-iniciales').textContent =
    sociaActual.nombre.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
  document.getElementById('topbar-nombre').textContent = sociaActual.nombre
  document.getElementById('btn-logout').addEventListener('click', logout)

  ;[productosList, todasLasSocias] = await Promise.all([getProductos(), getSocias()])

  await mostrarCaja()
  bindNav()
}

function bindNav() {
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      const vista = btn.dataset.vista
      if (vista === 'caja')       mostrarCaja()
      if (vista === 'inventario') mostrarInventario()
      if (vista === 'balance')    mostrarBalance()
    })
  })
}

// ── VISTA: Caja ────────────────────────────────────────────
async function mostrarCaja() {
  const fab = document.getElementById('fab')
  fab.style.display = 'flex'
  fab.onclick = () => abrirModalMovimiento()

  const periodo = periodoActual()
  const [movimientos, resumen] = await Promise.all([
    getMovimientos({ limite: 30, periodo }),
    getResumenPeriodo(periodo)
  ])

  const contenido = document.getElementById('contenido')
  contenido.innerHTML = `
    <div class="metricas">
      <div class="card">
        <div class="card-title">Ventas del mes</div>
        <div class="card-valor">${formatPeso(resumen.ventas)}</div>
        <div class="card-sub">Período ${periodo}</div>
      </div>
      <div class="card">
        <div class="card-title">Ganancia neta</div>
        <div class="card-valor" style="color:${resumen.ganancia_bruta >= 0 ? 'var(--verde)' : 'var(--rojo)'}">
          ${formatPeso(resumen.ganancia_bruta)}
        </div>
        <div class="card-sub">Ventas − costos</div>
      </div>
      <div class="card">
        <div class="card-title">Tu parte (50%)</div>
        <div class="card-valor">${formatPeso(resumen.por_socia)}</div>
        <div class="card-sub">Estimado</div>
      </div>
      <div class="card">
        <div class="card-title">Costos del mes</div>
        <div class="card-valor" style="color:var(--rojo)">${formatPeso(resumen.compras + resumen.gastos)}</div>
        <div class="card-sub">Materiales + gastos</div>
      </div>
    </div>

    <div class="seccion-titulo">Últimos movimientos</div>
    <div class="mov-lista" id="lista-movimientos">
      ${movimientos.length === 0
        ? `<div class="vacio"><div class="vacio-icono">📋</div>Sin movimientos este mes.<br>Tocá + para agregar uno.</div>`
        : movimientos.map(m => renderMovimiento(m)).join('')
      }
    </div>
  `

  contenido.querySelectorAll('.mov-item').forEach(el => {
    el.querySelector('.btn-eliminar')?.addEventListener('click', async (e) => {
      e.stopPropagation()
      if (!confirm('¿Eliminar este movimiento?')) return
      await eliminarMovimiento(el.dataset.id)
      mostrarCaja()
    })
  })
}

function renderMovimiento(m) {
  const esIngreso = m.tipo === 'venta' || m.tipo === 'aporte_capital'
  const iconos = {
    venta: '💰', compra_materiales: '🛒', aporte_capital: '💵',
    retiro: '🏧', gasto_fijo: '📌'
  }
  const etiquetas = {
    venta: 'Venta', compra_materiales: 'Compra materiales',
    aporte_capital: 'Aporte', retiro: 'Retiro', gasto_fijo: 'Gasto fijo'
  }

  const realizadoPor = m.realizado_por || m.socias?.nombre || ''
  const badgeColor = realizadoPor === 'Creta'
    ? 'background:#E8F4FD;color:#2980B9'
    : 'background:var(--verde-claro);color:var(--verde)'

  return `
    <div class="mov-item" data-id="${m.id}">
      <div class="mov-icono ${esIngreso ? 'ingreso' : 'egreso'}">${iconos[m.tipo] || '•'}</div>
      <div class="mov-info">
        <div class="mov-desc">${m.descripcion || etiquetas[m.tipo]}</div>
        <div class="mov-meta">
          ${formatFecha(m.fecha)} ·
          <span class="badge-socia" style="${badgeColor}">${realizadoPor}</span>
          ${m.productos ? ` · ${m.productos.nombre}` : ''}
        </div>
      </div>
      <div class="mov-monto ${esIngreso ? 'ingreso' : 'egreso'}">
        ${esIngreso ? '+' : '−'}${formatPeso(m.monto)}
      </div>
      <button class="btn-eliminar" style="background:none;border:none;cursor:pointer;color:var(--texto-suave);font-size:18px;padding:4px;margin-left:4px;" title="Eliminar">×</button>
    </div>
  `
}

function abrirModalMovimiento() {
  const overlay = document.getElementById('modal-overlay')
  const cuerpo = document.getElementById('modal-cuerpo')

  const opcionesProducto = productosList.map(p =>
    `<option value="${p.id}">${p.nombre} — ${formatPeso(p.precio_venta)}</option>`
  ).join('')

  const otrasSocias = todasLasSocias.filter(s => s.id !== sociaActual.id)

  cuerpo.innerHTML = `
    <div class="modal-titulo">
      Nuevo movimiento
      <button class="btn-cerrar" onclick="document.getElementById('modal-overlay').classList.remove('open')">×</button>
    </div>

    <div class="campo">
      <label>Tipo de movimiento</label>
      <div class="chips" id="chips-tipo">
        <button class="chip activo" data-tipo="venta">Venta</button>
        <button class="chip" data-tipo="compra_materiales">Compra</button>
        <button class="chip" data-tipo="aporte_capital">Aporte</button>
        <button class="chip" data-tipo="retiro">Retiro</button>
        <button class="chip" data-tipo="gasto_fijo">Gasto fijo</button>
      </div>
    </div>

    <div class="campo" id="campo-producto" style="display:none">
      <label>Producto vendido (opcional)</label>
      <select id="input-producto">
        <option value="">— Sin especificar —</option>
        ${opcionesProducto}
      </select>
    </div>

    <div class="campo">
      <label>¿Quién realizó este movimiento?</label>
      <div class="chips" id="chips-responsable">
        <button class="chip activo" data-id="${sociaActual.id}" data-nombre="${sociaActual.nombre}">
          ${sociaActual.nombre} (yo)
        </button>
        ${otrasSocias.map(s => `
          <button class="chip" data-id="${s.id}" data-nombre="${s.nombre}">${s.nombre}</button>
        `).join('')}
        <button class="chip" data-id="creta" data-nombre="Creta">Creta</button>
      </div>
    </div>

    <div class="campo-fila">
      <div class="campo">
        <label>Monto ($)</label>
        <input type="number" id="input-monto" placeholder="0" min="0" step="1">
      </div>
      <div class="campo">
        <label>Medio de pago</label>
        <select id="input-medio">
          <option value="efectivo">Efectivo</option>
          <option value="mercado_pago">Mercado Pago</option>
          <option value="transferencia">Transferencia</option>
          <option value="otro">Otro</option>
        </select>
      </div>
    </div>

    <div class="campo">
      <label>Descripción (opcional)</label>
      <input type="text" id="input-desc" placeholder="Ej: Venta feria del domingo">
    </div>

    <div id="error-mov" class="error-msg"></div>
    <button class="btn btn-primary" id="btn-guardar-mov">Guardar movimiento</button>
  `

  overlay.classList.add('open')

  let tipoSeleccionado = 'venta'
  let responsableId = sociaActual.id
  let responsableNombre = sociaActual.nombre

  cuerpo.querySelectorAll('#chips-tipo .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      cuerpo.querySelectorAll('#chips-tipo .chip').forEach(c => c.classList.remove('activo'))
      chip.classList.add('activo')
      tipoSeleccionado = chip.dataset.tipo
      document.getElementById('campo-producto').style.display =
        tipoSeleccionado === 'venta' ? 'block' : 'none'
    })
  })

  cuerpo.querySelectorAll('#chips-responsable .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      cuerpo.querySelectorAll('#chips-responsable .chip').forEach(c => c.classList.remove('activo'))
      chip.classList.add('activo')
      responsableId = chip.dataset.id
      responsableNombre = chip.dataset.nombre
    })
  })

  document.getElementById('btn-guardar-mov').addEventListener('click', async () => {
    const monto = parseFloat(document.getElementById('input-monto').value)
    const errEl = document.getElementById('error-mov')

    if (!monto || monto <= 0) {
      errEl.textContent = 'Ingresá un monto válido mayor a cero.'
      errEl.classList.add('visible')
      return
    }
    errEl.classList.remove('visible')

    const productoId = document.getElementById('input-producto')?.value || null
    const btn = document.getElementById('btn-guardar-mov')
    btn.textContent = 'Guardando...'
    btn.disabled = true

    const sociaIdParaGuardar = responsableId === 'creta' ? sociaActual.id : responsableId

    try {
      await crearMovimiento({
        socia_id: sociaIdParaGuardar,
        tipo: tipoSeleccionado,
        monto,
        medio_pago: document.getElementById('input-medio').value,
        descripcion: document.getElementById('input-desc').value.trim() || null,
        producto_id: productoId || null,
        periodo: periodoActual(),
        fecha: new Date().toISOString(),
        realizado_por: responsableNombre
      })
      overlay.classList.remove('open')
      mostrarCaja()
    } catch (e) {
      errEl.textContent = 'Error al guardar: ' + e.message
      errEl.classList.add('visible')
      btn.textContent = 'Guardar movimiento'
      btn.disabled = false
    }
  })
}

// ── VISTA: Inventario ──────────────────────────────────────
async function mostrarInventario() {
  const { crearProducto, actualizarProducto, eliminarProducto, subirFotoProducto } = await import('./db.js')
  const productos = await getProductos()
  const contenido = document.getElementById('contenido')
  document.getElementById('fab').style.display = 'flex'
  document.getElementById('fab').onclick = () =>
    abrirModalProducto(null, crearProducto, actualizarProducto, eliminarProducto, subirFotoProducto)

  contenido.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
      <div class="seccion-titulo" style="margin:0">Productos</div>
      <button class="btn btn-secondary" id="btn-nuevo-prod" style="width:auto;padding:8px 16px;font-size:13px">+ Nuevo</button>
    </div>
    ${productos.length === 0
      ? `<div class="vacio"><div class="vacio-icono">📦</div>Sin productos aún.<br>Agregá tu primer artesanía.</div>`
      : productos.map(p => `
        <div class="card" style="margin-bottom:10px" data-prod-id="${p.id}">
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div class="prod-foto-thumb">
              ${p.foto_url
                ? `<img src="${p.foto_url}" alt="${p.nombre}">`
                : `<span class="prod-foto-placeholder">📦</span>`
              }
            </div>
            <div style="flex:1;display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div style="font-size:15px;font-weight:600">${p.nombre}</div>
                <div style="font-size:12px;color:var(--texto-suave);margin-top:2px">${p.categoria || 'Sin categoría'}</div>
              </div>
              <div style="text-align:right">
                <div style="font-size:16px;font-weight:700;color:var(--verde)">${formatPeso(p.precio_venta)}</div>
                <div style="font-size:12px;color:var(--texto-suave)">Costo: ${formatPeso(p.costo_materiales)}</div>
              </div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--borde)">
            <div>
              <span style="font-size:13px;color:var(--texto-suave)">Stock: </span>
              <span style="font-size:14px;font-weight:600;color:${p.stock_actual <= 2 ? 'var(--rojo)' : 'var(--texto)'}">${p.stock_actual} unidades</span>
            </div>
            <div style="display:flex;gap:8px">
              <span style="font-size:12px;color:var(--verde);background:var(--verde-suave);padding:3px 10px;border-radius:999px">
                Margen: ${Math.round((1 - p.costo_materiales / p.precio_venta) * 100)}%
              </span>
              <button class="btn-edit-prod" style="background:none;border:none;cursor:pointer;font-size:13px;color:var(--texto-suave)">Editar</button>
            </div>
          </div>
        </div>
      `).join('')
    }
  `

  document.getElementById('btn-nuevo-prod').onclick = () =>
    abrirModalProducto(null, crearProducto, actualizarProducto, eliminarProducto, subirFotoProducto)

  contenido.querySelectorAll('.btn-edit-prod').forEach(btn => {
    const card = btn.closest('[data-prod-id]')
    const prod = productos.find(p => p.id === card.dataset.prodId)
    btn.onclick = () => abrirModalProducto(prod, crearProducto, actualizarProducto, eliminarProducto, subirFotoProducto)
  })
}

function abrirModalProducto(prod, crearProducto, actualizarProducto, eliminarProducto, subirFotoProducto) {
  const overlay = document.getElementById('modal-overlay')
  const cuerpo = document.getElementById('modal-cuerpo')
  const esEdicion = !!prod
  let fotoSeleccionada = null

  cuerpo.innerHTML = `
    <div class="modal-titulo">
      ${esEdicion ? 'Editar producto' : 'Nuevo producto'}
      <button class="btn-cerrar" onclick="document.getElementById('modal-overlay').classList.remove('open')">×</button>
    </div>

    <div class="campo">
      <label>Foto del producto</label>
      <div class="foto-upload-wrap" id="foto-preview-wrap">
        ${prod?.foto_url
          ? `<img src="${prod.foto_url}" id="foto-preview" class="foto-preview">`
          : `<div class="foto-placeholder" id="foto-preview-placeholder"><span>📷</span><span class="foto-placeholder-texto">Tocá para agregar foto</span></div>`
        }
      </div>
      <input type="file" id="p-foto" accept="image/*" capture="environment" style="display:none">
    </div>

    <div class="campo">
      <label>Nombre del producto</label>
      <input type="text" id="p-nombre" placeholder="Ej: Maceta cerámica mediana" value="${prod?.nombre || ''}">
    </div>
    <div class="campo">
      <label>Categoría</label>
      <input type="text" id="p-categoria" placeholder="Ej: Cerámica, Tejido, Joyería" value="${prod?.categoria || ''}">
    </div>
    <div class="campo-fila">
      <div class="campo">
        <label>Costo de materiales ($)</label>
        <input type="number" id="p-costo" placeholder="0" value="${prod?.costo_materiales || ''}">
      </div>
      <div class="campo">
        <label>Precio de venta ($)</label>
        <input type="number" id="p-precio" placeholder="0" value="${prod?.precio_venta || ''}">
      </div>
    </div>
    <div class="campo">
      <label>Stock actual (unidades)</label>
      <input type="number" id="p-stock" placeholder="0" value="${prod?.stock_actual ?? 0}">
    </div>
    <div id="error-prod" class="error-msg"></div>
    <button class="btn btn-primary" id="btn-guardar-prod">${esEdicion ? 'Guardar cambios' : 'Agregar producto'}</button>
    ${esEdicion ? `<button class="btn btn-danger" id="btn-elim-prod" style="margin-top:8px">Eliminar producto</button>` : ''}
  `

  overlay.classList.add('open')

  const inputFoto = document.getElementById('p-foto')
  const previewWrap = document.getElementById('foto-preview-wrap')

  previewWrap.addEventListener('click', () => inputFoto.click())

  inputFoto.addEventListener('change', () => {
    const file = inputFoto.files[0]
    if (!file) return
    fotoSeleccionada = file
    const url = URL.createObjectURL(file)
    previewWrap.innerHTML = `<img src="${url}" class="foto-preview">`
  })

  document.getElementById('btn-guardar-prod').onclick = async () => {
    const nombre = document.getElementById('p-nombre').value.trim()
    const costo = parseFloat(document.getElementById('p-costo').value)
    const precio = parseFloat(document.getElementById('p-precio').value)
    const stock = parseInt(document.getElementById('p-stock').value) || 0
    const errEl = document.getElementById('error-prod')

    if (!nombre || !precio) {
      errEl.textContent = 'Nombre y precio son obligatorios.'
      errEl.classList.add('visible')
      return
    }
    errEl.classList.remove('visible')

    const btn = document.getElementById('btn-guardar-prod')
    btn.textContent = 'Guardando...'
    btn.disabled = true

    const datos = {
      nombre,
      categoria: document.getElementById('p-categoria').value.trim() || null,
      costo_materiales: costo || 0,
      precio_venta: precio,
      stock_actual: stock
    }

    try {
      let productoGuardado
      if (esEdicion) {
        productoGuardado = await actualizarProducto(prod.id, datos)
      } else {
        productoGuardado = await crearProducto(datos)
      }

      if (fotoSeleccionada) {
        const fotoUrl = await subirFotoProducto(fotoSeleccionada, productoGuardado.id)
        await actualizarProducto(productoGuardado.id, { foto_url: fotoUrl })
      }

      overlay.classList.remove('open')
      mostrarInventario()
    } catch (e) {
      errEl.textContent = 'Error: ' + e.message
      errEl.classList.add('visible')
      btn.textContent = esEdicion ? 'Guardar cambios' : 'Agregar producto'
      btn.disabled = false
    }
  }

  if (esEdicion) {
    document.getElementById('btn-elim-prod').onclick = async () => {
      if (!confirm(`¿Eliminar "${prod.nombre}"?`)) return
      try {
        await eliminarProducto(prod.id)
        overlay.classList.remove('open')
        mostrarInventario()
      } catch (e) {
        alert('Error al eliminar: ' + e.message)
      }
    }
  }
}

// ── VISTA: Balance ─────────────────────────────────────────
async function mostrarBalance() {
  document.getElementById('fab').style.display = 'none'
  const periodo = periodoActual()
  const resumen = await getResumenPeriodo(periodo)
  const contenido = document.getElementById('contenido')

  contenido.innerHTML = `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">Resumen del período ${periodo}</div>
      <table style="width:100%;font-size:14px;border-collapse:collapse;margin-top:8px">
        <tr style="border-bottom:1px solid var(--borde)">
          <td style="padding:8px 0;color:var(--texto-suave)">Ventas totales</td>
          <td style="text-align:right;font-weight:600;color:var(--verde)">${formatPeso(resumen.ventas)}</td>
        </tr>
        <tr style="border-bottom:1px solid var(--borde)">
          <td style="padding:8px 0;color:var(--texto-suave)">Compra de materiales</td>
          <td style="text-align:right;color:var(--rojo)">− ${formatPeso(resumen.compras)}</td>
        </tr>
        <tr style="border-bottom:1px solid var(--borde)">
          <td style="padding:8px 0;color:var(--texto-suave)">Gastos fijos</td>
          <td style="text-align:right;color:var(--rojo)">− ${formatPeso(resumen.gastos)}</td>
        </tr>
        <tr style="border-bottom:1px solid var(--borde)">
          <td style="padding:8px 0;color:var(--texto-suave)">Aportes de capital</td>
          <td style="text-align:right;color:var(--verde)">+ ${formatPeso(resumen.aportes)}</td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-weight:600">Ganancia neta</td>
          <td style="text-align:right;font-size:18px;font-weight:700;color:${resumen.ganancia_bruta >= 0 ? 'var(--verde)' : 'var(--rojo)'}">
            ${formatPeso(resumen.ganancia_bruta)}
          </td>
        </tr>
      </table>
    </div>

    <div class="seccion-titulo">División 50/50</div>
    <div class="metricas">
      <div class="card">
        <div class="card-title">Florencia</div>
        <div class="card-valor">${formatPeso(resumen.por_socia)}</div>
        <div class="card-sub">50% ganancia neta</div>
      </div>
      <div class="card">
        <div class="card-title">Belén</div>
        <div class="card-valor">${formatPeso(resumen.por_socia)}</div>
        <div class="card-sub">50% ganancia neta</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px;background:var(--verde-suave);border-color:var(--verde-claro)">
      <div class="card-title" style="color:var(--verde)">Nota</div>
      <div style="font-size:13px;color:var(--verde);line-height:1.6">
        Balance estimado en tiempo real. El cierre oficial se hace el último día de cada mes.
      </div>
    </div>
  `
}

init()
