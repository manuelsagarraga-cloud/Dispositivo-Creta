import { supabase } from './supabase.js'

export async function getUsuarioActual() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.reload()
}

export async function getSociaActual(userId) {
  const { data, error } = await supabase
    .from('socias')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error) throw error
  return data
}
