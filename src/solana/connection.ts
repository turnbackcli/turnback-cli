import { Connection, ConnectionConfig } from '@solana/web3.js';
import { config } from '../config';
import { withRetry } from '../utils/retry';
import { logger } from '../logs/logger';

const CONNECTION_CONFIG: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000
};

let currentRpcUrl = config.rpcUrl;
let connection: Connection | null = null;

export function getConnection(customRpcUrl?: string): Connection {
  const rpcUrl = customRpcUrl || currentRpcUrl;
  
  if (!connection || currentRpcUrl !== rpcUrl) {
    currentRpcUrl = rpcUrl;
    connection = new Connection(rpcUrl, CONNECTION_CONFIG);
    logger.debug(`Connected to RPC: ${maskRpcUrl(rpcUrl)}`);
  }
  
  return connection;
}

export function getCurrentRpcUrl(): string {
  return currentRpcUrl;
}

export function setRpcUrl(rpcUrl: string, silent: boolean = false): void {
  currentRpcUrl = rpcUrl;
  connection = null; // Force reconnection
  if (!silent) {
    logger.info(`RPC switched to: ${maskRpcUrl(rpcUrl)}`);
  }
}

export async function testConnection(rpcUrl?: string): Promise<boolean> {
  try {
    const conn = getConnection(rpcUrl);
    const version = await withRetry(() => conn.getVersion(), {
      maxAttempts: 2,
      delayMs: 500
    });
    logger.debug(`RPC version: ${JSON.stringify(version)}`);
    return true;
  } catch (error: any) {
    logger.error(`RPC connection test failed: ${error.message}`);
    return false;
  }
}

export async function getConnectionWithFallback(): Promise<Connection> {
  const conn = getConnection();
  
  try {
    await withRetry(() => conn.getSlot(), {
      maxAttempts: 2,
      delayMs: 500
    });
    return conn;
  } catch (error) {
    logger.warn('Primary RPC failed, connection may be unstable');
    throw error;
  }
}

function maskRpcUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname.substring(0, 20)}${parsed.pathname.length > 20 ? '...' : ''}`;
  } catch {
    return url.substring(0, 50) + '...';
  }
}
