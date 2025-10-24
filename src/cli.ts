#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { setupSupabase } from './setup/supabase';
import { setupClerk } from './setup/clerk';
import { setupWebhooks } from './setup/webhooks';
import { uninstallSupabase } from './setup/uninstall-supabase';
import { uninstallClerk } from './setup/uninstall-clerk';
import { detectExistingSetup, ProjectSetup } from './utils/detection';
import { installDependencies } from './utils/installer';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();

program
  .name('next-supabase-clerk-setup')
  .description('Automated setup for Supabase and Clerk integration with Next.js')
  .version('1.0.0');

program
  .command('install')
  .description('Install and configure Supabase and/or Clerk in your Next.js project')
  .option('-s, --supabase', 'Setup Supabase only')
  .option('-c, --clerk', 'Setup Clerk only')
  .option('-a, --all', 'Setup both Supabase and Clerk')
  .option('--skip-deps', 'Skip installing dependencies')
  .option('--apply-migrations', 'Apply Supabase migrations using Supabase CLI if available')
  .option('--webhooks', 'Setup webhook endpoints for Supabase and Clerk')
  .option('--force', 'Force reconfiguration even if already installed')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Next.js Supabase & Clerk Setup'));
      console.log(chalk.gray('Detecting existing setup...\n'));

      const existingSetup = await detectExistingSetup();
      
      if (existingSetup.hasSupabase && existingSetup.hasClerk && !options.force) {
        console.log(chalk.yellow('⚠️  Both Supabase and Clerk are already configured in this project.'));
        console.log(chalk.gray('Use --force to reconfigure or specify individual services.\n'));
        return;
      }

      const setupConfig: ProjectSetup = {
        hasSupabase: existingSetup.hasSupabase,
        hasClerk: existingSetup.hasClerk,
        hasNextAuth: existingSetup.hasNextAuth,
        projectType: existingSetup.projectType
      };

      // Determine what to install
      const installSupabase = options.all || options.supabase || (!options.clerk && !existingSetup.hasSupabase);
      const installClerk = options.all || options.clerk || (!options.supabase && !existingSetup.hasClerk);

      if (installSupabase && !existingSetup.hasSupabase) {
        console.log(chalk.blue('📦 Setting up Supabase...'));
        await setupSupabase(setupConfig);
        console.log(chalk.green('✅ Supabase setup completed!\n'));
      }

      if (installClerk && !existingSetup.hasClerk) {
        console.log(chalk.blue('🔐 Setting up Clerk...'));
        await setupClerk(setupConfig);
        console.log(chalk.green('✅ Clerk setup completed!\n'));
      }

      // Setup webhooks if requested
      if (options.webhooks) {
        console.log(chalk.blue('🔗 Setting up webhooks...'));
        await setupWebhooks(installSupabase, installClerk);
        console.log(chalk.green('✅ Webhooks setup completed!\n'));
      }

      if (!options.skipDeps) {
        console.log(chalk.blue('📥 Installing dependencies...'));
        await installDependencies(installSupabase, installClerk, existingSetup);
        console.log(chalk.green('✅ Dependencies installed!\n'));
      }

      // Optionally apply Supabase migrations
      if (options.applyMigrations && installSupabase) {
        const { isSupabaseCliAvailable, applySupabaseMigrations } = await import('./utils/migrations');
        console.log(chalk.blue('🗃️ Applying Supabase migrations...'));
        if (isSupabaseCliAvailable()) {
          const ok = applySupabaseMigrations();
          if (ok) {
            console.log(chalk.green('✅ Supabase migrations applied!\n'));
          } else {
            console.log(chalk.yellow('⚠️  Could not apply migrations automatically. See README for manual steps.'));
          }
        } else {
          console.log(chalk.yellow('⚠️  Supabase CLI not found. Skipping migration apply.'));
          console.log(chalk.gray('Install via: brew install supabase/tap/supabase, then run: supabase db push'));
        }
      }

      console.log(chalk.green.bold('🎉 Setup completed successfully!'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('1. Configure your environment variables in .env.local'));
      console.log(chalk.gray('2. Run your development server: npm run dev'));
      console.log(chalk.gray('3. Check the generated documentation for integration details'));

    } catch (error) {
      console.error(chalk.red('❌ Setup failed:'), error);
      process.exit(1);
    }
  });

