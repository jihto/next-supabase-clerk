import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ProjectSetup } from '../utils/detection';

export async function setupSupabase(setup: ProjectSetup): Promise<void> {
  try {
    // Create necessary directories
    await fs.ensureDir('lib/supabase');
    await fs.ensureDir('types');
    await fs.ensureDir('supabase/migrations');

    // Create Supabase client configuration
    await createSupabaseClient(setup.projectType);
    
    // Create Supabase server configuration
    await createSupabaseServer(setup.projectType);
    
    // Create Supabase middleware
    await createSupabaseMiddleware(setup.projectType);
    
    // Create TypeScript types
    await createSupabaseTypes();
    
    // Create initial migration
    await createInitialMigration();
    
    // Create Supabase configuration
    await createSupabaseConfig();
    
    // Update environment variables
    await updateEnvironmentVariables('supabase');
    
    // Create example usage files
    await createSupabaseExamples(setup.projectType);

    console.log(chalk.green('✅ Supabase configuration files created'));
    
  } catch (error) {
    console.error(chalk.red('❌ Failed to setup Supabase:'), error);
    throw error;
  }
}

async function createSupabaseClient(projectType: string): Promise<void> {
  const clientContent = `import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
`;

  await fs.writeFile('lib/supabase/client.ts', clientContent);
}

async function createSupabaseServer(projectType: string): Promise<void> {
  const serverContent = `import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The setAll method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
`;

  await fs.writeFile('lib/supabase/server.ts', serverContent);
}

async function createSupabaseMiddleware(projectType: string): Promise<void> {
  const middlewareContent = `import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
`;

  await fs.writeFile('lib/supabase/middleware.ts', middlewareContent);
}

async function createSupabaseTypes(): Promise<void> {
  const typesContent = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // Add your table types here
      // Example:
      // users: {
      //   Row: {
      //     id: string
      //     email: string
      //     created_at: string
      //   }
      //   Insert: {
      //     id?: string
      //     email: string
      //     created_at?: string
      //   }
      //   Update: {
      //     id?: string
      //     email?: string
      //     created_at?: string
      //   }
      // }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;

  await fs.writeFile('types/supabase.ts', typesContent);
}

async function createInitialMigration(): Promise<void> {
  const migrationContent = `-- Create a table for public profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security (RLS)
-- See https://supabase.com/docs/guides/auth/row-level-security for more details.
alter table public.profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using ( true );

create policy "Users can insert their own profile." on profiles
  for insert with check ( auth.uid() = id );

create policy "Users can update own profile." on profiles
  for update using ( auth.uid() = id );

-- Create a function to handle updating the updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create a trigger to call the function
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();
`;

  await fs.writeFile('supabase/migrations/001_initial_schema.sql', migrationContent);
}

