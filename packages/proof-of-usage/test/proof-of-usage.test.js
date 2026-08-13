import assert from "node:assert/strict";
import test from "node:test";

import {
  alreadyRecorded,
  buildRow,
  insertRow,
  namesEndpoint,
  parseRepo,
  provenanceHash,
  readRecord,
} from "../src/index.js";

// node --test test/proof-of-usage.test.js

const example = {
  system: "ExampleModel v2",
  operator: "AI Corp",
  date: "2026-08-12T14:30:00Z",
  repo: "https://github.com/acme/widget",
  contact: "contact@aicorp.com",
};

test("the handshake is the one in the licence", () => {
  assert.equal(
    provenanceHash(example.system, example.operator, example.date, example.repo),
    "471e3dc7467c3c9f83be8199e5ed76b2635a0aefc86b2e3679ffc836fc9c741c",
  );
});

test("the repository URL is canonicalised before it is hashed", () => {
  assert.deepEqual(parseRepo("https://github.com/acme/widget.git/")?.url, example.repo);
  assert.equal(parseRepo("git@github.com:acme/widget.git"), null);
  assert.equal(parseRepo("https://gitlab.com/acme/widget"), null);
});

test("a record is accepted, with the defaults the table expects", () => {
  const { record, hash, error } = readRecord({ ...example });
  assert.equal(error, undefined);
  assert.equal(hash, "471e3dc7467c3c9f83be8199e5ed76b2635a0aefc86b2e3679ffc836fc9c741c");
  assert.equal(record?.what, "whole repository");
  assert.equal(record?.purpose, "training");
});

test("a pipe in a field would forge a second row, so it is not a field", () => {
  const { error } = readRecord({ ...example, system: "Model | Other Co | 2026-01-01T00:00:00Z" });
  assert.match(String(error), /system is required/);
});

test("a hash that disagrees with its own fields is refused", () => {
  const { error } = readRecord({ ...example, hash: "0".repeat(64) });
  assert.match(String(error), /does not match/);
});

test("a date that is not ISO 8601 is refused", () => {
  assert.match(String(readRecord({ ...example, date: "yesterday" }).error), /ISO 8601/);
});

test("the row lands in the table, not at the end of the file", () => {
  const file = [
    "# Proof of Usage Record",
    "",
    "| System | Operator | Date and Time (UTC) | What | Purpose | Contact | Provenance Hash |",
    "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
    "| ExampleModel v2 | AI Corp | 2026-08-12T14:30:00Z | whole repository | training | contact@aicorp.com | `abc` |",
    "",
    "## Field reference",
    "",
    "| Field | Meaning |",
  ].join("\n");

  const { record, hash } = readRecord({ ...example, system: "GPT-5.6 Sol", operator: "OpenAI" });
  const row = buildRow(record, hash);
  const updated = insertRow(file, row).split("\n");

  assert.equal(updated[5], row);
  assert.equal(updated.at(-1), "| Field | Meaning |");
  assert.ok(alreadyRecorded(updated.join("\n"), hash));
  assert.equal(insertRow("no table here", row), null);
});

test("an endpoint acts only for a licence that names it", () => {
  const licence = "PROVENANCE ENDPOINT: https://generals.wasm.ltd/api/proof-of-usage";
  assert.ok(namesEndpoint(licence, "https://generals.wasm.ltd/api/proof-of-usage"));
  assert.ok(namesEndpoint(licence, "http://generals.wasm.ltd/api/proof-of-usage/"));
  assert.equal(namesEndpoint(licence, "https://wasm.ltd/api/proof-of-usage"), false);
});
