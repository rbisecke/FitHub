import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Static a11y gate (0.26, 09 §8): the jsx-a11y recommended ruleset. eslint-config-next
// already registers the plugin, so we apply its RULES only (re-registering errors).
const a11yRules = jsxA11y.flatConfigs.recommended.rules;
// A "warn" projection of the same rules, used to relax legacy pre-redesign code.
const a11yWarn = Object.fromEntries(
  Object.keys(a11yRules).map((rule) => [rule, "warn"]),
);

// Pre-redesign directories not yet rebuilt against the new design system. The a11y
// ruleset runs as ERRORS on the redesign surface (everything else) and is relaxed to
// WARNINGS here so CI stays green until each domain is rebuilt. Remove a folder from
// this list when its Effort rebuilds it, so it graduates to full enforcement.
const legacyGlobs = [
  "components/adaptations/**",
  "components/admin/**",
  "components/analytics/**",
  "components/coach/**",
  "components/dashboard/**",
  "components/history/**",
  "components/injuries/**",
  "components/integrations/**",
  "components/layout/**",
  "components/log/**",
  "components/motivation/**",
  "components/notifications/**",
  "components/onboarding/**",
  "components/plans/**",
  "components/profile/**",
  "components/records/**",
  "components/session/**",
  "components/team-sessions/**",
  "components/workout/**",
  "components/ui/**", // upstream shadcn primitives — not ours to re-author here
  // Pre-redesign shared components (the Effort-3 plate calculator supersedes these).
  "components/shared/LoadCalculator.tsx",
  "components/shared/LoadCalculatorSheet.tsx",
  // Route-group parens are extglob syntax, so escape them to match the literal dirs.
  "app/\\(admin\\)/**",
  "app/\\(app\\)/**",
  "app/onboarding/**",
  "app/login/**",
  "app/auth/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Recommended a11y rules as errors across the redesign surface. Mirrored as a
  // blocking CI check via `pnpm lint`.
  { rules: a11yRules },
  // Legacy relaxation — see note above.
  { files: legacyGlobs, rules: a11yWarn },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
