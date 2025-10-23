import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface ProjectSetup {
  hasSupabase: boolean;
  hasClerk: boolean;
  hasNextAuth: boolean;
  projectType: 'nextjs' | 'nextjs-app' | 'nextjs-pages' | 'unknown';
}

export async function detectExistingSetup(): Promise<ProjectSetup> {
  const setup: ProjectSetup = {
    hasSupabase: false,
    hasClerk: false,
    hasNextAuth: false,
    projectType: 'unknown'
  };

  // Detect project type
  setup.projectType = await detectProjectType();

  // Check for Supabase
  setup.hasSupabase = await detectSupabase();

  // Check for Clerk
  setup.hasClerk = await detectClerk();

  // Check for NextAuth
  setup.hasNextAuth = await detectNextAuth();

  return setup;
}

async function detectProjectType(): Promise<'nextjs' | 'nextjs-app' | 'nextjs-pages' | 'unknown'> {
  try {
    const packageJson = await fs.readJson('package.json');
    
    if (!packageJson.dependencies?.next) {
      return 'unknown';
    }

    // Check for app directory (Next.js 13+)
    if (await fs.pathExists('app')) {
      return 'nextjs-app';
    }

    // Check for pages directory (traditional Next.js)
    if (await fs.pathExists('pages')) {
      return 'nextjs-pages';
    }

    return 'nextjs';
  } catch {
    return 'unknown';
  }
}

async function detectSupabase(): Promise<boolean> {
  try {
    // Check for Supabase in package.json
    const packageJson = await fs.readJson('package.json');
    if (packageJson.dependencies?.['@supabase/supabase-js'] || packageJson.dependencies?.['@supabase/ssr']) {
      return true;
    }

    // Check for Supabase configuration files
    const supabaseFiles = [
      'lib/supabase/client.ts',
      'lib/supabase/server.ts',
      'lib/supabase/middleware.ts',
      'utils/supabase.ts',
      'supabase/config.toml'
    ];

    for (const file of supabaseFiles) {
      if (await fs.pathExists(file)) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('@supabase/') || content.includes('createClient') || content.includes('supabase')) {
          return true;
        }
      }
    }

    // Check .env.local for Supabase variables
    if (await fs.pathExists('.env.local')) {
      const content = await fs.readFile('.env.local', 'utf-8');
      if (content.includes('NEXT_PUBLIC_SUPABASE_URL') && content.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY')) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function detectClerk(): Promise<boolean> {
  try {
    // Check for Clerk in package.json
    const packageJson = await fs.readJson('package.json');
    if (packageJson.dependencies?.['@clerk/nextjs'] || packageJson.dependencies?.['@clerk/clerk-js']) {
      return true;
    }

    // Check for Clerk configuration files
    const clerkFiles = [
      'lib/clerk.ts'
    ];

    for (const file of clerkFiles) {
      if (await fs.pathExists(file)) {
        const content = await fs.readFile(file, 'utf-8');
        if (content.includes('@clerk/') || content.includes('ClerkProvider')) {
          return true;
        }
      }
    }

    // Check middleware.ts for Clerk
    if (await fs.pathExists('middleware.ts')) {
      const content = await fs.readFile('middleware.ts', 'utf-8');
      if (content.includes('clerkMiddleware') || content.includes('@clerk/nextjs/server')) {
        return true;
      }
    }

    // Check .env.local for Clerk variables
    if (await fs.pathExists('.env.local')) {
      const content = await fs.readFile('.env.local', 'utf-8');
      if (content.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') && content.includes('CLERK_SECRET_KEY')) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function detectNextAuth(): Promise<boolean> {
  try {
    // Check for NextAuth in package.json
    const packageJson = await fs.readJson('package.json');
    if (packageJson.dependencies?.['next-auth'] || packageJson.dependencies?.['@auth/nextjs']) {
      return true;
    }

    // Check for NextAuth configuration files
    const nextAuthFiles = [
      'pages/api/auth/[...nextauth].ts',
      'pages/api/auth/[...nextauth].js',
      'app/api/auth/[...nextauth]/route.ts',
      'lib/auth.ts',
      'lib/auth.js'
    ];

    for (const file of nextAuthFiles) {
      if (await fs.pathExists(file)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

