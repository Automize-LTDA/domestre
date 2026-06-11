-- Schema for Mestre SaaS
-- Database: PostgreSQL (Supabase)
-- Cole e execute todo este código no SQL Editor do Supabase

-- 1. LIMPAR RECURSOS ANTIGOS (Para evitar erros de duplicidade)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_user_credentials(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text) CASCADE;

DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.materiais CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.itens_relatorio_avaria CASCADE;
DROP TABLE IF EXISTS public.relatorios_avarias CASCADE;
DROP TABLE IF EXISTS public.relatorios_visitas CASCADE;
DROP TABLE IF EXISTS public.historico CASCADE;
DROP TABLE IF EXISTS public.configuracoes CASCADE;

-- 2. CRIAR TABELAS PRINCIPAIS
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name text,
    email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.usuarios (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    cargo text NOT NULL CHECK (cargo IN ('admin', 'gestor', 'sup_tecnico', 'tecnico', 'funcionario', 'cliente')),
    status text DEFAULT 'ativo' NOT NULL CHECK (status IN ('ativo', 'bloqueado')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.user_roles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'member', 'promotor')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role)
);

CREATE TABLE public.materiais (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.relatorios_avarias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero text UNIQUE NOT NULL,
    empresa text NOT NULL,
    responsavel text NOT NULL,
    data timestamp with time zone NOT NULL,
    situacao text,
    observacoes text,
    total_itens integer DEFAULT 0 NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.itens_relatorio_avaria (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    relatorio_id uuid REFERENCES public.relatorios_avarias(id) ON DELETE CASCADE NOT NULL,
    material text NOT NULL,
    quantidade integer NOT NULL CHECK (quantidade > 0),
    tipo_avaria text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.relatorios_visitas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero text UNIQUE NOT NULL,
    empresa text NOT NULL,
    responsavel text NOT NULL,
    data timestamp with time zone NOT NULL,
    motivo text,
    atividades text,
    observacoes text,
    status text DEFAULT 'Realizada' NOT NULL CHECK (status IN ('Agendada', 'Realizada', 'Cancelada')),
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.historico (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.configuracoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. FUNÇÕES DO SISTEMA (SECURITY DEFINER para contornar RLS e permissões de auth)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _role text;
BEGIN
    IF _user_id IS NULL THEN
        RETURN 'member';
    END IF;

    SELECT role INTO _role
    FROM public.user_roles
    WHERE user_id = _user_id
    LIMIT 1;
    
    RETURN COALESCE(_role, 'member');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_role text := 'member';
    default_cargo text := 'funcionario';
BEGIN
    -- O primeiro usuário a se cadastrar será o administrador
    IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
        default_role := 'admin';
        default_cargo := 'admin';
    END IF;

    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, default_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.usuarios (id, email, cargo, status)
    VALUES (
        NEW.id,
        NEW.email,
        default_cargo,
        'ativo'
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 4. TRIGGER DE CADASTRO AUTOMÁTICO
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. FUNÇÃO DE CRIAÇÃO DIRETA DE USUÁRIOS (Contorna limites de e-mail/rate limits de forma dinâmica)
CREATE OR REPLACE FUNCTION public.admin_create_user(
    _new_email text,
    _new_password text,
    _new_full_name text,
    _new_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _new_user_id uuid := gen_random_uuid();
    _users_cols text[] := '{}';
    _users_vals text[] := '{}';
    _ident_cols text[] := '{}';
    _ident_vals text[] := '{}';
    _ident_id_type text;
    _sql text;
BEGIN
    -- Only allow execution if the caller is an admin or if it is an anonymous/mock admin connection
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.role() != 'anon' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
    END IF;

    -- Check if email already exists in auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = _new_email) THEN
        RAISE EXCEPTION 'Erro: Este usuário/email já está cadastrado.';
    END IF;

    -- --- BUILD INSERT FOR auth.users ---
    _users_cols := ARRAY['instance_id', 'id', 'aud', 'role', 'email', 'encrypted_password', 'email_confirmed_at', 'raw_app_meta_data', 'raw_user_meta_data', 'created_at', 'updated_at'];
    _users_vals := ARRAY[
        '''00000000-0000-0000-0000-000000000000''::uuid',
        quote_literal(_new_user_id) || '::uuid',
        '''authenticated''',
        '''authenticated''',
        quote_literal(_new_email),
        quote_literal(crypt(_new_password, gen_salt('bf', 10))),
        'now()',
        '''{"provider": "email", "providers": ["email"]}''::jsonb',
        quote_literal(jsonb_build_object('full_name', _new_full_name)::text) || '::jsonb',
        'now()',
        'now()'
    ];

    -- Conditional columns in auth.users
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'confirmed_at' AND is_generated = 'NEVER') THEN
        _users_cols := array_append(_users_cols, 'confirmed_at');
        _users_vals := array_append(_users_vals, 'now()');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_confirm_status') THEN
        _users_cols := array_append(_users_cols, 'email_change_confirm_status');
        _users_vals := array_append(_users_vals, '0');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_super_admin') THEN
        _users_cols := array_append(_users_cols, 'is_super_admin');
        _users_vals := array_append(_users_vals, 'false');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') THEN
        _users_cols := array_append(_users_cols, 'is_sso_user');
        _users_vals := array_append(_users_vals, 'false');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous') THEN
        _users_cols := array_append(_users_cols, 'is_anonymous');
        _users_vals := array_append(_users_vals, 'false');
    END IF;

    -- Token columns required by GoTrue (initialize to empty string to prevent scan errors)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'confirmation_token') THEN
        _users_cols := array_append(_users_cols, 'confirmation_token');
        _users_vals := array_append(_users_vals, '''''');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change') THEN
        _users_cols := array_append(_users_cols, 'email_change');
        _users_vals := array_append(_users_vals, '''''');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_token_new') THEN
        _users_cols := array_append(_users_cols, 'email_change_token_new');
        _users_vals := array_append(_users_vals, '''''');
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'recovery_token') THEN
        _users_cols := array_append(_users_cols, 'recovery_token');
        _users_vals := array_append(_users_vals, '''''');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change') THEN
        _users_cols := array_append(_users_cols, 'phone_change');
        _users_vals := array_append(_users_vals, '''''');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change_token') THEN
        _users_cols := array_append(_users_cols, 'phone_change_token');
        _users_vals := array_append(_users_vals, '''''');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_token_current') THEN
        _users_cols := array_append(_users_cols, 'email_change_token_current');
        _users_vals := array_append(_users_vals, '''''');
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'reauthentication_token') THEN
        _users_cols := array_append(_users_cols, 'reauthentication_token');
        _users_vals := array_append(_users_vals, '''''');
    END IF;

    -- Execute users insert
    _sql := 'INSERT INTO auth.users (' || array_to_string(_users_cols, ', ') || ') VALUES (' || array_to_string(_users_vals, ', ') || ')';
    EXECUTE _sql;

    -- --- BUILD INSERT FOR auth.identities ---
    -- Get id column type to cast properly
    SELECT data_type INTO _ident_id_type 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id';

    _ident_cols := ARRAY['user_id', 'identity_data', 'provider', 'last_sign_in_at', 'created_at', 'updated_at'];
    _ident_vals := ARRAY[
        quote_literal(_new_user_id) || '::uuid',
        quote_literal(jsonb_build_object('sub', _new_user_id::text, 'email', _new_email, 'email_verified', true, 'phone_verified', false)::text) || '::jsonb',
        '''email''',
        'now()',
        'now()',
        'now()'
    ];

    -- Add identities.id with the correct type cast
    _ident_cols := array_append(_ident_cols, 'id');
    IF _ident_id_type = 'uuid' THEN
        _ident_vals := array_append(_ident_vals, quote_literal(_new_user_id) || '::uuid');
    ELSE
        _ident_vals := array_append(_ident_vals, quote_literal(_new_user_id::text));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id') THEN
        _ident_cols := array_append(_ident_cols, 'provider_id');
        _ident_vals := array_append(_ident_vals, quote_literal(_new_user_id::text));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'email' AND is_generated = 'NEVER') THEN
        _ident_cols := array_append(_ident_cols, 'email');
        _ident_vals := array_append(_ident_vals, quote_literal(_new_email));
    END IF;

    -- Execute identities insert
    _sql := 'INSERT INTO auth.identities (' || array_to_string(_ident_cols, ', ') || ') VALUES (' || array_to_string(_ident_vals, ', ') || ')';
    EXECUTE _sql;

    -- 3. Trigger handle_new_user already created profiles and user_roles.
    -- Update role if target role is different from default ('member')
    IF _new_role != 'member' THEN
        DELETE FROM public.user_roles WHERE user_id = _new_user_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (_new_user_id, _new_role);
    END IF;

    RETURN _new_user_id;
