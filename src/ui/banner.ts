import figlet from 'figlet';
import gradient from 'gradient-string';
import chalk from 'chalk';

export function printBanner(): void {
  const banner = figlet.textSync('TURNBACKBOT', {
    font: 'Standard',
    horizontalLayout: 'default',
    verticalLayout: 'default',
    width: 80,
    whitespaceBreak: true
  });

  const gradientBanner = gradient.pastel.multiline(banner);
  console.log('\n' + gradientBanner);
  console.log(chalk.dim('  Production-ready Solana CLI for fee claims & buybacks\n'));
}

export function printWarning(): void {
  console.log(chalk.yellow('⚠  WARNING: Running on Solana Mainnet'));
  console.log(chalk.yellow('   Double-check all parameters before confirming transactions\n'));
}
