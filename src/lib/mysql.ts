// ====== VERCEL → MySQL via HTTP Proxy ======
// Instead of connecting directly to MySQL (blocked by firewall),
// we call a PHP proxy hosted on the same server as MySQL.
// The proxy connects via localhost (no firewall issues).

const PROXY_URL = process.env.MYSQL_PROXY_URL || 'https://mybss.cloud/api/db-proxy.php';
const PROXY_KEY = process.env.MYSQL_PROXY_KEY || 'BSS_PROXY_2025_SECRET_KEY_CHANGE_THIS';

interface ProxyResponse {
  ok?: boolean;
  rows?: Record<string, unknown>[];
  count?: number;
  affected?: number;
  error?: string;
  message?: string;
}

// Execute query via HTTP proxy with 1 retry
export async function queryMySQL<T = Record<string, unknown>>(
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const doFetch = async (): Promise<T[]> => {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PROXY_KEY,
      },
      body: JSON.stringify({ query, params: params || [] }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    const data: ProxyResponse = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.message || data.error || `Proxy error ${res.status}`);
    }

    return (data.rows || []) as T[];
  };

  try {
    return await doFetch();
  } catch (error: unknown) {
    const msg = (error as { message?: string })?.message || '';
    const isTimeout = msg.includes('timeout') || msg.includes('abort') ||
                      msg.includes('ETIMEDOUT') || msg.includes('ECONNRESET') ||
                      msg.includes('fetch failed');

    if (isTimeout) {
      console.warn(`[MySQL Proxy] Retry after: ${msg.slice(0, 60)}`);
      await new Promise(r => setTimeout(r, 1000));
      return await doFetch();
    }
    throw error;
  }
}

// For multiple queries on same "connection" — just runs sequentially via proxy
export async function withConnection<T>(
  fn: (conn: { execute: (q: string, p?: unknown[]) => Promise<[unknown[], unknown]> }) => Promise<T>
): Promise<T> {
  // Create a fake connection object that uses the proxy
  const fakeConn = {
    execute: async (q: string, p?: unknown[]): Promise<[unknown[], unknown]> => {
      const rows = await queryMySQL(q, p);
      return [rows, []];
    }
  };
  return await fn(fakeConn);
}
