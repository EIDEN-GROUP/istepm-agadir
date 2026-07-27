# Environment Variables for Production

## Backend
The backend uses a `.env` file. In production, you should set the following environment variables (either via your hosting provider or Docker):

- NODE_ENV=production
- PORT=3000
- DATABASE_URL=postgresql://user:password@host:port/database
- JWT_SECRET=your_super_secret_key_change_this
- JWT_EXPIRES_IN=7d
- REDIS_URL=redis://host:port
- MINIO_ENDPOINT=your_minio_endpoint
- MINIO_PORT=9000
- MINIO_ACCESS_KEY=your_access_key
- MINIO_SECRET_KEY=your_secret_key
- MINIO_BUCKET=your_bucket_name
- CORS_ORIGIN=https://yourdomain.com
- LOG_LEVEL=info

## Frontend
The frontend uses Vite and expects the following environment variables (prefixed with `VITE_`):

- VITE_API_URL=https://api.yourdomain.com (the base URL for the backend API)

These can be set in a `.env` file in the frontend directory or via the build system (e.g., Netlify, Vercel, Docker, etc.)

Example `.env` for frontend:
VITE_API_URL=https://api.example.com