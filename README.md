# Custa sales workspace

Custa adds a LinkedIn sales workflow to the Next.js app in this T3 Turbo
monorepo. Next.js and React render the workspace with Tailwind and the shared
UI package. Better Auth identifies the business owner, tRPC exposes typed
procedures, and Drizzle persists profiles, leads, and orders in Postgres.
The existing TanStack Start and Expo apps are also part of the workspace.

## Run Custa

### With Docker Compose

Copy `.env.example` to `.env` and set a generated `AUTH_SECRET`.
Set `PROJECT_PRODUCTION_URL` to the full origin you open in your browser.
It defaults to `http://localhost:3000`. For a public instance, use your own
HTTPS origin and forward traffic to the app's localhost port with your
reverse proxy. Preserve the incoming host and forward the original HTTPS
scheme. If your buyer-facing order origin differs, set `SALES_PUBLIC_URL`.

```sh
docker compose up --build -d
```

Compose starts Postgres 17 on Alpine
with a persistent volume, applies the Drizzle schema, and starts the
Next.js app and local sales MCP server. Ports are bound to localhost.
Compose supplies the container database and MCP addresses automatically.

Create the first owner before signing in. Supply a password of 12 to 128
characters. In PowerShell 7, run:

```powershell
Read-Host "Owner password" -MaskInput | docker compose exec -T app pnpm --filter @acme/nextjs owner:password owner@example.com "Owner"
```

In Bash, run:

```bash
read -rsp 'Owner password: ' owner_password
printf '%s\n' "$owner_password" | docker compose exec -T app pnpm --filter @acme/nextjs owner:password owner@example.com "Owner"
unset owner_password
```

Open Custa at `PROJECT_PRODUCTION_URL` and sign in. Account provisioning
requires access to the instance and public sign-up is disabled. To migrate
an existing account, run the same command with its original email. Custa
preserves its user ID and workspace, sets the local password, and revokes
active sessions. Use the command again to reset a password.

The local MCP returns sample pitches and fictional prospects. Outreach
and email are simulated, with duplicate requests suppressed until the MCP
server restarts. Use `docker compose logs sales-mcp` to find the test order
link after simulating outreach. Keep the default local credentials and token
for local testing.

To start just Postgres and MCP while running Next.js on the host, use
`docker compose up --build postgres sales-mcp`. In `.env`, use the example
`POSTGRES_URL` and set `SALES_MCP_URL=http://localhost:8080/mcp`,
`SALES_MCP_TOKEN=custa-local-mcp`.
Then apply the schema and start Next.js using the commands below.

### Run Next.js on the host

1. Use the Node and pnpm versions in the root package manifest and run `pnpm install`.
2. Copy `.env.example` to `.env` and set `POSTGRES_URL`, `AUTH_SECRET`, and
   `PROJECT_PRODUCTION_URL`. Set `POSTGRES_DIRECT_URL` for schema management
   if your runtime URL connects through a pooler.
3. Run `pnpm db:push` against your development database.
4. Provision an owner using the command above without the
   `docker compose exec -T app` prefix.
5. Run `pnpm dev:next` and open the URL printed by Next.js.

Each signed-in owner has one business profile. Save the business details,
generate a pitch, and search LinkedIn. Review and edit each outreach message
before sending. The app adds a private, single-use order submission link.
The buyer submits their contact and order details without signing in. Custa
stores the request before attempting email notification and lets the owner
retry a pending notification from the workspace. Requests are recorded for
business fulfillment.

## Optional social sign-in

Set the client ID and secret for each provider you want to enable in `.env`.
Register the callback below on the provider's developer portal, using your
exact `PROJECT_PRODUCTION_URL` as the origin. Restart the app after editing
`.env`. With Compose, run `docker compose up -d app` to apply the environment.
The sign-in page shows providers with a complete credential pair.

