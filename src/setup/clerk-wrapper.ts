import { Client } from 'pg';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface ClerkWrapperConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  clerkApiKey: string;
  useVault?: boolean;
  selectedTables?: string[];
  excludedTables?: string[];
}

class ClerkWrapperSetup {
  private client: Client;
  private config: ClerkWrapperConfig;

  constructor(config: ClerkWrapperConfig) {
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

  async enableWrappersExtension(): Promise<void> {
    const query = `
      CREATE EXTENSION IF NOT EXISTS wrappers WITH SCHEMA extensions;
    `;
    await this.executeQuery(query, 'Enabling Wrappers extension');
  }

  async enableWasmWrapper(): Promise<void> {
    const query = `
      CREATE FOREIGN DATA WRAPPER wasm_wrapper
        HANDLER wasm_fdw_handler
        VALIDATOR wasm_fdw_validator;
    `;
    await this.executeQuery(query, 'Enabling Wasm foreign data wrapper');
  }

  async storeClerkCredentials(): Promise<string> {
    const query = `
      SELECT vault.create_secret(
        $1,
        'clerk',
        'Clerk API key for Wrappers'
      );
    `;
    
    const result = await this.executeQuery(
      query, 
      'Storing Clerk API key in Vault'
    );
    
    // Extract key_id from the result
    const keyId = result.rows[0]?.create_secret;
    if (!keyId) {
      throw new Error('Failed to retrieve key_id from Vault');
    }
    
    console.log(chalk.green(`✅ Clerk API key stored with key_id: ${keyId}`));
    return keyId;
  }

  async createClerkServerWithVault(keyId: string): Promise<void> {
    const query = `
      CREATE SERVER clerk_server
        FOREIGN DATA WRAPPER wasm_wrapper
        OPTIONS (
          fdw_package_url 'https://github.com/supabase/wrappers/releases/download/wasm_clerk_fdw_v0.2.0/clerk_fdw.wasm',
          fdw_package_name 'supabase:clerk-fdw',
          fdw_package_version '0.2.0',
          fdw_package_checksum '89337bb11779d4d654cd3e54391aabd02509d213db6995f7dd58951774bf0e37',
          api_url 'https://api.clerk.com/v1',
          api_key_id '${keyId}'
        );
    `;
    await this.executeQuery(query, 'Creating Clerk server with Vault');
  }

  async createClerkServerWithoutVault(): Promise<void> {
    const query = `
      CREATE SERVER clerk_server
        FOREIGN DATA WRAPPER wasm_wrapper
        OPTIONS (
          fdw_package_url 'https://github.com/supabase/wrappers/releases/download/wasm_clerk_fdw_v0.2.0/clerk_fdw.wasm',
          fdw_package_name 'supabase:clerk-fdw',
          fdw_package_version '0.2.0',
          fdw_package_checksum '89337bb11779d4d654cd3e54391aabd02509d213db6995f7dd58951774bf0e37',
          api_url 'https://api.clerk.com/v1',
          api_key '${this.config.clerkApiKey}'
        );
    `;
    await this.executeQuery(query, 'Creating Clerk server without Vault');
  }

  async createClerkSchema(): Promise<void> {
    const query = `
      CREATE SCHEMA IF NOT EXISTS clerk;
    `;
    await this.executeQuery(query, 'Creating Clerk schema');
  }

  async importAllTables(): Promise<void> {
    const query = `
      IMPORT FOREIGN SCHEMA clerk FROM SERVER clerk_server INTO clerk;
    `;
    await this.executeQuery(query, 'Importing all Clerk foreign tables');
  }

  async importSelectedTables(tables: string[]): Promise<void> {
    const tablesList = tables.map(table => `"${table}"`).join(', ');
    const query = `
      IMPORT FOREIGN SCHEMA clerk
        LIMIT TO (${tablesList})
        FROM SERVER clerk_server INTO clerk;
    `;
    await this.executeQuery(query, `Importing selected tables: ${tables.join(', ')}`);
  }

  async importTablesExcept(excludedTables: string[]): Promise<void> {
    const tablesList = excludedTables.map(table => `"${table}"`).join(', ');
    const query = `
      IMPORT FOREIGN SCHEMA clerk
        EXCEPT (${tablesList})
        FROM SERVER clerk_server INTO clerk;
    `;
    await this.executeQuery(query, `Importing all tables except: ${excludedTables.join(', ')}`);
  }

  async listAvailableTables(): Promise<void> {
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'clerk'
      ORDER BY table_name;
    `;
    
    try {
      const result = await this.executeQuery(query, 'Listing available Clerk tables');
      console.log(chalk.blue('\n📋 Available Clerk tables:'));
      result.rows.forEach((row: any) => {
        console.log(chalk.gray(`  - ${row.table_name}`));
      });
    } catch (error) {
      console.log(chalk.yellow('ℹ️  No tables found yet. Run import first.'));
    }
  }

  async setup(): Promise<void> {
    try {
      console.log(chalk.blue('🚀 Starting Clerk Wrapper Setup...\n'));

      await this.connect();

      // Step 1: Enable Wrappers Extension
      await this.enableWrappersExtension();

      // Step 2: Enable Wasm Wrapper
      await this.enableWasmWrapper();

      // Step 3: Store Clerk Credentials
      let keyId: string | undefined;
      if (this.config.useVault !== false) {
        try {
          keyId = await this.storeClerkCredentials();
        } catch (error) {
          console.log(chalk.yellow('⚠️  Vault not available, using direct API key'));
          keyId = undefined;
        }
      }

      // Step 4: Create Clerk Server
      if (keyId) {
        await this.createClerkServerWithVault(keyId);
      } else {
        await this.createClerkServerWithoutVault();
      }

      // Step 5: Create Clerk Schema
      await this.createClerkSchema();

      // Step 6: Import Tables
      if (this.config.selectedTables && this.config.selectedTables.length > 0) {
        await this.importSelectedTables(this.config.selectedTables);
      } else if (this.config.excludedTables && this.config.excludedTables.length > 0) {
        await this.importTablesExcept(this.config.excludedTables);
      } else {
        await this.importAllTables();
      }

      // Step 7: List Available Tables
      await this.listAvailableTables();

      console.log(chalk.green('\n🎉 Clerk Wrapper setup completed successfully!'));
      console.log(chalk.blue('\n📚 Available Clerk objects:'));
      console.log(chalk.gray('  - allowlist_identifiers: List of allowed sign-up identifiers'));
      console.log(chalk.gray('  - blocklist_identifiers: List of blocked sign-up identifiers'));
      console.log(chalk.gray('  - domains: Custom domains'));
      console.log(chalk.gray('  - invitations: User invitations'));
      console.log(chalk.gray('  - jwt_templates: JWT templates'));
      console.log(chalk.gray('  - oauth_applications: OAuth applications'));
      console.log(chalk.gray('  - organizations: Organizations'));
      console.log(chalk.gray('  - organization_invitations: Organization invitations'));
      console.log(chalk.gray('  - organization_memberships: Organization memberships'));
      console.log(chalk.gray('  - redirect_urls: Whitelisted redirect URLs'));
      console.log(chalk.gray('  - saml_connections: SAML connections'));
      console.log(chalk.gray('  - users: Users'));

    } catch (error) {
      console.error(chalk.red('\n❌ Setup failed:'), error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

export { ClerkWrapperSetup };
export type { ClerkWrapperConfig };

