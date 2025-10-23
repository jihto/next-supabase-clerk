import { auth } from '@clerk/nextjs/server'
import { createClient } from './supabase/server'

export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const supabase = await createClient()
  
  // Get user from Supabase using Clerk user ID
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', userId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return user
}

export async function createUserIfNotExists(clerkUser: any) {
  const supabase = await createClient()
  
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('clerk_id', clerkUser.id)
    .single()

  if (existingUser) {
    return existingUser
  }

  // Create new user in Supabase
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      first_name: clerkUser.firstName,
      last_name: clerkUser.lastName,
      image_url: clerkUser.imageUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }

  return newUser
}
