#!/usr/bin/env tsx

import * as dotenv from 'dotenv';
import { DatabaseIntegrationSetup } from './database-integration';
import { ClerkWrapperSetup } from './clerk-wrapper';
import { setupSupabase } from './supabase';
import { setupClerk } from './clerk';
import { setupWebhooks } from './webhooks';
import { installDependencies } from '../utils/installer';
import { detectExistingSetup, ProjectSetup } from '../utils/detection';
import chalk from 'chalk';
import fs from 'fs-extra';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface EnhancedSetupOptions {
  clerkWrapper?: boolean;
  databaseIntegration?: boolean;
  useVault?: boolean;
  selectedTables?: string[];
  excludedTables?: string[];
  enableWebhooks?: boolean;
  webhookUrl?: string;
  skipDeps?: boolean;
  applyMigrations?: boolean;
}

class EnhancedClerkSupabaseSetup {
  private options: EnhancedSetupOptions;

  constructor(options: EnhancedSetupOptions = {}) {
    this.options = {
      clerkWrapper: true,
      databaseIntegration: true,
      useVault: true,
      enableWebhooks: true,
      ...options
    };
  }

  async validateEnvironment(): Promise<void> {
    console.log(chalk.blue('🔍 Validating environment variables...\n'));

    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const clerkWrapperVars = [
      'CLERK_SECRET_KEY'
    ];

    const integrationVars = [
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
    ];

    const webhookVars = [
      'CLERK_WEBHOOK_SECRET'
    ];

    const missingVars: string[] = [];

    // Check required vars
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      } else {
        console.log(chalk.green(`✅ ${varName}`));
      }
    }

    // Check Clerk wrapper vars
    if (this.options.clerkWrapper) {
      for (const varName of clerkWrapperVars) {
        if (!process.env[varName]) {
          missingVars.push(varName);
        } else {
          console.log(chalk.green(`✅ ${varName}`));
        }
      }
    }

    // Check integration vars
    if (this.options.databaseIntegration) {
      for (const varName of integrationVars) {
        if (!process.env[varName]) {
          missingVars.push(varName);
        } else {
          console.log(chalk.green(`✅ ${varName}`));
        }
      }
    }

    // Check webhook vars
    if (this.options.enableWebhooks) {
      for (const varName of webhookVars) {
        if (!process.env[varName]) {
          console.log(chalk.yellow(`⚠️  ${varName} (optional for webhooks)`));
        } else {
          console.log(chalk.green(`✅ ${varName}`));
        }
      }
    }

    if (missingVars.length > 0) {
      console.log(chalk.red('\n❌ Missing required environment variables:'));
      missingVars.forEach(varName => console.log(chalk.red(`  - ${varName}`)));
      console.log(chalk.yellow('\nPlease add these to your .env.local file'));
      process.exit(1);
    }

    console.log(chalk.green('\n✅ All required environment variables are present\n'));
  }

  async setupBasicConfiguration(): Promise<void> {
    console.log(chalk.blue('🔧 Setting up basic configuration...\n'));

    const existingSetup = await detectExistingSetup();
    
    // Setup Supabase if not already configured
    if (!existingSetup.hasSupabase) {
      console.log(chalk.blue('📦 Setting up Supabase...'));
      await setupSupabase(existingSetup);
      console.log(chalk.green('✅ Supabase setup completed!\n'));
    }

    // Setup Clerk if not already configured
    if (!existingSetup.hasClerk) {
      console.log(chalk.blue('🔐 Setting up Clerk...'));
      await setupClerk(existingSetup);
      console.log(chalk.green('✅ Clerk setup completed!\n'));
    }

    // Setup webhooks if enabled
    if (this.options.enableWebhooks) {
      console.log(chalk.blue('🔗 Setting up webhooks...'));
      await setupWebhooks(true, true);
      console.log(chalk.green('✅ Webhooks setup completed!\n'));
    }
  }

  async setupClerkWrapper(): Promise<void> {
    if (!this.options.clerkWrapper) {
      console.log(chalk.yellow('⏭️  Skipping Clerk Wrapper setup\n'));
      return;
    }

    console.log(chalk.blue('🔧 Setting up Clerk Wrapper...\n'));

    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      clerkApiKey: process.env.CLERK_SECRET_KEY!,
      useVault: this.options.useVault,
      selectedTables: this.options.selectedTables,
      excludedTables: this.options.excludedTables
    };

    const wrapperSetup = new ClerkWrapperSetup(config);
    await wrapperSetup.setup();
  }

  async setupDatabaseIntegration(): Promise<void> {
    if (!this.options.databaseIntegration) {
      console.log(chalk.yellow('⏭️  Skipping Database Integration setup\n'));
      return;
    }

    console.log(chalk.blue('🔧 Setting up Database Integration...\n'));

    const config = {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      clerkDomain: process.env.CLERK_DOMAIN || '',
      enableWebhooks: this.options.enableWebhooks,
      webhookUrl: this.options.webhookUrl
    };

    const integrationSetup = new DatabaseIntegrationSetup(config);
    await integrationSetup.setup();
  }

  async installDependencies(): Promise<void> {
    if (this.options.skipDeps) {
      console.log(chalk.yellow('⏭️  Skipping dependency installation\n'));
      return;
    }

    console.log(chalk.blue('📥 Installing dependencies...\n'));

    const existingSetup = await detectExistingSetup();
    await installDependencies(true, true, existingSetup, this.options.enableWebhooks);
    console.log(chalk.green('✅ Dependencies installed!\n'));
  }

  async applyMigrations(): Promise<void> {
    if (!this.options.applyMigrations) {
      return;
    }

    console.log(chalk.blue('🗃️ Applying Supabase migrations...\n'));
    
    try {
      const { isSupabaseCliAvailable, applySupabaseMigrations } = await import('../utils/migrations');
      
      if (isSupabaseCliAvailable()) {
        const success = applySupabaseMigrations();
        if (success) {
          console.log(chalk.green('✅ Supabase migrations applied!\n'));
        } else {
          console.log(chalk.yellow('⚠️  Could not apply migrations automatically. See README for manual steps.\n'));
        }
      } else {
        console.log(chalk.yellow('⚠️  Supabase CLI not found. Skipping migration apply.\n'));
        console.log(chalk.gray('Install via: brew install supabase/tap/supabase, then run: supabase db push\n'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not apply migrations. Please run manually.\n'));
    }
  }

  async run(): Promise<void> {
    try {
      console.log(chalk.blue.bold('🚀 Enhanced Clerk + Supabase Complete Setup\n'));
      console.log(chalk.gray('This script will set up:'));
      if (this.options.clerkWrapper) {
        console.log(chalk.gray('  ✅ Clerk Wrapper (FDW) - Query Clerk data directly from Postgres'));
      }
      if (this.options.databaseIntegration) {
        console.log(chalk.gray('  ✅ Database Integration - Authentication + Database with RLS'));
      }
      if (this.options.enableWebhooks) {
        console.log(chalk.gray('  ✅ Webhook Integration - Automatic user data sync'));
      }
      console.log('');

      // Step 1: Validate environment
      await this.validateEnvironment();

      // Step 2: Setup basic configuration
      await this.setupBasicConfiguration();

      // Step 3: Setup Clerk Wrapper
      await this.setupClerkWrapper();

      // Step 4: Setup Database Integration
      await this.setupDatabaseIntegration();

      // Step 5: Install dependencies
      await this.installDependencies();

      // Step 6: Apply migrations
      await this.applyMigrations();

      console.log(chalk.green.bold('\n🎉 Complete setup finished successfully!\n'));

      console.log(chalk.blue('📋 Summary of what was set up:'));
      if (this.options.clerkWrapper) {
        console.log(chalk.gray('  ✅ Clerk Wrapper (FDW)'));
        console.log(chalk.gray('     - Wrappers extension enabled'));
        console.log(chalk.gray('     - Wasm foreign data wrapper created'));
        console.log(chalk.gray('     - Clerk server configured'));
        console.log(chalk.gray('     - Foreign tables imported to clerk schema'));
      }
      if (this.options.databaseIntegration) {
        console.log(chalk.gray('  ✅ Database Integration'));
        console.log(chalk.gray('     - Database schema created (profiles, tasks)'));
        console.log(chalk.gray('     - Row Level Security enabled'));
        console.log(chalk.gray('     - RLS policies created'));
        console.log(chalk.gray('     - Database indexes created'));
      }
      if (this.options.enableWebhooks) {
        console.log(chalk.gray('  ✅ Webhook Infrastructure'));
        console.log(chalk.gray('     - Webhook handler function created'));
        console.log(chalk.gray('     - Webhook events table created'));
        console.log(chalk.gray('     - Webhook trigger configured'));
      }

      console.log(chalk.blue('\n📚 Next Steps:'));
      console.log(chalk.gray('1. Configure Clerk Dashboard:'));
      console.log(chalk.gray('   - Go to https://dashboard.clerk.com'));
      console.log(chalk.gray('   - Navigate to Integrations → Supabase'));
      console.log(chalk.gray('   - Activate Supabase integration'));
      console.log(chalk.gray('   - Copy your Clerk Domain to CLERK_DOMAIN in .env.local'));
      
      console.log(chalk.gray('\n2. Configure Supabase Dashboard:'));
      console.log(chalk.gray('   - Go to https://supabase.com/dashboard'));
      console.log(chalk.gray('   - Navigate to Authentication → Providers'));
      console.log(chalk.gray('   - Add Clerk provider with your Clerk Domain'));
      
      if (this.options.enableWebhooks) {
        console.log(chalk.gray('\n3. Set up Clerk Webhook:'));
        console.log(chalk.gray('   - Go to Clerk Dashboard → Webhooks'));
        console.log(chalk.gray('   - Add endpoint: https://your-domain.com/api/webhooks/clerk'));
        console.log(chalk.gray('   - Select events: user.created, user.updated, user.deleted'));
        console.log(chalk.gray('   - Copy the signing secret to CLERK_WEBHOOK_SECRET'));
      }

      console.log(chalk.gray('\n4. Test the setup:'));
      console.log(chalk.gray('   - Run: npm run dev'));
      console.log(chalk.gray('   - Visit: http://localhost:3000'));
      console.log(chalk.gray('   - Sign up and test authentication'));
      console.log(chalk.gray('   - Create and manage tasks'));

      console.log(chalk.gray('\n5. Query Clerk data directly (if wrapper enabled):'));
      console.log(chalk.gray('   - Use the clerk schema in your Supabase SQL editor'));
      console.log(chalk.gray('   - Example: SELECT * FROM clerk.users;'));
      console.log(chalk.gray('   - Example: SELECT * FROM clerk.organizations;'));

    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error);
      process.exit(1);
    }
  }
}

// Parse command line arguments
function parseArgs(): EnhancedSetupOptions {
  const args = process.argv.slice(2);
  const options: EnhancedSetupOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-wrapper':
        options.clerkWrapper = false;
        break;
      case '--no-integration':
        options.databaseIntegration = false;
        break;
      case '--no-vault':
        options.useVault = false;
        break;
      case '--no-webhooks':
        options.enableWebhooks = false;
        break;
      case '--skip-deps':
        options.skipDeps = true;
        break;
      case '--apply-migrations':
        options.applyMigrations = true;
        break;
      case '--tables':
        if (i + 1 < args.length) {
          options.selectedTables = args[i + 1].split(',').map(t => t.trim());
          i++;
        }
        break;
      case '--exclude-tables':
        if (i + 1 < args.length) {
          options.excludedTables = args[i + 1].split(',').map(t => t.trim());
          i++;
        }
        break;
      case '--webhook-url':
        if (i + 1 < args.length) {
          options.webhookUrl = args[i + 1];
          i++;
        }
        break;
      case '--help':
        console.log(`
Enhanced Clerk + Supabase Setup Script

Usage: next-supabase-clerk-setup enhanced [options]

Options:
  --no-wrapper          Skip Clerk Wrapper (FDW) setup
  --no-integration      Skip Database Integration setup
  --no-vault            Don't use Vault for storing Clerk API key
  --no-webhooks         Skip webhook infrastructure setup
  --skip-deps           Skip installing dependencies
  --apply-migrations    Apply Supabase migrations using Supabase CLI
  --tables <list>       Import only specific Clerk tables (comma-separated)
  --exclude-tables <list> Import all tables except specified ones (comma-separated)
  --webhook-url <url>   Set custom webhook URL
  --help                Show this help message

Examples:
  next-supabase-clerk-setup enhanced                                    # Full setup
  next-supabase-clerk-setup enhanced --no-wrapper                      # Integration only
  next-supabase-clerk-setup enhanced --no-integration                  # Wrapper only
  next-supabase-clerk-setup enhanced --tables "users,organizations"    # Import specific tables
  next-supabase-clerk-setup enhanced --exclude-tables "saml_connections,oauth_applications"  # Import all except specified
  next-supabase-clerk-setup enhanced --webhook-url "https://myapp.com/api/webhooks/clerk"  # Custom webhook URL

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL         # Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY        # Your Supabase service role key
  CLERK_SECRET_KEY                 # Your Clerk secret key
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY # Your Clerk publishable key
  CLERK_WEBHOOK_SECRET             # Your Clerk webhook secret (optional)
  CLERK_DOMAIN                     # Your Clerk domain (optional)
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const setup = new EnhancedClerkSupabaseSetup(options);
  await setup.run();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the setup
if (require.main === module) {
  main().catch(console.error);
}

export { EnhancedClerkSupabaseSetup };
export type { EnhancedSetupOptions };
