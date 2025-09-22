# Environment Setup Guide

## Overview

This project uses environment variables for configuration. To protect sensitive information, we use template files and local environment files.

## Setup Steps

### 1. Copy Environment Template

```bash
cp env.template .env
```

### 2. Fill in Your Values

Edit the `.env` file with your actual configuration values:

- **Database URLs**: Your MongoDB and Redis connection strings
- **JWT Secret**: A strong, random string for JWT signing
- **OAuth Credentials**: Google OAuth client ID and secret
- **Stripe Keys**: Your Stripe API keys (use test keys for development)
- **Email Settings**: SMTP configuration for sending emails

### 3. Never Commit .env Files

The `.gitignore` file is configured to prevent committing:

- `.env` files
- `env.master` and other environment files
- `mongodb_data/` directory
- Log files

### 4. Production Deployment

For production, set environment variables directly on your deployment platform:

- Docker environment variables
- Kubernetes secrets
- Cloud platform environment variables

## Security Notes

- **Never commit real API keys or secrets to Git**
- **Use different keys for development, staging, and production**
- **Rotate secrets regularly**
- **Use environment-specific configuration files**

## Troubleshooting

If you see "Repository rule violations" when pushing:

1. Check that sensitive files are not being tracked
2. Verify `.gitignore` is properly configured
3. Remove any committed secrets using `git rm --cached <file>`
4. Create a new commit without sensitive data
