# Open_Fridge

A web app built with Vite, TypeScript, and React for managing fridge inventory and related workflows.

## Project overview

This repository contains the Open_Fridge frontend. It uses modern web tooling (Vite + TypeScript), Tailwind CSS, and shadcn-ui components.

Key goals:

- Provide a fast, accessible UI for scanning and managing food items.
- Integrate with Supabase for backend functions and storage (see `supabase/` for serverless functions and migrations).

## Technologies

- Vite
- TypeScript
- React
- Tailwind CSS
- shadcn-ui
- Supabase (serverless functions & migrations bundled in `supabase/`)

## Prerequisites

- Node.js (recommended via nvm)
- npm or a compatible package manager (pnpm / yarn also supported but examples use npm)

- Deno (required for running the Supabase/Deno serverless functions locally)

Recommended installs:

```sh
# macOS (Homebrew)
brew install deno

# or using the official install script
curl -fsSL https://deno.land/x/install/install.sh | sh
```

If you use VS Code, install the "Deno" extension (extension id: `denoland.vscode-deno`) and enable it for the workspace so editor features and workspace Deno tooling work correctly.

Install Node with nvm:

```sh
# install nvm (if needed) — follow instructions at https://github.com/nvm-sh/nvm
# then install a recent Node.js LTS, e.g.:
nvm install --lts
nvm use --lts
```

## Local development

1. Clone the repository:

```sh
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

1. Install dependencies:

```sh
npm install
```

1. Start the dev server:

```sh
npm run dev
```

The app will run locally (Vite dev server). Open the address shown in the terminal (usually `http://localhost:5173`).

## Build for production

```sh
npm run build
```

This creates an optimized `dist/` you can deploy to any static host.

## Deploying

You can deploy the built output to any static hosting provider (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, etc.). Most providers accept the `dist/` directory produced by `npm run build`.

If you use Vercel or Netlify, simply connect the repository and set the build command to `npm run build` and the publish directory to `dist`.

## Supabase backend

This repo includes a `supabase/` folder with serverless functions and DB migrations. See that folder for details on functions such as QR generation and license management. Deploy those to your Supabase project as needed.

## Project structure (high-level)

- `src/` — main frontend source
  - `components/` — React components grouped by feature
  - `pages/` — route pages
  - `integrations/supabase/` — Supabase client and helpers
- `public/` — static assets
- `supabase/` — serverless functions and DB migrations

## Testing QR Scanner on iPhone

### Important: HTTPS Requirement

**iPhone (iOS) requires HTTPS for camera access** due to Apple's security policies. This affects QR code scanning functionality.

### Working Solutions

1. **Use the Hosted Preview (Recommended)**
   - The Lovable preview URL automatically uses HTTPS
   - Camera will work without any additional setup
   - URL format: `https://[project-id].lovableproject.com`

2. **Local Development with HTTPS Tunnel**
   
   For testing on your iPhone while developing locally, use an HTTPS tunnel:

   **Option A: Using ngrok**
   ```sh
   # Install ngrok (https://ngrok.com/)
   # Then run:
   ngrok http 8080
   
   # ngrok will provide an HTTPS URL like:
   # https://abc123.ngrok.io
   # Open this URL on your iPhone
   ```

   **Option B: Using Cloudflare Tunnel**
   ```sh
   # Install cloudflared
   cloudflared tunnel --url http://localhost:8080
   
   # Opens an HTTPS URL for testing
   ```

3. **Manual QR Code Entry Fallback**
   - The app includes a manual entry option
   - When camera can't be accessed, users can paste/type the QR code
   - Useful for testing and as a backup option

### Why This Limitation Exists

- iOS Safari and Chrome require HTTPS (or `localhost`) for camera access
- This is a security feature to prevent unauthorized camera access
- HTTP connections over local network (e.g., `http://192.168.x.x:8080`) are blocked
- Android is more permissive with HTTP on local networks

### Camera Permission Flow

1. User clicks "Scan QR Code" button
2. Scanner opens with "Start Camera" button (requires user gesture)
3. Browser requests camera permission from iOS
4. If on HTTP: Clear error message with HTTPS instructions
5. If denied: Instructions to enable in Settings
6. If granted: Camera starts scanning

### Troubleshooting

**"Camera requires HTTPS on iPhone"**
- Use the hosted preview link (HTTPS)
- Or set up an HTTPS tunnel for local development

**"Camera permission denied"**
- Go to iPhone Settings → Safari → Camera
- Set to "Allow" or "Ask"
- Reload the page and try again

**Camera works on Android but not iPhone**
- This is expected behavior due to iOS security policies
- Android allows camera access over HTTP on local networks
- iPhone requires HTTPS



1. Fork & branch from `main`.
2. Add tests or a changelog entry if applicable.
3. Submit a pull request with a clear description.

Please follow the existing TypeScript and styling conventions. Run linters and formatters before opening a PR.

## Troubleshooting

- If dev server fails to start, confirm Node version (`node -v`) and reinstall dependencies.
- If environment-specific features rely on Supabase, ensure your `.env` variables (Supabase URL/Key) are set before running.

## License & contact

Include your license here (e.g., MIT). For questions, open an issue or contact the repository owner.

---

If you'd like, I can also:

- add a short `README` section documenting how to run the included Supabase functions locally (via `supabase` CLI),
- or generate a small CONTRIBUTING.md and a basic CODE_OF_CONDUCT.md.

Let me know which you'd prefer.
