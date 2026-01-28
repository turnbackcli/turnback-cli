import boxen from 'boxen';
import chalk from 'chalk';

export function printBox(title: string, content: string[]): void {
  const text = content.join('\n');
  console.log(
    boxen(text, {
      title,
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    })
  );
}

export function printSuccessBox(title: string, content: string[]): void {
  const text = content.join('\n');
  console.log(
    boxen(chalk.green(text), {
      title: chalk.green(title),
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    })
  );
}

export function printErrorBox(title: string, content: string[]): void {
  const text = content.join('\n');
  console.log(
    boxen(chalk.red(text), {
      title: chalk.red(title),
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red'
    })
  );
}

export function printTable(rows: Array<[string, string]>, padding: number = 20): void {
  for (const [key, value] of rows) {
    console.log(`  ${chalk.dim(key.padEnd(padding))}: ${value}`);
  }
}

export function formatNumber(num: number, decimals: number = 4): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function formatPercent(num: number, decimals: number = 2): string {
  return num.toFixed(decimals) + '%';
}
