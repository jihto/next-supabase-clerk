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
}
