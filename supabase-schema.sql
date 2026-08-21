-- ============================================================
-- Planillas de Prácticas · Campoalto (PPS-GAA-F-006)
-- Ejecuta este script completo en Supabase > SQL Editor
-- ============================================================

create table if not exists students (
  documento text primary key,
  nombre text default '',
  correo text default '',
  telefono text default '',
  sede text default '',
  semestre text default '',
  modalidad text default '',
  periodo_academico text default '',
  funcionario text default '',
  programa text default 'Técnico Laboral por Competencias en Auxiliar Administrativo en Salud',

  competencias jsonb default '{
    "ser": [null,null,null,null,null,null],
    "desempeno": [null,null,null,null,null,null],
    "producto": [null,null,null,null,null,null],
    "conocimiento": [null,null,null,null,null,null]
  }'::jsonb,

  meses jsonb default '[
    {"sitio":"","fechaInicio":"","fechaFin":"","observaciones":"","firmaEmpresa":null,"firmaEstudiante":null},
    {"sitio":"","fechaInicio":"","fechaFin":"","observaciones":"","firmaEmpresa":null,"firmaEstudiante":null},
    {"sitio":"","fechaInicio":"","fechaFin":"","observaciones":"","firmaEmpresa":null,"firmaEstudiante":null},
    {"sitio":"","fechaInicio":"","fechaFin":"","observaciones":"","firmaEmpresa":null,"firmaEstudiante":null},
    {"sitio":"","fechaInicio":"","fechaFin":"","observaciones":"","firmaEmpresa":null,"firmaEstudiante":null},
    {"sitio":"","fechaInicio":"","fechaFin":"","observaciones":"","firmaEmpresa":null,"firmaEstudiante":null}
  ]'::jsonb,

  revision_funciones jsonb default '{
    "fecha":"","sitio":"","area":"","jefeInmediato":"","supervisor":"",
    "firmaJefe":null,"firmaEstudiante":null,"firmaSupervisor":null
  }'::jsonb,

  datos_supervision jsonb default '{
    "fecha":"","sitio":"","area":"","jefeInmediato":"","supervisor":"",
    "obsEstudiante":{"p1":"","p2":"","comentarios":"","firma":null},
    "obsJefe":{"p1":"","p2":"","comentarios":"","firma":null},
    "obsSupervisor":{"comentarios":"","firma":null}
  }'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table students enable row level security;

-- Piloto sin login: cualquiera con la anon key (tu app) puede leer y escribir.
-- El "número de documento" funciona como código de acceso informal, igual que en
-- el prototipo. Si más adelante quieres restringir esto de verdad, agrega Supabase
-- Auth y cambia estas políticas para exigir auth.uid() en vez de "true".
drop policy if exists "allow read for anon" on students;
create policy "allow read for anon" on students
  for select using (true);

drop policy if exists "allow insert for anon" on students;
create policy "allow insert for anon" on students
  for insert with check (true);

drop policy if exists "allow update for anon" on students;
create policy "allow update for anon" on students
  for update using (true);

-- Índice para búsquedas por documento (ya es la PK, pero por si luego buscas por nombre)
create index if not exists idx_students_nombre on students (nombre);
