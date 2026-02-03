# Environment Configuration for SmartPark

## Local Development

1. In `.env.local`:
```
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

2. In Supabase Dashboard (Authentication → URL Configuration):
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs**: Add `http://localhost:3000/**`

## Production (Vercel)

1. In Vercel Environment Variables:
```
NEXT_PUBLIC_SITE_URL="https://your-production-domain.com"
```

2. In Supabase Dashboard (Authentication → URL Configuration):
   - **Site URL**: `https://your-production-domain.com`
   - **Redirect URLs**: Add `https://your-production-domain.com/**`

## Notes
- Supabase only allows ONE Site URL, so for dev/prod switching you need to:
  - Use `http://localhost:3000` during local development
  - Change to production URL when deploying
  - OR keep production URL as Site URL and add `http://localhost:3000/**` to Redirect URLs
