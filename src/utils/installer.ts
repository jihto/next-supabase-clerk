import { execSync } from 'child_process';
import chalk from 'chalk';
import { ProjectSetup } from './detection';

export async function installDependencies(
  installSupabase: boolean,
  installClerk: boolean,
  existingSetup: ProjectSetup,
  hasWebhooks: boolean = false
): Promise<void> {
  const dependencies: string[] = [];
  const devDependencies: string[] = [];

  // Supabase dependencies
  if (installSupabase && !existingSetup.hasSupabase) {
    dependencies.push('@supabase/supabase-js', '@supabase/ssr');
    devDependencies.push('@types/node');
  }

  // Clerk dependencies
  if (installClerk && !existingSetup.hasClerk) {
    dependencies.push('@clerk/nextjs');
  }

  // Webhook dependencies
  if (hasWebhooks) {
    dependencies.push('svix');
  }

  // Common dependencies that might be needed
  if (installSupabase || installClerk) {
    if (!existingSetup.hasSupabase && !existingSetup.hasClerk) {
      // Only add these if neither is already installed
      dependencies.push('react', 'react-dom');
    }
  }

  if (dependencies.length === 0 && devDependencies.length === 0) {
    console.log(chalk.gray('No new dependencies to install.'));
    return;
  }

  try {
    // Install dependencies
    if (dependencies.length > 0) {
      console.log(chalk.blue(`Installing dependencies: ${dependencies.join(', ')}`));
      execSync(`npm install ${dependencies.join(' ')}`, { stdio: 'inherit' });
    }

    // Install dev dependencies
    if (devDependencies.length > 0) {
      console.log(chalk.blue(`Installing dev dependencies: ${devDependencies.join(', ')}`));
      execSync(`npm install --save-dev ${devDependencies.join(' ')}`, { stdio: 'inherit' });
    }

  } catch (error) {
    console.error(chalk.red('Failed to install dependencies:'), error);
    throw error;
  }
}

export function getRequiredDependencies(installSupabase: boolean, installClerk: boolean): {
  dependencies: string[];
  devDependencies: string[];
} {
  const dependencies: string[] = [];
  const devDependencies: string[] = [];

  if (installSupabase) {
    dependencies.push('@supabase/supabase-js', '@supabase/ssr');
    devDependencies.push('@types/node');
  }

  if (installClerk) {
    dependencies.push('@clerk/nextjs');
  }

  return { dependencies, devDependencies };
}
