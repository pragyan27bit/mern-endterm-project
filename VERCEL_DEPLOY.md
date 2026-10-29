# Deploy PacePilot on Vercel (without GitHub)

This edition adds a root `app.js` exported Express application for Vercel's Node.js Functions and `npm run build:vercel` to copy the Vite React build into `/public` for Vercel's CDN. Its MongoDB connection is established lazily and reused on warm instances. The original `npm run dev` and `npm start` still work for local use and traditional hosting.

## Important: protect credentials

Rotate the MongoDB database password and JWT secret if either has appeared in a screenshot or message. Keep the `.env` file local and out of Git; do **not** put secrets into `vercel.json` or `README.md`.

## Steps

1. Unzip this project and open the inner `PacePilot_Vercel` directory in VS Code.
2. Sign in or create an account at https://vercel.com (Google sign-in works).
3. From the **project root** (where `app.js` and `vercel.json` are located), run:

   ```bash
   npm install
   npm test
   npm run build:vercel
   npx --yes vercel@latest login
   npx --yes vercel@latest link
   ```

   When prompted, select your account, create a new project named `pacepilot-mern`, and **do not link a Git repository yet**. Keep root directory as `./`.

4. Open the new project in the Vercel dashboard. Under **Settings → Environment Variables** set these for **Production** (and Preview if using preview deployments):

   | Name | Value |
   | --- | --- |
   | `MONGODB_URI` | Your Atlas driver connection string (with updated database password) |
   | `JWT_SECRET` | A long random secret of at least 32 characters |
   | `NODE_ENV` | `production` |
   | `ENABLE_DEMO` | `true` (optional, public and shared demo account) |

   **Do not set `PORT`.** Vercel uses its own runtime.

5. In Atlas under Network Access, permit your deployment's outbound IPs. If you cannot use fixed outbound IPs, a temporary `0.0.0.0/0` allowlist may be needed; use a strong DB password and restrict later when possible.
6. Deploy from your Mac:

   ```bash
   npx --yes vercel@latest --prod
   ```

7. Open the URL printed by the CLI. Check `<live-url>/api/health` (expected `{"status":"ok"}`), then sign in or select the demo and exercise all the workflows. If errors occur, review the **Runtime Logs** in the Vercel dashboard.
8. Record your demo and add both the deployment URL and video link to the README, then push your final code to GitHub. Never commit `.env`.

## If you want to deploy using the browser only

Visit https://vercel.com/drop and upload this project folder, then configure the same Vercel environment variables and redeploy. The CLI route above is preferred because it's easier to update the same Vercel project when you change its configuration.

## Local development

Use `npm run dev` with a local `.env` file in the project root. If port 5000 is occupied on macOS, change `PORT=5001` in `.env` and `client/vite.config.js` proxy to `http://localhost:5001` (do not set that port on Vercel).

## Notes

- A live Vercel deployment is not included; you need to sign in and deploy it with your own account and Atlas secrets.
- The Vercel production backend is a serverless Express Function, not an always-listening port.
- Local tests and syntax checks cover application logic, but full cloud deployment depends on Vercel configuration and MongoDB network access.
- The existing README's Render instructions remain relevant only to a Render deployment. For Vercel, use this file.
