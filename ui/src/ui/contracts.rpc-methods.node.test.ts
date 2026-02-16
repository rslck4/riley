import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const UI_SRC_DIR = path.resolve(import.meta.dirname, "..");
const FIXTURE_PATH = path.resolve(import.meta.dirname, "../../testdata/rpc-methods.v1.txt");

function walkFiles(dir: string, out: string[]) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".ts")) {
      out.push(fullPath);
    }
  }
}

function extractRpcMethodsFromSource(): string[] {
  const files: string[] = [];
  walkFiles(UI_SRC_DIR, files);

  const methods = new Set<string>();
  const requestRegex = /\brequest(?:<[^>]*>)?\s*\(\s*["'`]([^"'`]+)["'`]/g;

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    for (const match of content.matchAll(requestRegex)) {
      const method = match[1]?.trim();
      if (!method) {
        continue;
      }
      if (/^[a-z][a-z0-9.-]*(?:\.[a-z0-9.-]+)*$/.test(method)) {
        methods.add(method);
      }
    }
  }

  return [...methods].toSorted();
}

function loadFixtureMethods(): string[] {
  const raw = fs.readFileSync(FIXTURE_PATH, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .toSorted();
}

describe("RPC method contract fixture", () => {
  it("matches pinned rpc-methods.v1 snapshot", () => {
    const current = extractRpcMethodsFromSource();
    const expected = loadFixtureMethods();

    expect(current).toEqual(expected);
  });

  it("uses versioned fixture naming", () => {
    expect(path.basename(FIXTURE_PATH)).toMatch(/^rpc-methods\.v\d+\.txt$/);
  });
});
