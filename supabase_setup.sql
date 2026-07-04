-- =========================================================================
-- SCRIPT UNIFICADO DE BANCO DE DADOS E SEGURANÇA - PRODUTOS DO MESTRE (V5)
-- =========================================================================
-- Database: PostgreSQL (Supabase)
-- Instruções: Copie todo o código abaixo, acesse o painel do Supabase,
-- vá em "SQL Editor", crie uma nova query, cole o código e clique em "Run".
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. LIMPAR RECURSOS ANTIGOS (Evita erros de duplicidade e conflitos)
-- -------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_is_manager() CASCADE;
DROP FUNCTION IF EXISTS public.admin_update_user_credentials(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, text, text) CASCADE;

DROP TABLE IF EXISTS public.logs_acesso CASCADE;
DROP TABLE IF EXISTS public.notificacoes CASCADE;
DROP TABLE IF EXISTS public.solicitacoes_brindes CASCADE;
DROP TABLE IF EXISTS public.configuracoes CASCADE;
DROP TABLE IF EXISTS public.historico CASCADE;
DROP TABLE IF EXISTS public.itens_relatorio_avaria CASCADE;
DROP TABLE IF EXISTS public.relatorios_visitas CASCADE;
DROP TABLE IF EXISTS public.relatorios_avarias CASCADE;
DROP TABLE IF EXISTS public.empresas CASCADE;
DROP TABLE IF EXISTS public.materiais CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- -------------------------------------------------------------------------
-- 2. CRIAR TABELAS DO SISTEMA
-- -------------------------------------------------------------------------

-- Perfis de Usuários (Sincronizado com auth.users)
CREATE TABLE public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name text,
    email text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Cargos e Permissões Administrativas
CREATE TABLE public.usuarios (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    cargo text NOT NULL CHECK (cargo IN ('admin', 'gestor', 'sup_tecnico', 'tecnico', 'funcionario', 'cliente', 'vendedor')),
    status text DEFAULT 'ativo' NOT NULL CHECK (status IN ('ativo', 'bloqueado')),
    empresa text DEFAULT 'Do Mestre',
    telefone text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Papéis Internos (Membro / Admin / Promotor / Vendedor)
CREATE TABLE public.user_roles (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('admin', 'member', 'promotor', 'vendedor')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, role)
);