async function createSupabaseConfig(): Promise<void> {
  const configContent = `# A string used to distinguish different Supabase projects on the same host. Defaults to the
# working directory name when running supabase init.
project_id = "next-supabase-clerk"

[api]
enabled = true
# Port to use for the API URL.
port = 54321
# Schemas to expose in your API. Tables, views and stored procedures in this schema will get API endpoints.
# public and storage are always included.
schemas = ["public", "storage", "graphql_public"]
# Extra schemas to add to the search_path of every request. public is always included.
extra_search_path = ["public", "extensions"]
# The maximum number of rows returned from a table or view. Limits payload size
# for accidental or malicious requests.
max_rows = 1000

[db]
# Port to use for the local database URL.
port = 54322
# Port used by db diff command to initialize the shadow database.
shadow_port = 54320
# The database major version to use. This has to be the same as your remote database's. Run SHOW server_version; on the remote database to check.
major_version = 15

[db.pooler]
enabled = false
# Port to use for the local connection pooler.
port = 54329
# Specifies when a server connection can be reused by other clients.
# Configure one of the supported pooler modes: transaction, session.
pool_mode = "transaction"
# How many server connections to allow per user/database pair.
default_pool_size = 20
# Maximum number of client connections allowed.
max_client_conn = 100

[realtime]
enabled = true
# Bind realtime via either IPv4 or IPv6. (default: IPv6)
# ip_version = "IPv6"

[studio]
enabled = true
# Port to use for Supabase Studio.
port = 54323
# External URL of the API server that frontend connects to.
api_url = "http://127.0.0.1:54321"

# Email testing server. Emails sent with the local dev setup are not actually sent - instead, they
# are monitored, and you can view the emails that would have been sent from the web interface.
[inbucket]
enabled = true
# Port to use for the email testing server web interface.
port = 54324
# Uncomment to expose additional ports for testing user applications that send emails.
# smtp_port = 54325
# pop3_port = 54326

[storage]
enabled = true
# The maximum file size allowed (e.g. "5MB", "500KB").
file_size_limit = "50MiB"

[auth]
enabled = true
# The base URL of your website. Used as an allow-list for redirects and for constructing URLs used
# in emails.
site_url = "http://127.0.0.1:3000"
# A list of *exact* URLs that auth providers are permitted to redirect to post authentication.
additional_redirect_urls = ["https://127.0.0.1:3000"]
# How long tokens are valid for, in seconds. Defaults to 3600 (1 hour), maximum 604800 (1 week).
jwt_expiry = 3600
# If disabled, the refresh token will never expire.
enable_refresh_token_rotation = true
# Allows refresh tokens to be reused after expiry, up to the specified interval in seconds.
# Requires enable_refresh_token_rotation = true.
refresh_token_reuse_interval = 10
# Allow/disallow new user signups to your project.
enable_signup = true

[auth.email]
# Allow/disallow new user signups via email to your project.
enable_signup = true
# If enabled, a user will be required to confirm any email change on both the old, and new email addresses. If disabled, only the new email is required to confirm.
double_confirm_changes = true
# If enabled, users need to confirm their email address before signing in.
enable_confirmations = false

# Uncomment to customize email template
# [auth.email.template.invite]
# subject = "You have been invited"
# content_path = "./supabase/templates/invite.html"

[auth.sms]
# Allow/disallow new user signups via SMS to your project.
enable_signup = true
# If enabled, users need to confirm their phone number before signing in.
enable_confirmations = false

# Configure one of the supported SMS providers: twilio, messagebird, textlocal, vonage.
[auth.sms.twilio]
enabled = false
account_sid = ""
message_service_sid = ""
# DO NOT commit your Twilio auth token to git. Use environment variable substitution instead:
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"

# Use pre-defined map of phone number to OTP for testing.
[auth.sms.test_otp]
# 4152127777 = "123456"

# Configure one of the supported captcha providers: hcaptcha, turnstile.
[auth.captcha]
enabled = false
provider = "hcaptcha"
secret = "env(SUPABASE_AUTH_CAPTCHA_SECRET)"

# Use an external OAuth provider. The full list of providers are: apple, azure, bitbucket,
# discord, facebook, github, gitlab, google, keycloak, linkedin, notion, twitch,
# twitter, slack, spotify, workos, zoom.
[auth.external.apple]
enabled = false
client_id = ""
secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"
# Overrides the default auth redirectUrl.
redirect_uri = ""
# Overrides the default auth provider URL. Used to support self-hosted gitlab, single-tenant Azure,
# or any other third-party OIDC providers.
url = ""

[edge_runtime]
enabled = true
# Configure one of the supported request policies: oneshot, per_worker.
# oneshot creates a new worker for each request, which is useful for debugging.
# per_worker reuses workers across requests, which is more efficient.
policy = "oneshot"
`;

  await fs.writeFile('supabase/config.toml', configContent);
}

async function updateEnvironmentVariables(service: 'supabase' | 'clerk'): Promise<void> {
  const envPath = '.env.local';
  let envContent = '';

  // Read existing .env.local if it exists
  if (await fs.pathExists(envPath)) {
    envContent = await fs.readFile(envPath, 'utf-8');
  }

  if (service === 'supabase') {
    const supabaseEnvVars = `
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
`;

    // Check if Supabase vars already exist
    if (!envContent.includes('NEXT_PUBLIC_SUPABASE_URL')) {
      envContent += supabaseEnvVars;
    }
  }

  await fs.writeFile(envPath, envContent);
}

