export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  fallbackValue: T | null = null
): Promise<T | null> {
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
    return await res.json();
  } catch (err) {
    console.warn(`[API] Fetch error for ${url}:`, err);
    return fallbackValue;
  }
}
