-- NyxVantore Designs — banco, autenticação, RLS e Storage
-- Execute todo este arquivo no SQL Editor de um projeto Supabase novo.

create extension if not exists "pgcrypto";
create schema if not exists private;
revoke all on schema private from public;

-- Lista privada de administradores. Não há política de leitura para clientes.
create table if not exists private.admin_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

insert into private.admin_users (email)
values ('nyxfreelancer9@gmail.com')
on conflict (email) do nothing;

alter table private.admin_users enable row level security;
revoke all on table private.admin_users from anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from private.admin_users a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and auth.uid() is not null
  );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;

-- Wrapper sem SECURITY DEFINER para a verificação de interface via RPC.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.is_admin(); $$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 140),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null check (char_length(summary) between 10 and 320),
  description text not null check (char_length(description) between 20 and 8000),
  category text not null check (category in (
    'Identidade visual', 'Social media', 'Thumbnail', 'Cartaz e divulgação',
    'Design para eventos', 'Web design', 'Edição de vídeo', 'Outros'
  )),
  year smallint not null check (year between 2000 and 2100),
  tools text[] not null default '{}',
  cover_image_path text,
  cover_image_url text,
  cover_alt_text text not null default '' check (char_length(cover_alt_text) <= 240),
  video_url text check (video_url is null or video_url ~ '^https://'),
  external_url text check (external_url is null or external_url ~ '^https://'),
  featured boolean not null default false,
  published boolean not null default false,
  display_order integer not null default 0 check (display_order between 0 and 9999),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  constraint project_cover_required_when_published check (
    not published or (cover_image_path is not null or cover_image_url is not null)
  )
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text,
  storage_path text not null unique,
  alt_text text not null check (char_length(alt_text) between 2 and 240),
  display_order integer not null default 0 check (display_order between 0 and 9999),
  created_at timestamptz not null default now()
);

create index if not exists projects_public_order_idx
  on public.projects (published, featured desc, display_order, published_at desc);
create index if not exists projects_category_idx on public.projects (category) where published = true;
create index if not exists project_images_project_order_idx on public.project_images (project_id, display_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.project_images enable row level security;

drop policy if exists "Projetos publicados são públicos" on public.projects;
create policy "Projetos publicados são públicos"
on public.projects for select
to anon, authenticated
using (published = true or (select private.is_admin()));

drop policy if exists "Administrador cria projetos" on public.projects;
create policy "Administrador cria projetos"
on public.projects for insert
to authenticated
with check ((select private.is_admin()) and created_by = (select auth.uid()));

drop policy if exists "Administrador atualiza projetos" on public.projects;
create policy "Administrador atualiza projetos"
on public.projects for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Administrador exclui projetos" on public.projects;
create policy "Administrador exclui projetos"
on public.projects for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "Imagens de projetos publicados são públicas" on public.project_images;
create policy "Imagens de projetos publicados são públicas"
on public.project_images for select
to anon, authenticated
using (
  (select private.is_admin()) or exists (
    select 1 from public.projects p
    where p.id = project_images.project_id and p.published = true
  )
);

drop policy if exists "Administrador cria imagens" on public.project_images;
create policy "Administrador cria imagens"
on public.project_images for insert
to authenticated
with check (
  (select private.is_admin()) and exists (
    select 1 from public.projects p where p.id = project_images.project_id
  )
);

drop policy if exists "Administrador atualiza imagens" on public.project_images;
create policy "Administrador atualiza imagens"
on public.project_images for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "Administrador exclui imagens" on public.project_images;
create policy "Administrador exclui imagens"
on public.project_images for delete
to authenticated
using ((select private.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.projects, public.project_images to anon;
grant select, insert, update, delete on public.projects, public.project_images to authenticated;

-- Bucket privado: visitantes recebem URLs assinadas apenas quando a política SELECT permite.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio',
  'portfolio',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Leitura controlada das imagens do portfólio" on storage.objects;
create policy "Leitura controlada das imagens do portfólio"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'portfolio'
  and (
    (select private.is_admin())
    or exists (
      select 1 from public.projects p
      where p.published = true and p.cover_image_path = name
    )
    or exists (
      select 1
      from public.project_images pi
      join public.projects p on p.id = pi.project_id
      where p.published = true and pi.storage_path = name
    )
  )
);

drop policy if exists "Administrador envia imagens" on storage.objects;
create policy "Administrador envia imagens"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio' and (select private.is_admin()));

drop policy if exists "Administrador substitui imagens" on storage.objects;
create policy "Administrador substitui imagens"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio' and (select private.is_admin()))
with check (bucket_id = 'portfolio' and (select private.is_admin()));

drop policy if exists "Administrador exclui imagens" on storage.objects;
create policy "Administrador exclui imagens"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio' and (select private.is_admin()));

-- Testes manuais úteis após criar o usuário:
-- select public.is_admin(); -- false no SQL Editor, pois não há JWT de usuário.
-- select id, title, published from public.projects;
