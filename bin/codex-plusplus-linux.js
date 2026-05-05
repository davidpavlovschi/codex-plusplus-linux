#!/usr/bin/env node
import { main } from "../lib/cli.js";

const invoked = process.argv[1]?.split("/").at(-1);
const args = invoked === "codex-here" ? ["open", process.cwd(), ...process.argv.slice(2)] : process.argv.slice(2);

main(args).catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`codex-plusplus-linux: ${message}\n`);
  process.exit(1);
});
