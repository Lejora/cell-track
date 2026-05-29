# Cell Track

Cell Track is a Next.js web application for importing mobile cell log data, mapping estimated locations, and managing per-user projects. It is a public portfolio version of the application, with credentials, local analysis data, and database migration history intentionally omitted.

## Features

- Import and preview cell log files before saving
- Manage multiple tracking projects per authenticated user
- Search, sort, paginate, bulk edit, and bulk delete cell logs
- Filter logs by date and time range
- Visualize cell-derived locations on Google Maps
- Configure map defaults and accuracy circle display settings
- Export account-owned data
- GitHub OAuth login with database-backed sessions

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js App Router, React |
| API | Hono running on Next.js route handlers |
| Authentication | Auth.js / NextAuth with GitHub OAuth |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| UI | Tailwind CSS, shadcn/ui-style Radix primitives, lucide-react |
| Maps and geolocation | Google Maps JavaScript API, Google Geolocation API |
| Data import | Custom parser and preview flow for cell log files |

## Repository Notes

The source schema is included in `src/db/schema.ts` so reviewers can understand the data model. Migration files are not included because they can expose environment-specific database history from the private development repository.

The app reads configuration from environment variables and does not include real credentials.

## Getting Started

```bash
git clone https://github.com/Lejora/cell-track.git
cd cell-track
npm install
npm run dev
```

Create `.env.local` with the following values:

```env
DATABASE_URL=your_neon_postgres_url
AUTH_SECRET=your_auth_secret
AUTH_GITHUB_ID=your_github_oauth_client_id
AUTH_GITHUB_SECRET=your_github_oauth_client_secret
GOOGLE_MAPS_API_KEY=your_server_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_browser_google_maps_api_key
```

For database schema management:

```bash
npm run db:generate
npm run db:migrate
```

## License

MIT
