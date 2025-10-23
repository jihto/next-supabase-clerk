import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    console.error(chalk.red(`Failed to create directory ${dirPath}:`), error);
    throw error;
  }
}

export async function writeFileIfNotExists(filePath: string, content: string): Promise<boolean> {
  try {
    if (await fs.pathExists(filePath)) {
      console.log(chalk.yellow(`⚠️  File ${filePath} already exists, skipping...`));
      return false;
    }
    
    await fs.writeFile(filePath, content);
    console.log(chalk.green(`✅ Created ${filePath}`));
    return true;
  } catch (error) {
    console.error(chalk.red(`Failed to write file ${filePath}:`), error);
    throw error;
  }
}

export async function appendToFile(filePath: string, content: string): Promise<void> {
  try {
    const existingContent = await fs.pathExists(filePath) ? await fs.readFile(filePath, 'utf-8') : '';
    await fs.writeFile(filePath, existingContent + content);
  } catch (error) {
    console.error(chalk.red(`Failed to append to file ${filePath}:`), error);
    throw error;
  }
}

export async function readJsonFile<T = any>(filePath: string): Promise<T | null> {
  try {
    if (!(await fs.pathExists(filePath))) {
      return null;
    }
    return await fs.readJson(filePath);
  } catch (error) {
    console.error(chalk.red(`Failed to read JSON file ${filePath}:`), error);
    return null;
  }
}

export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  try {
    await fs.writeJson(filePath, data, { spaces: 2 });
  } catch (error) {
    console.error(chalk.red(`Failed to write JSON file ${filePath}:`), error);
    throw error;
  }
}

export function getProjectRoot(): string {
  return process.cwd();
}

export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}
