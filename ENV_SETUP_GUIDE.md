# Environment Variables Setup Guide

This guide will help you get all the required secret keys and environment variables for your Next.js Supabase & Clerk project.

## 🔑 Required Environment Variables

After running `next-supabase-clerk-setup install`, you'll need to add these to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Webhook Secrets (optional - if using --webhooks flag)
SUPABASE_WEBHOOK_SECRET=your_supabase_webhook_secret
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Database URL (optional - for direct database connection)
DATABASE_URL=postgresql://username:password@localhost:54322/postgres
```

## 🗄️ Getting Supabase Keys

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com/)
2. Click "Start your project"
3. Sign up/Login with GitHub
4. Click "New Project"
5. Choose your organization
6. Fill in project details:
   - **Name**: Your project name
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users
7. Click "Create new project"

### Step 2: Get API Keys

1. Wait for project to finish setting up (2-3 minutes)
2. Go to **Settings** → **API**
3. Copy the following values:

```env
# From Project URL section
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# From Project API keys section
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Database Setup (Optional)

If you want to use the generated migration:

1. Go to **SQL Editor** in Supabase dashboard
2. Copy content from `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL to create the profiles table

## 🔐 Getting Clerk Keys

### Step 1: Create Clerk Application

1. Go to [clerk.com](https://clerk.com/)
2. Click "Sign up" or "Log in"
3. Click "Create application"
4. Fill in application details:
   - **Application name**: Your app name
   - **Sign-in options**: Choose your preferred methods
5. Click "Create application"

### Step 2: Get API Keys

1. In your Clerk dashboard, go to **API Keys**
2. Copy the following values:

```env
# From Publishable key section
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# From Secret key section
CLERK_SECRET_KEY=sk_test_...
```

### Step 3: Configure URLs (Optional)

1. Go to **Paths** in Clerk dashboard
2. Set your custom paths:
   - **Sign-in URL**: `/sign-in`
   - **Sign-up URL**: `/sign-up`
   - **After sign-in URL**: `/dashboard`
   - **After sign-up URL**: `/dashboard`

## 🔗 Getting Webhook Secrets (Optional)

### Supabase Webhook Secret

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Scroll down to **Webhooks** section
4. Click **Create new webhook**
5. Set webhook URL to: `https://yourdomain.com/api/webhooks/supabase`
6. Select events you want to listen to (INSERT, UPDATE, DELETE)
7. Copy the generated webhook secret

### Clerk Webhook Secret

1. Go to your Clerk dashboard
2. Navigate to **Webhooks** section
3. Click **Add Endpoint**
4. Set endpoint URL to: `https://yourdomain.com/api/webhooks/clerk`
5. Select events you want to listen to (user.created, user.updated, etc.)
6. Copy the webhook secret from the endpoint details

## 🔧 Setting Up Environment Variables

### Method 1: Manual Setup

1. Create `.env.local` file in your project root
2. Copy the template from above
3. Replace placeholder values with your actual keys

### Method 2: Using the Generated Template

The package creates a template file for you:

```bash
# Check if template was created
cat templates/env.example

# Copy to .env.local
cp templates/env.example .env.local
```

## 🚀 Testing Your Setup

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Test Supabase Connection

1. Go to `http://localhost:3000`
2. Check browser console for Supabase connection errors
3. Test database queries in your components

### Step 3: Test Clerk Authentication

1. Go to `http://localhost:3000/sign-in`
2. Try signing in with your configured providers
3. Check if redirects work properly

## 🔒 Security Best Practices

### Environment Variables

- ✅ **Never commit** `.env.local` to version control
- ✅ **Use different keys** for development and production
- ✅ **Rotate keys** regularly in production
- ✅ **Use environment-specific** `.env` files

### Supabase Security

- ✅ **Enable RLS** (Row Level Security) on all tables
- ✅ **Use service role key** only on server-side
- ✅ **Never expose** service role key to client
- ✅ **Set up proper policies** for data access

### Clerk Security

- ✅ **Use different applications** for dev/prod
- ✅ **Configure allowed origins** in Clerk dashboard
- ✅ **Set up proper redirect URLs**
- ✅ **Enable MFA** for production users

## 🐛 Troubleshooting

### Common Issues

**1. "Invalid API key" errors**
- Check if keys are copied correctly (no extra spaces)
- Verify you're using the right environment (test vs live)
- Ensure keys match your project/application

**2. "CORS" errors**
- Add your domain to Clerk's allowed origins
- Check Supabase RLS policies
- Verify environment variables are loaded

**3. "Database connection failed"**
- Check if Supabase project is active
- Verify database password is correct
- Ensure RLS policies allow your operations

### Debug Steps

```bash
# Check if environment variables are loaded
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)

# Test Supabase connection
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data, error } = await supabase.from('profiles').select('*')

# Test Clerk connection
import { useUser } from '@clerk/nextjs'
const { user, isLoaded } = useUser()
```

## 📝 Production Checklist

Before deploying to production:

- [ ] Replace test keys with live keys
- [ ] Update redirect URLs for production domain
- [ ] Set up proper RLS policies
- [ ] Configure Clerk production application
- [ ] Test all authentication flows
- [ ] Set up monitoring and logging
- [ ] Backup database before migration

## 🆘 Need Help?

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Clerk Docs**: [clerk.com/docs](https://clerk.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)

---

**Quick Reference:**
- Supabase keys: Settings → API
- Clerk keys: API Keys section
- Test locally: `npm run dev`
- Check console for errors
