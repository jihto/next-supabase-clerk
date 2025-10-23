export interface ProjectSetup {
  hasSupabase: boolean;
  hasClerk: boolean;
  hasNextAuth: boolean;
  projectType: 'nextjs' | 'nextjs-app' | 'nextjs-pages' | 'unknown';
}

export interface InstallationOptions {
  installSupabase: boolean;
  installClerk: boolean;
  skipDependencies: boolean;
  force: boolean;
}

export interface DependencyInfo {
  name: string;
  version: string;
  isDev: boolean;
  isInstalled: boolean;
}

export interface SetupResult {
  success: boolean;
  installedServices: string[];
  createdFiles: string[];
  errors: string[];
}

export interface ConfigFile {
  path: string;
  content: string;
  overwrite: boolean;
}

export type ProjectType = 'nextjs' | 'nextjs-app' | 'nextjs-pages' | 'unknown';
export type ServiceType = 'supabase' | 'clerk' | 'nextauth';
export type FileType = 'component' | 'page' | 'api' | 'config' | 'middleware' | 'types';
