# Cloudflare Tunnel Configuration

## Setup

The production compose file uses a token-based cloudflared tunnel (`CLOUDFLARE_TUNNEL_TOKEN`).
Configure the tunnel routes in the Cloudflare Zero Trust dashboard:

| Public hostname                    | Service                        |
|------------------------------------|--------------------------------|
| `twp-web.kzokvdevs.dpdns.org`     | `http://twp-prod-web:3000`      |
| `twp-api.kzokvdevs.dpdns.org`     | `http://twp-prod-api:4000`      |

## Steps

1. Go to **Cloudflare Zero Trust** > **Networks** > **Tunnels**
2. Create a new tunnel (or select existing), copy the tunnel token
3. Add the two public hostname routes above
4. Set `CLOUDFLARE_TUNNEL_TOKEN` in `infra/docker/.env.prod`
