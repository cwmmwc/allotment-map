# Cloud Run Deployment Cheat Sheet

## Project Info
- **GCP Project:** lunar-mercury-397321 (federal-register-forced-fee)
- **Region:** us-east1
- **Service:** allotment-map
- **Live URL:** https://allotment-map-996830241007.us-east1.run.app
- **Stack:** Static site (HTML/CSS/JS) served by nginx

## Auto-Deploy (CI/CD)
Pushes to `main` on `cwmmwc/allotment-map` automatically build and deploy via Cloud Build.

```bash
git push origin main   # triggers auto-deploy
```

Check build status:
```bash
gcloud builds list --region=us-east1 --limit=5
gcloud builds log <BUILD_ID> --region=us-east1
```

## Manual Deploy
```bash
gcloud run deploy allotment-map \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --memory 256Mi
```

## View Logs
```bash
# Stream live logs
gcloud run services logs tail allotment-map --region=us-east1

# Recent logs
gcloud run services logs read allotment-map --region=us-east1 --limit=50
```

## Service Management
```bash
# Check service status
gcloud run services describe allotment-map --region=us-east1

# List revisions
gcloud run revisions list --service=allotment-map --region=us-east1

# Roll back to a previous revision
gcloud run services update-traffic allotment-map \
  --to-revisions=<REVISION_NAME>=100 --region=us-east1
```

## Console Links
- Cloud Run: https://console.cloud.google.com/run/detail/us-east1/allotment-map?project=lunar-mercury-397321
- Cloud Build: https://console.cloud.google.com/cloud-build/builds?project=lunar-mercury-397321
