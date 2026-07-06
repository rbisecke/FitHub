# AI Architecture

FitHub uses Claude (Anthropic) for natural language understanding, plan generation, and coaching prose. This document describes how the AI layer is designed, what the LLM is and isn't allowed to decide, and how safety is maintained.

---

## Core design principle

**Safety-critical logic is deterministic Python. The LLM generates prose and plans only.**

The LLM never decides whether a load level is safe, whether to trigger an adaptation, or whether an injury is serious enough to warrant medical attention. Deterministic code makes those decisions; the LLM explains the result in natural language.

This separation is not incidental — it's the load-bearing constraint of the architecture. Any change that moves a safety or adaptation decision into the LLM path needs to be reviewed carefully.

---

## Division of responsibility

| Decision                                          | Who makes it                                  |
| ------------------------------------------------- | --------------------------------------------- |
| Whether ACWR exceeds the spike threshold          | Deterministic Python (`engine/acwr.py`)       |
| Whether to trigger a training adaptation          | Deterministic Python (`engine/adaptation.py`) |
| Whether an injury red-flag requires referral      | Rule-based Python (`ai/safety.py`)            |
| Which movements are contraindicated for an injury | Curated dictionary (`engine/injury.py`)       |
| What the coaching rationale says                  | LLM (Claude Haiku)                            |
| The narrative content of a training plan          | LLM (Claude Haiku)                            |
| Parsing a free-text workout into structured data  | LLM (Claude Haiku via Instructor)             |
| Answering a user's training question in chat      | LLM (Claude Haiku)                            |

---

## Components

### NL workout parser

**What it does:** Converts a free-text workout description (e.g., "21-15-9 thrusters 43kg and pull-ups, 4:52") into a structured `WorkoutCreate` Pydantic model.

