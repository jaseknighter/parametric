# Strategic Manifest: Infrastructure as Code (IaC) & Blue/Green Deployment (Draft v0.1)


Status: DRAFT Objective: Transition to 100% deterministic deployments for post v0.5 development.

## 1. Vision
To treat all CI/CD configurations (`.github/workflows/*.yml`) and environment scripts as **Infrastructure as Code**. No configuration changes should be applied to the `main` branch without deterministic validation in a mirrored staging environment.

## 2. The Blue/Green Infrastructure Model

Utilize a branch-based logical separation to simulate Blue/Green environments within GitHub Pages:

* **Blue (Production):** The `main` branch. Serves the live application and "Official" reports.
* **Green (Stage):** The `stage` branch. Serves as the laboratory for testing `deploy.yml` logic, new test runners, or scrubbing scripts.

### Implementation Pattern
The `deploy.yml` is updated to handle environmental context:

```yaml
on:
  push:
    branches: [main, stage]

jobs:
  build-and-deploy:
    steps:
      # ... build steps ...
      
      - name: Deploy to Production (Blue)
        if: github.ref == 'refs/heads/main'
        uses: actions/deploy-pages@v4

      - name: Deploy to Staging (Green)
        if: github.ref == 'refs/heads/stage'
        run: echo "Validation successful. Inspect artifacts for Green deployment."
```

## 3. Configuration Testing Tier
### Tier 1: Static Analysis (Linting)
Use `actionlint` to catch syntax errors (e.g., duplicate IDs or indentation issues) before pushing.

*   **Command:** `actionlint .github/workflows/deploy.yml`
*   **Integration:** Add to Husky pre-commit hooks.

### Tier 2: Local Execution (The 'act' Protocol)
Use `nektos/act` to run the workflow inside a local Docker container. This allows testing of the `cp -RT` logic and `find` commands without waiting for a 2-minute CI cycle.

*   **Command:** `act push -W .github/workflows/deploy.yml`

### Tier 3: Automated Infrastructure Unit Tests
Add a verification job that "tests the test results" before deployment.

```yaml
  infrastructure-audit:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Download Artifacts
        uses: actions/download-artifact@v4
        with:
          name: test-reports
      - name: Assert Asset Integrity
        run: |
          test -f monocart-report/index.html || exit 1
          test -f monocart-report/base.css || exit 1
          echo "Infrastructure Audit: PASSED"
```

## 4. The Change Management Workflow (The Acceptance Loop)
1.  **Develop:** Create a feature branch `infra/fix-asset-paths`.
2.  **Lint:** Run `actionlint` locally.
3.  **Simulation:** Run `act` locally to verify directory nesting.
4.  **Staging (Green):** Merge to `stage` branch.
5.  **Audit:** Verify that the "Green" run produced a correctly styled, redacted report.
6.  **Promotion (Blue):** Merge `stage` into `main`.