-- Catálogo de Materiais
CREATE TABLE public.materiais (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Empresas Parceiras / Clientes (Completamente alinhada com as colunas do Dashboard)
CREATE TABLE public.empresas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    codigo text,
    cnpj text,
    responsavel text,
    contato text, -- Mantido para retrocompatibilidade
    telefone text,
    endereco text,
    status text DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Relatórios de Avarias
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

-- Itens Vinculados a Relatórios de Avarias
CREATE TABLE public.itens_relatorio_avaria (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    relatorio_id uuid REFERENCES public.relatorios_avarias(id) ON DELETE CASCADE NOT NULL,
    material text NOT NULL,
    quantidade integer NOT NULL CHECK (quantidade > 0),
    tipo_avaria text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Relatórios de Visitas
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

-- Histórico de Ações
CREATE TABLE public.historico (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configurações Gerais do Sistema
CREATE TABLE public.configuracoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text UNIQUE NOT NULL,
    value jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Solicitações de Brindes (Híbrida: Atende ao promotor mestre-SaaS e ao dashboard-mestre)
CREATE TABLE public.solicitacoes_brindes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    requester_name text,
    email text,
    promotor_name text,
    empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
    empresa_nome text,
    brinde_tipo text,
    quantidade integer DEFAULT 1,
    justificativa text,
    observacao_admin text,
    itens_solicitados text, -- Coluna antiga do promotor
    endereco_entrega text,   -- Coluna antiga do promotor
    observacoes text,        -- Coluna antiga do promotor
    status text DEFAULT 'Pendente' NOT NULL, -- Valores híbridos: Pendente, Aprovado, pendente, aprovado, etc.
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Logs de Acesso ao Sistema
CREATE TABLE public.logs_acesso (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    email text NOT NULL,
    cargo text,
    status_acesso text NOT NULL CHECK (status_acesso IN ('sucesso', 'negado')),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Notificações e Alertas do Dashboard
CREATE TABLE public.notificacoes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    tipo text DEFAULT 'info' NOT NULL CHECK (tipo IN ('info', 'sucesso', 'alerta', 'erro')),
    lida boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -------------------------------------------------------------------------
-- 3. FUNÇÕES E TRIGGERS DE SISTEMA (SECURITY DEFINER para RLS bypass)
-- -------------------------------------------------------------------------

-- Obter papel interno do usuário
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
    SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
    RETURN COALESCE(_role, 'member');
END;
$$;

-- Verificar se o usuário autenticado possui cargo de gestor ativo
CREATE OR REPLACE FUNCTION public.check_user_is_manager()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() 
      AND cargo IN ('admin', 'gestor', 'sup_tecnico')
      AND status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger executado após criação de novo usuário no Auth
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

    INSERT INTO public.usuarios (id, email, cargo, status, empresa, telefone)
    VALUES (
        NEW.id,
        NEW.email,
        default_cargo,
        'ativo',
        'Do Mestre',
        NULL
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Criar usuário administrativamente
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
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.role() != 'anon' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE email = _new_email) THEN
        RAISE EXCEPTION 'Erro: Este usuário/email já está cadastrado.';
    END IF;

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

    -- Token columns required by GoTrue
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

    _sql := 'INSERT INTO auth.users (' || array_to_string(_users_cols, ', ') || ') VALUES (' || array_to_string(_users_vals, ', ') || ')';
    EXECUTE _sql;

    SELECT data_type INTO _ident_id_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id';
    _ident_cols := ARRAY['user_id', 'identity_data', 'provider', 'last_sign_in_at', 'created_at', 'updated_at'];
    _ident_vals := ARRAY[
        quote_literal(_new_user_id) || '::uuid',
        quote_literal(jsonb_build_object('sub', _new_user_id::text, 'email', _new_email, 'email_verified', true, 'phone_verified', false)::text) || '::jsonb',
        '''email''',
        'now()',
        'now()',
        'now()'
    ];

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

    _sql := 'INSERT INTO auth.identities (' || array_to_string(_ident_cols, ', ') || ') VALUES (' || array_to_string(_ident_vals, ', ') || ')';
    EXECUTE _sql;

    IF _new_role != 'member' THEN
        DELETE FROM public.user_roles WHERE user_id = _new_user_id;
        INSERT INTO public.user_roles (user_id, role) VALUES (_new_user_id, _new_role);
    END IF;

    RETURN _new_user_id;
END;
$$;

-- Atualizar credenciais de usuário
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
        
        UPDATE auth.identities 
        SET identity_data = jsonb_build_object('sub', _user_id::text, 'email', _new_email, 'email_verified', true, 'phone_verified', false),
            updated_at = now()
        WHERE user_id = _user_id AND provider = 'email';
        
        BEGIN
            UPDATE auth.identities SET email = _new_email WHERE user_id = _user_id AND provider = 'email';
        EXCEPTION WHEN OTHERS THEN
            -- Ignorar caso a coluna não exista
        END;
    END IF;

    IF _new_password IS NOT NULL AND _new_password != '' THEN
        UPDATE auth.users SET encrypted_password = crypt(_new_password, gen_salt('bf', 10)) WHERE id = _user_id;
    END IF;
END;
$$;

-- Exclusão de usuário
CREATE OR REPLACE FUNCTION public.admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.role() != 'anon' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem remover usuários.';
    END IF;

    DELETE FROM public.user_roles WHERE user_id = _user_id;
    DELETE FROM public.usuarios WHERE id = _user_id;
    DELETE FROM public.profiles WHERE id = _user_id;
    DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- -------------------------------------------------------------------------
-- 4. ALIMENTAR SEEDS (Dados Iniciais do Catálogo de Materiais)
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 5. HABILITAR SEGURANÇA DE LINHA (RLS - Row Level Security)
-- -------------------------------------------------------------------------
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
ALTER TABLE public.solicitacoes_brindes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 6. CRIAR POLÍTICAS DE RLS (Row Level Security - Habilitando Anon/Mock)
-- -------------------------------------------------------------------------

-- Profiles
CREATE POLICY "Leitura de perfis pública para autenticados e anon" ON public.profiles
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Edição do próprio perfil ou gestores" ON public.profiles
    FOR ALL USING (auth.uid() = id OR auth.role() = 'anon' OR public.check_user_is_manager());

-- Usuarios
CREATE POLICY "Leitura de usuários para autenticados e anon" ON public.usuarios
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Escrita de usuários para próprios ou gestores" ON public.usuarios
    FOR ALL USING (auth.uid() = id OR auth.role() = 'anon' OR public.check_user_is_manager());

-- User Roles
CREATE POLICY "Leitura de papéis para autenticados e anon" ON public.user_roles
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Gerenciamento de papéis para gestores" ON public.user_roles
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Materiais
CREATE POLICY "Leitura de materiais pública" ON public.materiais
    FOR SELECT USING (true);
CREATE POLICY "Escrita de materiais apenas para gestores" ON public.materiais
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Empresas
CREATE POLICY "Leitura pública de empresas" ON public.empresas
    FOR SELECT USING (true);
CREATE POLICY "Escrita de empresas para autenticados e anon" ON public.empresas
    FOR ALL USING (true);

-- Relatórios de Avarias
CREATE POLICY "Leitura de avarias para autenticados e anon" ON public.relatorios_avarias
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Inserção de avarias para autenticados e anon" ON public.relatorios_avarias
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Modificação de avarias apenas para gestores" ON public.relatorios_avarias
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Itens de Avarias
CREATE POLICY "Leitura de itens de avarias para autenticados e anon" ON public.itens_relatorio_avaria
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Inserção de itens de avarias para autenticados e anon" ON public.itens_relatorio_avaria
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Modificação de itens de avarias apenas para gestores" ON public.itens_relatorio_avaria
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Relatórios de Visitas
CREATE POLICY "Leitura de visitas para autenticados e anon" ON public.relatorios_visitas
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Inserção de visitas para autenticados e anon" ON public.relatorios_visitas
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Modificação de visitas apenas para gestores" ON public.relatorios_visitas
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Histórico
CREATE POLICY "Leitura de histórico apenas para gestores e anon" ON public.historico
    FOR SELECT USING (public.check_user_is_manager() OR auth.role() = 'anon');
CREATE POLICY "Gravação de histórico para autenticados e anon" ON public.historico
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));

-- Configurações
CREATE POLICY "Leitura de configurações pública" ON public.configuracoes
    FOR SELECT USING (true);
CREATE POLICY "Gerenciamento de configurações para gestores" ON public.configuracoes
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Solicitações de Brindes
CREATE POLICY "Visualização de brindes para autenticados e anon" ON public.solicitacoes_brindes
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Criação de brindes para próprios ou gestores" ON public.solicitacoes_brindes
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Gerenciamento de brindes para próprios ou gestores" ON public.solicitacoes_brindes
    FOR ALL USING (auth.uid() = user_id OR public.check_user_is_manager() OR auth.role() = 'anon');

-- Logs de Acesso
CREATE POLICY "Permitir inserção de logs pública" ON public.logs_acesso
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Leitura de logs apenas para gestores e anon" ON public.logs_acesso
    FOR SELECT USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- Notificações
CREATE POLICY "Leitura de notificações para autenticados e anon" ON public.notificacoes
    FOR SELECT USING (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Inserção de notificações para autenticados e anon" ON public.notificacoes
    FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon'));
CREATE POLICY "Modificação de notificações apenas para gestores" ON public.notificacoes
    FOR ALL USING (public.check_user_is_manager() OR auth.role() = 'anon');

-- -------------------------------------------------------------------------
-- 7. REPARAR / ASSEGURAR USUÁRIO ADMINISTRADOR "kaua@domestre.com"
-- -------------------------------------------------------------------------
DO $$
DECLARE
    _target_user_id uuid := '267f0bf9-9c71-47da-bd02-e1407bb5a283';
    _email text := 'kaua@domestre.com';
    _password text := 'dev@2026';
    _full_name text := 'Kauã Felipe';
    _sql text;
    _users_cols text[] := '{}';
    _users_vals text[] := '{}';
    _ident_cols text[] := '{}';
    _ident_vals text[] := '{}';
    _ident_id_type text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        -- --- INSERIR NO auth.users ---
        _users_cols := ARRAY['instance_id', 'id', 'aud', 'role', 'email', 'encrypted_password', 'email_confirmed_at', 'raw_app_meta_data', 'raw_user_meta_data', 'created_at', 'updated_at'];
        _users_vals := ARRAY[
            '''00000000-0000-0000-0000-000000000000''::uuid',
            quote_literal(_target_user_id) || '::uuid',
            '''authenticated''',
            '''authenticated''',
            quote_literal(_email),
            quote_literal(crypt(_password, gen_salt('bf', 10))),
            'now()',
            '''{"provider": "email", "providers": ["email"]}''::jsonb',
            quote_literal(jsonb_build_object('full_name', _full_name)::text) || '::jsonb',
            'now()',
            'now()'
        ];

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'confirmed_at' AND is_generated = 'NEVER') THEN
            _users_cols := array_append(_users_cols, 'confirmed_at');
            _users_vals := array_append(_users_vals, 'now()');
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_confirm_status') THEN
            _users_cols := array_append(_users_cols, 'email_change_confirm_status');
            _users_vals := array_append(_users_vals, '0');
        END IF;

        _sql := 'INSERT INTO auth.users (' || array_to_string(_users_cols, ', ') || ') VALUES (' || array_to_string(_users_vals, ', ') || ')';
        EXECUTE _sql;

        -- --- INSERIR NO auth.identities ---
        SELECT data_type INTO _ident_id_type FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'id';
        _ident_cols := ARRAY['user_id', 'identity_data', 'provider', 'last_sign_in_at', 'created_at', 'updated_at'];
        _ident_vals := ARRAY[
            quote_literal(_target_user_id) || '::uuid',
            quote_literal(jsonb_build_object('sub', _target_user_id::text, 'email', _email, 'email_verified', true, 'phone_verified', false)::text) || '::jsonb',
            '''email''',
            'now()',
            'now()',
            'now()'
        ];

        _ident_cols := array_append(_ident_cols, 'id');
        IF _ident_id_type = 'uuid' THEN
            _ident_vals := array_append(_ident_vals, quote_literal(_target_user_id) || '::uuid');
        ELSE
            _ident_vals := array_append(_ident_vals, quote_literal(_target_user_id::text));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'provider_id') THEN
            _ident_cols := array_append(_ident_cols, 'provider_id');
            _ident_vals := array_append(_ident_vals, quote_literal(_target_user_id::text));
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = 'email' AND is_generated = 'NEVER') THEN
            _ident_cols := array_append(_ident_cols, 'email');
            _ident_vals := array_append(_ident_vals, quote_literal(_email));
        END IF;

        _sql := 'INSERT INTO auth.identities (' || array_to_string(_ident_cols, ', ') || ') VALUES (' || array_to_string(_ident_vals, ', ') || ')';
        EXECUTE _sql;
    ELSE
        SELECT id INTO _target_user_id FROM auth.users WHERE email = _email LIMIT 1;
    END IF;

    -- --- ASSEGURAR SINCRONIZAÇÃO EM PERFIS E CARGOS ---
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (_target_user_id, _full_name, _email)
    ON CONFLICT (id) DO UPDATE SET full_name = _full_name, email = _email;

    DELETE FROM public.user_roles WHERE user_id = _target_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, 'admin');

    INSERT INTO public.usuarios (id, email, cargo, status, empresa, telefone)
    VALUES (_target_user_id, _email, 'admin', 'ativo', 'Do Mestre', NULL)
    ON CONFLICT (id) DO UPDATE SET email = _email, cargo = 'admin', status = 'ativo', empresa = 'Do Mestre';

