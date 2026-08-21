# Planillas de Prácticas · Campoalto (PPS-GAA-F-006)

App web para diligenciar, firmar y exportar la planilla de evaluación de prácticas.
Roles: Empresa (jefe inmediato), Estudiante, Supervisor institucional.
Proyecto independiente — usa una cuenta de GitHub, Supabase y Vercel distinta a CODICE.

## 1. Supabase (base de datos)

1. Ve a https://supabase.com y crea una cuenta nueva (o inicia sesión con la cuenta que vas a usar para este proyecto — no la de CODICE).
2. **New project** → ponle un nombre, por ejemplo `planillas-practicas`, elige región (la más cercana a Colombia es `South America (São Paulo)`), y una contraseña de base de datos (guárdala).
3. Cuando el proyecto termine de crearse, ve a **SQL Editor** (menú izquierdo) → **New query**.
4. Pega el contenido completo de `supabase-schema.sql` (incluido en este proyecto) y dale **Run**.
5. Ve a **Project Settings → API**. Copia:
   - **Project URL**
   - **anon public** key
6. Abre `index.html` y reemplaza estas dos líneas (búscalas cerca de `STORAGE (Supabase)`):
   ```js
   const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
   const SUPABASE_ANON_KEY = "TU-ANON-KEY";
   ```
   con tus valores reales.

## 2. GitHub (repositorio)

1. Crea una cuenta nueva en https://github.com si aún no tienes la que vas a usar para este proyecto.
2. Crea un repositorio nuevo, por ejemplo `planillas-practicas`.
3. Sube estos archivos (`index.html`, `supabase-schema.sql`, `README.md`) al repositorio:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de la app de planillas"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/planillas-practicas.git
   git push -u origin main
   ```

## 3. Vercel (hosting)

1. Ve a https://vercel.com y crea una cuenta (puedes usar "Continue with GitHub" con la cuenta nueva del paso anterior).
2. **Add New → Project** → importa el repositorio `planillas-practicas`.
3. En "Framework Preset" elige **Other** (es un sitio estático, no necesita build).
4. Deja el resto por defecto y dale **Deploy**.
5. En 1-2 minutos tendrás una URL tipo `https://planillas-practicas.vercel.app` funcionando, sin nada instalado en tu PC.

Cada vez que hagas `git push` a `main`, Vercel vuelve a desplegar automáticamente.

## Notas importantes

- **Seguridad del piloto:** no hay login todavía — cualquiera con la URL y un número de documento puede ver/editar esa planilla, igual que en el prototipo. Sirve para probar con tu grupo. Si más adelante lo vas a usar con datos reales de muchos estudiantes, hay que agregar Supabase Auth (login por correo institucional) y ajustar las políticas de RLS en `supabase-schema.sql`.
- **Firmas:** hoy se guardan como imagen base64 dentro de la fila (columnas `meses`, `revision_funciones`, `datos_supervision`). Con el límite de 500 MB del plan free de Supabase esto alcanza para varios cientos de estudiantes sin problema; si crece mucho, se pueden mover a Supabase Storage.
- **Proyecto pausado por inactividad:** Supabase free pausa el proyecto tras 7 días sin uso — solo hay que entrar al dashboard y reactivarlo, no se pierden los datos.
- **PDF:** se sigue generando en el navegador (jsPDF), no necesita servidor.
