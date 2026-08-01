import { createApp } from './app';
import { runMigrations } from './db/migrate';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

async function main() {
  await runMigrations();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
