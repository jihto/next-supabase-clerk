# Next.js Supabase & Clerk Setup

A powerful CLI tool that automatically sets up Supabase and Clerk authentication in your Next.js projects. Perfect for projects that need both database functionality and user authentication.

## 🚀 Features

- **Automatic Detection**: Intelligently detects existing Supabase or Clerk setups
- **Flexible Installation**: Install Supabase only, Clerk only, or both
- **Next.js Support**: Works with both App Router and Pages Router
- **TypeScript Ready**: Full TypeScript support with proper type definitions
- **Zero Configuration**: Minimal setup required, works out of the box
- **Production Ready**: Includes middleware, security configurations, and best practices

## 📦 Installation

### Global Installation
```bash
npm install -g next-supabase-clerk-setup
```

### Local Installation
```bash
npm install --save-dev next-supabase-clerk-setup
npx next-supabase-clerk-setup install
```

## 🎯 Use Cases

This package is perfect for:

1. **New Next.js projects** that need both Supabase and Clerk
2. **Existing Next.js projects** that want to add Supabase
3. **Existing Next.js projects** that want to add Clerk
4. **Projects with Supabase** that want to add Clerk authentication
5. **Projects with Clerk** that want to add Supabase database functionality

## 🛠️ Usage

### Basic Setup

```bash
# Install both Supabase and Clerk
next-supabase-clerk-setup install --all

# Install only Supabase
next-supabase-clerk-setup install --supabase

# Install only Clerk
next-supabase-clerk-setup install --clerk

# Skip dependency installation
next-supabase-clerk-setup install --all --skip-deps
```

### Check Current Setup

```bash
# Analyze your current project setup
next-supabase-clerk-setup check
```

## 📁 What Gets Created

### Supabase Setup
- `lib/supabase/client.ts` - Browser client configuration
- `lib/supabase/server.ts` - Server-side client configuration
- `lib/supabase/middleware.ts` - Authentication middleware
- `types/supabase.ts` - TypeScript type definitions
- `supabase/config.toml` - Supabase configuration
- `supabase/migrations/` - Database migration files
- Example API routes and components

### Clerk Setup
- `lib/clerk.ts` - Clerk provider configuration
- `middleware.ts` - Clerk authentication middleware
- `app/sign-in/[[...sign-in]]/page.tsx` - Sign-in page (App Router)
- `app/sign-up/[[...sign-up]]/page.tsx` - Sign-up page (App Router)
- `pages/sign-in/[[...sign-in]].tsx` - Sign-in page (Pages Router)
- `pages/sign-up/[[...sign-up]].tsx` - Sign-up page (Pages Router)
- Example dashboard and protected components

### Configuration Files
- `.env.local` - Environment variables template
- `next.config.js` - Next.js configuration updates
- `tailwind.config.js` - Tailwind CSS configuration (if not exists)

## 🔧 Environment Variables

After installation, configure these environment variables in your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

## 🎨 Integration Examples

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

## 🔍 Project Detection

The tool automatically detects:

- **Project Type**: Next.js App Router vs Pages Router
- **Existing Supabase**: Configuration files, dependencies, imports
- **Existing Clerk**: Configuration files, dependencies, imports
- **NextAuth**: Alternative authentication setup
- **Dependencies**: Already installed packages

## 🚦 Commands

| Command | Description |
|---------|-------------|
| `install` | Install and configure Supabase and/or Clerk |
| `check` | Analyze current project setup |
| `--supabase` | Install Supabase only |
| `--clerk` | Install Clerk only |
| `--all` | Install both Supabase and Clerk |
| `--skip-deps` | Skip dependency installation |

## 🛡️ Security Features

- **Row Level Security (RLS)** enabled by default
- **Middleware protection** for sensitive routes
- **Environment variable validation**
- **Type-safe database queries**
- **Secure authentication flows**

## 📚 Next Steps

1. **Configure Environment Variables**: Add your Supabase and Clerk keys
2. **Set up Supabase Project**: Create your database and configure RLS policies
3. **Set up Clerk Application**: Configure your authentication providers
4. **Customize UI**: Modify the generated components to match your design
5. **Deploy**: Your app is ready for production!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/next-supabase-clerk-setup/issues) page
2. Create a new issue with detailed information
3. Check the [Documentation](https://github.com/yourusername/next-supabase-clerk-setup#readme)

## 🙏 Acknowledgments

- [Supabase](https://supabase.com/) for the amazing database platform
- [Clerk](https://clerk.com/) for the excellent authentication solution
- [Next.js](https://nextjs.org/) for the powerful React framework
