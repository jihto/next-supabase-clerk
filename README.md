# Next.js Supabase & Clerk Setup

A powerful CLI tool that automatically sets up Supabase and Clerk authentication in your Next.js projects. Perfect for projects that need both database functionality and user authentication.

## 🚀 Features

- **Automatic Detection**: Intelligently detects existing Supabase or Clerk setups
- **Flexible Installation**: Install Supabase only, Clerk only, or both
- **Next.js Support**: Works with both App Router and Pages Router
- **TypeScript Ready**: Full TypeScript support with proper type definitions
- **Auto Provider Setup**: Automatically wraps your app with ClerkProvider
- **Migration Support**: Optional automatic Supabase migration application
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
next-supabase-clerk-setup install

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
- `supabase/migrations/001_initial_schema.sql` - Initial database migration
- `components/Profile.tsx` - Example profile component
- Example API routes

### Clerk Setup
- `lib/clerk.tsx` - Clerk provider configuration
- `middleware.ts` - Clerk authentication middleware
- `app/sign-in/[[...sign-in]]/page.tsx` - Sign-in page (App Router)
- `app/sign-up/[[...sign-up]]/page.tsx` - Sign-up page (App Router)
- `pages/sign-in/[[...sign-in]].tsx` - Sign-in page (Pages Router)
- `pages/sign-up/[[...sign-up]].tsx` - Sign-up page (Pages Router)
- `components/Dashboard.tsx` - Example dashboard component
- `app/api/protected/route.ts` - Example protected API route

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

## 🎯 Advanced Usage

### Automatic Migration Application

The `--apply-migrations` flag automatically applies Supabase migrations using the Supabase CLI:

```bash
# Install with automatic migration application
next-supabase-clerk-setup install --supabase --apply-migrations

# For both services with migrations
next-supabase-clerk-setup install --all --apply-migrations
```

**Requirements:**
- Supabase CLI must be installed (`brew install supabase/tap/supabase`)
- Project must be linked (`supabase link --project-ref <PROJECT_REF>`)

### Force Reconfiguration

Use `--force` to overwrite existing configurations:

```bash
# Reconfigure everything
next-supabase-clerk-setup install --all --force

# Reconfigure only Clerk
next-supabase-clerk-setup install --clerk --force
```

### Project Detection

The tool automatically detects your current setup:

```bash
# Check what's already configured
next-supabase-clerk-setup check
```

**Output example:**
```
🔍 Project Setup Analysis

Project Type: nextjs-app
Has Supabase: ✅ Yes
Has Clerk: ❌ No
Has NextAuth: ❌ No
```

## 🚦 Commands

| Command | Description |
|---------|-------------|
| `install` | Install and configure Supabase and/or Clerk |
| `uninstall` | Remove Supabase and/or Clerk configuration |
| `check` | Analyze current project setup |
| `--supabase` | Install/Remove Supabase only |
| `--clerk` | Install/Remove Clerk only |
| `--all` | Install/Remove both Supabase and Clerk |
| `--skip-deps` | Skip installing dependencies |
| `--keep-deps` | Keep dependencies when uninstalling |
| `--force` | Force reconfiguration even if already installed |
| `--apply-migrations` | Apply Supabase migrations using Supabase CLI |

## 🛡️ Security Features

- **Row Level Security (RLS)** enabled by default
- **Middleware protection** for sensitive routes
- **Environment variable validation**
- **Type-safe database queries**
- **Secure authentication flows**

## 📚 Next Steps

1. **Configure Environment Variables**: Add your Supabase and Clerk keys to `.env.local`
2. **Set up Supabase Project**: Create your database and configure RLS policies
3. **Apply Migrations**: Use `--apply-migrations` flag or run manually:
   ```bash
   # Install Supabase CLI
   brew install supabase/tap/supabase
   
   # Login and link project
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   
   # Apply migrations
   supabase db push
   ```
4. **Set up Clerk Application**: Configure your authentication providers
5. **Customize UI**: Modify the generated components to match your design
6. **Deploy**: Your app is ready for production!

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