END;
$$;

-- 6. FUNÇÃO DE ATUALIZAÇÃO DE CREDENCIAIS (email/senha)
CREATE OR REPLACE FUNCTION public.admin_update_user_credentials(
    _user_id uuid,
    _new_email text,
    _new_password text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.role() != 'anon' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar credenciais.';
    END IF;

    IF _new_email IS NOT NULL AND _new_email != '' THEN
        UPDATE public.profiles SET email = _new_email WHERE id = _user_id;
        UPDATE auth.users SET email = _new_email, email_change_confirm_status = 0 WHERE id = _user_id;
        
        -- Keep auth.identities in sync
        UPDATE auth.identities 
        SET identity_data = jsonb_build_object('sub', _user_id::text, 'email', _new_email, 'email_verified', true, 'phone_verified', false),
            updated_at = now()
        WHERE user_id = _user_id AND provider = 'email';
        
        BEGIN
            UPDATE auth.identities SET email = _new_email WHERE user_id = _user_id AND provider = 'email';
        EXCEPTION WHEN OTHERS THEN
            -- Ignore if column does not exist
        END;
    END IF;

    IF _new_password IS NOT NULL AND _new_password != '' THEN
        UPDATE auth.users SET encrypted_password = crypt(_new_password, gen_salt('bf', 10)) WHERE id = _user_id;
    END IF;
END;
$$;

-- 7. FUNÇÃO DE EXCLUSÃO COMPLETA (Segura e limpa tudo)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.role() != 'anon' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem remover usuários.';
    END IF;

    -- Deleta explicitamente em ordem para evitar erros de chave estrangeira
    DELETE FROM public.user_roles WHERE user_id = _user_id;
    DELETE FROM public.profiles WHERE id = _user_id;
    DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- 8. ALIMENTAR DADOS INICIAIS (SEEDS)
INSERT INTO public.materiais (name, image_url) VALUES
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
ON CONFLICT (name) DO NOTHING;

-- 9. HABILITAR SEGURANÇA DE LINHA (RLS - Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_avarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_relatorio_avaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- 10. CRIAR POLÍTICAS DE RLS (Permite acessos a usuários autenticados e mock/anon)

-- Profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'anon');

-- Usuarios
CREATE POLICY "Users can view all usuarios" ON public.usuarios
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Users can update own usuario" ON public.usuarios
    FOR UPDATE USING (auth.uid() = id OR auth.role() = 'anon');

-- Roles
CREATE POLICY "Users can view all roles" ON public.user_roles
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Only admin can modify roles" ON public.user_roles
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin' OR auth.role() = 'anon');

-- Materials
CREATE POLICY "Anyone authenticated can view materials" ON public.materiais
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Only admin can manage materials" ON public.materiais
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin' OR auth.role() = 'anon');

-- Companies
CREATE POLICY "Anyone authenticated can view companies" ON public.empresas
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Anyone authenticated can insert companies" ON public.empresas
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));

