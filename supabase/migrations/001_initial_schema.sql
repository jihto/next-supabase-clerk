-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table for additional user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  website VARCHAR(255),
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table as an example
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

-- Create policies for profiles table
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- Create policies for posts table
CREATE POLICY "Users can view published posts" ON posts
  FOR SELECT USING (published = true);

CREATE POLICY "Users can view their own posts" ON posts
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can insert their own posts" ON posts
  FOR INSERT WITH CHECK (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can update their own posts" ON posts
  FOR UPDATE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY "Users can delete their own posts" ON posts
  FOR DELETE USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
