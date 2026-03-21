import "dotenv/config";
import dns from "dns";
import { PrismaClient } from ".prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Force ALL dns.lookup calls to IPv4 — affects pg/net module connections
dns.setDefaultResultOrder("ipv4first");
const originalLookup = dns.lookup;
dns.lookup = function (
  hostname: string,
  optionsOrCb: any,
  maybeCallback?: any
) {
  const cb = typeof optionsOrCb === "function" ? optionsOrCb : maybeCallback;
  const opts =
    typeof optionsOrCb === "function"
      ? { family: 4 }
      : typeof optionsOrCb === "number"
        ? { family: 4 }
        : { ...optionsOrCb, family: 4 };
  return (originalLookup as any).call(dns, hostname, opts, cb);
} as typeof dns.lookup;

// Resolve Supabase hostname to IPv4 before creating the pool
// This is the most reliable way to avoid IPv6 on networks where it's broken
const databaseUrl = process.env.DATABASE_URL!;

function resolveToIPv4AndConnect(): pg.Pool {
  const parsedUrl = new URL(databaseUrl);
  const hostname = parsedUrl.hostname;

  // Create pool — connections are lazy, dns.lookup override above ensures IPv4
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Pre-warm: resolve hostname to IPv4 to populate OS DNS cache
  dns.resolve4(hostname, (err, addresses) => {
    if (!err && addresses.length > 0) {
      console.log(`[Database] Resolved ${hostname} → ${addresses[0]} (IPv4)`);
    }
  });

  return pool;
}

const pool = resolveToIPv4AndConnect();
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? (() => {
  console.log("[Database] Initializing Prisma client...");
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
})();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
