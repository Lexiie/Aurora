const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var ${key}`);
  }
  return value;
};

const toBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return ["1", "true", "yes"].includes(value.toLowerCase());
};

const toNumber = (value: string | undefined, fallback?: number): number | undefined => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const SANCTUM_BASE_URL = getEnv("SANCTUM_BASE_URL", "https://gateway.sanctum.so");
export const SANCTUM_API_KEY = process.env.SANCTUM_API_KEY ?? "";
export const SOLANA_RPC_URL = getEnv("SOLANA_RPC_URL", "https://api.devnet.solana.com");
export const DEFAULT_JITO_TIP_LAMPORTS = toNumber(process.env.DEFAULT_JITO_TIP_LAMPORTS, 50_000) ?? 50_000;
export const MOCK_GATEWAY = toBoolean(process.env.MOCK_GATEWAY, true);
export const AURORA_CLUSTER = getEnv("AURORA_CLUSTER", "devnet");

export const ENV_CONFIG = {
  SANCTUM_BASE_URL,
  SANCTUM_API_KEY,
  SOLANA_RPC_URL,
  DEFAULT_JITO_TIP_LAMPORTS,
  MOCK_GATEWAY,
  AURORA_CLUSTER
};
