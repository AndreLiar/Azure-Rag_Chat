# Archived Workflows

This folder contains the old CI/CD workflow files that have been replaced by the optimized `production.yml` pipeline.

## Archived Files:
- `backend.yml` - Original backend CI/CD workflow
- `frontend.yml` - Original frontend CI/CD workflow  
- `deploy.yml` - Original deployment workflow
- `azure-static-web-apps-zealous-grass-0c5e85103.yml` - Auto-generated Azure Static Web Apps workflow

## Migration to production.yml

These workflows have been consolidated into a single, optimized pipeline (`production.yml`) that provides:

- ✅ Parallel testing (backend + frontend)
- ✅ Smart change detection (only test what changed)  
- ✅ Security scanning (Trivy, Bandit, Safety)
- ✅ Staged deployment (staging → production)
- ✅ Blue-green deployment with rollback
- ✅ Performance testing and monitoring
- ✅ Slack notifications

## Rollback Instructions

If needed, you can restore the old workflows by:

1. Moving files back from `archive/` to `.github/workflows/`
2. Disabling `production.yml` by renaming to `production.yml.disabled`
3. Updating any outdated configurations in the restored files

## Cleanup

These archived files can be safely deleted after confirming the new pipeline works correctly in production.