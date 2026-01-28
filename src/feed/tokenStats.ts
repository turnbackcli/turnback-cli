import { Connection, PublicKey } from '@solana/web3.js';
import { fetch } from 'undici';
import { config } from '../config';
import chalk from 'chalk';

export interface TokenStats {
  price: number;
  marketCap: number;
  supply: number;
  liquidity: number;
  priceChange24h: number;
  volume24h: number;
}

export async function fetchTokenStats(
  connection: Connection,
  mintAddress: string
): Promise<TokenStats | null> {
  try {
    // Fetch supply first (always available)
    const supply = await fetchTokenSupply(connection, mintAddress);
    
    // Try multiple sources in order
    let priceData = await fetchJupiterPrice(mintAddress);
    
    if (!priceData || !priceData.price) {
      priceData = await fetchDexScreenerPrice(mintAddress);
    }
    
    if (!priceData || !priceData.price) {
      priceData = await fetchBirdeyePrice(mintAddress);
    }
    
    const price = priceData?.price || 0;
    const marketCap = price * supply;
    
    return {
      price,
      marketCap,
      supply,
      liquidity: priceData?.liquidity || 0,
      priceChange24h: priceData?.priceChange24h || 0,
      volume24h: priceData?.volume24h || 0
    };
  } catch (error) {
    return null;
  }
}

async function fetchJupiterPrice(mintAddress: string): Promise<any> {
  try {
    const url = `https://price.jup.ag/v6/price?ids=${mintAddress}`;
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json() as any;
    const tokenData = data.data?.[mintAddress];
    
    if (tokenData && tokenData.price > 0) {
      return {
        price: tokenData.price,
        liquidity: tokenData.extraInfo?.quotedPrice?.buyPrice || 0,
        priceChange24h: 0,
        volume24h: 0
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

async function fetchDexScreenerPrice(mintAddress: string): Promise<any> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${mintAddress}`;
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json() as any;
    
    // Get all Solana pairs and find the most active one
    const solanaPairs = data.pairs?.filter((p: any) => p.chainId === 'solana') || [];
    
    if (solanaPairs.length === 0) return null;
    
    // Sort by volume (most active = most accurate price)
    solanaPairs.sort((a: any, b: any) => {
      const volA = parseFloat(a.volume?.h24 || 0);
      const volB = parseFloat(b.volume?.h24 || 0);
      return volB - volA;
    });
    
    const bestPair = solanaPairs[0];
    if (bestPair && bestPair.priceUsd) {
      return {
        price: parseFloat(bestPair.priceUsd),
        liquidity: parseFloat(bestPair.liquidity?.usd || 0),
        priceChange24h: parseFloat(bestPair.priceChange?.h24 || 0),
        volume24h: parseFloat(bestPair.volume?.h24 || 0)
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

async function fetchBirdeyePrice(mintAddress: string): Promise<any> {
  try {
    const url = `https://public-api.birdeye.so/public/price?address=${mintAddress}`;
    const response = await fetch(url, {
      headers: { 
        'Accept': 'application/json',
        'X-API-KEY': 'public'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) return null;
    
    const data = await response.json() as any;
    
    if (data.data?.value > 0) {
      return {
        price: data.data.value,
        liquidity: 0,
        priceChange24h: data.data.priceChange24h || 0,
        volume24h: 0
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

async function fetchTokenSupply(
  connection: Connection,
  mintAddress: string
): Promise<number> {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    const supply = await connection.getTokenSupply(mintPubkey);
    return parseFloat(supply.value.uiAmountString || '0');
  } catch {
    return 0;
  }
}

export function displayTokenStats(stats: TokenStats | null): void {
  if (!stats || stats.price === 0) {
    console.log(chalk.dim('  Stats: Price data not available (token may be too new/low volume)'));
    console.log('');
    return;
  }

  const priceColor = stats.priceChange24h >= 0 ? chalk.green : chalk.red;
  const priceChange = stats.priceChange24h >= 0 ? '+' : '';

  // Format price dynamically
  let priceStr: string;
  if (stats.price < 0.000001) {
    priceStr = stats.price.toExponential(2);
  } else if (stats.price < 0.01) {
    priceStr = stats.price.toFixed(6);
  } else {
    priceStr = stats.price.toFixed(4);
  }

  console.log(
    `  ${chalk.bold('Price:')} ${chalk.yellow('$' + priceStr)}  ` +
    `${chalk.bold('MC:')} ${chalk.cyan(formatLargeNumber(stats.marketCap))}  ` +
    `${chalk.bold('Supply:')} ${chalk.dim(formatSupply(stats.supply))}`
  );
  
  if (stats.liquidity > 0 || stats.volume24h > 0) {
    console.log(
      `  ${chalk.bold('Liq:')} ${chalk.cyan(formatLargeNumber(stats.liquidity))}  ` +
      `${chalk.bold('Vol 24h:')} ${chalk.dim(formatLargeNumber(stats.volume24h))}  ` +
      `${priceColor(priceChange + stats.priceChange24h.toFixed(2) + '%')}`
    );
  }
  
  console.log('');
}

function formatLargeNumber(num: number): string {
  if (num === 0) return '$0';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatSupply(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return `${num.toFixed(0)}`;
}
