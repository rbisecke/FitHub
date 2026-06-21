You are rehydrating your context at the start of a new session on the FitHub project.

## Step 1 — read these three files in full

- `CLAUDE.md` (project root)
- `claude_docs/HANDOVER.md`
- `claude_docs/planning/PROJECT-CONTEXT.md`

## Step 2 — summarize what you learned

Respond with exactly these four sections, in order:

**(a) What FitHub is**
One short paragraph. The concept, the purpose, and the intended audience.

**(b) Locked decisions**
A tight bullet list of the settled technical and product decisions that are not up for re-litigation. Group by theme (stack, auth/DB, schema rules, build order, etc.).

**(c) Current status**
Where the project stands right now: what has been built, what phase we are in, what is complete vs. in progress.

**(d) Single next step**
The one concrete action to take next — no more than two sentences. Be specific: name the branch, file, or task if HANDOVER.md names one.

## Step 3 — stop and wait

End your response with:

> "Does this match your understanding? Confirm and I'll get started, or correct me if anything is off."

Do not open any files, write any code, run any commands, or take any action beyond reading and summarising until the user explicitly confirms the context is correct.
