# GitHub Configuration

This directory contains GitHub-specific configuration files for the Tabliczki ZTM project.

## Structure

- `workflows/` - GitHub Actions workflows
  - `ci.yml` - Main CI/CD pipeline (tests, linting, builds)
- `CI-CD.md` - Detailed documentation for CI/CD setup

## Quick Start

### Required Repository Secrets

Before running workflows, configure these secrets in repository settings:

```
SUPABASE_URL
SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Running CI Manually

1. Go to "Actions" tab in GitHub
2. Select "CI" workflow
3. Click "Run workflow"
4. Select branch and confirm

## Documentation

For detailed information about CI/CD setup, see [CI-CD.md](./CI-CD.md).