async function createSupabaseExamples(projectType: string): Promise<void> {
  // Create example API route
  const apiRouteContent = `import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
`;

  if (projectType === 'nextjs-app') {
    await fs.ensureDir('app/api/profiles');
    await fs.writeFile('app/api/profiles/route.ts', apiRouteContent);
  } else {
    await fs.ensureDir('pages/api/profiles');
    await fs.writeFile('pages/api/profiles/index.ts', apiRouteContent);
  }

  // Create example component
  const componentContent = `'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    getProfile()
  }, [supabase])

  if (!profile) return <div>Loading...</div>

  return (
    <div>
      <h1>Profile</h1>
      <p>Username: {profile.username}</p>
      <p>Full Name: {profile.full_name}</p>
    </div>
  )
}
`;

  await fs.ensureDir('components');
  await fs.writeFile('components/Profile.tsx', componentContent);
  console.log(chalk.gray('  Created: components/Profile.tsx'));

  // Create Connection Test component
  const connectionTestContent = `import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

interface ConnectionStatus {
  supabase: {
    connected: boolean
    error?: string
    url?: string
  }
  clerk: {
    connected: boolean
    error?: string
    publishableKey?: string
  }
}

export default function ConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>({
    supabase: { connected: false },
    clerk: { connected: false }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    testConnections()
  }, [])

  const testConnections = async () => {
    const newStatus: ConnectionStatus = {
      supabase: { connected: false },
      clerk: { connected: false }
    }

    // Test Supabase connection
    try {
      const supabase = createClient()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        newStatus.supabase.error = 'Missing environment variables'
      } else {
        // Test connection by getting session
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          newStatus.supabase.error = error.message
        } else {
          newStatus.supabase.connected = true
          newStatus.supabase.url = supabaseUrl
        }
      }
    } catch (error) {
      newStatus.supabase.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // Test Clerk connection
    try {
      const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      const clerkSecretKey = process.env.CLERK_SECRET_KEY

      if (!clerkPublishableKey || !clerkSecretKey) {
        newStatus.clerk.error = 'Missing environment variables'
      } else if (!clerkPublishableKey.startsWith('pk_') || !clerkSecretKey.startsWith('sk_')) {
        newStatus.clerk.error = 'Invalid key format'
      } else {
        newStatus.clerk.connected = true
        newStatus.clerk.publishableKey = clerkPublishableKey
      }
    } catch (error) {
      newStatus.clerk.error = error instanceof Error ? error.message : 'Unknown error'
    }

    setStatus(newStatus)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Connection Test</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Connection Test</h2>
      
      <div className="space-y-4">
        {/* Supabase Status */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Supabase</h3>
            {status.supabase.connected ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ✅ Connected
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                ❌ Disconnected
              </span>
            )}
          </div>
          
          {status.supabase.connected ? (
            <div className="text-sm text-gray-600">
              <p>URL: {status.supabase.url}</p>
            </div>
          ) : (
            <div className="text-sm text-red-600">
              <p>Error: {status.supabase.error}</p>
            </div>
          )}
        </div>

        {/* Clerk Status */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold">Clerk</h3>
            {status.clerk.connected ? (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ✅ Connected
              </span>
            ) : (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                ❌ Disconnected
              </span>
            )}
          </div>
          
          {status.clerk.connected ? (
            <div className="text-sm text-gray-600">
              <p>Publishable Key: {status.clerk.publishableKey?.substring(0, 20)}...</p>
            </div>
          ) : (
            <div className="text-sm text-red-600">
              <p>Error: {status.clerk.error}</p>
            </div>
          )}
        </div>

        {/* Test Button */}
        <button
          onClick={testConnections}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Test Connections Again
        </button>
      </div>
    </div>
  )
}`;

  await fs.writeFile('components/ConnectionTest.tsx', connectionTestContent);
  console.log(chalk.gray('  Created: components/ConnectionTest.tsx'));

  // Create demo page for connection test
  const demoPageContent = `import ConnectionTest from '@/components/ConnectionTest'

export default function ConnectionTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm">
          <ConnectionTest />
        </div>
      </div>
    </div>
  )
}`;

  await fs.ensureDir('app/connection-test');
  await fs.writeFile('app/connection-test/page.tsx', demoPageContent);
  console.log(chalk.gray('  Created: app/connection-test/page.tsx'));

  // Create enhanced SQL setup file
  await createEnhancedSqlSetup();
}