END;
$$;

-- -------------------------------------------------------------------------
-- 8. SINCRONIZAR TODOS OS USUÁRIOS DO AUTH.USERS PARA TABELAS PÚBLICAS
-- -------------------------------------------------------------------------
DO $$
DECLARE
    usr record;
    default_role text;
    default_cargo text;
BEGIN
    FOR usr IN SELECT * FROM auth.users LOOP
        IF usr.email = 'kaua@domestre.com' THEN
            default_role := 'admin';
            default_cargo := 'admin';
        ELSE
            -- Padrão inicial: promotor/vendedor. O admin pode ajustar no painel depois.
            default_role := 'promotor';
            default_cargo := 'vendedor';
        END IF;

        -- Insere no profiles
        INSERT INTO public.profiles (id, full_name, email)
        VALUES (
            usr.id,
            COALESCE(usr.raw_user_meta_data->>'full_name', usr.email),
            usr.email
        )
        ON CONFLICT (id) DO UPDATE SET email = usr.email;

        -- Insere no user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (usr.id, default_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Insere no usuarios
        INSERT INTO public.usuarios (id, email, cargo, status, empresa, telefone)
        VALUES (
            usr.id,
            usr.email,
            default_cargo,
            'ativo',
            'Do Mestre',
            NULL
        )
        ON CONFLICT (id) DO UPDATE SET email = usr.email;
    END LOOP;
END;
$$;

-- FIM DO SCRIPT UNIFICADO V5
