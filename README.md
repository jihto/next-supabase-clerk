# Next.js + Supabase + Clerk Starter

A modern, production-ready Next.js starter template with Supabase database and Clerk authentication pre-configured.

## Features

- ⚡ **Next.js 14** with App Router
- 🔐 **Clerk Authentication** with social providers
- 🗄️ **Supabase Database** with PostgreSQL
- 🎨 **Tailwind CSS** for styling
- 📱 **Responsive Design**
- 🔒 **Row Level Security** (RLS) enabled
- 🚀 **TypeScript** support
- 📦 **Pre-configured** environment

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/next-supabase-clerk-starter.git
cd next-supabase-clerk-starter
npm install
```

### 2. Environment Setup

Copy the environment template and fill in your API keys:

```bash
cp env.example .env.local
```

Update `.env.local` with your actual API keys:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
```

### 3. Database Setup

Start Supabase locally:

```bash
npm run db:start
```

Run database migrations:

```bash
npm run db:reset
```

### 4. Start Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app!

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── sign-in/           # Clerk sign-in page
│   ├── sign-up/           # Clerk sign-up page
│   └── page.tsx           # Home page
├── lib/                   # Utility functions
│   ├── supabase/          # Supabase client configuration
│   └── clerk.ts           # Clerk utilities
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase config
├── components/            # Reusable components
└── types/                 # TypeScript type definitions
```

## Database Schema

The starter includes a pre-configured database schema with:

- **Users table** - Synced with Clerk user data
- **Profiles table** - Extended user information
- **Posts table** - Example content management
- **Row Level Security** - Secure data access

## Authentication Flow

1. **Clerk** handles user authentication and session management
2. **Webhooks** sync user data to Supabase automatically
3. **Middleware** protects routes and manages sessions
4. **Database** stores user profiles and application data

## API Routes

- `POST /api/webhooks/clerk` - Syncs Clerk users with Supabase

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run setup        # Run setup script
npm run db:start     # Start Supabase locally
npm run db:stop      # Stop Supabase
npm run db:reset     # Reset database with migrations
npm run db:generate  # Generate TypeScript types
```

## Environment Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLERK_WEBHOOK_SECRET` | Clerk webhook secret for user sync | - |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | - |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Next.js Documentation](https://nextjs.org/docs)
- 🔐 [Clerk Documentation](https://clerk.com/docs)
- 🗄️ [Supabase Documentation](https://supabase.com/docs)
- 🎨 [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Acknowledgments

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - The open source Firebase alternative
- [Clerk](https://clerk.com/) - Authentication and user management
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
