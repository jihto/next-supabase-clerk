#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { setupSupabase } from './setup/supabase';
import { setupClerk } from './setup/clerk';
import { detectExistingSetup, ProjectSetup } from './utils/detection';
import { installDependencies } from './utils/installer';

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
  .action(async (options) => {
    try {
      console.log(chalk.blue.bold('🚀 Next.js Supabase & Clerk Setup'));
      console.log(chalk.gray('Detecting existing setup...\n'));

      const existingSetup = await detectExistingSetup();
      
      if (existingSetup.hasSupabase && existingSetup.hasClerk) {
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

      if (!options.skipDeps) {
        console.log(chalk.blue('📥 Installing dependencies...'));
        await installDependencies(installSupabase, installClerk, existingSetup);
        console.log(chalk.green('✅ Dependencies installed!\n'));
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
  .action(async () => {
    try {
      console.log(chalk.blue.bold('🔍 Project Setup Analysis\n'));
      
      const setup = await detectExistingSetup();
      
      console.log(chalk.cyan('Project Type:'), setup.projectType);
      console.log(chalk.cyan('Has Supabase:'), setup.hasSupabase ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      console.log(chalk.cyan('Has Clerk:'), setup.hasClerk ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      console.log(chalk.cyan('Has NextAuth:'), setup.hasNextAuth ? chalk.green('✅ Yes') : chalk.red('❌ No'));
      
      if (setup.hasSupabase || setup.hasClerk) {
        console.log(chalk.gray('\n📋 Detected configuration files:'));
        if (setup.hasSupabase) {
          console.log(chalk.gray('  • Supabase client configuration'));
          console.log(chalk.gray('  • Supabase middleware'));
        }
        if (setup.hasClerk) {
          console.log(chalk.gray('  • Clerk configuration'));
          console.log(chalk.gray('  • Clerk middleware'));
        }
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Analysis failed:'), error);
      process.exit(1);
    }
  });

program.parse();