**How:** Uses [Instructor](https://github.com/instructor-ai/instructor) with Anthropic tool-use constrained decoding. Instructor wraps the Anthropic SDK and enforces schema adherence via tool-call constraints rather than asking the model to emit raw JSON.

**Why Instructor over raw JSON mode:** Schema adherence with raw JSON parsing is ~85% on complex nested structures. Instructor's tool-use constraint approach pushes this to ~99%. Failed parses return a structured error rather than silently corrupt data.

**Implementation:** `apps/api/app/ai/parser.py`

---

### Streaming coach

**What it does:** Answers training questions, explains load metrics, provides workout suggestions, and adapts recommendations to the user's current training state and active injuries.

**Architecture:** SSE (Server-Sent Events) endpoint with persistent session history per user. Each request retrieves relevant context via the RAG pipeline, constructs the system prompt, and streams the response token by token.

**Session persistence:** Coach sessions are stored per-user in the `coach_sessions` table. The coach maintains conversation context across requests within a session.

**Context injection:** The system prompt includes:

- User's current ACWR and readiness score
- Active injuries (if any) — including contraindicated movements and a MEDICAL ALERT if any injury is classified as referral-level
- Today's prescribed session (if a plan is active)
- Retrieved document chunks from the knowledge base

**Prompt injection mitigation:** Context injected from the database is enclosed in XML delimiters (e.g., `<user_context>`, `<injury_context>`) to make it structurally distinct from user input. The system prompt explicitly instructs the model to treat content outside the XML blocks as user input and to be skeptical of instructions embedded there.

**Implementation:** `apps/api/app/ai/coach.py`

---

### Adaptive plan generator

**What it does:** Generates a multi-week training plan personalized to the user's current fitness, goals, injury status, and recent training load.

**Architecture:** Returns HTTP 202 immediately and exposes a polling URL (async task pattern). Plan generation can take 10–30 seconds; making it synchronous would create timeout issues for mobile clients.

**Inputs (structured, not free-text):**

- Epley 1RM estimates for key lifts
- Current ACWR and readiness score
- Active injuries
- User-specified goal and experience level

**Safety gate:** If ACWR > 1.5 or readiness < 40, the plan generator returns a reduced-load plan rather than the standard volume. The reduction rule is in `engine/adaptation.py`, not the prompt.

**Output validation:** Generated plan sessions are validated against the sports science knowledge base (ACWR projections, movement contraindications) before persisting. A plan that would project an unsafe ACWR spike is rejected and regenerated.

**Implementation:** `apps/api/app/ai/planner.py`

---

### Adaptation engine

**What it does:** Monitors training data continuously and triggers load adjustments when specific conditions are met. When a trigger fires, the LLM generates a plain-language rationale explaining the adjustment to the user.

**Trigger conditions (deterministic Python):**

- ACWR > 1.5 (spike zone)
- Readiness < 0.4 (normalized Hooper threshold)
- 3+ consecutive missed sessions
- Session RPE drift > 2 points above plan target for 3 consecutive sessions

**The LLM's role:** Once a trigger fires and the adjustment is computed, the LLM is given the trigger context and generates the user-facing explanation. The LLM does not decide whether to trigger or what the adjustment magnitude is.

**Implementation:** `apps/api/app/engine/adaptation.py` (trigger logic) + `apps/api/app/ai/coach.py` (rationale generation)

---

### Injury train-around engine

**What it does:** Given the user's active injuries, returns a set of blocked movements (contraindicated by the injury) and curated substitutions for any planned session. Fully deterministic — no LLM involved.

**Coverage:** 21 body regions (9 joint, 8 muscle belly, 3 soft-tissue/connective): `shoulder`, `elbow`, `wrist`, `hip`, `knee`, `ankle`, `lower_back`, `neck`, `thoracic_spine`, `hamstring`, `quad`, `calf`, `glute`, `upper_back`, `chest`, `bicep`, `tricep`, `lat`, `hip_flexor`, `it_band`, `forearm`.

**Data structures:**

- `CONTRAINDICATIONS`: maps body region → list of blocked movement patterns
- `SUBSTITUTES`: maps blocked movement → list of approved alternatives
- `CHRONIC_REGIONS`: suppresses acute-rupture language for overuse conditions

**Coach integration:** At every coach chat turn, the active injuries and their contraindicated movements are injected into the system prompt. The coach will not suggest contraindicated movements and will explain why when the user asks about them.

**Implementation:** `apps/api/app/engine/injury.py`

---

### Safety classifier

**What it does:** Evaluates user messages (and AI-generated content before display) for safety concerns — primarily injury red-flags and requests that would be inappropriate to answer without referral.

**Methodology:** Rule-based Python pattern matching on the input text. Not LLM-based. Red-flag patterns (e.g., descriptions suggesting acute rupture, chest pain, neurological symptoms) trigger a `STOP` classification that injects a medical referral message regardless of what the LLM would have generated.

**Evaluation:** Evaluated against a 60-case golden set achieving 100% STOP accuracy on dangerous inputs (no missed red-flags) and < 5% false positive rate. The golden set is maintained in `apps/api/tests/fixtures/safety_golden_set.json`.

**Implementation:** `apps/api/app/ai/safety.py`

---

## RAG pipeline

The coach retrieves context from two sources fused via Reciprocal Rank Fusion (RRF):

1. **BM25 keyword search** over the knowledge base — good for exact term matches (movement names, benchmark names, specific protocols)
2. **pgvector cosine similarity** — good for semantic/conceptual matches ("programming for endurance athletes", "periodization for masters")

**RRF fusion:** Combines the ranked lists from both retrieval methods. This outperforms either method alone across a broad range of query types without requiring tuning of individual retrieval weights.

**Knowledge base contents:**

- CrossFit Level 1 programming standards
- Coaching and programming notes
- Sports science methodology (the same content as [`docs/science.md`](science.md))
- User's recent training history (injected directly into the prompt, not retrieved)

**Chunking:** Documents are chunked at 512 tokens with 64-token overlap. Chunk boundaries respect paragraph structure where possible.

**Implementation:** `apps/api/app/ai/retrieval.py`

---

## Prompt design

**Structural choices (rationale):**

- **XML delimiters for injected context:** Separates database-sourced content from user input structurally, making prompt injection harder to execute and easier to audit.
- **System prompt for role and constraints; user turns for conversation:** Standard multi-turn conversation structure. The safety constraints and coach persona are in the system prompt, not inline instructions in user turns (which the model may learn to discount).
- **Prompts extracted to `ai/prompts.py`:** Prompt templates are not inline in router or coach files. Keeping them in one module makes auditing easier and prevents accidental duplication.
- **No prompt text committed in comments or tests:** The golden-set tests validate behavior (output classification, schema adherence), not prompt wording. This avoids tests that pass only because they match the current prompt text.

---

## Model strategy

| Environment    | Model                                                             | Cost                    |
| -------------- | ----------------------------------------------------------------- | ----------------------- |
| Local dev / CI | `STUB_LLM=true` — deterministic fixture responses, zero API calls | $0                      |
| Production     | Claude Haiku 4.5                                                  | $1 / $5 per MTok in/out |

**Why Haiku:** The app's structured output (Instructor) and RAG-augmented chat tasks don't require frontier model capability. Haiku provides fast, cost-efficient responses within the latency budget for SSE streaming. The architecture makes it straightforward to upgrade to Sonnet or Opus for specific endpoints if quality gaps are identified.

**Stub mode:** `STUB_LLM=true` replaces all LLM calls with deterministic fixture responses. The test suite requires this — running tests against the live API accumulates cost and introduces flakiness. See `apps/api/tests/conftest.py` for how stubs are registered.

---

## Evaluation

**NL parser:** Evaluated on a 200-case golden set of real-world workout descriptions. Target: ≥ 98% schema adherence, ≥ 95% field-level accuracy for movement name, load, and rep count.

**Safety classifier:** Evaluated on a 60-case golden set with two categories: STOP-required (dangerous inputs) and CONTINUE (normal training questions). Target: 100% STOP recall (no missed red-flags), < 5% false positive rate.

**Coach quality:** No automated metric — assessed via manual review of representative conversations. The evaluation process is described in `apps/api/tests/fixtures/` alongside the golden sets.
