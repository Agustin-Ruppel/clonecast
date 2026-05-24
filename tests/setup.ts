// IMPORTANT: enable the internal test-fixture gate BEFORE any test imports
// production modules. Providers branch on `isTestFixtureMode()` (which reads
// this env var) to return deterministic stubs instead of hitting real APIs.
// Production code never sets this — it's vitest-only.
process.env.CLONECAST_TEST_FIXTURES = 'true';

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
