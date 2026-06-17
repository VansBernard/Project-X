# Project X Admin Dashboard

React admin dashboard for Project X, built with Vite, TypeScript, and Tailwind CSS.

## Features

- Authentication screens for login, forgot password, and reset password
- Protected dashboard shell with sidebar, topbar, logout, and mobile navigation
- Dashboard overview with API health status
- Tenants page backed by `GET /api/v1/admin/dealers`
- Users page backed by the customer search endpoint, `GET /api/v1/customers`
- Placeholder pages for Devices, Licenses / Unlock Tokens, Audit Logs, and Settings
- Shared loading, error, empty, page header, and status badge components

## Getting Started

From the repository root:

```bash
npm install
```

Copy the admin environment template:

```bash
cp apps/admin/.env.example apps/admin/.env.local
```

Set the local API URL and dealer slug:

```text
VITE_API_URL=http://localhost:4000/api/v1
VITE_DEALER_SLUG=your-dealer-slug
```

Run the dashboard:

```bash
npm --workspace apps/admin run dev
```

Build the dashboard:

```bash
npm --workspace apps/admin run build
```

Typecheck the dashboard:

```bash
npm --workspace apps/admin run lint
```

## API Integration

The API client lives at `src/lib/api.ts`.

Authentication methods:

- `login(email, password)` -> `POST /api/v1/auth/login`
- `forgotPassword(email)` -> `POST /api/v1/auth/password/forgot`
- `resetPassword(token, password)` -> `POST /api/v1/auth/password/reset`
- `getMe()` -> `GET /api/v1/auth/me`
- `refresh()` -> `POST /api/v1/auth/refresh`
- `logout()` -> `POST /api/v1/auth/logout`

Admin data methods:

- `health()` -> `GET /api/v1/health`
- `listDealers()` -> `GET /api/v1/admin/dealers`
- `searchCustomers()` -> `GET /api/v1/customers`

Tenants page requirements:

- Backend role: `super_admin`
- Backend permission: `dealers:statistics`

Users page requirements:

- Backend roles: `super_admin`, `dealer`, or `sales_agent`
- Backend permission: `customers:read`
- Note: this page currently displays customer records because there is no dedicated admin users endpoint yet.

## Project Structure

```text
apps/admin/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  src/
    main.tsx
    App.tsx
    index.css
    lib/api.ts
    context/AuthContext.tsx
    routes/ProtectedRoute.tsx
    layouts/
      AuthLayout.tsx
      DashboardLayout.tsx
    components/
      Button.tsx
      Card.tsx
      EmptyState.tsx
      ErrorState.tsx
      Input.tsx
      LoadingState.tsx
      NavItem.tsx
      PageHeader.tsx
      Sidebar.tsx
      StatusBadge.tsx
      Topbar.tsx
    pages/
      LoginPage.tsx
      ForgotPasswordPage.tsx
      ResetPasswordPage.tsx
      DashboardPage.tsx
      TenantsPage.tsx
      UsersPage.tsx
      DevicesPage.tsx
      LicensesPage.tsx
      AuditLogsPage.tsx
      SettingsPage.tsx
```

## Troubleshooting

If login fails:

1. Verify the API server is running at `VITE_API_URL`.
2. Check that `VITE_DEALER_SLUG` matches the dealer slug in the API.
3. Confirm the user exists, has the required role, and has the required permissions.

If a protected data page returns an error:

1. Check the signed-in user's role and permissions.
2. Confirm the access token is present in browser application storage.
3. Check the API logs for authorization or validation errors.

## License

UNLICENSED (Internal Project X)
