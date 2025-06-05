# Cell Track

📡 **Cell Track** is a web application that maps mobile cell tower data (MCC, MNC, TAC, CID) onto Google Maps to visualize location and estimate movement routes.

## 🔧 Features

- Map cell tower locations using Google Maps
- Visualize location history and estimated movement
- GitHub OAuth login support
- Per-user log storage and session management
- 
## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Lejora/cell-track.git
cd cell-track
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Create a `.env` file with the following variables

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
AUTH_SECRET=your_auth_secret
AUTH_GITHUB_ID=your_github_client_id
AUTH_GITHUB_SECRET=your_github_client_secret
DATABASE_URL=your_postgres_database_url
```

### 4. Start the development server

```bash
npm run dev
# or
bun run dev
```

## 🛠 Tech Stack

| Category        | Technology                                |
|------------------|--------------------------------------------|
| Framework        | Next.js 15, Hono (Edge API routing)        |
| Authentication   | Auth.js (GitHub OAuth)                     |
| Database / ORM   | Neon (PostgreSQL), Drizzle ORM             |
| Styling / UI     | Tailwind CSS, Shadcn UI                    |
| External APIs    | Google Geolocation API, Google Maps API    |

## 🔐 Authentication

Authentication is handled using GitHub OAuth via Auth.js.  
Sessions are stored securely in a PostgreSQL database.

## ✨ Roadmap (planned)

- Preserve selection state when switching tabs
- Route line drawing between cell towers
- GeoJSON export support

## 📄 License

MIT © Lejora
