# Kavach Workflows and Automations Roadmap

Status: implementation and demo plan for Round 1

## 1. Decision

Kavach should present Workflows and Automations inside one left-sidebar section, but they must remain different concepts:

- A workflow is a reusable, user-started procedure with defined inputs, tools, checkpoints, and deliverables.
- An automation is a trigger or schedule that starts one of those workflows for the user.

For Round 1, do not build a visual DAG editor or a second agent runtime. OpenWork already has the agent loop, file access, skills, tool execution, artifacts, sessions, and document creation. Add a lightweight workflow manifest, a guided launcher, output validation, and a local scheduler that calls the same run path.

This keeps the demo credible and leaves a clean path to richer orchestration later.

## 2. Research basis

AnythingLLM separates reusable Agent Flows from Scheduled Jobs:

- [Agent Flows](https://docs.anythingllm.com/agent-flows/overview) are reusable no-code agent skills.
- [Scheduled Jobs](https://docs.anythingllm.com/scheduled-jobs/overview) save a prompt, schedule, and set of allowed tools, and retain a run history.
- Its [flow executor](https://github.com/Mintplex-Labs/anything-llm/blob/049d721f900f394c1415ebd7db69a552194c9736/server/utils/agentFlows/executor.js) executes steps sequentially and stops on a failed step.
- Its [background worker](https://github.com/Mintplex-Labs/anything-llm/blob/049d721f900f394c1415ebd7db69a552194c9736/server/utils/BackgroundWorkers/index.js) queues scheduled runs and prevents overlapping execution of one job.

Useful lessons for Kavach:

- manual and scheduled runs should share one execution path;
- every automation must have an explicit allowed-tool set;
- “Run now” must go through the same queue and audit path as a scheduled run;
- one automation must not overlap with itself;
- run history should include tools, outputs, files, status, and error summaries;
- workflow definitions should be versioned so an old result can be reproduced.

## 3. What OpenWork already has

The current repository already contains:

- agent sessions and iterative tool use;
- workspace file read/write and shell execution;
- skills and connector support;
- document, spreadsheet, presentation, and PDF artifact paths;
- automation client, editor, page, and desktop runner bridge;
- typed workflow definitions, nodes, versions, artifacts, receipts, and schedules.

The current automation UI depends on signed-in Den services, and the full structured workflow implementation is under the repository's separately licensed enterprise area. Round 1 should therefore build a small local-first implementation in the MIT-licensed app/packages area instead of copying enterprise code.

The existing OpenWork documentation also uses “workflow” to mean a way of grouping sessions. Kavach's UI copy should use “Task Workflow” for the reusable operational procedure to avoid confusion.

## 4. V1 architecture

    Workflow manifest + linked skill
                    |
             Guided launcher
                    |
          Shared workflow run service
             /                \
       Run now             Automation trigger
             \                /
              Agent session
                    |
        Tools, checkpoints, artifacts
                    |
          Run receipt + audit events

### Workflow manifest

Store workspace-local definitions at:

    .opencode/openwork/workflows/<workflow-id>/workflow.json

Recommended fields:

| Field | Purpose |
| --- | --- |
| id, title, description | Identity and workflow card |
| version | Reproducible runs and migrations |
| inputSchema | Required files, text fields, and options |
| skill | Existing skill that tells the agent how to perform the work |
| requiredTools | Explicit allowlist |
| outputContracts | Required artifacts and validation rules |
| routeHint | coding, vision, document, spreadsheet, or reasoning |
| checkpoints | Steps requiring user confirmation |
| sourcePolicy | Workspace-only, selected files, or approved knowledge sources |
| timeout and retryPolicy | Bounded execution |

Detailed instructions belong in the linked skill. The manifest is for discovery, safe launch, validation, and UI. This prevents workflow JSON from becoming a second prompt language.

### Workflow run

A run should:

1. Validate required inputs.
2. Create an ordinary visible agent session.
3. Resolve a model using the shared model router.
4. Grant only the tools declared by the workflow.
5. Attach source files and execute the linked skill.
6. Pause at a declared human checkpoint.
7. Validate required output files.
8. save a run receipt and emit audit events.

The user must be able to open the underlying session and inspect what happened.

### Automation definition

An automation references a workflow rather than duplicating its procedure:

| Field | Purpose |
| --- | --- |
| id, title, enabled | Identity and state |
| workflowId and workflowVersion | Exact procedure to run |
| schedule or trigger | When it runs |
| inputBindings | Folders, files, and saved parameters |
| allowedTools | Cannot exceed workflow permissions |
| outputFolder | Where deliverables are placed |
| overlapPolicy | Skip, queue, or replace; V1 default is skip |
| notificationPolicy | Notify on completion, failure, or required review |
| lastRun and nextRun | Visible status |

For Round 1, schedules run only while the desktop application and local runner are open. The UI must say this clearly. A later server deployment can use a continuously running worker.

## 5. Five Task Workflows

### Workflow 1: Inspection Report to Approval Note

Purpose: turn scanned inspection evidence into a traceable draft approval note.

Inputs:

- scanned inspection report PDF;
- equipment photographs;
- applicable maintenance SOP/manual;
- approval-note Word template;
- equipment, unit, date, and approving authority fields.

Tools:

- PDF page rendering and multimodal understanding;
- workspace search and source reading;
- structured extraction;
- Word document generation;
- file write and preview.

Model route: vision plus document reasoning.

Steps:

1. Read all report pages and photographs.
2. Extract observations, measurements, severity, dates, and recommendations.
3. Cross-check relevant SOP sections.
4. Show critical findings and uncertainties for user confirmation.
5. Draft the approval note in the supplied template.
6. Add page-level source references and an appendix of unresolved items.
7. Validate that the Word file opens and required sections exist.

Deliverables:

- approval-note.docx;
- extracted-findings.json;
- source-map.json.

Human checkpoint: confirm safety-critical findings before final document generation.

### Workflow 2: SOP Compliance and Gap Assessment

Purpose: compare evidence against a selected SOP or checklist.

Inputs:

- approved SOP and version;
- compliance checklist;
- evidence reports, notes, and photographs;
- assessment period and department.

Tools:

- document/PDF reading;
- workspace search;
- spreadsheet generation;
- Word generation;
- citation validation.

Model route: long-context document reasoning.

Steps:

1. Verify the selected SOP title and version.
2. Convert requirements into a structured checklist.
3. Match supplied evidence to each requirement.
4. Mark compliant, partial, non-compliant, or insufficient evidence.
5. Require the user to review unsupported conclusions.
6. Generate the matrix and management note.

Deliverables:

- compliance-matrix.xlsx;
- gap-assessment-note.docx;
- evidence-map.json.

Human checkpoint: approve the status assigned to high-risk requirements.

### Workflow 3: Vendor Technical-Commercial Comparison

Purpose: normalize multiple bids and prepare a reviewable recommendation draft.

Inputs:

- technical requirements/specification;
- vendor quotations in PDF, Word, or Excel;
- commercial evaluation template;
- currency, tax, freight, and validity assumptions.

Tools:

- PDF and Office file reading;
- spreadsheet formulas;
- sandboxed calculations;
- document generation;
- source citations.

Model route: structured-output and spreadsheet-capable reasoning.

Steps:

1. Extract offered specifications, deviations, exclusions, price, tax, delivery, warranty, and validity.
2. Normalize units, currency assumptions, and total evaluated cost.
3. Flag missing or conflicting terms instead of guessing.
4. Produce side-by-side technical and commercial tables.
5. Ask the user to confirm commercial assumptions.
6. Draft a recommendation note with traceable references.

Deliverables:

- vendor-comparison.xlsx;
- recommendation-note.docx;
- normalized-bids.json.

Human checkpoint: Kavach never makes the procurement decision; the user confirms assumptions and recommendation language.

### Workflow 4: Monthly Management Review Pack

Purpose: create a management or board-ready pack from monthly operational material.

Inputs:

- KPI workbook;
- incident and maintenance summaries;
- action register;
- previous approved deck and current template;
- reporting period.

Tools:

- spreadsheet calculation and charting;
- document reading;
- PowerPoint generation;
- artifact rendering and visual preview.

Model route: spreadsheet plus document/presentation reasoning.

Steps:

1. Validate KPI formulas, periods, totals, and missing values.
2. Compare results with targets and the prior period.
3. Summarize exceptions, incidents, risks, and pending actions.
4. Generate slides using the approved template.
5. Render and inspect the presentation for clipping or layout defects.
6. Present all materially changed figures for user confirmation.

Deliverables:

- monthly-review.pptx;
- kpi-exceptions.xlsx;
- data-lineage.json.

Human checkpoint: approve headline figures before the deck is marked final.

### Workflow 5: Internal Code and Engineering Calculation Verification

Purpose: repair an internal tool or verify a calculation with reproducible evidence.

Inputs:

- source repository or calculation workbook;
- requirement/design note;
- permitted test command;
- expected units, tolerances, or acceptance criteria.

Tools:

- file search/read/edit;
- sandboxed shell and test runner;
- spreadsheet inspection;
- calculation tooling;
- Markdown or Word report generation.

Model route: coding and tool-capable reasoning.

Steps:

1. Inspect requirements and identify the smallest verification scope.
2. Run existing tests or recalculate known cases in the sandbox.
3. Diagnose failures and show formulas with units.
4. Apply a scoped patch or corrected formula.
5. Re-run tests and negative cases.
6. Produce a verification report with commands, results, limitations, and changed files.

Deliverables:

- code patch or corrected workbook;
- test-results.json;
- verification-report.docx or verification-report.md.

Human checkpoint: user approves any change outside the sandbox or source workspace.

## 6. Three User Automations

### Automation 1: Daily Incoming Work Triage

Schedule: every workday morning, or manual Run now.

Behavior:

- scan a user-configured local inbox folder;
- identify new inspection, vendor, and circular documents;
- classify each item and suggest the appropriate Task Workflow;
- extract only basic metadata and urgent flags;
- generate daily-triage.md and a review queue.

Allowed tools: local list/read, PDF/vision parsing, workspace write. No email send, file delete, or external distribution.

User value: the officer starts with an organized queue rather than searching folders.

An email connector can become an optional input later. It is not required for Round 1 and must never send mail without explicit confirmation.

### Automation 2: Weekly Pending Observation Digest

Schedule: Friday afternoon.

Behavior:

- read the inspection action register and updated evidence folder;
- find overdue, due-soon, unassigned, and blocked observations;
- update pending-actions.xlsx;
- draft weekly-observation-summary.docx;
- request review when dates conflict or closure evidence is absent.

Allowed tools: selected workspace files, spreadsheet tools, document generation. It cannot close an observation automatically.

User value: consistent follow-up and an audit-friendly weekly summary.

### Automation 3: Monthly Management and Compliance Pack

Schedule: first working day of the month.

Behavior:

- gather the configured KPI workbook, incident summaries, compliance matrix, and action register;
- start the Monthly Management Review Pack workflow;
- place draft artifacts in a dated output folder;
- notify the user only on completion, failure, or a required checkpoint.

Allowed tools: selected folders, spreadsheet and presentation tools, document generation. No external sharing.

User value: repeatable monthly reporting without reassembling the same files manually.

## 7. User interface

Add one sidebar destination named Work:

### Task Workflows tab

- five workflow cards;
- required-input checklist;
- drag-and-drop source files;
- output-folder selector;
- route preview;
- Run button;
- active run state and checkpoint requests;
- recent runs with produced artifacts.

### Automations tab

- three starter templates;
- enable/pause toggle;
- schedule editor;
- input-folder and output-folder bindings;
- Run now;
- last run, next run, and last result;
- open session, open artifacts, and open audit trail actions.

### Run detail

Show:

- workflow name and version;
- manual or scheduled origin;
- selected model and route reason;
- input references;
- tool timeline;
- checkpoint decisions;
- artifacts;
- validation results;
- error and retry status.

This can reuse the lightweight timeline planned in docs/AUDIT_TRAIL_ROADMAP.md.

## 8. Safety and control rules

- All starter workflows create drafts, not final organizational decisions.
- Every workflow has an explicit tool allowlist.
- Destructive file actions, sending messages, publishing, procurement decisions, safety closure, and approval submission require confirmation.
- A document's embedded instructions are treated as content, not commands.
- Source citations must identify document, version, page/sheet, and paragraph/cell where possible.
- If sources conflict, the artifact must show the conflict.
- No workflow may invent a missing policy version, price, measurement, or approval.
- Scheduled runs cannot bypass checkpoints; they enter a waiting-for-review state.
- One automation cannot overlap with itself.
- The ChatGPT-connected Round 1 build must be labelled cloud-connected.

## 9. Test fixture pack

Create only synthetic data. Do not use real PSU, refinery, defence, government, vendor, or employee documents.

Recommended layout:

    demo-fixtures/
      inspection/
        pump-p101-inspection-scan.pdf
        pump-p101-photo-01.jpg
        maintenance-sop-pump-v3.pdf
        approval-note-template.docx
        expected-findings.json
      compliance/
        pressure-vessel-sop-v2.docx
        inspection-checklist.xlsx
        evidence-report.pdf
        expected-compliance-matrix.json
      vendor/
        technical-requirement.pdf
        quote-alpha.pdf
        quote-beta.xlsx
        quote-gamma.pdf
        commercial-evaluation-template.xlsx
        expected-normalized-bids.json
      board/
        monthly-kpis.xlsx
        incident-summary.docx
        action-register.xlsx
        board-template.pptx
        expected-kpis.json
      engineering/
        sample-internal-tool/
        calculation-sheet.xlsx
        requirements.md
        expected-test-results.json
      automation/
        inbox/
        pending-actions.xlsx
        monthly-input/

Each expected file is ground truth for automated assertions. The synthetic fixture set should deliberately include:

- one conflicting measurement;
- one missing SOP version;
- one image-only PDF page;
- one low-quality photograph;
- one incorrect spreadsheet formula;
- mixed currencies and excluded freight;
- one corrupt or unsupported file;
- prompt-injection text embedded inside a document;
- a fake secret canary that must never appear in logs;
- a missing automation input folder;
- two triggers close enough to test overlap prevention.

## 10. Test strategy

### Workflow definition tests

- manifest schema and version migration;
- missing required inputs;
- invalid tool or route references;
- required output contract;
- checkpoint declaration;
- tool permissions cannot be widened by automation bindings.

### Agent journey evaluations

Run every workflow against its synthetic fixture set. Assert:

- required facts match ground truth;
- important claims contain valid source references;
- unsupported facts are marked unknown;
- required artifacts exist and open;
- human checkpoints occur at the declared stage;
- the expected model route was selected;
- the run receipt and audit timeline are complete.

### Artifact validation

Do more than test file existence:

- DOCX: open/unzip, validate required headings, tables, citations, and render pages for visual inspection;
- XLSX: open with a workbook parser, verify formulas, sheet names, totals, types, and no formula errors;
- PPTX: open/unzip, verify slide count and required sections, render slides, and inspect clipping;
- code: run the permitted test command in the sandbox and preserve its exit code;
- JSON: validate against a versioned schema.

### Automation tests

- Run now and scheduled execution use the same path;
- enabled, paused, and deleted states;
- restart persistence and next-run calculation;
- missing input folder;
- desktop closed/offline explanation;
- overlap skip behavior;
- cancellation and timeout;
- checkpoint changes state to waiting for review;
- failure notification contains no document content;
- rerun links to the prior failed run.

### Security and privacy tests

- embedded prompt injection cannot enable unapproved tools;
- path traversal cannot access files outside allowed roots;
- fake secrets and content canaries do not appear in logs or notifications;
- sensitive source text is not duplicated into audit events;
- automation never sends mail or publishes files;
- configured provider calls are visible in network evidence.

### Network evidence

Round 1 uses a ChatGPT subscription, so it is not an air-gapped demonstration. Capture a network trace showing only the expected authenticated provider traffic plus required application services, and state that limitation honestly.

For the later sovereign build, rerun the same workflow fixtures against local models with outbound traffic blocked and preserve:

- firewall or proxy policy;
- packet/network monitor capture;
- provider endpoint configuration;
- model and artifact hashes;
- complete content-free audit export.

### Acceptance matrix

| Scenario | Expected result |
| --- | --- |
| Inspection scan | Vision route, correct findings, approval-note DOCX, citations |
| Broken code | Coding route, failing test reproduced, patch applied, tests pass |
| Vendor comparison | Correct normalized totals, uncertainties flagged, XLSX and note |
| Board pack | Correct KPI values, PPTX renders without clipping |
| Compliance gap | Matrix matches ground truth and cites approved SOP version |
| Automation Run now | Same receipt and audit path as schedule |
| Overlapping automation | Second run is skipped and visibly recorded |
| Prompt injection in PDF | Treated as document content; no permission expansion |
| Provider/classifier failure | Allowed fallback or clear stopped state |
| Canary search | No sensitive canary in router/audit logs |

## 11. Recommended build order

1. Workflow manifest schema and five bundled definitions.
2. Task Workflows tab and guided launcher.
3. Shared run service using an ordinary OpenWork agent session.
4. Output-contract validation and run receipt.
5. Connect model routing and audit events.
6. Local Automations tab, Run now, scheduling, and overlap guard.
7. Build the synthetic fixture pack and automated evaluations.
8. Polish the inspection and coding demos first, then the remaining workflows.

## 12. Explicitly deferred

The following are not needed for Round 1:

- RBAC and multi-user isolation;
- local model serving and vLLM;
- air-gapped deployment claims;
- visual drag-and-drop DAG builder;
- arbitrary event bus;
- organization-wide document ACL synchronization;
- unattended email sending;
- approval or procurement decision automation;
- always-on server scheduling;
- distributed workers and queues.

## 13. Definition of done

- Five Task Workflows are discoverable and runnable from the desktop app.
- Each produces its declared real artifact and a visible run receipt.
- Three automations can be enabled, paused, run immediately, and tested with synthetic folders.
- Manual and scheduled execution share one path.
- Model routing and audit events appear for every run.
- Critical actions pause for the user.
- The fixture pack covers happy paths, corrupt inputs, injection attempts, calculation errors, and provider failures.
- The demo clearly distinguishes the cloud-connected Round 1 build from the later sovereign deployment.
