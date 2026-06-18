-- ============================================================
-- CRETA — Setup completo de base de datos en Supabase
-- Copiar todo esto en: Supabase > SQL Editor > New query
-- ============================================================

-- 1. Tabla de socias (vinculada a usuarios de Supabase Auth)
CREATE TABLE socias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  saldo_actual DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabla de productos / artesanías
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT,
  costo_materiales DECIMAL(12,2) DEFAULT 0,
  precio_venta DECIMAL(12,2) NOT NULL,
  stock_actual INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabla de movimientos (corazón del sistema)
CREATE TABLE movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  socia_id UUID REFERENCES socias(id) NOT NULL,
  producto_id UUID REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('venta','compra_materiales','aporte_capital','retiro','gasto_fijo')),
  monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
  descripcion TEXT,
  medio_pago TEXT DEFAULT 'efectivo',
  periodo TEXT NOT NULL, -- formato: '2025-01'
  fecha TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de balance mensual (se llena al cerrar cada período)
CREATE TABLE balance_socias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  socia_id UUID REFERENCES socias(id) NOT NULL,
  periodo TEXT NOT NULL,
  aportes DECIMAL(12,2) DEFAULT 0,
  retiros DECIMAL(12,2) DEFAULT 0,
  ganancia_asignada DECIMAL(12,2) DEFAULT 0,
  saldo_periodo DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(socia_id, periodo)
);

-- ============================================================
-- ROW LEVEL SECURITY — solo las socias ven los datos
-- ============================================================

ALTER TABLE socias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_socias ENABLE ROW LEVEL SECURITY;

-- Las socias autenticadas pueden ver y editar todo
CREATE POLICY "socias_acceso" ON socias
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "productos_acceso" ON productos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "movimientos_acceso" ON movimientos
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "balance_acceso" ON balance_socias
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- DATOS INICIALES — correr DESPUÉS de crear los usuarios
-- en Supabase Auth > Users > Add user
-- Reemplazar los UUIDs con los que genera Supabase
-- ============================================================

-- INSERT INTO socias (user_id, nombre, email) VALUES
--   ('UUID-DE-SOCIA-A-EN-AUTH', 'Socia A', 'sociaa@email.com'),
--   ('UUID-DE-SOCIA-B-EN-AUTH', 'Socia B', 'sociab@email.com');
