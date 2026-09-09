# Kavach V1 Demo

Kavach adds a Workflows screen to the desktop sidebar with four demonstration features:

- Model routing for general, coding, writing, and analysis categories.
- Ordered multi-step workflows with previous-output handoff and traceable sessions.
- Manual runs and repeating schedules while the local server is running.
- Run history and audit events with bounded, redacted outputs.

Open Workflows, save the connected GLM model as the default, and create a workflow. The included demo workflow is manual-only so it never runs unexpectedly. Provider-backed models run on provider infrastructure; a model runs on the Mac only when a local provider such as Ollama is configured.

The backend endpoints are under `/workspace/:workspaceId/local-workflows`. Use the desktop app for normal operation, or call the authenticated endpoints for integration checks.
