const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds TTL

export function clearApiCache() {
  apiCache.clear();
}

export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  fallbackValue: T | null = null,
  bypassCache: boolean = false
): Promise<T | null> {
  const method = (options?.method || 'GET').toUpperCase();

  // If write operation (POST, PUT, DELETE), immediately clear client cache
  if (method !== 'GET') {
    clearApiCache();
  } else if (!bypassCache && apiCache.has(url)) {
    const cached = apiCache.get(url)!;
    const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
    if (isFresh) {
      // Trigger background revalidation asynchronously without blocking UI
      fetch(url, options)
        .then(res => res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null)
        .then(data => {
          if (data) {
            apiCache.set(url, { data, timestamp: Date.now() });
          }
        })
        .catch(() => {});

      return cached.data as T;
    }
  }

  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`[API] Non-OK HTTP status ${res.status} for ${url}`);
      return fallbackValue;
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn(`[API] Non-JSON content-type '${contentType}' for ${url}`);
      return fallbackValue;
    }
    const data = await res.json();
    if (method === 'GET' && data) {
      apiCache.set(url, { data, timestamp: Date.now() });
    }
    return data;
  } catch (err) {
    console.warn(`[API] Fetch error for ${url}:`, err);
    if (method === 'GET' && apiCache.has(url)) {
      return apiCache.get(url)!.data as T;
    }
    return fallbackValue;
  }
}

