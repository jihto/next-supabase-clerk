# Usage Guide

This guide provides detailed instructions on how to use the Next.js Supabase & Clerk Setup package.

## Quick Start

### 1. Install the Package

```bash
# Global installation (recommended)
npm install -g next-supabase-clerk-setup

# Or local installation
npm install --save-dev next-supabase-clerk-setup
```

### 2. Run Setup

```bash
# For a new project - install both
next-supabase-clerk-setup install --all

# For existing project - install only what you need
next-supabase-clerk-setup install --supabase
next-supabase-clerk-setup install --clerk
```

### 3. Configure Environment Variables

Copy the generated `.env.local` file and add your actual API keys:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

## Command Reference

### `install` Command

Install and configure Supabase and/or Clerk in your Next.js project.

```bash
next-supabase-clerk-setup install [options]
```

**Options:**
- `-s, --supabase` - Setup Supabase only
- `-c, --clerk` - Setup Clerk only  
- `-a, --all` - Setup both Supabase and Clerk
- `--skip-deps` - Skip installing dependencies

**Examples:**
```bash
# Install both services
next-supabase-clerk-setup install --all

# Install only Supabase
next-supabase-clerk-setup install --supabase

# Install without dependencies
next-supabase-clerk-setup install --all --skip-deps
```

### `check` Command

Analyze your current project setup and show what's already configured.

```bash
next-supabase-clerk-setup check
```

**Output:**
```
🔍 Project Setup Analysis

Project Type: nextjs-app
Has Supabase: ✅ Yes
Has Clerk: ❌ No
Has NextAuth: ❌ No

📋 Detected configuration files:
  • Supabase client configuration
  • Supabase middleware
```

## Project Scenarios

### Scenario 1: New Next.js Project

```bash
# Create new Next.js project
npx create-next-app@latest my-app
cd my-app

# Install both Supabase and Clerk
next-supabase-clerk-setup install --all
```

### Scenario 2: Existing Next.js Project - Add Supabase

```bash
# In your existing Next.js project
next-supabase-clerk-setup install --supabase
```

### Scenario 3: Existing Next.js Project - Add Clerk

```bash
# In your existing Next.js project
next-supabase-clerk-setup install --clerk
```

### Scenario 4: Project with Supabase - Add Clerk

```bash
# In your project that already has Supabase
next-supabase-clerk-setup install --clerk
```

### Scenario 5: Project with Clerk - Add Supabase

```bash
# In your project that already has Clerk
next-supabase-clerk-setup install --supabase
```

## Generated Files

### Supabase Files

When you install Supabase, the following files are created:

```
lib/
  supabase/
    client.ts          # Browser client
    server.ts          # Server-side client
    middleware.ts      # Auth middleware
types/
  supabase.ts         # TypeScript types
supabase/
  config.toml         # Supabase configuration
  migrations/
    001_initial_schema.sql
```

### Clerk Files

When you install Clerk, the following files are created:

```
lib/
  clerk.ts            # Clerk provider
middleware.ts         # Auth middleware
app/
  sign-in/
    [[...sign-in]]/
      page.tsx        # Sign-in page
  sign-up/
    [[...sign-up]]/
      page.tsx        # Sign-up page
```

## Integration Examples

### Using Supabase with Clerk

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

export default function UserProfile() {
  const { user } = useUser()
  const [profile, setProfile] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    const getProfile = async () => {
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
  }, [user, supabase])

  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      {profile && <p>Username: {profile.username}</p>}
    </div>
  )
}
```

### Protected API Route

```tsx
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { userId } = await auth()
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ data })
}
```

## Troubleshooting

### Common Issues

1. **"Both Supabase and Clerk are already configured"**
   - Use individual flags: `--supabase` or `--clerk`
   - Use `--force` to reconfigure

2. **"Failed to install dependencies"**
   - Check your internet connection
   - Try running `npm install` manually
   - Use `--skip-deps` and install manually

3. **"Project type not detected"**
   - Ensure you're in a Next.js project directory
   - Check that `package.json` contains Next.js dependency

4. **Environment variables not working**
   - Restart your development server after adding env vars
   - Check that `.env.local` is in the project root
   - Verify variable names match exactly

### Getting Help

1. Run `next-supabase-clerk-setup check` to analyze your setup
2. Check the generated files for configuration issues
3. Review the [README.md](README.md) for detailed documentation
4. Open an issue on GitHub if you encounter bugs

## Best Practices

1. **Always run `check` first** to understand your current setup
2. **Configure environment variables** before starting development
3. **Test authentication flows** in development before deploying
4. **Use TypeScript** for better type safety
5. **Follow security best practices** for production deployments

## Next Steps

After installation:

1. **Set up your Supabase project** and get your API keys
2. **Create your Clerk application** and get your keys
3. **Configure your environment variables**
4. **Customize the generated components** to match your design
5. **Test the authentication flow** in your application
6. **Deploy to production** with confidence!