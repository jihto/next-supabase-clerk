#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Next.js + Supabase + Clerk starter...\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env.local from env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ Created .env.local file');
    console.log('⚠️  Please update the environment variables in .env.local with your actual API keys\n');
  } else {
    console.log('❌ env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env.local already exists');
}

// Check if node_modules exists
if (!fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed');
  } catch (error) {
    console.log('❌ Failed to install dependencies');
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Check if Supabase is initialized
const supabasePath = path.join(process.cwd(), 'supabase');
if (!fs.existsSync(path.join(supabasePath, 'config.toml'))) {
  console.log('🔧 Initializing Supabase...');
  try {
    execSync('npx supabase init', { stdio: 'inherit' });
    console.log('✅ Supabase initialized');
  } catch (error) {
    console.log('❌ Failed to initialize Supabase');
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Supabase already initialized');
}

console.log('\n🎉 Setup complete! Next steps:');
console.log('1. Update your environment variables in .env.local');
console.log('2. Start Supabase: npm run db:start');
console.log('3. Run migrations: npm run db:reset');
console.log('4. Start development server: npm run dev');
console.log('\n📚 Documentation: https://github.com/yourusername/next-supabase-clerk-starter');
