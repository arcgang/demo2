import { Pool } from 'pg';

export const db = process.env['DATABASE_URL']
  ? new Pool({ connectionString: process.env['DATABASE_URL'] })
  : new Pool({
      host: process.env['DB_HOST'] ?? 'localhost',
      port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
      database: process.env['DB_NAME'] ?? 'demo2',
      user: process.env['DB_USER'] ?? 'postgres',
      password: process.env['DB_PASSWORD'] ?? 'postgres',
    });