program
  .command('check')
  .description('Check current project setup and dependencies')
  .option('--detailed', 'Show detailed connection status and configuration')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🔍 Project Setup Analysis\n'));
      
      const setup = await detectExistingSetup();
      
      // Basic project info
      console.log(chalk.cyan('Project Type:'), setup.projectType);
      console.log(chalk.cyan('Has Supabase:'), setup.hasSupabase ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      console.log(chalk.cyan('Has Clerk:'), setup.hasClerk ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      console.log(chalk.cyan('Has NextAuth:'), setup.hasNextAuth ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      
      // Check for webhooks
      const hasWebhooks = await checkWebhookSetup();
      console.log(chalk.cyan('Has Webhooks:'), hasWebhooks ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      
      // Detailed checks if requested
      if (options.detailed) {
        console.log(chalk.blue.bold('\n🔧 Detailed Configuration Check\n'));
        
        // Check environment variables
        await checkEnvironmentVariables(setup);
        
        // Check configuration files
        await checkConfigurationFiles(setup);
        
        // Check dependencies
        await checkDependencies(setup);
        
        // Check connection status
        await checkConnectionStatus(setup);
      }
      
      // Basic file detection
      if (setup.hasSupabase || setup.hasClerk) {
        console.log(chalk.gray('\n📋 Detected configuration files:'));
        if (setup.hasSupabase) {
          console.log(chalk.gray('  • Supabase client configuration'));
          console.log(chalk.gray('  • Supabase middleware'));
          if (hasWebhooks) {
            console.log(chalk.gray('  • Supabase webhook endpoint'));
          }
        }
        if (setup.hasClerk) {
          console.log(chalk.gray('  • Clerk configuration'));
          console.log(chalk.gray('  • Clerk middleware'));
          if (hasWebhooks) {
            console.log(chalk.gray('  • Clerk webhook endpoint'));
          }
        }
      }
      
      // Recommendations
      console.log(chalk.blue.bold('\n💡 Recommendations:'));
      if (!setup.hasSupabase && !setup.hasClerk) {
        console.log(chalk.yellow('  • Run "next-supabase-clerk-setup install" to get started'));
      } else if (setup.hasSupabase && !setup.hasClerk) {
        console.log(chalk.yellow('  • Add Clerk with "next-supabase-clerk-setup install --clerk"'));
      } else if (!setup.hasSupabase && setup.hasClerk) {
        console.log(chalk.yellow('  • Add Supabase with "next-supabase-clerk-setup install --supabase"'));
      } else {
        console.log(chalk.green('  • Your setup looks complete!'));
        if (!hasWebhooks) {
          console.log(chalk.yellow('  • Consider adding webhooks with --webhooks flag'));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Analysis failed:'), error);
      process.exit(1);
    }
  });

program
  .command('uninstall')
  .description('Remove Supabase and/or Clerk configuration from your Next.js project')
  .option('-s, --supabase', 'Remove Supabase only')
  .option('-c, --clerk', 'Remove Clerk only')
  .option('-a, --all', 'Remove both Supabase and Clerk')
  .option('--keep-deps', 'Keep dependencies in package.json')
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🗑️  Next.js Supabase & Clerk Uninstall'));
      console.log(chalk.gray('Removing configuration...\n'));

      const existingSetup = await detectExistingSetup();
      
      // Determine what to remove
      const removeSupabase = options.all || options.supabase || (!options.clerk && existingSetup.hasSupabase);
      const removeClerk = options.all || options.clerk || (!options.supabase && existingSetup.hasClerk);

      if (removeSupabase && existingSetup.hasSupabase) {
        console.log(chalk.blue('🗑️  Removing Supabase...'));
        await uninstallSupabase(options.keepDeps);
        console.log(chalk.green('✅ Supabase removed!\n'));
      }

      if (removeClerk && existingSetup.hasClerk) {
        console.log(chalk.blue('🗑️  Removing Clerk...'));
        await uninstallClerk(options.keepDeps);
        console.log(chalk.green('✅ Clerk removed!\n'));
      }

      if (!removeSupabase && !removeClerk) {
        console.log(chalk.yellow('⚠️  No services to remove. Use --supabase, --clerk, or --all'));
        return;
      }

      console.log(chalk.green.bold('🎉 Uninstall completed successfully!'));
      console.log(chalk.gray('All configuration files and dependencies have been removed.'));

    } catch (error) {
      console.error(chalk.red('❌ Uninstall failed:'), error);
      process.exit(1);
    }
  });

program.parse();

// Helper functions for detailed checks
async function checkWebhookSetup(): Promise<boolean> {
  try {
    const supabaseWebhook = await fs.pathExists('app/api/webhooks/supabase/route.ts');
    const clerkWebhook = await fs.pathExists('app/api/webhooks/clerk/route.ts');
    const webhookUtils = await fs.pathExists('lib/webhook-utils.ts');
    return supabaseWebhook || clerkWebhook || webhookUtils;
  } catch {
    return false;
  }
}

