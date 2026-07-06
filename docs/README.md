# FitHub — contributor documentation

This directory is for contributors: people adding features, fixing bugs, or auditing the codebase.

For user-facing documentation (how to use the app, how to run it locally), start with the [root README](../README.md).

---

## Documents

| File                               | Audience                                  | What it covers                                                                                                  |
| ---------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | All contributors                          | System map: monorepo layout, data flow, module boundaries, where things live                                    |
| [science.md](science.md)           | Contributors touching load/readiness math | Sports science methodology: sRPE, ACWR/EWMA, Hooper Index, ATL/CTL/TSB — with citations and constants rationale |
| [ai.md](ai.md)                     | Contributors touching the AI layer        | LLM architecture: deterministic vs. generated, RAG pipeline, safety design, prompt strategy, evaluation         |

---

## Where to start

**New to the codebase?** Read [`architecture.md`](architecture.md) first. It gives you a map of every module and answers "where does X happen?" before you open a file.

**Touching load calculations or readiness?** Read [`science.md`](science.md) before editing any formula. The constants and model choices are deliberate scientific commitments, not tunable parameters.

**Working on the AI layer?** Read [`ai.md`](ai.md) for the full picture: what the LLM is and isn't allowed to decide, how the RAG pipeline is wired, and the safety classifier methodology.

---

## Contributing

Engineering standards (commit conventions, PR scope, testing requirements) are in [`CONSTITUTION.md`](../CONSTITUTION.md) at the repo root.
