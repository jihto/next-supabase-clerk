-- =====================================================
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
-- 9. CLERK WRAPPER SETUP (FDW)
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
-- 10. SAMPLE DATA (Optional)
-- =====================================================

-- Insert sample data for testing (optional)
-- Uncomment the following lines if you want sample data

/*
-- Sample organization
INSERT INTO public.organizations (name, slug, description, owner_id)
VALUES (
  'Acme Corp',
  'acme-corp',
  'A sample organization for testing',
  auth.uid()
);

-- Sample tasks
INSERT INTO public.tasks (title, description, priority, user_id)
VALUES 
  ('Complete project setup', 'Set up Supabase and Clerk integration', 'high', auth.uid()),
  ('Write documentation', 'Document the API endpoints', 'medium', auth.uid()),
  ('Test authentication', 'Test user signup and login flows', 'high', auth.uid());
*/

-- =====================================================
-- 11. GRANT PERMISSIONS
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
END $$;