async function checkEnvironmentVariables(setup: ProjectSetup): Promise<void> {
  console.log(chalk.cyan('🌍 Environment Variables:'));
  
  try {
    const envPath = '.env.local';
    const envExists = await fs.pathExists(envPath);
    
    if (!envExists) {
      console.log(chalk.red('  ❌ .env.local file not found'));
      return;
    }
    
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    // Check Supabase env vars
    if (setup.hasSupabase) {
      const supabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL=');
      const supabaseAnonKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
      const supabaseServiceKey = envContent.includes('SUPABASE_SERVICE_ROLE_KEY=');
      
      console.log(chalk.gray('  Supabase:'));
      console.log(supabaseUrl ? chalk.green('    ✅ NEXT_PUBLIC_SUPABASE_URL') : chalk.red('    ❌ NEXT_PUBLIC_SUPABASE_URL'));
      console.log(supabaseAnonKey ? chalk.green('    ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY') : chalk.red('    ❌ NEXT_PUBLIC_SUPABASE_ANON_KEY'));
      console.log(supabaseServiceKey ? chalk.green('    ✅ SUPABASE_SERVICE_ROLE_KEY') : chalk.red('    ❌ SUPABASE_SERVICE_ROLE_KEY'));
    }
    
    // Check Clerk env vars
    if (setup.hasClerk) {
      const clerkPublishableKey = envContent.includes('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=');
      const clerkSecretKey = envContent.includes('CLERK_SECRET_KEY=');
      const clerkSignInUrl = envContent.includes('NEXT_PUBLIC_CLERK_SIGN_IN_URL=');
      const clerkSignUpUrl = envContent.includes('NEXT_PUBLIC_CLERK_SIGN_UP_URL=');
      
      console.log(chalk.gray('  Clerk:'));
      console.log(clerkPublishableKey ? chalk.green('    ✅ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY') : chalk.red('    ❌ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'));
      console.log(clerkSecretKey ? chalk.green('    ✅ CLERK_SECRET_KEY') : chalk.red('    ❌ CLERK_SECRET_KEY'));
      console.log(clerkSignInUrl ? chalk.green('    ✅ NEXT_PUBLIC_CLERK_SIGN_IN_URL') : chalk.red('    ❌ NEXT_PUBLIC_CLERK_SIGN_IN_URL'));
      console.log(clerkSignUpUrl ? chalk.green('    ✅ NEXT_PUBLIC_CLERK_SIGN_UP_URL') : chalk.red('    ❌ NEXT_PUBLIC_CLERK_SIGN_UP_URL'));
    }
    
    // Check webhook secrets
    const hasWebhooks = await checkWebhookSetup();
    if (hasWebhooks) {
      const supabaseWebhookSecret = envContent.includes('SUPABASE_WEBHOOK_SECRET=');
      const clerkWebhookSecret = envContent.includes('CLERK_WEBHOOK_SECRET=');
      
      console.log(chalk.gray('  Webhooks:'));
      console.log(supabaseWebhookSecret ? chalk.green('    ✅ SUPABASE_WEBHOOK_SECRET') : chalk.red('    ❌ SUPABASE_WEBHOOK_SECRET'));
      console.log(clerkWebhookSecret ? chalk.green('    ✅ CLERK_WEBHOOK_SECRET') : chalk.red('    ❌ CLERK_WEBHOOK_SECRET'));
    }
    
  } catch (error) {
    console.log(chalk.red('  ❌ Error reading .env.local file'));
  }
}

async function checkConfigurationFiles(setup: ProjectSetup): Promise<void> {
  console.log(chalk.cyan('📁 Configuration Files:'));
  
  const filesToCheck = [
    { path: 'lib/supabase/client.ts', name: 'Supabase Client', required: setup.hasSupabase },
    { path: 'lib/supabase/server.ts', name: 'Supabase Server', required: setup.hasSupabase },
    { path: 'lib/supabase/middleware.ts', name: 'Supabase Middleware', required: setup.hasSupabase },
    { path: 'lib/clerk.tsx', name: 'Clerk Configuration', required: setup.hasClerk },
    { path: 'middleware.ts', name: 'Next.js Middleware', required: setup.hasClerk },
    { path: 'types/supabase.ts', name: 'Supabase Types', required: setup.hasSupabase },
    { path: 'supabase/config.toml', name: 'Supabase Config', required: setup.hasSupabase },
    { path: 'supabase/migrations/001_initial_schema.sql', name: 'Supabase Migration', required: setup.hasSupabase },
    { path: 'app/api/webhooks/supabase/route.ts', name: 'Supabase Webhook', required: false },
    { path: 'app/api/webhooks/clerk/route.ts', name: 'Clerk Webhook', required: false },
    { path: 'lib/webhook-utils.ts', name: 'Webhook Utils', required: false },
  ];
  
  for (const file of filesToCheck) {
    const exists = await fs.pathExists(file.path);
    const status = exists ? chalk.green('✅') : (file.required ? chalk.red('❌') : chalk.gray('⚪'));
    const required = file.required ? ' (required)' : ' (optional)';
    console.log(`  ${status} ${file.name}${required}`);
  }
}

