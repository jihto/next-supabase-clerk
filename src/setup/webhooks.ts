import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function setupWebhooks(installSupabase: boolean, installClerk: boolean): Promise<void> {
  try {
    // Create webhooks directory
    await fs.ensureDir('app/api/webhooks');

    if (installSupabase) {
      await createSupabaseWebhook();
    }

    if (installClerk) {
      await createClerkWebhook();
    }

    // Create webhook utilities
    await createWebhookUtils();

    console.log(chalk.green('✅ Webhook configuration files created'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to setup webhooks:'), error);
    throw error;
  }
}

async function createSupabaseWebhook(): Promise<void> {
  // Ensure directory exists
  await fs.ensureDir('app/api/webhooks/supabase');
  
  const webhookContent = `import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-supabase-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    // Process different event types
    switch (body.type) {
      case 'INSERT':
        await handleInsertEvent(body)
        break
      case 'UPDATE':
        await handleUpdateEvent(body)
        break
      case 'DELETE':
        await handleDeleteEvent(body)
        break
      default:
        console.log('Unknown event type:', body.type)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleInsertEvent(data: any) {
  console.log('Insert event:', data)
  // Handle insert events (e.g., new user registration)
  // Example: Send welcome email, create user profile, etc.
}

async function handleUpdateEvent(data: any) {
  console.log('Update event:', data)
  // Handle update events (e.g., profile updates)
  // Example: Update search index, send notifications, etc.
}

async function handleDeleteEvent(data: any) {
  console.log('Delete event:', data)
  // Handle delete events (e.g., user deletion)
  // Example: Clean up related data, send confirmation, etc.
}
`;

  await fs.writeFile('app/api/webhooks/supabase/route.ts', webhookContent);
  console.log(chalk.gray('  Created: app/api/webhooks/supabase/route.ts'));
}

async function createClerkWebhook(): Promise<void> {
  // Ensure directory exists
  await fs.ensureDir('app/api/webhooks/clerk');
  
  const webhookContent = `import { NextRequest, NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      throw new Error('Please add CLERK_WEBHOOK_SECRET to .env.local')
    }

    // Get the headers
    const headerPayload = await headers()
    const svix_id = headerPayload.get('svix-id')
    const svix_timestamp = headerPayload.get('svix-timestamp')
    const svix_signature = headerPayload.get('svix-signature')

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error occured -- no svix headers', {
        status: 400,
      })
    }

    // Get the body
    const payload = await request.text()
    const body = JSON.parse(payload)

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET)

    let evt: any

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      })
    } catch (err) {
      console.error('Error verifying webhook:', err)
      return new Response('Error occured', {
        status: 400,
      })
    }

    // Handle the webhook
    const eventType = evt.type

    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data)
        break
      case 'user.updated':
        await handleUserUpdated(evt.data)
        break
      case 'user.deleted':
        await handleUserDeleted(evt.data)
        break
      case 'session.created':
        await handleSessionCreated(evt.data)
        break
      case 'session.ended':
        await handleSessionEnded(evt.data)
        break
      default:
        console.log('Unhandled event type:', eventType)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleUserCreated(data: any) {
  console.log('User created:', data)
  const { id, email_addresses, first_name, last_name, image_url } = data

  try {
    // Update user profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        email: email_addresses[0]?.email_address || '',
        first_name: first_name || '',
        last_name: last_name || '',
        image_url: image_url || '',
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating user profile:', error)
      return new Response('Error updating user profile', { status: 500 })
    }

    console.log('User profile updated successfully:', id)
  } catch (error) {
    console.error('Error processing user.updated webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

async function handleUserUpdated(data: any) {
  console.log('User updated:', data)
  const { id, email_addresses, first_name, last_name, image_url } = data

  try {
    // Update user profile in Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        email: email_addresses[0]?.email_address || '',
        first_name: first_name || '',
        last_name: last_name || '',
        image_url: image_url || '',
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating user profile:', error)
      return new Response('Error updating user profile', { status: 500 })
    }

    console.log('User profile updated successfully:', id)
  } catch (error) {
    console.error('Error processing user.updated webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

async function handleUserDeleted(data: any) {
  console.log('User deleted:', data)
  const { id } = data

  try {
    // Delete user profile from Supabase (CASCADE will handle related tasks)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user profile:', error)
      return new Response('Error deleting user profile', { status: 500 })
    }

    console.log('User profile deleted successfully:', id)
  } catch (error) {
    console.error('Error processing user.deleted webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

async function handleSessionCreated(data: any) {
  console.log('Session created:', data)
  // Handle session creation (e.g., log user activity)
  // Example: Track login events, update last seen, etc.
}

async function handleSessionEnded(data: any) {
  console.log('Session ended:', data)
  // Handle session end (e.g., log logout events)
  // Example: Track logout events, cleanup session data, etc.
}

`;

  await fs.writeFile('app/api/webhooks/clerk/route.ts', webhookContent);
  console.log(chalk.gray('  Created: app/api/webhooks/clerk/route.ts'));
}

async function createWebhookUtils(): Promise<void> {
  const utilsContent = `import crypto from 'crypto'

export function verifySupabaseWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying Supabase webhook:', error)
    return false
  }
}

export function verifyClerkWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('Error verifying Clerk webhook:', error)
    return false
  }
}

export function getWebhookUrl(service: 'supabase' | 'clerk', baseUrl?: string): string {
  const url = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return \`\${url}/api/webhooks/\${service}\`
}
`;

  await fs.writeFile('lib/webhook-utils.ts', utilsContent);
  console.log(chalk.gray('  Created: lib/webhook-utils.ts'));
}
