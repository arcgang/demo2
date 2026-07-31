"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const migrate_1 = require("./db/migrate");
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
async function main() {
    await (0, migrate_1.runMigrations)();
    const app = (0, app_1.createApp)();
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