| Provider | Environment variables | Callback path |
| --- | --- | --- |
| [Google](https://better-auth.com/docs/authentication/google) | `AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_CLIENT_SECRET` | `/api/auth/callback/google` |
| [Apple](https://developer.apple.com/help/account/capabilities/configure-sign-in-with-apple-for-the-web) | `AUTH_APPLE_CLIENT_ID`, `AUTH_APPLE_CLIENT_SECRET` | `/api/auth/callback/apple` |
| [LinkedIn](https://learn.microsoft.com/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2) | `AUTH_LINKEDIN_CLIENT_ID`, `AUTH_LINKEDIN_CLIENT_SECRET` | `/api/auth/callback/linkedin` |

Apple requires a registered HTTPS domain. Use the Services ID and a signed
client-secret JWT. Renew the JWT before it expires. For LinkedIn, enable
the **Sign In with LinkedIn using OpenID Connect** product.

An instance operator still provisions each owner. To connect a provider
on first sign-in, use a provider account that verifies the same email
address as the existing Custa owner account.
For Apple, share that email if prompted. Password sign-in remains available.

## Bring your own sales MCP instance

Configure `SALES_MCP_URL` as the trusted provider's Streamable HTTP endpoint,
`SALES_MCP_TOKEN` as its service bearer token, and `SALES_PUBLIC_URL` as the
customer-reachable origin of the deployed Next.js app when it differs from
`PROJECT_PRODUCTION_URL`. Use HTTPS for public endpoints. Compose uses its
bundled local MCP by default. The app also accepts a compatible MCP server
you operate when you run the app outside the bundled Compose setup.

The MCP server must expose these tools using the
2025-11-25 MCP handshake or a supported earlier Streamable HTTP version.
Return each output as MCP `structuredContent` or as JSON in the first text
content item. The `business` argument contains `name`, `offering`, `audience`,
`market`, and `terms`.

| Tool | Arguments | Output |
| --- | --- | --- |
| `create_sales_pitch` | `ownerId`, `business` | `{ pitch }` |
| `research_linkedin_market` | `ownerId`, `business`, `limit` | `{ research, leads: [{ name, company, rationale, profileUrl }] }` |
| `send_linkedin_outreach` | `ownerId`, `idempotencyKey`, `profileUrl`, `message` | `{ accepted: true }` |
| `send_order_email` | `ownerId`, `idempotencyKey`, `to`, `order: { id, name, email, details }` | `{ accepted: true }` |

Research should return actual LinkedIn member URLs under
`https://www.linkedin.com/in/` and up to the requested number of leads.
The provider must bind `ownerId` to that owner's authorized LinkedIn account
and enforce account isolation. Use an authorized LinkedIn data and messaging
integration. LinkedIn's self-service permissions do not grant prospect search
or direct messaging access. See [LinkedIn API permissions](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access).

For outreach and email, the provider must deduplicate by owner, tool, and
idempotency key, including concurrent requests. Repeat calls for an already
accepted action must return the original acceptance. The email provider should
send the persisted order details to the business inbox using its configured
sender. Provider acceptance is the status shown in the workspace.

---

# create-t3-turbo

> [!NOTE]
>
> create-t3-turbo now includes the option to use Tanstack Start for the web app!

## Installation

> [!NOTE]
>
> Make sure to follow the system requirements specified in [`package.json#engines`](./package.json#L4) before proceeding.

There are two ways of initializing an app using the `create-t3-turbo` starter. You can either use this repository as a template:

![use-as-template](https://github.com/t3-oss/create-t3-turbo/assets/51714798/bb6c2e5d-d8b6-416e-aeb3-b3e50e2ca994)

or use Turbo's CLI to init your project (use PNPM as package manager):

```bash
npx create-turbo@latest -e https://github.com/t3-oss/create-t3-turbo
```

## About

Ever wondered how to migrate your T3 application into a monorepo? Stop right here! This is the perfect starter repo to get you running with the perfect stack!

It uses [Turborepo](https://turborepo.com) and contains:

```text
.github
  └─ workflows
        └─ CI with pnpm cache setup
.vscode
  └─ Recommended extensions and settings for VSCode users
apps
  ├─ expo
  │   ├─ Expo SDK 54
  │   ├─ React Native 0.81 using React 19
  │   ├─ Navigation using Expo Router
  │   ├─ Tailwind CSS v4 using NativeWind v5
  │   └─ Typesafe API calls using tRPC
  ├─ nextjs
  │   ├─ Next.js 15
  │   ├─ React 19
  │   ├─ Tailwind CSS v4
  │   └─ E2E Typesafe API Server & Client
  └─ tanstack-start
      ├─ Tanstack Start v1 (rc)
      ├─ React 19
      ├─ Tailwind CSS v4
      └─ E2E Typesafe API Server & Client
packages
  ├─ api
  │   └─ tRPC v11 router definition
  ├─ auth
  │   └─ Authentication using better-auth.
  ├─ db
  │   └─ Typesafe db calls using Drizzle and Postgres
  └─ ui
      └─ Start of a UI package for the webapp using shadcn-ui
tooling
  ├─ eslint
  │   └─ shared, fine-grained, eslint presets
  ├─ prettier
  │   └─ shared prettier configuration
  ├─ tailwind
  │   └─ shared tailwind theme and configuration
  └─ typescript
      └─ shared tsconfig you can extend from
```

> In this template, we use `@acme` as a placeholder for package names. As a user, you might want to replace it with your own organization or project name. You can use find-and-replace to change all the instances of `@acme` to something like `@my-company` or `@project-name`.

## Quick Start

> **Note**
> The [db](./packages/db) package uses node-postgres in the Node.js runtime.
> It accepts a connection string for either local Postgres or a hosted Postgres provider.

To get it running, follow the steps below:

### 1. Setup dependencies

> [!NOTE]
>
> While the repo does contain both a Next.js and Tanstack Start version of a web app, you can pick which one you like to use and delete the other folder before starting the setup.

```bash
# Install dependencies
pnpm i

# Configure environment variables
# There is an `.env.example` in the root directory you can use for reference
cp .env.example .env

# Push the Drizzle schema to the database
pnpm db:push
```

### 2. Generate Better Auth Schema

This project uses [Better Auth](https://www.better-auth.com) for authentication. The auth schema needs to be generated using the Better Auth CLI before you can use the authentication features.

```bash
# Generate the Better Auth schema
pnpm --filter @acme/auth generate
```

This command runs the Better Auth CLI with the following configuration:

- **Config file**: `packages/auth/script/auth-cli.ts` - A CLI-only configuration file (isolated from src to prevent imports)
- **Output**: `packages/db/src/auth-schema.ts` - Generated Drizzle schema for authentication tables

The generation process:

1. Reads the Better Auth configuration from `packages/auth/script/auth-cli.ts`
2. Generates the appropriate database schema based on your auth setup
3. Outputs a Drizzle-compatible schema file to the `@acme/db` package

> **Note**: The `auth-cli.ts` file is placed in the `script/` directory (instead of `src/`) to prevent accidental imports from other parts of the codebase. This file is exclusively for CLI schema generation and should **not** be used directly in your application. For runtime authentication, use the configuration from `packages/auth/src/index.ts`.

For more information about the Better Auth CLI, see the [official documentation](https://www.better-auth.com/docs/concepts/cli#generate).

### 3. Configure Expo `dev`-script

#### Use iOS Simulator

1. Make sure you have XCode and XCommand Line Tools installed [as shown on expo docs](https://docs.expo.dev/workflow/ios-simulator).

   > **NOTE:** If you just installed XCode, or if you have updated it, you need to open the simulator manually once. Run `npx expo start` from `apps/expo`, and then enter `I` to launch Expo Go. After the manual launch, you can run `pnpm dev` in the root directory.

   ```diff
   +  "dev": "expo start --ios",
   ```

2. Run `pnpm dev` at the project root folder.

#### Use Android Emulator

1. Install Android Studio tools [as shown on expo docs](https://docs.expo.dev/workflow/android-studio-emulator).

2. Change the `dev` script at `apps/expo/package.json` to open the Android emulator.

   ```diff
   +  "dev": "expo start --android",
   ```

3. Run `pnpm dev` at the project root folder.

### 4. Connect Expo to Custa

Set `EXPO_PUBLIC_PROJECT_PRODUCTION_URL` to a Custa origin that the device
can reach. Create an owner on that instance and use the same email and
password in Expo. For local TanStack Start, set `PROJECT_PRODUCTION_URL`
to its origin, such as `http://localhost:3001`.

### 5a. When it's time to add a new UI component

Run the `ui-add` script to add a new UI component using the interactive `shadcn/ui` CLI:

```bash
pnpm ui-add
```

When the component(s) has been installed, you should be good to go and start using it in your app.

### 5b. When it's time to add a new package

To add a new package, simply run `pnpm turbo gen init` in the monorepo root. This will prompt you for a package name as well as if you want to install any dependencies to the new package (of course you can also do this yourself later).

The generator sets up the `package.json`, `tsconfig.json` and a `index.ts`, as well as configures all the necessary configurations for tooling around your package such as formatting, linting and typechecking. When the package is created, you're ready to go build out the package.

## FAQ

### Does the starter include Solito?

No. Solito will not be included in this repo. It is a great tool if you want to share code between your Next.js and Expo app. However, the main purpose of this repo is not the integration between Next.js and Expo — it's the code splitting of your T3 App into a monorepo. The Expo app is just a bonus example of how you can utilize the monorepo with multiple apps but can just as well be any app such as Vite, Electron, etc.

Integrating Solito into this repo isn't hard, and there are a few [official templates](https://github.com/nandorojo/solito/tree/master/example-monorepos) by the creators of Solito that you can use as a reference.

### Does this pattern leak backend code to my client applications?

No, it does not. The `api` package should only be a production dependency in the Next.js application where it's served. The Expo app, and all other apps you may add in the future, should only add the `api` package as a dev dependency. This lets you have full typesafety in your client applications, while keeping your backend code safe.

If you need to share runtime code between the client and server, such as input validation schemas, you can create a separate `shared` package for this and import it on both sides.

## Deployment

### Next.js

Use the Docker Compose setup above on the host you manage. Set
`PROJECT_PRODUCTION_URL` to your instance's browser-facing origin.

### Expo

Deploying your Expo application works slightly differently compared to Next.js on the web. Instead of "deploying" your app online, you need to submit production builds of your app to app stores, like [Apple App Store](https://www.apple.com/app-store) and [Google Play](https://play.google.com/store/apps). You can read the full [guide to distributing your app](https://docs.expo.dev/distribution/introduction), including best practices, in the Expo docs.

1. Set `EXPO_PUBLIC_PROJECT_PRODUCTION_URL` to your Custa instance's origin.

2. Let's start by setting up [EAS Build](https://docs.expo.dev/build/introduction), which is short for Expo Application Services. The build service helps you create builds of your app, without requiring a full native development setup. The commands below are a summary of [Creating your first build](https://docs.expo.dev/build/setup).

   ```bash
   # Install the EAS CLI
   pnpm add -g eas-cli

   # Log in with your Expo account
   eas login

   # Configure your Expo app
   cd apps/expo
   eas build:configure
   ```

3. After the initial setup, you can create your first build. You can build for Android and iOS platforms and use different [`eas.json` build profiles](https://docs.expo.dev/build-reference/eas-json) to create production builds or development, or test builds. Let's make a production build for iOS.

   ```bash
   eas build --platform ios --profile production
   ```

   > If you don't specify the `--profile` flag, EAS uses the `production` profile by default.

4. Now that you have your first production build, you can submit this to the stores. [EAS Submit](https://docs.expo.dev/submit/introduction) can help you send the build to the stores.

   ```bash
   eas submit --platform ios --latest
   ```

   > You can also combine build and submit in a single command, using `eas build ... --auto-submit`.

5. Before you can get your app in the hands of your users, you'll have to provide additional information to the app stores. This includes screenshots, app information, privacy policies, etc. _While still in preview_, [EAS Metadata](https://docs.expo.dev/eas/metadata) can help you with most of this information.

6. Once everything is approved, your users can finally enjoy your app. Let's say you spotted a small typo; you'll have to create a new build, submit it to the stores, and wait for approval before you can resolve this issue. In these cases, you can use EAS Update to quickly send a small bugfix to your users without going through this long process. Let's start by setting up EAS Update.

   The steps below summarize the [Getting started with EAS Update](https://docs.expo.dev/eas-update/getting-started/#configure-your-project) guide.

   ```bash
   # Add the `expo-updates` library to your Expo app
   cd apps/expo
   pnpm expo install expo-updates

   # Configure EAS Update
   eas update:configure
   ```

7. Before we can send out updates to your app, you have to create a new build and submit it to the app stores. For every change that includes native APIs, you have to rebuild the app and submit the update to the app stores. See steps 2 and 3.

8. Now that everything is ready for updates, let's create a new update for `production` builds. With the `--auto` flag, EAS Update uses your current git branch name and commit message for this update. See [How EAS Update works](https://docs.expo.dev/eas-update/how-eas-update-works/#publishing-an-update) for more information.

   ```bash
   cd apps/expo
   eas update --auto
   ```

   > Your OTA (Over The Air) updates must always follow the app store's rules. You can't change your app's primary functionality without getting app store approval. But this is a fast way to update your app for minor changes and bug fixes.

9. Done! Now that you have created your production build, submitted it to the stores, and installed EAS Update, you are ready for anything!

## References

The stack originates from [create-t3-app](https://github.com/t3-oss/create-t3-app).

A [blog post](https://jumr.dev/blog/t3-turbo) where I wrote how to migrate a T3 app into this.
