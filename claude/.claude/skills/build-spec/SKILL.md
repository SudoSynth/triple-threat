---
name: build-spec
description: "Spec phase of the build pipeline. Runs GSD's discuss + spec phases to formalize a feature description into a written spec. Auto-detects AI/LLM keywords and offers to route through gsd-ai-integration-phase. Use standalone when you have an idea to think through but aren't committed to building it yet."
argument-hint: "<feature description> [--no-ai]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
  - Skill
---

# /build-spec — Discussion + spec writing

Walks the user's feature description through GSD's spec phase: an exploratory discussion to clarify requirements, followed by formalizing the conclusion into a spec document. If the spec touches AI/LLM territory, optionally routes through GSD's AI-integration phase.

## Steps

### 1. Pre-flight check

Verify `.planning/` exists. If not, the workspace hasn't been bootstrapped — tell the user to run `/build-init` first.

### 2. Run the discussion

Invoke the `gsd-discuss-phase` skill via the Skill tool (bare name, no leading slash), passing the user's feature description. This runs adaptive questioning to surface the gray areas that need decisions before planning.

### 3. Run the spec writeup

Invoke the `gsd-spec-phase` skill via the Skill tool. This formalizes the discussion output into a structured spec document in `.planning/`.

### 4. AI keyword scan

If `--no-ai` flag was passed, skip this step.

Otherwise, after the spec is written, scan its content for AI/LLM keywords. Match these as whole-word, case-insensitive:

```
LLM, GPT, Claude, Gemini, language model
RAG, retrieval, retrieval-augmented
embedding, embeddings, vector, vector DB, vector store
agent, agentic, multi-agent, tool calling, tool use
prompt, system prompt, chain-of-thought, few-shot
eval, evals, evaluation, hallucination, factuality, refusal
chatbot, conversational, conversational AI
summarization, extraction, classification (only when paired with LLM context)
OpenAI, Anthropic, Hugging Face, LangChain, LlamaIndex
```

If any match is found:
- Use AskUserQuestion to ask: "Spec mentions AI/LLM territory. Run /gsd-ai-integration-phase to lock framework choice and eval strategy?"
- Options: "Yes, run AI integration", "No, skip"
- If yes → invoke the `gsd-ai-integration-phase` skill via the Skill tool
- If no → continue without it

### 5. Approval gate

The spec phase typically includes its own approval gate inside GSD. If the user is left with an unapproved spec, do not proceed. Report:
```
Spec written to .planning/<phase-dir>/SPEC.md
Awaiting your approval before /build-plan can run.
```

## What this skill does NOT do

- Does not run /autoplan or any plan-phase work — that's `/build-plan`.
- Does not start writing code — that's `/build-exec`.
- Does not modify spec content directly — defers entirely to gsd-spec-phase.
