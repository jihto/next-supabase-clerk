import chalk from 'chalk';

export class Logger {
  static info(message: string): void {
    console.log(chalk.blue('ℹ️'), message);
  }

  static success(message: string): void {
    console.log(chalk.green('✅'), message);
  }

  static warning(message: string): void {
    console.log(chalk.yellow('⚠️'), message);
  }

  static error(message: string): void {
    console.log(chalk.red('❌'), message);
  }

  static step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  }

  static header(message: string): void {
    console.log(chalk.blue.bold(`\n🚀 ${message}\n`));
  }

  static subheader(message: string): void {
    console.log(chalk.cyan.bold(`\n📦 ${message}\n`));
  }

  static divider(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }
}