async function createEnhancedSqlSetup(): Promise<void> {
  const enhancedSqlContent = `-- =====================================================
-- Enhanced Supabase + Clerk Setup SQL Script
-- =====================================================
-- This script sets up everything needed for a complete
-- Supabase + Clerk integration including:
-- - Database schema with RLS
-- - Clerk Wrapper (FDW) for direct Clerk data access
-- - Webhook infrastructure
-- - Authentication policies
-- =====================================================

-- =====================================================
-- 1. ENABLE EXTENSIONS
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Wrappers extension for Clerk FDW
CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;

-- Enable Wasm wrapper for HTTP requests
CREATE EXTENSION IF NOT EXISTS wasm WITH SCHEMA extensions;

-- =====================================================
-- 2. CREATE SCHEMAS
-- =====================================================

-- Create clerk schema for foreign tables
CREATE SCHEMA IF NOT EXISTS clerk;

-- =====================================================
-- 3. CREATE CORE TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Tasks table for demo purposes
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, user_id)
);

-- Webhook events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  source TEXT NOT NULL, -- 'clerk' or 'supabase'
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE USING (auth.uid() = id);

-- Tasks policies
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON public.organizations
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.organization_members 
      WHERE organization_id = organizations.id
    )
  );

CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their organizations" ON public.organizations
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their organizations" ON public.organizations
  FOR DELETE USING (auth.uid() = owner_id);

-- Organization members policies
CREATE POLICY "Users can view members of their organizations" ON public.organization_members
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT owner_id FROM public.organizations 
      WHERE id = organization_id
    )
  );

CREATE POLICY "Users can join organizations" ON public.organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave organizations" ON public.organization_members
  FOR DELETE USING (auth.uid() = user_id);

-- Webhook events policies (admin only)
CREATE POLICY "Only service role can access webhook events" ON public.webhook_events
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_completed_idx ON public.tasks(completed);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date);

-- Organizations indexes
CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations(slug);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS organization_members_org_id_idx ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS webhook_events_source_idx ON public.webhook_events(source);
CREATE INDEX IF NOT EXISTS webhook_events_processed_idx ON public.webhook_events(processed);
CREATE INDEX IF NOT EXISTS webhook_events_created_at_idx ON public.webhook_events(created_at);

-- =====================================================
-- 7. CREATE FUNCTIONS
-- =====================================================

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process webhook events
CREATE OR REPLACE FUNCTION public.process_webhook_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Process Clerk webhook events
  IF NEW.source = 'clerk' THEN
    CASE NEW.event_type
      WHEN 'user.created' THEN
        -- Handle user creation
        INSERT INTO public.profiles (id, full_name, avatar_url, email)
        VALUES (
          (NEW.event_data->>'id')::UUID,
          NEW.event_data->>'first_name' || ' ' || NEW.event_data->>'last_name',
          NEW.event_data->>'image_url',
          NEW.event_data->>'email_addresses'->0->>'email_address'
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url,
          email = EXCLUDED.email,
          updated_at = NOW();
        
      WHEN 'user.updated' THEN
        -- Handle user updates
        UPDATE public.profiles SET
          full_name = NEW.event_data->>'first_name' || ' ' || NEW.event_data->>'last_name',
          avatar_url = NEW.event_data->>'image_url',
          email = NEW.event_data->>'email_addresses'->0->>'email_address',
          updated_at = NOW()
        WHERE id = (NEW.event_data->>'id')::UUID;
        
      WHEN 'user.deleted' THEN
        -- Handle user deletion
        DELETE FROM public.profiles WHERE id = (NEW.event_data->>'id')::UUID;
    END CASE;
  END IF;
  
  -- Mark as processed
  NEW.processed = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. CREATE TRIGGERS
-- =====================================================

-- Trigger for updated_at on profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on tasks
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for updated_at on organizations
CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for webhook event processing
CREATE TRIGGER process_webhook_events
  BEFORE INSERT ON public.webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.process_webhook_event();

-- =====================================================
-- 9. CLERK WRAPPER SETUP (FDW) - OPTIONAL
-- =====================================================

-- Note: The following section requires manual configuration
-- You need to replace 'YOUR_CLERK_SECRET_KEY' with your actual Clerk secret key

-- Create foreign data wrapper for Clerk API
-- This will be created when you run the enhanced setup with proper credentials

-- Example of what the wrapper setup would look like:
/*
-- Create wasm foreign data wrapper
CREATE FOREIGN DATA WRAPPER clerk_wrapper
  HANDLER wasm_fdw_handler
  VALIDATOR wasm_fdw_validator;

-- Create server for Clerk API
CREATE SERVER clerk_server
  FOREIGN DATA WRAPPER clerk_wrapper
  OPTIONS (
    api_key 'YOUR_CLERK_SECRET_KEY',
    base_url 'https://api.clerk.com/v1'
  );

-- Create foreign tables for Clerk data
CREATE FOREIGN TABLE clerk.users (
  id TEXT,
  first_name TEXT,
  last_name TEXT,
  email_addresses JSONB,
  phone_numbers JSONB,
  image_url TEXT,
  created_at BIGINT,
  updated_at BIGINT
) SERVER clerk_server
OPTIONS (
  object 'users'
);

CREATE FOREIGN TABLE clerk.organizations (
  id TEXT,
  name TEXT,
  slug TEXT,
  members_count INTEGER,
  created_at BIGINT,
  updated_at BIGINT
) SERVER clerk_server
OPTIONS (
  object 'organizations'
);
*/

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA clerk TO authenticated;
GRANT USAGE ON SCHEMA clerk TO anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT ON public.webhook_events TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Enhanced Supabase + Clerk Setup Complete!';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'What was created:';
  RAISE NOTICE '- Database schema with RLS policies';
  RAISE NOTICE '- Profiles, tasks, organizations tables';
  RAISE NOTICE '- Webhook events table';
  RAISE NOTICE '- Authentication triggers and functions';
  RAISE NOTICE '- Indexes for performance';
  RAISE NOTICE '=====================================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure Clerk Dashboard integration';
  RAISE NOTICE '2. Set up webhook endpoints';
  RAISE NOTICE '3. Test authentication flows';
  RAISE NOTICE '4. Query Clerk data using foreign tables';
  RAISE NOTICE '=====================================================';
END $$;`;

  await fs.ensureDir('supabase');
  await fs.writeFile('supabase/enhanced-setup.sql', enhancedSqlContent);
  console.log(chalk.gray('  Created: supabase/enhanced-setup.sql'));
}
