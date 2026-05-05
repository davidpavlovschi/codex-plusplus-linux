#!/usr/bin/env node
import { main } from "../lib/cli.js";

main(process.argv.slice(2)).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`codex-plusplus-linux: ${message}\n`);
  process.exit(1);
});
