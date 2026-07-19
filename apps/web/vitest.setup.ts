// Vitest global setup (0.27). Registers the vitest-axe matchers (`toHaveNoViolations`)
// so component-level a11y specs can assert against axe-core. Component a11y specs run
// under jsdom (via a per-file `// @vitest-environment jsdom` comment) because
// vitest-axe is known-incompatible with happy-dom (09 §8).
import { expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";

expect.extend(axeMatchers);
