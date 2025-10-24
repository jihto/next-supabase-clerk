import { Client } from 'pg';
import * as dotenv from 'dotenv';
import fs from 'fs-extra';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface DatabaseIntegrationConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  clerkApiKey?: string;
  useVault?: boolean;
  enableWebhooks?: boolean;
  webhookUrl?: string;
}

class DatabaseIntegrationSetup {
  private client: Client;
  private config: DatabaseIntegrationConfig;

  constructor(config: DatabaseIntegrationConfig) {
    this.config = config;
    this.client = new Client({
      connectionString: `${config.supabaseUrl}/rest/v1/`,
      ssl: { rejectUnauthorized: false },
      password: config.supabaseServiceKey,
      user: 'postgres',
      database: 'postgres'
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log(chalk.green('✅ Connected to Supabase database'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to connect to database:'), error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.client.end();
    console.log(chalk.green('✅ Disconnected from database'));
  }

  async executeQuery(query: string, description: string): Promise<any> {
    try {
      console.log(chalk.blue(`🔄 ${description}...`));
      const result = await this.client.query(query);
      console.log(chalk.green(`✅ ${description} completed`));
      return result;
    } catch (error) {
      console.error(chalk.red(`❌ ${description} failed:`), error);
      throw error;
    }
  }

  async createProfilesTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        image_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await this.executeQuery(query, 'Creating profiles table');
  }

  async createTasksTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        completed BOOLEAN DEFAULT FALSE,
        user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await this.executeQuery(query, 'Creating tasks table');
  }

  async enableRLS(): Promise<void> {
    const queries = [
      'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;',
      'ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;'
    ];

    for (const query of queries) {
      await this.executeQuery(query, 'Enabling Row Level Security');
    }
  }

  async createProfilesPolicies(): Promise<void> {
    const policies = [
      {
        name: 'Users can view their own profile',
        query: `CREATE POLICY "Users can view their own profile" ON profiles
          FOR SELECT USING (auth.jwt()->>'sub' = id);`
      },
      {
        name: 'Users can update their own profile',
        query: `CREATE POLICY "Users can update their own profile" ON profiles
          FOR UPDATE USING (auth.jwt()->>'sub' = id);`
      },
      {
        name: 'Users can insert their own profile',
        query: `CREATE POLICY "Users can insert their own profile" ON profiles
          FOR INSERT WITH CHECK (auth.jwt()->>'sub' = id);`
      }
    ];

    for (const policy of policies) {
      try {
        await this.executeQuery(policy.query, `Creating policy: ${policy.name}`);
      } catch (error) {
        // Policy might already exist, continue
        console.log(chalk.yellow(`ℹ️  Policy "${policy.name}" might already exist, skipping...`));
      }
    }
  }

  async createTasksPolicies(): Promise<void> {
    const policies = [
      {
        name: 'Users can view their own tasks',
        query: `CREATE POLICY "Users can view their own tasks" ON tasks
          FOR SELECT USING (auth.jwt()->>'sub' = user_id);`
      },
      {
        name: 'Users can insert their own tasks',
        query: `CREATE POLICY "Users can insert their own tasks" ON tasks
          FOR INSERT WITH CHECK (auth.jwt()->>'sub' = user_id);`
      },
      {
        name: 'Users can update their own tasks',
        query: `CREATE POLICY "Users can update their own tasks" ON tasks
          FOR UPDATE USING (auth.jwt()->>'sub' = user_id);`
      },
      {
        name: 'Users can delete their own tasks',
        query: `CREATE POLICY "Users can delete their own tasks" ON tasks
          FOR DELETE USING (auth.jwt()->>'sub' = user_id);`
      }
    ];

    for (const policy of policies) {
      try {
        await this.executeQuery(policy.query, `Creating policy: ${policy.name}`);
      } catch (error) {
        // Policy might already exist, continue
        console.log(chalk.yellow(`ℹ️  Policy "${policy.name}" might already exist, skipping...`));
      }
    }
  }

  async createWebhookFunction(): Promise<void> {
    const query = `
      CREATE OR REPLACE FUNCTION handle_clerk_webhook()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Handle user.created event
        IF TG_OP = 'INSERT' THEN
          INSERT INTO profiles (id, email, first_name, last_name, image_url)
          VALUES (
            NEW.id,
            NEW.email_addresses->0->>'email_address',
            NEW.first_name,
            NEW.last_name,
            NEW.image_url
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            image_url = EXCLUDED.image_url,
            updated_at = NOW();
        END IF;

        -- Handle user.updated event
        IF TG_OP = 'UPDATE' THEN
          UPDATE profiles SET
            email = NEW.email_addresses->0->>'email_address',
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            image_url = NEW.image_url,
            updated_at = NOW()
          WHERE id = NEW.id;
        END IF;

        -- Handle user.deleted event
        IF TG_OP = 'DELETE' THEN
          DELETE FROM profiles WHERE id = OLD.id;
        END IF;

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    await this.executeQuery(query, 'Creating webhook handler function');
  }

  async createWebhookTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS clerk_webhook_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        user_id TEXT,
        event_data JSONB,
        processed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await this.executeQuery(query, 'Creating webhook events table');
  }

  async createWebhookTrigger(): Promise<void> {
    const query = `
      DROP TRIGGER IF EXISTS clerk_webhook_trigger ON clerk_webhook_events;
      CREATE TRIGGER clerk_webhook_trigger
        AFTER INSERT ON clerk_webhook_events
        FOR EACH ROW
        EXECUTE FUNCTION handle_clerk_webhook();
    `;
    await this.executeQuery(query, 'Creating webhook trigger');
  }

  async createIndexes(): Promise<void> {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_user_id ON clerk_webhook_events(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON clerk_webhook_events(processed);'
    ];

    for (const indexQuery of indexes) {
      await this.executeQuery(indexQuery, 'Creating database indexes');
    }
  }

  async verifySetup(): Promise<void> {
    const queries = [
      {
        name: 'Profiles table',
        query: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'profiles';"
      },
      {
        name: 'Tasks table',
        query: "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = 'tasks';"
      },
      {
        name: 'RLS policies',
        query: "SELECT COUNT(*) as count FROM pg_policies WHERE tablename IN ('profiles', 'tasks');"
      }
    ];

    console.log(chalk.blue('\n🔍 Verifying setup...'));
    
    for (const { name, query } of queries) {
      try {
        const result = await this.executeQuery(query, `Checking ${name}`);
        const count = result.rows[0]?.count || 0;
        console.log(chalk.green(`  ✅ ${name}: ${count} found`));
      } catch (error) {
        console.log(chalk.red(`  ❌ ${name}: Verification failed`));
      }
    }
  }

  async setup(): Promise<void> {
    try {
      console.log(chalk.blue('🚀 Starting Database Integration Setup...\n'));

      await this.connect();

      // Step 1: Create Database Schema
      await this.createProfilesTable();
      await this.createTasksTable();

      // Step 2: Enable Row Level Security
      await this.enableRLS();

      // Step 3: Create RLS Policies
      await this.createProfilesPolicies();
      await this.createTasksPolicies();

      // Step 4: Create Webhook Infrastructure (if enabled)
      if (this.config.enableWebhooks) {
        await this.createWebhookFunction();
        await this.createWebhookTable();
        await this.createWebhookTrigger();
      }

      // Step 5: Create Indexes
      await this.createIndexes();

      // Step 6: Verify Setup
      await this.verifySetup();

      console.log(chalk.green('\n🎉 Database Integration setup completed successfully!'));
      
      console.log(chalk.blue('\n📋 Next Steps:'));
      console.log(chalk.gray('1. Configure Clerk Dashboard:'));
      console.log(chalk.gray('   - Go to https://dashboard.clerk.com'));
      console.log(chalk.gray('   - Navigate to Integrations → Supabase'));
      console.log(chalk.gray('   - Activate Supabase integration'));
      console.log(chalk.gray('   - Copy your Clerk Domain'));
      
      console.log(chalk.gray('\n2. Configure Supabase Dashboard:'));
      console.log(chalk.gray('   - Go to https://supabase.com/dashboard'));
      console.log(chalk.gray('   - Navigate to Authentication → Providers'));
      console.log(chalk.gray('   - Add Clerk provider with your Clerk Domain'));
      
      if (this.config.enableWebhooks) {
        console.log(chalk.gray('\n3. Set up Clerk Webhook:'));
        console.log(chalk.gray('   - Go to Clerk Dashboard → Webhooks'));
        console.log(chalk.gray(`   - Add endpoint: ${this.config.webhookUrl || 'https://your-domain.com/api/webhooks/clerk'}`));
        console.log(chalk.gray('   - Select events: user.created, user.updated, user.deleted'));
        console.log(chalk.gray('   - Copy the signing secret to CLERK_WEBHOOK_SECRET'));
      }

      console.log(chalk.gray('\n4. Test the integration:'));
      console.log(chalk.gray('   - Run: npm run dev'));
      console.log(chalk.gray('   - Visit: http://localhost:3000'));
      console.log(chalk.gray('   - Sign up and create tasks'));

    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

export { DatabaseIntegrationSetup };
export type { DatabaseIntegrationConfig };
