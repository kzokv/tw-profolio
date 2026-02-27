# Cloudflared SSH Tunnel for GitHub Actions Deploy

## Overview

GitHub Actions deploys to the QNAP by SSHing into the `ubuntu-sshd` container
(`192.168.2.61`) via a Cloudflare Access SSH tunnel. This avoids exposing SSH
directly to the internet.

## Setup Steps

### 1. Create a Cloudflare Access Application for SSH

1. Go to **Cloudflare Zero Trust** > **Access** > **Applications**
2. Create a new **Self-hosted** application
   - **Application name**: `twp-deploy-ssh`
   - **Session Duration**: 1 hour
   - **Application domain**: e.g. `ssh-deploy.kzokvdevs.dpdns.org`
3. Create a policy allowing service tokens (for GitHub Actions)

### 2. Create a Service Token

1. Go to **Cloudflare Zero Trust** > **Access** > **Service Auth** > **Service Tokens**
2. Create a new service token, note the **Client ID** and **Client Secret**
3. Add an Access policy to the SSH application:
   - **Policy name**: `github-actions-deploy`
   - **Action**: Service Auth
   - **Include**: Service Token matching the one created above

### 3. Configure the Tunnel Route for SSH

In the tunnel configuration (same tunnel as app traffic or a separate one):

| Public hostname                       | Service          | Type |
|---------------------------------------|------------------|------|
| `ssh-deploy.kzokvdevs.dpdns.org`      | `ssh://192.168.2.61:22` | SSH  |

### 4. Set GitHub Actions Secrets

In the `tw-portfolio` GitHub repo, go to **Settings** > **Secrets and variables** >
**Actions** and add these secrets:

| Secret                      | Value                                              |
|-----------------------------|----------------------------------------------------|
| `DEPLOY_SSH_PRIVATE_KEY`    | SSH private key for the `ubuntu` user on ubuntu-sshd |
| `CF_ACCESS_CLIENT_ID`       | Service token Client ID from step 2                |
| `CF_ACCESS_CLIENT_SECRET`   | Service token Client Secret from step 2            |
| `DEPLOY_HOST`               | `ssh-deploy.kzokvdevs.dpdns.org`                   |
| `DEPLOY_USER`               | `ubuntu`                                           |
| `DEPLOY_PATH`               | Path to tw-portfolio repo on QNAP (e.g. `/data/tw-portfolio`) |

### 5. Create a GitHub Environment

1. Go to **Settings** > **Environments** > create `production`
2. Optionally add required reviewers for manual approval before deploy
3. Associate the secrets above with this environment

### 6. Generate SSH Key Pair (if not already done)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f deploy_key -N ""
```

- Add `deploy_key.pub` to `~/.ssh/authorized_keys` on the ubuntu-sshd container
- Add the contents of `deploy_key` (private key) as the `DEPLOY_SSH_PRIVATE_KEY` secret
