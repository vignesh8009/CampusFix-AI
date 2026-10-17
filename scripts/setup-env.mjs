// Creates .env from .env.example on first run so Windows users do not have to copy it by hand.
import { copyFileSync, existsSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env already exists - leaving it unchanged.");
} else if (existsSync(".env.example")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example (demo mode, no API key).");
} else {
  console.error("Missing .env.example. Create a .env file with DATABASE_URL=\"file:./dev.db\".");
  process.exit(1);
}
