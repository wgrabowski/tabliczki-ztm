# Vercel Deployment

## Overview

The application is deployed on Vercel platform using the `@astrojs/vercel` adapter. The configuration has been optimized for SSR (Server-Side Rendering) with dynamic caching.

## Vercel Configuration

### `vercel.json` File

The project includes a `vercel.json` configuration that defines caching strategy for different resource types:

#### Caching Strategy

| Path                            | Cache-Control                         | Purpose                                 |
| ------------------------------- | ------------------------------------- | --------------------------------------- |
| `/(.*)`<br/>(pages)             | `public, max-age=0, must-revalidate`  | Always fresh data for dynamic SSR pages |
| `/api/(.*)`<br/>(API endpoints) | `no-cache, no-store, must-revalidate` | No caching for real-time data           |
| `/_astro/(.*)`<br/>(assets)     | `public, max-age=31536000, immutable` | Long-term caching for hashed files      |
| `/fonts/(.*)`<br/>(fonts)       | `public, max-age=31536000, immutable` | Long-term caching for static fonts      |

### Astro Adapter Configuration

The `astro.config.mjs` file configures the Vercel adapter:

```javascript
import vercel from "@astrojs/vercel";

export default defineConfig({
  output: "server", // SSR mode
  adapter: vercel({
    webAnalytics: { enabled: true },
    isr: false, // Disable Incremental Static Regeneration
    edgeMiddleware: false,
  }),
  build: {
    inlineStylesheets: "auto",
  },
});
```

#### Adapter Parameters

- **`output: "server"`** - SSR mode for all pages
- **`webAnalytics: { enabled: true }`** - Vercel Web Analytics for performance monitoring
- **`isr: false`** - ISR disabled; application uses full SSR
- **`edgeMiddleware: false`** - Standard serverless functions (not edge)

## Deployment Verification

### Check Cache Headers

Use `curl` to verify HTTP headers:

```bash
# Home page
curl -I https://your-app.vercel.app/
# Expected: Cache-Control: public, max-age=0, must-revalidate

# API endpoint
curl -I https://your-app.vercel.app/api/ztm/stops
# Expected: Cache-Control: no-cache, no-store, must-revalidate

# Static asset
curl -I https://your-app.vercel.app/_astro/index.abc123.css
# Expected: Cache-Control: public, max-age=31536000, immutable
```

### Hard Refresh After Deployment

After deploying a new version, use hard refresh to bypass browser cache:

- **Chrome/Edge**: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows/Linux)
- **Firefox**: `Cmd+Shift+R` (Mac) / `Ctrl+F5` (Windows/Linux)
- **Safari**: `Cmd+Option+R`

## SSR Best Practices

### Time-Dependent Components (Svelte 5 Runes)

For components displaying current time or data dependent on render moment:

```svelte
<script>
  import { onMount } from "svelte";

  let currentTime = $state<Date | null>(null);

  // Initialize only on client side
  onMount(() => {
    currentTime = new Date();

    const interval = setInterval(() => {
      currentTime = new Date();
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  });

  const display = $derived(
    currentTime ? formatTime(currentTime) : "--:--"
  );
</script>

{display}
```

**Key principles:**

- Use `onMount` for time-dependent values
- Initialize with placeholder value (`null`, `"--:--"`)
- Update value only on client side
- Use `$state` and `$derived` instead of `export let` and `$:`

### Caching Policy

| Resource Type    | Strategy                      | Rationale                               |
| ---------------- | ----------------------------- | --------------------------------------- |
| SSR pages        | `max-age=0, must-revalidate`  | Dynamic data, always up-to-date         |
| API endpoints    | `no-cache, no-store`          | Real-time data, no caching              |
| Hashed assets    | `max-age=31536000, immutable` | Content-addressed, safe long-term cache |
| Static resources | `max-age=31536000, immutable` | Immutable files (fonts, icons)          |

## Troubleshooting

### Old Code After Deployment

If you still see the previous version after deployment:

1. Perform hard refresh (`Cmd/Ctrl + Shift + R`)
2. Check deployment status in Vercel Dashboard
3. Verify in incognito mode
4. Clear Vercel cache (Settings → Data Cache → Purge)

### Hydration Errors

Messages like "Hydration failed" in browser console:

- Check if components with `new Date()` use `onMount`
- Ensure values generated on server and client are identical
- Use placeholder values for client-only data
- Verify compliance with Svelte 5 Runes (`$state`, `$derived`, `$props`)

### API Endpoint Caching

If API returns stale data:

1. Verify HTTP headers for the endpoint (`curl -I`)
2. Ensure `vercel.json` is in the project root directory
3. Review logs in Vercel Dashboard → Functions
4. Clear Edge Cache in Vercel Dashboard

## Monitoring and Analytics

### Vercel Web Analytics

The project has Vercel Web Analytics enabled (`webAnalytics: { enabled: true }`).

**Available metrics:**

- **Core Web Vitals**: LCP, FID, CLS
- **Real User Monitoring**: actual loading times
- **Visitor Analytics**: geography, devices, browsers

**Access:** Vercel Dashboard → Project → Analytics

### Function Logs

Real-time serverless functions monitoring:

1. Vercel Dashboard → Project → Functions
2. Select function (e.g., `/api/ztm/stops`)
3. View logs, execution times, errors

**Useful for:**

- Debugging API endpoints
- Identifying slow queries
- Monitoring 500 errors

### Deployment Logs

Build and deployment process logs:

1. Vercel Dashboard → Project → Deployments
2. Select deployment
3. "Build Logs" and "Runtime Logs" tabs

## Environment Variables

Environment variables configured in Vercel Dashboard → Settings → Environment Variables:

| Variable                    | Required | Description                    |
| --------------------------- | -------- | ------------------------------ |
| `PUBLIC_SUPABASE_URL`       | ✅       | Supabase instance URL          |
| `PUBLIC_SUPABASE_ANON_KEY`  | ✅       | Supabase public key            |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅       | Service role key (server-side) |

**Note:** Variables with `PUBLIC_` prefix are available on the client side.

## Useful Commands

```bash
# Local testing with Vercel CLI
npx vercel dev

# Local build (simulates Vercel build)
npm run build

# Preview deployment (branch preview)
git push origin feature-branch

# Production deployment
git push origin master
```

## Documentation

- [Vercel Documentation](https://vercel.com/docs)
- [Astro Vercel Adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/)
- [Vercel Cache-Control Headers](https://vercel.com/docs/edge-network/headers)
- [Svelte 5 Documentation](https://svelte.dev/docs/svelte/overview)
- [Svelte SSR](https://svelte.dev/docs/svelte/svelte-server)
