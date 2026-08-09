#!/data/data/com.termux/files/usr/bin/node

import { execFileSync, spawnSync } from "node:child_process";
import { accessSync, constants, linkSync, mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(2);
}

function run(command: string, args: string[] = []): string {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

const uid = process.getuid?.();
if (uid === undefined || uid < 10_000) {
  fail("run this from ordinary Termux, not PRoot");
}

const prefix = process.env.PREFIX;
if (!prefix) fail("PREFIX is unset; run this from ordinary Termux");

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const binary = join(repo, "target/release/omnigraph");
try {
  accessSync(binary, constants.X_OK);
} catch {
  fail(`missing ${binary}; build omnigraph-cli first`);
}

const uname = run("uname", ["-a"]);
if (/proot/i.test(uname)) fail("run this from ordinary Termux, not PRoot");

const rustHost = run("rustc", ["-vV"])
  .split("\n")
  .find((line) => line.startsWith("host: "))
  ?.slice(6);
if (!rustHost?.endsWith("linux-android")) {
  fail(`Rust host is ${rustHost ?? "unknown"}, expected *-linux-android`);
}

const checkDir = mkdtempSync(join(prefix, "tmp/omnigraph-native."));
const store = join(checkDir, "repro.omni");
const log = join(prefix, "tmp/omnigraph-native-direct.log");
const fixtures = join(repo, "crates/omnigraph/tests/fixtures");
const schema = join(fixtures, "test.pg");
const data = join(fixtures, "test.jsonl");
const query = join(fixtures, "test.gq");

const linkSource = join(checkDir, "hardlink-source");
writeFileSync(linkSource, "");
let hardLink = "ok";
try {
  linkSync(linkSource, join(checkDir, "hardlink-target"));
} catch (error) {
  hardLink = `failed: ${error instanceof Error ? error.message : String(error)}`;
}

const header = [
  `uid=${uid}`,
  `uname=${uname}`,
  `rust_host=${rustHost}`,
  run(binary, ["--version"]),
  `hard_link=${hardLink}`,
  `store=${store}`,
].join("\n");
console.log(header);

const steps = [
  ["init", ["init", "--schema", schema, store]],
  ["load", ["load", "--data", data, "--mode", "overwrite", store]],
  ["query", ["query", "friends_of", "--query", query, "--params", '{"name":"Alice"}', "--format", "json", "--store", store]],
] as const;
const transcript = [header];
let status = 0;
for (const [name, args] of steps) {
  const result = spawnSync(binary, args, {
    encoding: "utf8",
    env: { ...process.env, RUST_BACKTRACE: "1" },
  });
  if (result.error) fail(result.error.message);
  status = result.status ?? 1;
  transcript.push(`step=${name}`, result.stdout, result.stderr, `step_status=${status}`);
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (status !== 0) break;
  if (name === "query") {
    const payload = JSON.parse(result.stdout) as { row_count?: number };
    if (payload.row_count !== 2) {
      status = 2;
      transcript.push(`unexpected_row_count=${String(payload.row_count)}`);
    }
  }
}

writeFileSync(log, `${transcript.join("\n")}\nexit_status=${status}\n`);
console.log(`exit_status=${status}`);
console.log(`log=${log}`);
process.exit(status);
