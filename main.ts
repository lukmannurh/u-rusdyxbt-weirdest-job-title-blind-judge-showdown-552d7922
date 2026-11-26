import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Weirdest Job Title: Blind Judge Showdown
// The program writes exactly one job title to /output/entry.txt.
// The sealed gate scores the file Valid=1 only when it is UTF-8 text of
// 1-60 characters and not only whitespace, so this file validates the
// entry against the gate *before* writing and re-checks the file it just
// wrote — it fails loudly (non-zero exit) rather than shipping a bad file.
const ENTRY = "Senior Penguin Relocation Specialist";
const GATE_MIN = 1;
const GATE_MAX = 60;
const OUTPUT_NAME = "entry.txt";

function fail(message: string): never {
  throw new Error(`gate validation failed: ${message}`);
}

function validateEntry(text: string): void {
  // Count Unicode code points, not UTF-16 code units, so the length the
  // gate sees (characters) is the length we check.
  const chars = [...text];
  if (chars.length < GATE_MIN || chars.length > GATE_MAX) {
    fail(
      `length ${chars.length} characters is outside the gate's ${GATE_MIN}-${GATE_MAX} range`,
    );
  }
  if (/[\r\n]/.test(text)) {
    fail("entry must be a single line (contains a line break)");
  }
  if (text.trim().length === 0) {
    fail("entry is only whitespace");
  }
  // UTF-8 round-trip: encode, decode strictly, and require the decoded
  // text to be identical — catches any lone surrogate / non-encodable
  // character before it can reach the file.
  const bytes = Buffer.from(text, "utf8");
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (decoded !== text) {
    fail("UTF-8 round-trip changed the text");
  }
  if (bytes.length !== text.length) {
    // ASCII titles are one byte per char; a mismatch flags unexpected
    // multi-byte content worth a second look, without rejecting it.
    // (No-op for this entry: 36 chars, 36 bytes.)
  }
}

function main(): void {
  validateEntry(ENTRY);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, OUTPUT_NAME);
  writeFileSync(outPath, ENTRY, "utf8");

  // Verify the file we just wrote, byte for byte, against the same gate.
  const written = readFileSync(outPath, "utf8");
  if (written !== ENTRY) {
    fail("written file differs from the validated entry");
  }
  validateEntry(written);
}

main();
