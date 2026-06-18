# Creta — Sistema de gestión

App de flujo de caja e inventario para el emprendimiento Creta.

---

## Stack

- **Frontend**: HTML + CSS + JS vanilla (sin frameworks)
- **Base de datos**: Supabase (PostgreSQL gratuito)
- **Hosting**: GitHub Pages (gratuito)
- **Auth**: Supabase Auth (email + contraseña)

---

## Puesta en marcha — paso a paso

### Paso 1 — Crear cuenta en Supabase

1. Ir a [supabase.com](https://supabase.com) y crear cuenta gratuita
2. Crear un nuevo proyecto (nombre: `creta`, región: South America)
3. Guardar la contraseña del proyecto en un lugar seguro

### Paso 2 — Crear las tablas

1. En Supabase, ir a **SQL Editor** → **New query**
2. Copiar todo el contenido de `supabase-setup.sql` y ejecutarlo
3. Verificar que se crearon las 4 tablas en **Table Editor**

### Paso 3 — Crear los usuarios

1. En Supabase ir a **Authentication** → **Users** → **Add user**
2. Crear usuario para Socia A (email + contraseña)
3. Crear usuario para Socia B (email + contraseña)
4. Copiar los UUID de cada usuario (columna `id`)

### Paso 4 — Insertar las socias en la tabla

En SQL Editor, ejecutar (reemplazando los UUIDs y emails reales):

```sql
INSERT INTO socias (user_id, nombre, email) VALUES
  ('UUID-SOCIA-A', 'Nombre Socia A', 'sociaa@email.com'),
  ('UUID-SOCIA-B', 'Nombre Socia B', 'sociab@email.com');
```

### Paso 5 — Conectar Supabase con la app

1. En Supabase ir a **Settings** → **API**
2. Copiar **Project URL** y **anon public key**
3. Abrir el archivo `js/supabase.js` y reemplazar:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co'
   const SUPABASE_ANON_KEY = 'eyJ...'
   ```

> ⚠️ La `anon key` es pública y segura de publicar — solo permite
> acceso a usuarios autenticados gracias al Row Level Security.

### Paso 6 — Subir a GitHub

```bash
git init
git add .
git commit -m "primera versión de creta"
git remote add origin https://github.com/TU_USUARIO/creta-app.git
git push -u origin main
```

### Paso 7 — Activar GitHub Pages

1. En GitHub ir al repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / carpeta: **/ (root)**
4. Guardar — en 1-2 minutos la app estará en:
   `https://TU_USUARIO.github.io/creta-app`

---

## Uso diario

### Registrar una venta
1. Abrir la app → pantalla **Caja**
2. Tocar el botón **+**
3. Seleccionar tipo: **Venta**
4. Ingresar monto, medio de pago y descripción
5. Guardar

### Registrar una compra de materiales
1. Botón **+** → tipo: **Compra**
2. El monto se descuenta automáticamente de la ganancia

### Agregar un producto al inventario
1. Ir a pestaña **Inventario**
2. Tocar **+ Nuevo**
3. Cargar nombre, categoría, costo de materiales y precio de venta

### Ver el balance
- Ir a pestaña **Balance**
- Se muestra la ganancia neta del mes y la parte de cada socia

---

## Períodos

El sistema trabaja con períodos mensuales en formato `AAAA-MM` (ej: `2025-06`).
Cada movimiento queda asignado al período en que se registra.
El balance estimado se actualiza en tiempo real.

---

## Próximos pasos (Fase 2)

- [ ] Integración con Mercado Pago (solo lectura)
- [ ] Reportes por período histórico
- [ ] Exportar balance a PDF
- [ ] Notificaciones de stock bajo
