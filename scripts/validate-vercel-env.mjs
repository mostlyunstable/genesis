import { pathToFileURL } from 'node:url';

export function validateBackendOrigin(raw) {
  if (!raw?.trim()) {
    throw new Error(
      'Set VITE_API_BASE_URL in Vercel to your hosted FastAPI HTTPS origin before deploying. ' +
      'The FastAPI/Ollama backend currently needs a public server. See docs/VERCEL_DEPLOYMENT.md.'
    );
  }
  let url;
  try { url = new URL(raw.trim()); }
  catch { throw new Error('VITE_API_BASE_URL must be a complete HTTPS origin, such as https://api.your-domain.com.'); }
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const parts = host.split('.').map(Number);
  const privateIpv4 = parts.length === 4 && parts.every(Number.isInteger) && (
    parts[0] === 0 || parts[0] === 10 || parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168)
  );
  const privateIpv6 = host.includes(':') && (
    host === '::' || host === '::1' || host.startsWith('fc') || host.startsWith('fd') ||
    /^fe[89ab][0-9a-f]:/.test(host) || host.startsWith('::ffff:')
  );
  if (url.protocol !== 'https:' || host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') || host.endsWith('.internal') || (!host.includes('.') && !host.includes(':')) ||
      privateIpv4 || privateIpv6 || host.endsWith('.example') ||
      ['example.com', 'example.org', 'example.net'].some(domain => host === domain || host.endsWith('.' + domain)) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error(
      'VITE_API_BASE_URL must be your real public HTTPS backend origin, without credentials, ' +
      'a path, /api/v1, query parameters or fragments. Local and placeholder addresses cannot be deployed.'
    );
  }
  return url.origin;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateBackendOrigin(process.env.VITE_API_BASE_URL);
    console.log('Vercel backend origin configuration is valid.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
