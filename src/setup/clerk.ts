import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { ProjectSetup } from '../utils/detection';

export async function setupClerk(setup: ProjectSetup): Promise<void> {
  try {
    // Create necessary directories
    await fs.ensureDir('lib');
    await fs.ensureDir('components');
    await fs.ensureDir('app/sign-in/[[...sign-in]]');
    await fs.ensureDir('app/sign-up/[[...sign-up]]');

    // Create Clerk configuration
    await createClerkConfig();

    // Create middleware
    await createClerkMiddleware();

    // Create sign-in page
    await createSignInPage(setup.projectType);

    // Create sign-up page
    await createSignUpPage(setup.projectType);

    // Create Clerk provider wrapper
    await createClerkProvider(setup.projectType);

    // Update environment variables
    await updateEnvironmentVariables('clerk');

    // Create example components
    await createClerkExamples();

    console.log(chalk.green('✅ Clerk configuration files created'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to setup Clerk:'), error);
    throw error;
  }
}

async function createClerkConfig(): Promise<void> {
  const configContent = `import { ClerkProvider } from '@clerk/nextjs'
import React from 'react'

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: 'bg-slate-500 hover:bg-slate-400 text-sm normal-case',
        },
      }}
    >
      {children}
    </ClerkProvider>
  )
}
`;

  await fs.writeFile('lib/clerk.tsx', configContent);
}

async function createClerkMiddleware(): Promise<void> {
  const middlewareContent = `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/admin(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId, redirectToSignIn } = await auth()
    if (!userId) return redirectToSignIn()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
`;

  await fs.writeFile('middleware.ts', middlewareContent);
}

async function createSignInPage(projectType: string): Promise<void> {
  const signInContent = `import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn />
    </div>
  )
}
`;

  if (projectType === 'nextjs-app') {
    await fs.writeFile('app/sign-in/[[...sign-in]]/page.tsx', signInContent);
  } else {
    await fs.ensureDir('pages/sign-in');
    await fs.writeFile('pages/sign-in/[[...sign-in]].tsx', signInContent);
  }
}

async function createSignUpPage(projectType: string): Promise<void> {
  const signUpContent = `import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}
`;

  if (projectType === 'nextjs-app') {
    await fs.writeFile('app/sign-up/[[...sign-up]]/page.tsx', signUpContent);
  } else {
    await fs.ensureDir('pages/sign-up');
    await fs.writeFile('pages/sign-up/[[...sign-up]].tsx', signUpContent);
  }
}

async function createClerkProvider(projectType: string): Promise<void> {
  if (projectType === 'nextjs-app') {
    // Check if layout.tsx already exists
    if (await fs.pathExists('app/layout.tsx')) {
      await updateExistingLayout();
    } else {
      const providerContent = `import { ClerkProviderWrapper } from '@/lib/clerk'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClerkProviderWrapper>
          {children}
        </ClerkProviderWrapper>
      </body>
    </html>
  )
}
`;
      await fs.writeFile('app/layout.tsx', providerContent);
    }
  } else {
    // For pages router, create _app.tsx
    const pagesAppContent = `import { ClerkProviderWrapper } from '@/lib/clerk'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProviderWrapper>
      <Component {...pageProps} />
    </ClerkProviderWrapper>
  )
}
`;

    if (await fs.pathExists('pages/_app.tsx')) {
      await updateExistingPagesApp();
    } else {
      await fs.writeFile('pages/_app.tsx', pagesAppContent);
    }
  }
}

async function updateExistingLayout(): Promise<void> {
  try {
    const layoutPath = 'app/layout.tsx';
    const content = await fs.readFile(layoutPath, 'utf-8');
    
    // Check if already has ClerkProvider
    if (content.includes('ClerkProvider') || content.includes('ClerkProviderWrapper')) {
      console.log(chalk.green('✅ ClerkProvider already exists in layout.tsx'));
      return;
    }
    
    // Simple approach: add import and wrap children
    let updatedContent = content;
    
    // Add import if not exists
    if (!content.includes("from '@/lib/clerk'")) {
      updatedContent = `import { ClerkProviderWrapper } from '@/lib/clerk'\n${updatedContent}`;
    }
    
    // Wrap children with ClerkProviderWrapper
    updatedContent = updatedContent.replace(
      /{children}/g,
      '<ClerkProviderWrapper>{children}</ClerkProviderWrapper>'
    );
    
    await fs.writeFile(layoutPath, updatedContent);
    console.log(chalk.green('✅ Updated app/layout.tsx with ClerkProviderWrapper'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not update layout.tsx automatically. Please manually add ClerkProviderWrapper.'));
    console.log(chalk.gray('Example: Wrap your app with <ClerkProviderWrapper>{children}</ClerkProviderWrapper>'));
  }
}

async function updateExistingPagesApp(): Promise<void> {
  try {
    const appPath = 'pages/_app.tsx';
    const content = await fs.readFile(appPath, 'utf-8');

    // Check if already has ClerkProvider
    if (content.includes('ClerkProvider') || content.includes('ClerkProviderWrapper')) {
      console.log(chalk.green('✅ ClerkProvider already exists in _app.tsx'));
      return;
    }

    // Add ClerkProviderWrapper import
    let updatedContent = content;
    if (!content.includes("from '@/lib/clerk'")) {
      updatedContent = content.replace(
        /import.*from.*['"]next\/app['"]/,
        `import { ClerkProviderWrapper } from '@/lib/clerk'\n$&`
      );
    }

    // Wrap Component with ClerkProviderWrapper
    updatedContent = updatedContent.replace(
      /return\s*\(\s*<Component[\s\S]*?\/>\s*\)/,
      (match) => {
        if (match.includes('ClerkProviderWrapper')) {
          return match; // Already wrapped
        }
        return match.replace(
          '<Component',
          '<ClerkProviderWrapper><Component'
        ).replace(
          '/>',
          '/></ClerkProviderWrapper>'
        );
      }
    );

    await fs.writeFile(appPath, updatedContent);
    console.log(chalk.green('✅ Updated pages/_app.tsx with ClerkProviderWrapper'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not update _app.tsx automatically. Please manually add ClerkProviderWrapper.'));
    console.log(chalk.gray('Example: Wrap your app with <ClerkProviderWrapper><Component {...pageProps} /></ClerkProviderWrapper>'));
  }
}

async function updateEnvironmentVariables(service: 'supabase' | 'clerk'): Promise<void> {
  const envPath = '.env.local';
  let envContent = '';

  // Read existing .env.local if it exists
  if (await fs.pathExists(envPath)) {
    envContent = await fs.readFile(envPath, 'utf-8');
  }

  if (service === 'clerk') {
    const clerkEnvVars = `
# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
`;

    // Check if Clerk vars already exist
    if (!envContent.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')) {
      envContent += clerkEnvVars;
    }
  }

  await fs.writeFile(envPath, envContent);
}

async function createClerkExamples(): Promise<void> {
  // Create example dashboard component
  const dashboardContent = `'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { SignInButton, SignUpButton } from '@clerk/nextjs'

export default function Dashboard() {
  const { isSignedIn, user, isLoaded } = useUser()

  if (!isLoaded) {
    return <div>Loading...</div>
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to Dashboard</h1>
          <p className="mb-4">Please sign in to continue</p>
          <div className="space-x-4">
            <SignInButton mode="modal">
              <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Sign Up
              </button>
            </SignUpButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Dashboard</h1>
            </div>
            <div className="flex items-center">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome, {user.firstName || user.emailAddresses[0].emailAddress}!
              </h2>
              <p className="text-gray-600">
                You are successfully signed in with Clerk.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
`;

  await fs.ensureDir('components');
  await fs.writeFile('components/Dashboard.tsx', dashboardContent);

  // Create example API route
  const apiRouteContent = `import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return NextResponse.json({ 
    message: 'Hello from protected route!',
    userId 
  })
}
`;

  await fs.ensureDir('app/api/protected');
  await fs.writeFile('app/api/protected/route.ts', apiRouteContent);
}
