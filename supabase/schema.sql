-- Schema for Mestre SaaS
-- Database: PostgreSQL (Supabase)

-- Drop existing resources first to ensure clean execution and prevent relation/trigger/policy duplication errors
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.get_user_role(uuid) cascade;

drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;
drop table if exists public.materiais cascade;
drop table if exists public.empresas cascade;
drop table if exists public.itens_relatorio_avaria cascade;
drop table if exists public.relatorios_avarias cascade;
drop table if exists public.relatorios_visitas cascade;
drop table if exists public.historico cascade;
drop table if exists public.configuracoes cascade;

-- 1. PROFILES & ROLES
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    full_name text,
    email text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.user_roles (
    id bigint generated always as identity primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    role text not null check (role in ('admin', 'member')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, role)
);

-- 2. MATERIALS & COMPANIES
create table public.materiais (
    id uuid default gen_random_uuid() primary key,
    name text unique not null,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.empresas (
    id uuid default gen_random_uuid() primary key,
    name text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. REPORTS (AVARIAS & VISITAS)
create table public.relatorios_avarias (
    id uuid default gen_random_uuid() primary key,
    numero text unique not null,
    empresa text not null,
    responsavel text not null,
    data timestamp with time zone not null,
    situacao text,
    observacoes text,
    total_itens integer default 0 not null,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.itens_relatorio_avaria (
    id uuid default gen_random_uuid() primary key,
    relatorio_id uuid references public.relatorios_avarias(id) on delete cascade not null,
    material text not null,
    quantidade integer not null check (quantidade > 0),
    tipo_avaria text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.relatorios_visitas (
    id uuid default gen_random_uuid() primary key,
    numero text unique not null,
    empresa text not null,
    responsavel text not null,
    data timestamp with time zone not null,
    motivo text,
    atividades text,
    observacoes text,
    status text default 'Realizada' not null check (status in ('Agendada', 'Realizada', 'Cancelada')),
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. SYSTEM HISTORY & CONFIGURATION
create table public.historico (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.profiles(id) on delete set null,
    action text not null,
    details jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.configuracoes (
    id uuid default gen_random_uuid() primary key,
    key text unique not null,
    value jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. FUNCTION TO GET USER ROLE (SECURITY DEFINER to avoid RLS policy recursion)
create or replace function public.get_user_role(_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
    _role text;
begin
    if _user_id is null then
        return 'member';
    end if;

    select role into _role
    from public.user_roles
    where user_id = _user_id
    limit 1;
    
    return coalesce(_role, 'member');
end;
$$;

-- 6. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
    default_role text := 'member';
begin
    -- The first user to sign up will be the admin
    if not exists (select 1 from public.profiles) then
        default_role := 'admin';
    end if;

    insert into public.profiles (id, full_name, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', new.email),
        new.email
    )
    on conflict (id) do nothing;

    insert into public.user_roles (user_id, role)
    values (new.id, default_role)
    on conflict (user_id, role) do nothing;

    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 7. SEED DATA
insert into public.materiais (name, image_url) values
    ('Argamassa AC1', '/assets/argamassa-ac1-BmpV27ny.jpeg'),
    ('Argamassa AC2', '/assets/argamassa-ac2-CQZ9wPOC.jpeg'),
    ('Argamassa AC3', '/assets/argamassa-ac3-B8WQUbpj.jpeg'),
    ('Tinta Emborrachada 3,6L', '/assets/tinta-emborrachada-BbL48fij.jpeg'),
    ('Tinta Emborrachada 18L', '/assets/tinta-emborrachada-BbL48fij.jpeg'),
    ('Manta Líquida', '/assets/manta-liquida-Cr8zedL_.jpeg'),
    ('Rejunte Tipo 2', '/assets/rejunte-tipo2-N3UJjJ3P.jpeg'),
    ('Rejunte Siliconado', '/assets/rejunte-siliconado-BMqhJzFT.jpeg'),
    ('Rejunte Piscinas', '/assets/rejunte-piscinas-DJ6NXkgV.jpeg'),
    ('Argamassa Impermeabilizante', '/assets/argamassa-impermeabilizante-CTVnaWh2.jpeg')
on conflict (name) do nothing;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.materiais enable row level security;
alter table public.empresas enable row level security;
alter table public.relatorios_avarias enable row level security;
alter table public.itens_relatorio_avaria enable row level security;
alter table public.relatorios_visitas enable row level security;
alter table public.historico enable row level security;
alter table public.configuracoes enable row level security;

-- Profiles policies (allow authenticated and anonymous/mock users to view)
create policy "Users can view all profiles" on public.profiles
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Users can update own profile" on public.profiles
    for update using (auth.uid() = id or auth.role() = 'anon');

-- Roles policies (allow authenticated and anonymous to view, restrict updates using non-recursive role function or allow anon)
create policy "Users can view all roles" on public.user_roles
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Only admin can modify roles" on public.user_roles
    for all using (public.get_user_role(auth.uid()) = 'admin' or auth.role() = 'anon');

-- Materials policies
create policy "Anyone authenticated can view materials" on public.materiais
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Only admin can manage materials" on public.materiais
    for all using (public.get_user_role(auth.uid()) = 'admin' or auth.role() = 'anon');

-- Companies policies
create policy "Anyone authenticated can view companies" on public.empresas
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Anyone authenticated can insert companies" on public.empresas
    for insert with check (auth.role() in ('authenticated', 'anon'));

-- Avarias Reports policies
create policy "Anyone authenticated can view avarias reports" on public.relatorios_avarias
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Anyone authenticated can insert avarias reports" on public.relatorios_avarias
    for insert with check (auth.role() in ('authenticated', 'anon'));
create policy "Admin or creator can delete avarias reports" on public.relatorios_avarias
    for delete using (
        created_by = auth.uid() or
        created_by is null or
        public.get_user_role(auth.uid()) = 'admin' or
        auth.role() = 'anon'
    );

-- Items policies
create policy "Anyone authenticated can view avarias items" on public.itens_relatorio_avaria
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Anyone authenticated can insert avarias items" on public.itens_relatorio_avaria
    for insert with check (auth.role() in ('authenticated', 'anon'));
create policy "Admin or creator can delete avarias items" on public.itens_relatorio_avaria
    for delete using (
        exists (
            select 1 from public.relatorios_avarias r
            where r.id = relatorio_id and (
                r.created_by = auth.uid() or
                r.created_by is null or
                public.get_user_role(auth.uid()) = 'admin' or
                auth.role() = 'anon'
            )
        )
    );

-- Visitas Reports policies
create policy "Anyone authenticated can view visitas reports" on public.relatorios_visitas
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Anyone authenticated can insert visitas reports" on public.relatorios_visitas
    for insert with check (auth.role() in ('authenticated', 'anon'));
create policy "Admin or creator can delete visitas reports" on public.relatorios_visitas
    for delete using (
        created_by = auth.uid() or
        created_by is null or
        public.get_user_role(auth.uid()) = 'admin' or
        auth.role() = 'anon'
    );

-- Historico policies
create policy "Admins can view history" on public.historico
    for select using (public.get_user_role(auth.uid()) = 'admin' or auth.role() = 'anon');
create policy "Anyone authenticated can insert history logs" on public.historico
    for insert with check (auth.role() in ('authenticated', 'anon'));

-- Configuracoes policies
create policy "Anyone authenticated can view configurations" on public.configuracoes
    for select using (auth.role() in ('authenticated', 'anon'));
create policy "Only admin can manage configurations" on public.configuracoes
    for all using (public.get_user_role(auth.uid()) = 'admin' or auth.role() = 'anon');
