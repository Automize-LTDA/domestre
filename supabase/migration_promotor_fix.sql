-- MESTRE SAAS - MIGRATION TO FIX PROMOTER CREATED AS ADMIN BUG
-- Instruções: Execute todo este código no SQL Editor do Supabase para corrigir a RPC e limpar dados duplicados.

-- 1. ATUALIZAR FUNÇÃO RPC DE CRIAÇÃO DE USUÁRIOS
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
    -- Validação de permissão
    IF public.get_user_role(auth.uid()) != 'admin' AND auth.role() != 'anon' THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
    END IF;

    -- Validação de e-mail existente
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

    -- Execute users insert
    _sql := 'INSERT INTO auth.users (' || array_to_string(_users_cols, ', ') || ') VALUES (' || array_to_string(_users_vals, ', ') || ')';
    EXECUTE _sql;

    -- --- BUILD INSERT FOR auth.identities ---
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

    -- 3. Limpar e definir corretamente a role na tabela public.user_roles (Evita duplicidade)
    DELETE FROM public.user_roles WHERE user_id = _new_user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (_new_user_id, _new_role);

    -- 4. Sincronizar o cargo na tabela public.usuarios (Substitui cargo de admin pelo correto se trigger falhou)
    UPDATE public.usuarios 
    SET cargo = CASE 
        WHEN _new_role = 'admin' THEN 'admin'::text
        ELSE 'funcionario'::text
    END
    WHERE id = _new_user_id;

    RETURN _new_user_id;
END;
$$;


-- 2. LIMPEZA DOS DADOS DUPLICADOS NO BANCO DE DADOS
-- Remove papéis 'admin' órfãos/duplicados de usuários que já possuem o papel de 'promotor' ou 'member'
DELETE FROM public.user_roles 
WHERE role = 'admin' 
  AND user_id IN (
      SELECT user_id 
      FROM public.user_roles 
      WHERE role IN ('promotor', 'member')
  );

-- Corrige o cargo de usuários que são promotores ou membros comuns para que não fiquem como 'admin'
UPDATE public.usuarios 
SET cargo = 'funcionario' 
WHERE id IN (
    SELECT user_id 
    FROM public.user_roles 
    WHERE role IN ('promotor', 'member')
) AND cargo = 'admin';
