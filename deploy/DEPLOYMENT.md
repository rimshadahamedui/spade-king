# R-SPADE production deployment (VPS)

## Live URL
- API / Socket.IO: **https://spade.rimozo.com**
- Health: `https://spade.rimozo.com/health`

## Server layout (isolated from other apps)
| Item | Value |
|------|--------|
| App directory | `/opt/r-spade` |
| PM2 process | `r-spade-api` (1 instance, port **4010**) |
| Nginx site | `/etc/nginx/sites-available/spade.rimozo.com` |
| SSL | Let's Encrypt (auto-renew via certbot) |

Other projects (`fullfill`, `rimowallet`, `backend` on :5000) were **not modified**.

## Mobile `.env` for friends
```env
EXPO_PUBLIC_API_URL=https://spade.rimozo.com
EXPO_PUBLIC_SOCKET_URL=https://spade.rimozo.com
```

## Useful commands (SSH)
```bash
pm2 logs r-spade-api
pm2 restart r-spade-api
curl -s http://127.0.0.1:4010/health
nginx -t && systemctl reload nginx
```

## Redeploy after code changes
From your PC (in repo root):
```bash
cd backend && tar -czf ../rspade-backend.tgz --exclude=node_modules --exclude=dist --exclude=.env .
# upload rspade-backend.tgz + run remote-setup.sh on server
```

## Security
- Rotate VPS root password and MongoDB password (credentials were shared in chat).
- Production JWT secrets are generated on the server in `/opt/r-spade/.env`.
