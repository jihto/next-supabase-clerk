import { execSync, spawnSync } from 'child_process';
import chalk from 'chalk';

export function isSupabaseCliAvailable(): boolean {
  try {
    const res = spawnSync('supabase', ['--version'], { stdio: 'ignore' });
    return res.status === 0;
  } catch {
    return false;
  }
}

export function applySupabaseMigrations(): boolean {
  try {
    execSync('supabase db push', { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to apply Supabase migrations via CLI.'));
    return false;
  }
}


