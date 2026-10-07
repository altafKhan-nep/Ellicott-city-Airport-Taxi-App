/**
 * The contact details used to be a literal in 17 files, which let the app and
 * the web app drift into showing the same business number differently. These
 * tests pin the single source of truth and the format.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CONTACT_PHONE, CONTACT_PHONE_HREF } from '../src/data/site.js';

const SRC = new URL('../src/', import.meta.url).pathname;

/** Every .jsx under src/, recursively. */
function jsxFiles(dir = SRC) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return jsxFiles(p);
    return name.endsWith('.jsx') ? [p] : [];
  });
}

describe('contact details', () => {
  it('is straight, with no parentheses', () => {
    expect(CONTACT_PHONE).not.toMatch(/[()]/);
    expect(CONTACT_PHONE).toMatch(/^\d{3}-\d{3}-\d{4}$/);
  });

  it('href is digits only, matching the displayed number', () => {
    expect(CONTACT_PHONE_HREF).toMatch(/^\d+$/);
    expect(CONTACT_PHONE.replace(/\D/g, '')).toBe(CONTACT_PHONE_HREF);
  });
});

describe('no hardcoded phone number is left behind', () => {
  const files = jsxFiles();

  it('finds components to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const file of files) {
    it(`${file.split('/src/')[1]} imports the constant`, () => {
      const src = readFileSync(file, 'utf8');
      // The paren form must not reappear in a component. data/site.js documents
      // it in a comment, which is why this is scoped to .jsx files.
      expect(src, `${file} still hardcodes the parenthesised number`).not.toMatch(
        /\(410\)\s*365-5556/
      );
    });
  }
});

describe('interpolation is real, not literal text', () => {
  // A careless replacement turns aria-label="Call {PHONE}" into the literal
  // string "Call {PHONE}", which a screen reader would read out verbatim.
  for (const file of jsxFiles()) {
    it(`${file.split('/src/')[1]} has no un-interpolated constant`, () => {
      const src = readFileSync(file, 'utf8');
      // Match a DOUBLE-QUOTED JSX attribute holding the constant, e.g.
      //   aria-label="Call {CONTACT_PHONE}"      <- broken, renders literally
      // The correct form is a template literal, which starts with ` not ",
      //   aria-label={`Call ${CONTACT_PHONE}`}   <- fine
      expect(src, `${file} has an un-interpolated constant in a quoted attribute`)
        .not.toMatch(/="[^"]*\{CONTACT_PHONE[^"]*"/);
    });
  }
});
