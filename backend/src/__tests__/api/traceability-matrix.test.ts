import * as fs from 'fs';
import * as path from 'path';

/**
 * Acceptance tests for docs/traceability-matrix.json
 *
 * Task spec requires a machine-readable artifact at docs/traceability-matrix.json that:
 *   AC-1  File exists and is valid JSON.
 *   AC-2  Root object contains required metadata fields (version, generatedAt, stories).
 *   AC-3  Every story entry has all five required fields:
 *           id, title, acceptanceCriteriaRefs, tmfCapabilities, dependencyNames.
 *   AC-4  Every story has a journeyIds array mapping it to one or more demo journeys.
 *   AC-5  Story identifiers are unique and match the US-NNN pattern.
 *   AC-6  All tmfCapabilities values are from the eight allowed TMF standard references.
 *   AC-7  All dependencyNames values are from the eleven named external boundaries.
 *   AC-8  All four demo journeys (purchase, onboarding, upgrade, activation) are covered
 *           by at least one story each.
 *   AC-9  All eleven external dependency boundaries appear at least once across
 *           the full story set (100% FR coverage proxy).
 *   AC-10 A docs/README.md file exists and documents each schema field.
 */

// ─── paths ───────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '../../../../');
const MATRIX_PATH = path.join(REPO_ROOT, 'docs', 'traceability-matrix.json');
const DOCS_README_PATH = path.join(REPO_ROOT, 'docs', 'README.md');

// ─── constants from the task spec ────────────────────────────────────────────

const VALID_TMF_CAPABILITIES = new Set([
  'TMF620',
  'TMF622',
  'TMF632',
  'TMF637',
  'TMF666',
  'TMF676',
  'TMF663',
  'TMF669',
]);

const VALID_DEPENDENCY_NAMES = new Set([
  'Identity Service',
  'PSP Tokenization',
  'Mobile Money Provider',
  'KYC/RICA Verification',
  'Financing Service',
  'Trade-In Valuation',
  'Activation Status',
  'Catalog/Offer Source',
  'Order Submission',
  'Consent/Audit Sink',
  'Personalization Rule Boundary',
]);

const REQUIRED_JOURNEY_IDS = ['purchase', 'onboarding', 'upgrade', 'activation'] as const;

const STORY_ID_PATTERN = /^US-\d{3,}$/;

// ─── helpers ─────────────────────────────────────────────────────────────────

interface TraceabilityStory {
  id: string;
  title: string;
  acceptanceCriteriaRefs: unknown;
  tmfCapabilities: unknown;
  dependencyNames: unknown;
  journeyIds: unknown;
  [key: string]: unknown;
}

interface TraceabilityMatrix {
  version: unknown;
  generatedAt: unknown;
  stories: unknown;
  [key: string]: unknown;
}

function loadMatrix(): TraceabilityMatrix {
  const raw = fs.readFileSync(MATRIX_PATH, 'utf8');
  return JSON.parse(raw) as TraceabilityMatrix;
}

