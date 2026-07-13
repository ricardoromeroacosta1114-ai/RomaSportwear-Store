-- ============================================================
-- ROMA Sportwear · Preparación de Supabase
-- Pega TODO este archivo en: Supabase → SQL Editor → Run
-- ============================================================

-- Tabla de productos
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  creado timestamptz default now(),
  nombre text not null,
  descripcion text default '',
  cat text default 'Otros',
  color text default 'Negro',
  precio numeric not null default 0,
  antes numeric,
  tipo text default 'arriba',          -- arriba | abajo | capa | ninguno (armador)
  forma text default 'playera',        -- silueta si no hay fotos
  tallas jsonb default '{}'::jsonb,    -- {"S":{"stock":2},"M":{"stock":1}}
  imagenes jsonb default '[]'::jsonb,  -- ["https://...","https://..."]
  img_principal int default 0,
  nuevo boolean default false,
  oferta boolean default false,
  agotado boolean default false,
  activo boolean default true,
  orden int default 0
);

-- Tabla de configuración (una sola fila, id = 1)
create table if not exists public.config (
  id int primary key default 1,
  datos jsonb default '{}'::jsonb
);
insert into public.config (id, datos) values (1, '{}'::jsonb)
  on conflict (id) do nothing;

-- Seguridad (RLS): lectura pública, escritura solo con sesión de administrador
alter table public.productos enable row level security;
alter table public.config enable row level security;

drop policy if exists "productos_lectura_publica" on public.productos;
create policy "productos_lectura_publica" on public.productos
  for select using (true);

drop policy if exists "productos_escritura_admin" on public.productos;
create policy "productos_escritura_admin" on public.productos
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "config_lectura_publica" on public.config;
create policy "config_lectura_publica" on public.config
  for select using (true);

drop policy if exists "config_escritura_admin" on public.config;
create policy "config_escritura_admin" on public.config
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Bucket de imágenes (público para lectura; solo admin sube/borra)
insert into storage.buckets (id, name, public)
  values ('productos', 'productos', true)
  on conflict (id) do nothing;

drop policy if exists "img_lectura_publica" on storage.objects;
create policy "img_lectura_publica" on storage.objects
  for select using (bucket_id = 'productos');

drop policy if exists "img_subida_admin" on storage.objects;
create policy "img_subida_admin" on storage.objects
  for insert with check (bucket_id = 'productos' and auth.role() = 'authenticated');

drop policy if exists "img_borrado_admin" on storage.objects;
create policy "img_borrado_admin" on storage.objects
  for delete using (bucket_id = 'productos' and auth.role() = 'authenticated');

-- LISTO. Ahora:
-- 1) Authentication → Users → Add user → crea tu correo y contraseña de administrador
-- 2) Settings → API → copia Project URL y anon public key a config.js del sitio
