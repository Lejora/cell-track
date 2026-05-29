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
| Framework | Next.js , React |
| API | Hono running on Next.js route handlers |
| Authentication | Auth.js / NextAuth with GitHub OAuth |
| Database | Neon PostgreSQL |
| ORM | Drizzle ORM |
| UI | Tailwind CSS, shadcn/ui, lucide-react, tanstack-table |
| Maps and geolocation | Google Maps JavaScript API, Google Geolocation API |

<p align="center">
  <img src="https://github.com/user-attachments/assets/3e078f61-4299-4df8-857e-b197b60eb6ce" width="10%" />
  <img src="https://github.com/user-attachments/assets/a303907f-3906-4e0c-b419-840bc748ce5e" width="10%" />
  <img src="https://github.com/user-attachments/assets/fabbbdb7-667b-4d14-beb2-d6c53661e8cb" width="10%"/>
  <img src="https://github.com/user-attachments/assets/974dfa44-5aa7-4eab-be48-7b606dd85f15" width="10%"/>
  <img src="https://github.com/user-attachments/assets/494c7711-3f42-4915-bded-6b2a47ca06fa" width="10%"/>
  <img src="https://github.com/user-attachments/assets/4accfd04-e984-4db8-a4c8-11a4608c2f65" width="10%"/>
  <img src="https://github.com/user-attachments/assets/3b92d68a-01be-4c2d-8a54-0aee01ee2f11" width="10%"/>
  <img src="https://github.com/user-attachments/assets/b72439a6-97ce-43e0-8c39-2e36e5d07a95" width="10%"/>
  <img src="https://github.com/user-attachments/assets/b5244af6-b77a-4cac-adb9-3726d1abe2c4" width="10%"/>
</p>


## Repository Notes

The source schema is included in `src/db/schema.ts` so reviewers can understand the data model. Migration files are not included because they can expose environment-specific database history from the private development repository.

The app reads configuration from environment variables and does not include real credentials.

## Getting Started

```bash
git clone https://github.com/Lejora/cell-track.git
cd cell-track
bun install
bun run dev
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
bun run db:generate
bun run db:migrate
```

## License

MIT
