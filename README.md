# RecetaBase 🍽️
Base de datos culinaria con IA — Guía de instalación completa

---

## Lo que vas a necesitar (todo gratis)

- Cuenta en **GitHub**: github.com
- Cuenta en **Supabase**: supabase.com
- Cuenta en **Vercel**: vercel.com
- Cuenta en **Anthropic** (para la IA): console.anthropic.com
- **Node.js** instalado en tu ordenador: nodejs.org (descarga la versión LTS)

---

## PASO 1 — Sube el código a GitHub

1. Ve a github.com → "New repository"
2. Ponle nombre: `recetabase`
3. Déjalo en **Public** y pulsa "Create repository"
4. Abre la terminal en tu ordenador y ejecuta:

```bash
# Entra a la carpeta del proyecto (ajusta la ruta)
cd recetabase

# Inicializa Git y sube el código
git init
git add .
git commit -m "RecetaBase inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/recetabase.git
git push -u origin main
```

---

## PASO 2 — Crea la base de datos en Supabase

1. Ve a **supabase.com** → "New project"
2. Dale un nombre (ej: `recetabase`) y crea una contraseña
3. Espera ~1 minuto a que se cree el proyecto
4. En el menú izquierdo ve a **SQL Editor** → "New query"
5. Copia y pega este SQL y pulsa **Run**:

```sql
CREATE TABLE recipes (
  id          BIGSERIAL PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  name        TEXT NOT NULL,
  origin      TEXT,
  cuisine     TEXT,
  type        TEXT,
  base        TEXT,
  main_ingredient TEXT,
  calories    INT DEFAULT 0,
  protein     INT DEFAULT 0,
  carbs       INT DEFAULT 0,
  fat         INT DEFAULT 0,
  source      TEXT DEFAULT 'Manual',
  ingredients JSONB DEFAULT '[]',
  steps       JSONB DEFAULT '[]',
  tags        JSONB DEFAULT '[]'
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON recipes
  FOR ALL USING (true) WITH CHECK (true);
```

6. Ve a **Settings → API** y copia:
   - `Project URL` → la necesitas en el paso 4
   - `anon public key` → la necesitas en el paso 4

---

## PASO 3 — Obtén tu API Key de Anthropic

1. Ve a **console.anthropic.com**
2. Crea una cuenta si no tienes
3. Ve a **API Keys** → "Create Key"
4. Copia la clave (empieza por `sk-ant-...`)
   ⚠️ Guárdala en un lugar seguro, solo se muestra una vez

---

## PASO 4 — Publica en Vercel

1. Ve a **vercel.com** → "Add New Project"
2. Conecta tu cuenta de GitHub y selecciona el repo `recetabase`
3. En **Environment Variables** añade estas 3 variables:

| Variable | Valor |
|----------|-------|
| `REACT_APP_SUPABASE_URL` | La URL de tu proyecto Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | La anon key de Supabase |
| `REACT_APP_ANTHROPIC_KEY` | Tu API key de Anthropic |

4. Pulsa **Deploy** y espera ~2 minutos

¡Listo! Vercel te dará una URL tipo `https://recetabase-xyz.vercel.app`

---

## PASO 5 — Úsala desde cualquier dispositivo

- Abre la URL en el móvil → guárdala en la pantalla de inicio (como app)
- Abre la URL en el ordenador
- Todos los cambios se sincronizan al momento en tiempo real

---

## Actualizar la app en el futuro

Cuando quieras hacer cambios, edita los archivos y ejecuta:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push automáticamente y publica la nueva versión en ~1 minuto.

---

## Estructura del proyecto

```
recetabase/
├── public/
│   └── index.html
├── src/
│   ├── lib/
│   │   └── supabase.js     ← Conexión a la base de datos
│   ├── App.js              ← Toda la lógica de la app
│   └── App.css             ← Todos los estilos
├── .env.example            ← Plantilla de variables de entorno
├── .gitignore
├── package.json
├── supabase-schema.sql     ← SQL para crear la tabla
└── vercel.json
```

---

## ¿Algo no funciona?

- **La app no carga recetas**: comprueba las variables de entorno en Vercel → Settings → Environment Variables
- **La IA no responde**: verifica que la API key de Anthropic es correcta y tienes crédito en console.anthropic.com
- **Error al guardar**: asegúrate de haber ejecutado el SQL del paso 2 correctamente

---

*RecetaBase — Hecho con ❤️ y Claude AI*
