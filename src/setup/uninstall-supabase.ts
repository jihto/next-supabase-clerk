import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';

export async function uninstallSupabase(keepDeps: boolean = false): Promise<void> {
  try {
    // Remove Supabase files
    const filesToRemove = [
      'lib/supabase',
      'types/supabase.ts',
      'supabase',
      'components/Profile.tsx'
    ];

    for (const file of filesToRemove) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
        console.log(chalk.gray(`  Removed: ${file}`));
      }
    }

    // Remove Supabase dependencies
    if (!keepDeps) {
      try {
        execSync('npm uninstall @supabase/supabase-js @supabase/ssr', { stdio: 'inherit' });
        console.log(chalk.gray('  Removed Supabase dependencies'));
      } catch (error) {
        console.log(chalk.yellow('  Could not remove Supabase dependencies automatically'));
      }
    }

    // Clean up environment variables
    await cleanupEnvironmentVariables('supabase');

    console.log(chalk.green('✅ Supabase configuration removed'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to remove Supabase:'), error);
    throw error;
  }
}

export async function uninstallClerk(keepDeps: boolean = false): Promise<void> {
  try {
    // Remove Clerk files
    const filesToRemove = [
      'lib/clerk.tsx',
      'middleware.ts',
      'app/sign-in',
      'app/sign-up',
      'pages/sign-in',
      'pages/sign-up',
      'components/Dashboard.tsx',
      'app/api/protected'
    ];

    for (const file of filesToRemove) {
      if (await fs.pathExists(file)) {
        await fs.remove(file);
        console.log(chalk.gray(`  Removed: ${file}`));
      }
    }

    // Remove Clerk dependencies
    if (!keepDeps) {
      try {
        execSync('npm uninstall @clerk/nextjs', { stdio: 'inherit' });
        console.log(chalk.gray('  Removed Clerk dependencies'));
      } catch (error) {
        console.log(chalk.yellow('  Could not remove Clerk dependencies automatically'));
      }
    }

    // Clean up environment variables
    await cleanupEnvironmentVariables('clerk');

    // Clean up layout files
    await cleanupLayoutFiles();

    console.log(chalk.green('✅ Clerk configuration removed'));

  } catch (error) {
    console.error(chalk.red('❌ Failed to remove Clerk:'), error);
    throw error;
  }
}

async function cleanupEnvironmentVariables(service: 'supabase' | 'clerk'): Promise<void> {
  const envPath = '.env.local';
  
  if (!(await fs.pathExists(envPath))) {
    return;
  }

  try {
    let content = await fs.readFile(envPath, 'utf-8');
    
    if (service === 'supabase') {
      // Remove Supabase environment variables
      const supabaseVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'DATABASE_URL'
      ];
      
      supabaseVars.forEach(varName => {
        const regex = new RegExp(`^${varName}=.*$`, 'gm');
        content = content.replace(regex, '');
      });
    } else if (service === 'clerk') {
      // Remove Clerk environment variables
      const clerkVars = [
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY',
        'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL'
      ];
      
      clerkVars.forEach(varName => {
        const regex = new RegExp(`^${varName}=.*$`, 'gm');
        content = content.replace(regex, '');
      });
    }

    // Clean up empty lines
    content = content.replace(/\n\s*\n/g, '\n').trim();
    
    if (content) {
      await fs.writeFile(envPath, content + '\n');
    } else {
      await fs.remove(envPath);
    }

    console.log(chalk.gray(`  Cleaned up ${service} environment variables`));
  } catch (error) {
    console.log(chalk.yellow(`  Could not clean up ${service} environment variables`));
  }
}

async function cleanupLayoutFiles(): Promise<void> {
  try {
    // Clean up App Router layout
    if (await fs.pathExists('app/layout.tsx')) {
      let content = await fs.readFile('app/layout.tsx', 'utf-8');
      
      // Remove ClerkProviderWrapper import
      content = content.replace(/import\s*{\s*ClerkProviderWrapper\s*}\s*from\s*['"]@\/lib\/clerk['"];?\s*\n?/g, '');
      
      // Remove ClerkProviderWrapper wrapper
      content = content.replace(/<ClerkProviderWrapper>\s*({children})\s*<\/ClerkProviderWrapper>/g, '$1');
      
      await fs.writeFile('app/layout.tsx', content);
      console.log(chalk.gray('  Cleaned up app/layout.tsx'));
    }

    // Clean up Pages Router _app.tsx
    if (await fs.pathExists('pages/_app.tsx')) {
      let content = await fs.readFile('pages/_app.tsx', 'utf-8');
      
      // Remove ClerkProviderWrapper import
      content = content.replace(/import\s*{\s*ClerkProviderWrapper\s*}\s*from\s*['"]@\/lib\/clerk['"];?\s*\n?/g, '');
      
      // Remove ClerkProviderWrapper wrapper
      content = content.replace(/<ClerkProviderWrapper>\s*<Component[\s\S]*?\/>\s*<\/ClerkProviderWrapper>/g, '<Component {...pageProps} />');
      
      await fs.writeFile('pages/_app.tsx', content);
      console.log(chalk.gray('  Cleaned up pages/_app.tsx'));
    }
  } catch (error) {
    console.log(chalk.yellow('  Could not clean up layout files'));
  }
}
