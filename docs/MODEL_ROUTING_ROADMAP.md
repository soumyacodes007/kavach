# Kavach Model Routing Roadmap

Status: implementation plan for Round 1

## 1. Decision

Kavach should add a small, provider-neutral routing layer in front of OpenWork's existing message send path. It should not fork or embed the whole AnythingLLM backend.

For Round 1, the router may select among models exposed by the user's connected ChatGPT account. The design must keep provider and model IDs configurable so a later release can add local OpenAI-compatible, Ollama, or vLLM endpoints without redesigning the router.

The router is one of the two remaining major product features after the audit-trail work. The other is the workflow and automation experience. Finishing these features still includes evaluation fixtures, failure handling, UI explanations, and integration with the audit trail.

## 2. What AnythingLLM currently does

The design below was checked against AnythingLLM commit [049d721](https://github.com/Mintplex-Labs/anything-llm/tree/049d721f900f394c1415ebd7db69a552194c9736).

AnythingLLM's current model router is not merely a workspace-level model selector. It can choose a provider and model for each conversation request. Its main behavior is:

1. Evaluate inexpensive calculated rules.
2. If no calculated rule matches, evaluate semantic rules with a classifier model.
3. Reuse a recent matched route for conversation continuity.
4. Fall back to the configured provider and model.
5. Expose selected-route metadata to the caller.

Relevant sources:

- [Model-router provider wrapper](https://github.com/Mintplex-Labs/anything-llm/blob/049d721f900f394c1415ebd7db69a552194c9736/server/utils/AiProviders/modelRouter/index.js)
- [Rule evaluation, classification cache, and sticky routes](https://github.com/Mintplex-Labs/anything-llm/blob/049d721f900f394c1415ebd7db69a552194c9736/server/utils/router/index.js)
- [Rule validation and persistence](https://github.com/Mintplex-Labs/anything-llm/blob/049d721f900f394c1415ebd7db69a552194c9736/server/models/modelRouterRule.js)
- [Semantic classifier agent skill](https://github.com/Mintplex-Labs/anything-llm/blob/049d721f900f394c1415ebd7db69a552194c9736/server/utils/agents/aibitat/plugins/router-classifier.js)
- [Official model-router documentation](https://docs.anythingllm.com/model-router/overview)

### Useful patterns to adopt

| Pattern | Why Kavach needs it |
| --- | --- |
| Cheap rules before classifier calls | Fast, predictable, and inexpensive for obvious tasks |
| Capability-based routes | Prevents sending an image or tool task to an incapable model |
| One configured fallback | A request still works when no rule matches |
| Sticky route per conversation | Avoids unexplained model changes during follow-up questions |
| Short classification cache | Avoids repeating classification work |
| Route metadata | Enables a visible explanation and an audit event |
| Provider adapter | Keeps the rest of the agent loop unaware of routing details |

### Changes Kavach should make

AnythingLLM deliberately groups every calculated rule ahead of every semantic rule, even if the displayed priorities are mixed. Kavach should make that precedence explicit: hard policy and capability gates first, deterministic task rules second, semantic classification only for ambiguous prompts.

AnythingLLM's debug path can log a truncated prompt. Kavach must never place prompt text, attachment text, document excerpts, credentials, or generated content in router logs. Record a message identifier and feature summary instead.

The router must also distinguish an operational fallback from a policy boundary. A failed local or approved route must never silently fall back to a provider that is not allowed for the workspace.

## 3. Current Kavach integration point

OpenWork already has provider discovery, manual model selection, session-level selection, attachments, tool execution, and the agent loop. The missing part is a route resolver.

In apps/app/src/react-app/shell/session-route.tsx, both normal send paths currently choose:

    sessionModelSelection?.model ?? local.prefs.defaultModel

The router should be called at these two boundaries after attachments and draft-mode requirements are known, but before the prompt request is submitted. The selected provider and model can then be passed through the existing request path exactly as a manual selection is today.

No changes to the agent's core tool loop are required for the first version.

## 4. V1 routing contract

### Model registry

Each discovered model should be normalized into a small capability record:

| Field | Example purpose |
| --- | --- |
| providerID and modelID | Existing OpenWork identifiers |
| displayName | Human-readable route result |
| enabled | User can exclude a model |
| text | Basic chat support |
| vision | Image and scanned-page input |
| pdf | Native PDF input, when known |
| tools | Tool/function calling |
| structuredOutput | Reliable schema-constrained output |
| contextTier | small, medium, or long |
| speedTier | fast, balanced, or deep |
| locality | cloud, local, or approved-private |
| tags | coding, reasoning, vision, general |

Capabilities should be discovered from provider metadata where possible and overridable in settings. Do not hard-code marketing model names into routing logic.

### Routing input

The route resolver receives derived facts, not unrestricted application state:

- explicit session model, if the user selected one;
- workspace policy and allowed providers;
- attachment MIME types and file extensions;
- whether image, PDF, shell, or other tools are required;
- estimated context size;
- composer mode, such as build or plan;
- workflow route hint;
- lightweight prompt features, such as likely coding, spreadsheet, document, or general work;
- provider/model availability.

Derived prompt features are evaluated in memory. They are not written to normal logs.

### Precedence

1. Apply absolute policy and capability eligibility.
2. Honor an explicit user selection if it is eligible.
3. Evaluate deterministic rules.
4. Use the semantic classifier only if the request remains ambiguous.
5. Reuse a recent sticky route when it remains eligible.
6. Use the configured allowed fallback.
7. Stop with an actionable error if no eligible route exists.

Hard requirements are re-evaluated for every user message. A sticky text route must not override a newly attached image or a newly required tool.

### Initial deterministic rules

| Priority | Condition | Required route |
| --- | --- | --- |
| 10 | Image, scanned page, or photo is attached | Vision-capable model |
| 20 | Agent will use shell, code edit, or test tools | Tool-capable coding model |
| 30 | Workbook input or spreadsheet deliverable | Tool-capable structured-output model |
| 40 | Very large document/context estimate | Long-context model |
| 50 | Approval note, memo, summary, or presentation | General reasoning/document model |
| 100 | No prior match | Configured general fallback |

The actual model behind each route is selected in Settings. For example, the labels can be Fast, Reasoning, Coding, Vision, and Long context while their provider/model IDs remain dynamic.

### Semantic classifier

The optional classifier should:

- receive only the current task statement and compact non-sensitive features needed for classification;
- choose from a fixed enum of configured route labels;
- return route, confidence, and a short reason code;
- make at most one model call;
- produce no chain-of-thought output;
- fall back safely on timeout, malformed output, or provider error;
- be disabled completely for an eventual air-gapped deployment if deterministic rules are sufficient.

For the ChatGPT-connected Round 1 demo, classification content goes to the already selected ChatGPT provider. The UI and documentation must not call that configuration air-gapped.

### Route stickiness

- Scope: current session.
- Default time-to-live: five minutes after an inference completes.
- Reset when the session's explicit selection changes.
- Ignore when a new hard capability is required.
- Store only the selected route and expiry, not prompt text.

## 5. User experience

Add an Auto option to the existing model picker. Manual model selection must remain available.

When Auto is active:

- show the resolved model beside the assistant turn;
- make the route reason inspectable, for example “image attachment requires vision”;
- show whether the result came from a manual override, deterministic rule, classifier, sticky route, or fallback;
- provide a Settings page for route labels, eligible models, fallback, and classifier enablement;
- show a clear error when no allowed capable model is available.

Avoid noisy notifications on every turn. The selected-model badge and audit event are enough.

## 6. Audit and privacy requirements

Emit a content-free model.route_decided event for every routed turn:

| Field | Description |
| --- | --- |
| eventId and timestamp | Audit identity |
| sessionId and messageId | Correlation without duplicating content |
| workflowRunId | Present for workflow/automation runs |
| selectedProvider and selectedModel | Final route |
| routeSource | manual, deterministic, semantic, sticky, or fallback |
| ruleId and reasonCode | Explainability |
| requiredCapabilities | Derived capability flags |
| eligibleModelCount | Debugging without model prompt data |
| classifierUsed | Boolean |
| durationMs | Router latency |
| policyVersion | Policy that constrained the choice |

Never include prompt text, excerpts, attachment names that are themselves sensitive, full local paths, secrets, or chain-of-thought. The existing audit-trail roadmap remains the source of truth for export and retention.

## 7. Proposed code shape

Keep routing logic independent of React and Electron:

    packages/model-router/
      src/types.ts
      src/model-registry.ts
      src/feature-extractor.ts
      src/rules.ts
      src/classifier.ts
      src/resolve-route.ts
      src/sticky-route-store.ts
      src/__tests__/

App integration:

- add auto-routing preferences to the existing local preferences store;
- normalize the provider catalog into the model registry;
- call resolveRoute in both send paths in session-route.tsx;
- pass the chosen model through the existing prompt request;
- attach safe route metadata to the assistant turn;
- emit the audit event;
- make workflows and automations call the same package.

The pure package must not import UI, Electron, network, or provider-specific clients. The app supplies an optional classifier callback and availability information.

## 8. Failure behavior

| Failure | Required behavior |
| --- | --- |
| Classifier times out | Use allowed deterministic/default fallback and mark fallback reason |
| Model unavailable before send | Re-resolve once from remaining eligible models |
| Provider fails during inference | Ask before switching trust boundaries; otherwise use configured same-boundary fallback |
| Required vision/tool capability absent | Stop and explain which capability is missing |
| Explicit model is ineligible | Keep policy boundary, explain conflict, offer eligible choices |
| Router configuration is invalid | Disable Auto and preserve manual selection |
| Audit sink unavailable | Continue or stop according to audit policy; show degraded-audit state |

Do not automatically change models halfway through one agent turn. All tool iterations for that turn use the resolved model. A later user turn may be re-routed.

## 9. Implementation phases

### Phase 1: deterministic router

- model registry and capability overrides;
- Auto option and configured fallback;
- attachment, coding/tool, spreadsheet, long-context, and general rules;
- session stickiness;
- route badge and content-free audit event.

### Phase 2: semantic routing

- structured classifier callback;
- confidence threshold and cache;
- settings and classifier failure behavior;
- evaluation against a labeled prompt set.

### Phase 3: provider-neutral deployment

- OpenAI-compatible endpoint registration;
- local provider health and capacity metadata;
- vLLM/Ollama adapters;
- locality policies and “never leave device” mode.

Learning routers, cost optimization, multi-user quotas, and GPU-aware load balancing are intentionally outside Round 1.

## 10. Test plan

### Unit tests

- precedence and first-match behavior;
- manual override without policy bypass;
- capability filtering;
- sticky-route creation, expiry, and invalidation;
- deterministic feature extraction;
- classifier schema validation and timeout;
- allowed fallback and no-eligible-route behavior;
- route audit redaction.

### Integration tests

Use fake provider adapters with distinct provider/model IDs and capture the outgoing prompt request. Verify that:

- a code task reaches the configured coding model;
- a scanned image reaches a vision model;
- a long document reaches a long-context model;
- ambiguous text invokes the classifier once;
- a classifier failure reaches the allowed fallback;
- follow-up text remains sticky;
- adding an image invalidates an incapable sticky route;
- manual selection bypasses Auto but never bypasses policy.

### UI tests

- Auto appears in the model picker;
- resolved-model badge and reason are correct;
- settings survive restart;
- unavailable routes produce actionable messages;
- manual selection and Auto can be switched without losing the draft.

### Privacy and observability tests

Seed prompts and filenames with unique canary strings. After all tests, search application logs, router logs, audit export, and error reports. The canaries must not appear in router or audit logs.

For deterministic routes, routing should add less than 50 ms on the test workstation and make zero classifier calls. Semantic routing should make no more than one classifier call.

## 11. Demo fixture set

Create synthetic fixtures under tests/fixtures/model-routing:

- labeled-prompts.jsonl: at least 15 prompts for each route label plus ambiguous cases;
- broken-calculator/: a tiny code repository with one failing unit test;
- pump-inspection-scan.pdf and pump-photo.jpg: synthetic image-based inspection evidence;
- monthly-kpis.xlsx: formulas, tables, and one deliberate anomaly;
- long-policy-manual.pdf: long enough to trigger the configured context rule;
- unsupported-format.bin: verifies an honest capability error;
- expected-routes.json: expected route, reason, and allowed fallbacks for every fixture.

The demo should show at least:

1. A scanned inspection task automatically selects the vision route.
2. A code repair task automatically selects the coding/tool route.
3. The model badge and audit timeline explain both decisions.
4. A classifier failure uses the configured safe fallback.

All fixtures must be invented. Do not use real PSU, refinery, defence, vendor, employee, or government data.

## 12. Definition of done

- Auto selects two visibly different configured models for the inspection and coding demos.
- Manual model selection still works.
- Routing is shared by chat, workflows, and scheduled automation runs.
- Every decision is explainable and present in the audit timeline.
- No sensitive prompt content is duplicated into router or audit logs.
- Tests cover precedence, capability changes, failure, privacy, and restart persistence.
- The UI truthfully labels the ChatGPT-connected build as cloud-connected, not sovereign or air-gapped.
