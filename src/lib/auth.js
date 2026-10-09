import { toThaiMessage } from './supabaseErrors.js'
export async function signUpAccount(
  client,
  { email, password, username, displayName },
  redirectTo,
) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { username, display_name: displayName },
      emailRedirectTo: redirectTo,
    },
  })
  if (error) throw new Error(toThaiMessage(error))
  return { confirmationRequired: !data.session }
}