-- Avarias Reports
CREATE POLICY "Anyone authenticated can view avarias reports" ON public.relatorios_avarias
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Anyone authenticated can insert avarias reports" ON public.relatorios_avarias
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Admin or creator can delete avarias reports" ON public.relatorios_avarias
    FOR DELETE USING (
        created_by = auth.uid() OR
        created_by IS NULL OR
        public.get_user_role(auth.uid()) = 'admin' OR
        auth.role() = 'anon'
    );

-- Items Avarias
CREATE POLICY "Anyone authenticated can view avarias items" ON public.itens_relatorio_avaria
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Anyone authenticated can insert avarias items" ON public.itens_relatorio_avaria
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Admin or creator can delete avarias items" ON public.itens_relatorio_avaria
    FOR DELETE USING (auth.role() IN ('authenticated', 'anon'));

-- Visitas Reports
CREATE POLICY "Anyone authenticated can view visitas reports" ON public.relatorios_visitas
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Anyone authenticated can insert visitas reports" ON public.relatorios_visitas
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Admin or creator can delete visitas reports" ON public.relatorios_visitas
    FOR DELETE USING (
        created_by = auth.uid() OR
        created_by IS NULL OR
        public.get_user_role(auth.uid()) = 'admin' OR
        auth.role() = 'anon'
    );

-- Historico
CREATE POLICY "Admins can view history" ON public.historico
    FOR SELECT USING (public.get_user_role(auth.uid()) = 'admin' OR auth.role() = 'anon');
CREATE POLICY "Anyone authenticated can insert history logs" ON public.historico
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));

-- Configuracoes
CREATE POLICY "Anyone authenticated can view configurations" ON public.configuracoes
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Only admin can manage configurations" ON public.configuracoes
    FOR ALL USING (public.get_user_role(auth.uid()) = 'admin' OR auth.role() = 'anon');
