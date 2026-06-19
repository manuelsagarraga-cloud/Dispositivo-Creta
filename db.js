import { supabase } from './supabase.js'

// ── Socias ────────────────────────────────────────────────
export async function getSocias() {
  const { data, error } = await supabase
    .from('socias')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

// ── Movimientos ────────────────────────────────────────────
export async function getMovimientos({ limite = 50, periodo = null } = {}) {
  let query = supabase
    .from('movimientos')
    .select(`*, socias(nombre), productos(nombre)`)
    .order('fecha', { ascending: false })
    .limit(limite)

  if (periodo) query = query.eq('periodo', periodo)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function crearMovimiento(mov) {
  const { data, error } = await supabase
    .from('movimientos')
    .insert([mov])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarMovimiento(id) {
  const { error } = await supabase
    .from('movimientos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Productos / inventario ──────────────────────────────────
export async function getProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('nombre')
  if (error) throw error
  return data
}

export async function crearProducto(prod) {
  const { data, error } = await supabase
    .from('productos')
    .insert([prod])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function actualizarProducto(id, cambios) {
  const { data, error } = await supabase
    .from('productos')
    .update(cambios)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function eliminarProducto(id) {
  const { error } = await supabase
    .from('productos')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Fotos de productos (Supabase Storage) ───────────────────
export async function subirFotoProducto(file, productoId) {
  const extension = file.name.split('.').pop()
  const nombreArchivo = `${productoId}-${Date.now()}.${extension}`

  const { error: errorSubida } = await supabase.storage
    .from('productos')
    .upload(nombreArchivo, file, { upsert: true })

  if (errorSubida) throw errorSubida

  const { data } = supabase.storage
    .from('productos')
    .getPublicUrl(nombreArchivo)

  return data.publicUrl
}

// ── Resumen / métricas ────────────────────────────────────
export async function getResumenPeriodo(periodo) {
  const { data, error } = await supabase
    .from('movimientos')
    .select('tipo, monto, socia_id')
    .eq('periodo', periodo)

  if (error) throw error

  const resumen = {
    ventas: 0,
    compras: 0,
    aportes: 0,
    retiros: 0,
    gastos: 0,
  }

  for (const m of data) {
    const monto = parseFloat(m.monto)
    if (m.tipo === 'venta')              resumen.ventas    += monto
    if (m.tipo === 'compra_materiales')  resumen.compras   += monto
    if (m.tipo === 'aporte_capital')     resumen.aportes   += monto
    if (m.tipo === 'retiro')             resumen.retiros   += monto
    if (m.tipo === 'gasto_fijo')         resumen.gastos    += monto
  }

  resumen.ganancia_bruta = resumen.ventas - resumen.compras - resumen.gastos
  resumen.por_socia = resumen.ganancia_bruta / 2

  return resumen
}

// ── Balance por socia ─────────────────────────────────────
export async function getBalanceSocias(periodo) {
  const { data, error } = await supabase
    .from('balance_socias')
    .select(`*, socias(nombre)`)
    .eq('periodo', periodo)

  if (error) throw error
  return data
}

export async function cerrarPeriodo(periodo, resumen) {
  const { data: socias } = await supabase.from('socias').select('id')

  for (const socia of socias) {
    const { data: movSocia } = await supabase
      .from('movimientos')
      .select('tipo, monto')
      .eq('periodo', periodo)
      .eq('socia_id', socia.id)

    let aportes = 0
    let retiros = 0
    for (const m of movSocia) {
      if (m.tipo === 'aporte_capital') aportes += parseFloat(m.monto)
      if (m.tipo === 'retiro')         retiros += parseFloat(m.monto)
    }

    await supabase.from('balance_socias').insert([{
      socia_id: socia.id,
      periodo,
      aportes,
      retiros,
      ganancia_asignada: resumen.por_socia,
      saldo_periodo: resumen.por_socia + aportes - retiros
    }])
  }
}

// ── Helpers ───────────────────────────────────────────────
export function periodoActual() {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
}

export function formatPeso(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(n)
}

export function formatFecha(iso) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}
