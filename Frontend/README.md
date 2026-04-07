# Frontend

This folder contains the React + TypeScript frontend for Schedora.

## Development

```bash
npm install
npm run dev
```

Default dev server:

- `http://localhost:3000`

If the backend is running on the standard local port, the default API base URL already points to:

- `http://localhost:5097/api`

To override it:

```bash
VITE_API_BASE_URL=http://localhost:5097/api npm run dev
```

## Build

```bash
npm run build
```

The build output goes to:

- `../Backend/wwwroot`

That allows the ASP.NET backend to serve the frontend as a single app.