function getStories(): TraceabilityStory[] {
  const matrix = loadMatrix();
  return matrix.stories as TraceabilityStory[];
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1  File existence and JSON validity
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-1: file existence and JSON validity', () => {
  it('docs/traceability-matrix.json exists on disk', () => {
    expect(fs.existsSync(MATRIX_PATH)).toBe(true);
  });

  it('docs/traceability-matrix.json is parseable as JSON without throwing', () => {
    const raw = fs.readFileSync(MATRIX_PATH, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('parsed root is a plain object, not an array or primitive', () => {
    const matrix = loadMatrix();
    expect(typeof matrix).toBe('object');
    expect(Array.isArray(matrix)).toBe(false);
    expect(matrix).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-2  Root metadata fields
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-2: root metadata fields', () => {
  it('root object has a "version" string field', () => {
    const matrix = loadMatrix();
    expect(typeof matrix.version).toBe('string');
    expect((matrix.version as string).length).toBeGreaterThan(0);
  });

  it('root object has a "generatedAt" ISO-8601 date string', () => {
    const matrix = loadMatrix();
    expect(typeof matrix.generatedAt).toBe('string');
    const d = new Date(matrix.generatedAt as string);
    expect(d.getTime()).not.toBeNaN();
  });

  it('root object has a "stories" array', () => {
    const matrix = loadMatrix();
    expect(Array.isArray(matrix.stories)).toBe(true);
  });

  it('"stories" array is non-empty', () => {
    const stories = getStories();
    expect(stories.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-3  Per-story required fields
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-3: per-story required fields', () => {
  it('every story has a string "id" field', () => {
    for (const story of getStories()) {
      expect(typeof story.id).toBe('string');
      expect((story.id as string).length).toBeGreaterThan(0);
    }
  });

  it('every story has a non-empty string "title" field', () => {
    for (const story of getStories()) {
      expect(typeof story.title).toBe('string');
      expect((story.title as string).length).toBeGreaterThan(0);
    }
  });

  it('every story has an "acceptanceCriteriaRefs" non-empty array', () => {
    for (const story of getStories()) {
      expect(Array.isArray(story.acceptanceCriteriaRefs)).toBe(true);
      expect((story.acceptanceCriteriaRefs as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('every entry in acceptanceCriteriaRefs is a non-empty string', () => {
    for (const story of getStories()) {
      for (const ref of story.acceptanceCriteriaRefs as unknown[]) {
        expect(typeof ref).toBe('string');
        expect((ref as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('every story has a "tmfCapabilities" non-empty array', () => {
    for (const story of getStories()) {
      expect(Array.isArray(story.tmfCapabilities)).toBe(true);
      expect((story.tmfCapabilities as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('every story has a "dependencyNames" non-empty array', () => {
    for (const story of getStories()) {
      expect(Array.isArray(story.dependencyNames)).toBe(true);
      expect((story.dependencyNames as unknown[]).length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-4  Journey mapping field
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-4: journey mapping', () => {
  it('every story has a "journeyIds" non-empty array', () => {
    for (const story of getStories()) {
      expect(Array.isArray(story.journeyIds)).toBe(true);
      expect((story.journeyIds as unknown[]).length).toBeGreaterThan(0);
    }
  });

  it('every journeyIds value is one of the four canonical demo journey identifiers', () => {
    const validJourneys = new Set(REQUIRED_JOURNEY_IDS);
    for (const story of getStories()) {
      for (const jid of story.journeyIds as unknown[]) {
        expect(validJourneys.has(jid as typeof REQUIRED_JOURNEY_IDS[number])).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-5  Story ID uniqueness and format
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-5: story identifier format and uniqueness', () => {
  it('every story id matches the US-NNN pattern', () => {
    for (const story of getStories()) {
      expect(STORY_ID_PATTERN.test(story.id)).toBe(true);
    }
  });

  it('story ids are unique across all entries', () => {
    const ids = getStories().map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-6  TMF capability key validity
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-6: TMF capability key validity', () => {
  it('all tmfCapabilities values across all stories are from the allowed set', () => {
    for (const story of getStories()) {
      for (const cap of story.tmfCapabilities as unknown[]) {
        expect(VALID_TMF_CAPABILITIES.has(cap as string)).toBe(true);
      }
    }
  });

  it('TMF620 (Product Catalog Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF620'),
    );
    expect(found).toBe(true);
  });

  it('TMF622 (Product Ordering) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF622'),
    );
    expect(found).toBe(true);
  });

  it('TMF632 (Party Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF632'),
    );
    expect(found).toBe(true);
  });

  it('TMF637 (Product Inventory Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF637'),
    );
    expect(found).toBe(true);
  });

  it('TMF666 (Account Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF666'),
    );
    expect(found).toBe(true);
  });

  it('TMF676 (Payment Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF676'),
    );
    expect(found).toBe(true);
  });

  it('TMF663 (Shopping Cart Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF663'),
    );
    expect(found).toBe(true);
  });

  it('TMF669 (Party Role Management) appears in at least one story', () => {
    const found = getStories().some((s) =>
      (s.tmfCapabilities as string[]).includes('TMF669'),
    );
    expect(found).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-7  External dependency name validity
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-7: dependency name validity', () => {
  it('all dependencyNames values across all stories are from the allowed set', () => {
    for (const story of getStories()) {
      for (const dep of story.dependencyNames as unknown[]) {
        expect(VALID_DEPENDENCY_NAMES.has(dep as string)).toBe(true);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-8  Four demo journey coverage
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-8: 100% demo journey coverage', () => {
  it('"purchase" journey is covered by at least one story', () => {
    const covered = getStories().some((s) =>
      (s.journeyIds as string[]).includes('purchase'),
    );
    expect(covered).toBe(true);
  });

  it('"onboarding" journey is covered by at least one story', () => {
    const covered = getStories().some((s) =>
      (s.journeyIds as string[]).includes('onboarding'),
    );
    expect(covered).toBe(true);
  });

  it('"upgrade" journey is covered by at least one story', () => {
    const covered = getStories().some((s) =>
      (s.journeyIds as string[]).includes('upgrade'),
    );
    expect(covered).toBe(true);
  });

  it('"activation" journey is covered by at least one story', () => {
    const covered = getStories().some((s) =>
      (s.journeyIds as string[]).includes('activation'),
    );
    expect(covered).toBe(true);
  });

  it('at least three stories cover the purchase journey (catalog, payment, order)', () => {
    const count = getStories().filter((s) =>
      (s.journeyIds as string[]).includes('purchase'),
    ).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('at least three stories cover the onboarding journey (identity, porting, RICA)', () => {
    const count = getStories().filter((s) =>
      (s.journeyIds as string[]).includes('onboarding'),
    ).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('at least three stories cover the upgrade journey (eligibility, financing, trade-in)', () => {
    const count = getStories().filter((s) =>
      (s.journeyIds as string[]).includes('upgrade'),
    ).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('at least one story covers the activation journey (eSIM issuance)', () => {
    const count = getStories().filter((s) =>
      (s.journeyIds as string[]).includes('activation'),
    ).length;
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-9  100% external dependency boundary coverage (FR proxy)
// ─────────────────────────────────────────────────────────────────────────────

describe('traceability-matrix.json — AC-9: all eleven dependency boundaries appear', () => {
  function dependencyAppearsInAnyStory(dep: string): boolean {
    return getStories().some((s) => (s.dependencyNames as string[]).includes(dep));
  }

  it('"Identity Service" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Identity Service')).toBe(true);
  });

  it('"PSP Tokenization" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('PSP Tokenization')).toBe(true);
  });

  it('"Mobile Money Provider" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Mobile Money Provider')).toBe(true);
  });

  it('"KYC/RICA Verification" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('KYC/RICA Verification')).toBe(true);
  });

  it('"Financing Service" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Financing Service')).toBe(true);
  });

  it('"Trade-In Valuation" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Trade-In Valuation')).toBe(true);
  });

  it('"Activation Status" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Activation Status')).toBe(true);
  });

  it('"Catalog/Offer Source" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Catalog/Offer Source')).toBe(true);
  });

  it('"Order Submission" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Order Submission')).toBe(true);
  });

  it('"Consent/Audit Sink" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Consent/Audit Sink')).toBe(true);
  });

  it('"Personalization Rule Boundary" appears in at least one story', () => {
    expect(dependencyAppearsInAnyStory('Personalization Rule Boundary')).toBe(true);
  });

  it('at least twelve stories exist to cover all four journeys and eleven dependencies', () => {
    expect(getStories().length).toBeGreaterThanOrEqual(12);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AC-10  README schema documentation
// ─────────────────────────────────────────────────────────────────────────────

describe('docs/README.md — AC-10: schema field documentation', () => {
  it('docs/README.md exists', () => {
    expect(fs.existsSync(DOCS_README_PATH)).toBe(true);
  });

  it('docs/README.md is non-empty', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content.trim().length).toBeGreaterThan(0);
  });

  it('README documents the "id" schema field', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/\bid\b/);
  });

  it('README documents the "title" schema field', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/\btitle\b/);
  });

  it('README documents the "acceptanceCriteriaRefs" schema field', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/acceptanceCriteriaRefs/);
  });

  it('README documents the "tmfCapabilities" schema field', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/tmfCapabilities/);
  });

  it('README documents the "dependencyNames" schema field', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/dependencyNames/);
  });

  it('README documents the "journeyIds" schema field', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/journeyIds/);
  });

  it('README references the TMF standard numbers', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/TMF6[0-9]{2}/);
  });

  it('README references the traceability-matrix.json file', () => {
    const content = fs.readFileSync(DOCS_README_PATH, 'utf8');
    expect(content).toMatch(/traceability-matrix/i);
  });
});
