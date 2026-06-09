import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { createClient } from '@supabase/supabase-js'
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { 
  UserPlus, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Plus, 
  Trash2, 
  LoaderCircle 
} from 'lucide-react'

interface ProfileItem {
  id: string
  full_name: string | null
  email: string | null
  role: 'admin' | 'member'
  created_at: string
}

export const Admin: React.FC = () => {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // New user form state
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member')

  async function loadUsers() {
    setLoading(true)
    try {
      // Get all profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .order('created_at', { ascending: false })

      if (profilesErr) throw profilesErr

      // Get user roles
      const { data: rolesData, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id, role')

      if (rolesErr) throw rolesErr

      const roleMap = new Map<string, 'admin' | 'member'>()
      rolesData?.forEach(r => {
        // If a user has both, prefer 'admin'
        if (r.role === 'admin' || !roleMap.has(r.user_id)) {
          roleMap.set(r.user_id, r.role as 'admin' | 'member')
        }
      })

      const combined: ProfileItem[] = (profilesData || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: roleMap.get(p.id) || 'member',
        created_at: p.created_at
      }))

      setProfiles(combined)
    } catch (err: any) {
      console.error(err)
      showToast('Falha ao carregar usuários: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  // Create new user (using client-side registration workaround)
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newUsername.trim() || newPassword.length < 8) {
      showToast('Por favor, preencha todos os campos corretamente. Senha mínima de 8 caracteres.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const cleanUsername = newUsername.trim()
      const emailToAuth = cleanUsername.includes('@') 
        ? cleanUsername 
        : `${cleanUsername}@domestre.com`

      // 1. Create a non-persistent secondary client
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })

      // 2. Call signUp (creates auth.users + triggers profiles/roles creation automatically)
      const { data: authData, error: authErr } = await tempClient.auth.signUp({
        email: emailToAuth,
        password: newPassword,
        options: {
          data: {
            full_name: newName.trim()
          }
        }
      })

      if (authErr) throw authErr
      if (!authData?.user) {
        throw new Error('Falha ao registrar credenciais do novo usuário.')
      }

      // 3. If the role was requested to be 'admin', insert it into user_roles
      // The trigger automatically inserts role='member', so we delete it and insert 'admin'
      if (newRole === 'admin') {
        const { error: roleInsErr } = await supabase
          .from('user_roles')
          .insert({ user_id: authData.user.id, role: 'admin' })

        if (roleInsErr) throw roleInsErr

        // Delete the default 'member' role row
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', authData.user.id)
          .eq('role', 'member')
      }

      showToast('Usuário criado com sucesso!', 'success')
      setNewName('')
      setNewUsername('')
      setNewPassword('')
      setNewRole('member')
      await loadUsers()
    } catch (err: any) {
      console.error(err)
      showToast('Erro ao criar usuário: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle user role
  async function handleToggleRole(targetUser: ProfileItem) {
    if (targetUser.id === user?.id) {
      showToast('Você não pode alterar o seu próprio papel de administrador.', 'error')
      return
    }

    const nextRole = targetUser.role === 'admin' ? 'member' : 'admin'
    const targetUsername = targetUser.email ? (targetUser.email.endsWith('@domestre.com') ? targetUser.email.split('@')[0] : targetUser.email) : 'Usuário'
    const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000'
    try {
      if (nextRole === 'admin') {
        const { error: insErr } = await supabase
          .from('user_roles')
          .insert({ user_id: targetUser.id, role: 'admin' })

        if (insErr && !insErr.message.includes('duplicate')) throw insErr

        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', targetUser.id)
          .eq('role', 'member')
      } else {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', targetUser.id)
          .eq('role', 'admin')

        const { error: insErr } = await supabase
          .from('user_roles')
          .insert({ user_id: targetUser.id, role: 'member' })

        if (insErr && !insErr.message.includes('duplicate')) throw insErr
      }

      // Log in history
      await supabase.from('historico').insert({
        user_id: isMockUser ? null : user?.id,
        action: 'UPDATE_USER_ROLE',
        details: { target_username: targetUsername, target_email: targetUser.email, new_role: nextRole }
      })

      showToast(`Papel de ${targetUsername} atualizado com sucesso!`, 'success')
      await loadUsers()
    } catch (err: any) {
      console.error(err)
      showToast('Erro ao atualizar papel: ' + err.message, 'error')
    }
  }

  // Delete user (using Edge Function with client-side fallback)
  async function handleDeleteUser(targetUser: ProfileItem) {
    if (targetUser.id === user?.id) {
      showToast('Você não pode remover a si mesmo.', 'error')
      return
    }

    const targetUsername = targetUser.email ? (targetUser.email.endsWith('@domestre.com') ? targetUser.email.split('@')[0] : targetUser.email) : 'Usuário'
    if (!confirm(`Remover o acesso de ${targetUsername}? Essa ação não pode ser desfeita.`)) {
      return
    }

    const isMockUser = user?.id === '00000000-0000-0000-0000-000000000000'
    try {
      let functionSuccess = false
      try {
        const { data, error } = await supabase.functions.invoke('admin-delete-user', {
          body: { user_id: targetUser.id }
        })
        if (!error && !data?.error) {
          functionSuccess = true
        }
      } catch (e) {
        console.warn('Edge function invoke failed, running client-side fallback delete:', e)
      }

      if (functionSuccess) {
        // Fallback client-side delete of profile if edge function succeeds
        await supabase.from('profiles').delete().eq('id', targetUser.id)
        showToast('Usuário removido com sucesso!', 'success')
      } else {
        // Fallback: Delete roles to block access, and try deleting profile
        const { error: roleDelErr } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', targetUser.id)

        if (roleDelErr) throw roleDelErr

        // Try deleting profile (may be blocked by RLS, but if it succeeds, awesome)
        await supabase.from('profiles').delete().eq('id', targetUser.id)

        showToast('Acesso do usuário revogado e removido localmente.', 'success')
      }

      // Log in history
      await supabase.from('historico').insert({
        user_id: isMockUser ? null : user?.id,
        action: 'DELETE_USER',
        details: { target_username: targetUsername, target_email: targetUser.email }
      })

      await loadUsers()
    } catch (err: any) {
      console.error(err)
      showToast('Erro ao remover usuário: ' + err.message, 'error')
    }
  }

  return (
    <Layout requireAdmin={true}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* HEADER */}
        <header className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-red">
            Administração
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-brand-navy flex items-center gap-3">
            <Users className="text-brand-navy" /> Usuários do sistema
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie acessos, defina papéis e gerencie quem pode entrar no sistema.
          </p>
        </header>

        {/* SECTION 1: CREATE USER FORM */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)] mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <UserPlus size={18} /> Adicionar novo usuário
          </h2>
          <form onSubmit={handleCreateUser} className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Nome completo
              </span>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Ex.: João da Silva"
                className="input"
                required
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Usuário
              </span>
              <input
                type="text"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                placeholder="Ex.: joao"
                className="input"
                required
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Senha (mín. 8 caracteres)
              </span>
              <input
                type="text"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Defina uma senha"
                className="input font-mono"
                required
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Papel
              </span>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'admin' | 'member')}
                className="input"
              >
                <option value="member">Comum</option>
                <option value="admin">Administrador</option>
              </select>
            </label>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundImage: 'var(--gradient-accent)' }}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-brand-red-foreground shadow-[var(--shadow-glow)] hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:hover:scale-100"
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" /> Criando...
                  </>
                ) : (
                  <>
                    <Plus size={16} /> Criar usuário
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* SECTION 2: USERS LIST */}
        <section className="rounded-2xl bg-card border border-border p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Usuários cadastrados ({profiles.length})
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <LoaderCircle className="animate-spin mr-2" size={18} />
              Carregando...
            </div>
          ) : profiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/50 p-8 text-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3">Nome</th>
                    <th className="py-3 px-3">Usuário</th>
                    <th className="py-3 px-3">Papel</th>
                    <th className="py-3 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(p => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                      <td className="py-3 px-3 font-semibold text-foreground">
                        {p.full_name || '—'}
                        {p.id === user?.id && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider text-brand-red font-bold">
                            (você)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {p.email ? (p.email.endsWith('@domestre.com') ? p.email.split('@')[0] : p.email) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          p.role === 'admin'
                            ? 'bg-brand-red text-brand-red-foreground'
                            : 'bg-secondary text-foreground border border-border'
                        }`}>
                          {p.role === 'admin' ? <ShieldCheck size={12} /> : <UserCheck size={12} />}
                          {p.role === 'admin' ? 'Administrador' : 'Comum'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => handleToggleRole(p)}
                            disabled={p.id === user?.id}
                            className="text-xs font-semibold rounded-lg border border-border px-3 py-1.5 hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Alternar papel"
                          >
                            Tornar {p.role === 'admin' ? 'comum' : 'admin'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(p)}
                            disabled={p.id === user?.id}
                            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Remover"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
export default Admin