async function checkDependencies(setup: ProjectSetup): Promise<void> {
  console.log(chalk.cyan('📦 Dependencies:'));
  
  try {
    const packageJsonPath = 'package.json';
    const packageJsonExists = await fs.pathExists(packageJsonPath);
    
    if (!packageJsonExists) {
      console.log(chalk.red('  ❌ package.json not found'));
      return;
    }
    
    const packageJson = await fs.readJson(packageJsonPath);
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = [
      { name: '@supabase/supabase-js', required: setup.hasSupabase },
      { name: '@supabase/ssr', required: setup.hasSupabase },
      { name: '@clerk/nextjs', required: setup.hasClerk },
      { name: 'next', required: true },
      { name: 'react', required: true },
      { name: 'react-dom', required: true },
    ];
    
    for (const dep of requiredDeps) {
      const installed = dependencies[dep.name];
      const status = installed ? chalk.green('✅') : (dep.required ? chalk.red('❌') : chalk.gray('⚪'));
      const version = installed ? ` (${installed})` : '';
      const required = dep.required ? ' (required)' : ' (optional)';
      console.log(`  ${status} ${dep.name}${version}${required}`);
    }
    
  } catch (error) {
    console.log(chalk.red('  ❌ Error reading package.json'));
  }
}

async function checkConnectionStatus(setup: ProjectSetup): Promise<void> {
  console.log(chalk.cyan('🔗 Connection Status:'));
  
  try {
    // Check if we can read environment variables
    const envPath = '.env.local';
    const envExists = await fs.pathExists(envPath);
    
    if (!envExists) {
      console.log(chalk.red('  ❌ Cannot check connections - .env.local not found'));
      return;
    }
    
    const envContent = await fs.readFile(envPath, 'utf-8');
    
    // Check Supabase connection
    if (setup.hasSupabase) {
      const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1];
      const supabaseAnonKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1];
      
      if (supabaseUrl && supabaseAnonKey) {
        if (supabaseUrl.includes('supabase.co') && supabaseAnonKey.startsWith('eyJ')) {
          console.log(chalk.green('  ✅ Supabase: Configuration looks valid'));
        } else {
          console.log(chalk.yellow('  ⚠️  Supabase: Configuration may be incomplete'));
        }
      } else {
        console.log(chalk.red('  ❌ Supabase: Missing required environment variables'));
      }
    }
    
    // Check Clerk connection
    if (setup.hasClerk) {
      const clerkPublishableKey = envContent.match(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=(.+)/)?.[1];
      const clerkSecretKey = envContent.match(/CLERK_SECRET_KEY=(.+)/)?.[1];
      
      if (clerkPublishableKey && clerkSecretKey) {
        if (clerkPublishableKey.startsWith('pk_') && clerkSecretKey.startsWith('sk_')) {
          console.log(chalk.green('  ✅ Clerk: Configuration looks valid'));
        } else {
          console.log(chalk.yellow('  ⚠️  Clerk: Configuration may be incomplete'));
        }
      } else {
        console.log(chalk.red('  ❌ Clerk: Missing required environment variables'));
      }
    }
    
    // Check webhook configuration
    const hasWebhooks = await checkWebhookSetup();
    if (hasWebhooks) {
      const supabaseWebhookSecret = envContent.match(/SUPABASE_WEBHOOK_SECRET=(.+)/)?.[1];
      const clerkWebhookSecret = envContent.match(/CLERK_WEBHOOK_SECRET=(.+)/)?.[1];
      
      if (supabaseWebhookSecret || clerkWebhookSecret) {
        console.log(chalk.green('  ✅ Webhooks: Configuration looks valid'));
      } else {
        console.log(chalk.yellow('  ⚠️  Webhooks: Missing webhook secrets'));
      }
    }
    
  } catch (error) {
    console.log(chalk.red('  ❌ Error checking connection status'));
  }
}
