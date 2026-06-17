# Project X Admin Dashboard - Architecture & Documentation

## Overview

The Project X Admin Dashboard is a comprehensive React application built with Vite, TypeScript, and Tailwind CSS. It provides complete management capabilities for dealers, customers, devices, contracts, payments, licenses, and reporting with real-time analytics.

## Technology Stack

- **Frontend Framework**: React 18+ with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React Context + Hooks
- **Routing**: React Router v6
- **API**: Fetch API with custom hooks for data fetching
- **Charts**: Placeholder ready for Chart.js, D3, or Recharts

## Project Structure

```
apps/admin/src/
├── components/               # Reusable UI components
│   ├── Analytics.tsx         # Stats cards, charts, metrics, KPIs
│   ├── Button.tsx            # Button component
│   ├── Card.tsx              # Card layout component
│   ├── DataTable.tsx         # Sortable, paginated data table
│   ├── EmptyState.tsx        # Empty state display
│   ├── ErrorState.tsx        # Error display
│   ├── Form.tsx              # Form fields and containers
│   ├── Input.tsx             # Text input component
│   ├── LoadingState.tsx      # Loading skeleton/spinner
│   ├── Modal.tsx             # Modal dialog component
│   ├── NavItem.tsx           # Navigation item
│   ├── PageHeader.tsx        # Page title and actions
│   ├── Sidebar.tsx           # Main navigation sidebar
│   ├── StatusBadge.tsx       # Status indicator badge
│   └── Topbar.tsx            # Top navigation bar
├── context/                  # Global state management
│   ├── AppContext.tsx        # App-wide state provider
│   └── AuthContext.tsx       # Authentication context (existing)
├── layouts/                  # Page layouts
│   ├── AuthLayout.tsx        # Auth pages layout
│   └── DashboardLayout.tsx   # Main dashboard layout
├── lib/                      # Utilities and APIs
│   ├── api.ts                # API client (existing)
│   └── hooks.ts              # Custom React hooks for data
├── pages/                    # Page components
│   ├── AdminDashboardPage.tsx    # Main dashboard with KPIs
│   ├── DealersPage.tsx          # Dealer management
│   ├── CustomersPage.tsx        # Customer management
│   ├── DevicesPage.tsx          # Device management
│   ├── ContractsPage.tsx        # Contract management
│   ├── PaymentsPage.tsx         # Payment management
│   ├── LicensesPage.tsx         # License management
│   ├── ReportsPage.tsx          # Report generation
│   ├── SettingsPage.tsx         # Admin settings
│   └── [Auth pages]             # Existing auth pages
├── routes/                   # Router configuration
│   ├── index.tsx             # Route configuration
│   └── ProtectedRoute.tsx    # Route protection wrapper
├── types/                    # TypeScript definitions
│   └── index.ts              # All type definitions
├── App.tsx                   # Main app component
└── main.tsx                  # Entry point
```

## Core Components

### Analytics & Metrics
**File**: `components/Analytics.tsx`

#### StatCard
Display single KPI with trend indicator
```tsx
<StatCard
  title="Total Revenue"
  value="$125,430"
  change={{ value: 12, direction: 'up', period: 'vs last month' }}
  icon="💰"
/>
```

#### ChartContainer
Wrapper for chart visualizations
```tsx
<ChartContainer title="Revenue Trend" subtitle="Last 30 days">
  {/* Chart goes here */}
</ChartContainer>
```

#### MetricBadge
Small colored badge for metrics
```tsx
<MetricBadge label="Active Dealers" value={42} color="green" />
```

#### ProgressBar
Visual progress indicator
```tsx
<ProgressBar value={75} label="Revenue Target" color="green" />
```

### Data Display
**File**: `components/DataTable.tsx`

Generic, sortable, and paginated table component
```tsx
const columns: Column<Dealer>[] = [
  { key: 'name', label: 'Name', sortable: true },
  {
    key: 'revenue',
    label: 'Revenue',
    render: (value) => `$${value.toLocaleString()}`,
  },
];

<DataTable
  columns={columns}
  data={dealers}
  loading={loading}
  onRowClick={(dealer) => handleSelect(dealer)}
  actions={(dealer) => <Button onClick={() => edit(dealer)}>Edit</Button>}
/>
```

### Forms
**File**: `components/Form.tsx`

#### Form Container
```tsx
<Form onSubmit={handleSubmit} onCancel={handleCancel}>
  <FormField
    label="Dealer Name"
    name="name"
    value={formData.name}
    onChange={(value) => setFormData({ ...formData, name: value })}
    required
  />
  <SelectField
    label="Tier"
    name="tier"
    value={formData.tier}
    onChange={(value) => setFormData({ ...formData, tier: value })}
    options={[
      { value: 'bronze', label: 'Bronze' },
      { value: 'gold', label: 'Gold' },
    ]}
  />
  <CheckboxField
    label="Active"
    name="active"
    checked={formData.active}
    onChange={(checked) => setFormData({ ...formData, active: checked })}
  />
</Form>
```

### Modal
**File**: `components/Modal.tsx`

```tsx
<Modal
  isOpen={isOpen}
  title="Create Dealer"
  onClose={handleClose}
  onConfirm={handleConfirm}
  size="lg"
>
  <Form onSubmit={handleSubmit}>
    {/* Form fields */}
  </Form>
</Modal>
```

## State Management

### AppContext
**File**: `context/AppContext.tsx`

Global application state including:
- Current user information
- User settings (theme, language, timezone)
- Notifications
- Loading state
- Selected filters (dealer, customer)

```tsx
const { 
  currentUser, 
  userSettings, 
  addNotification, 
  selectedDealerId 
} = useApp();
```

### Custom Hooks
**File**: `lib/hooks.ts`

Data fetching and management hooks:

#### Dashboard Hooks
- `useDashboardStats()` - Fetch KPI statistics
- `useAnalyticsData(dateRange)` - Fetch analytics data

#### Module Hooks (All follow same pattern)
- `useDealers(filters)` - CRUD for dealers
- `useCustomers(filters)` - Read customers
- `useDevices(filters)` - Read devices
- `useContracts(filters)` - Read contracts
- `usePayments(filters)` - Read payments
- `useLicenses(filters)` - Read licenses
- `useReports(filters)` - Read and generate reports

Each hook returns:
```ts
{
  data: T[],           // Data array
  total: number,       // Total count
  loading: boolean,    // Loading state
  error: string | null, // Error message
  fetch: () => Promise<void>,  // Fetch data
  create?: (item) => Promise<T>,    // For writable resources
  update?: (id, updates) => Promise<T>,
  delete?: (id) => Promise<void>,
  generate?: (type, params) => Promise<Report>, // For reports
}
```

## Modules

### Dashboard (`pages/AdminDashboardPage.tsx`)
Main administrative dashboard with:
- **5 Key Performance Indicators**: Revenue, Outstanding Balance, Active Devices, Active Contracts, Licenses Issued
- **Revenue Trend Chart**: 30-day revenue visualization
- **Quick Stats**: Revenue target progress, collection rate
- **Status Summary**: Active dealers, pending payments, expired licenses
- **Recent Transactions**: Latest 5 transactions with status

### Dealers (`pages/DealersPage.tsx`)
Dealer management with:
- **Table**: Name, email, phone, tier, status, revenue
- **Filters**: Status, tier, search
- **Actions**: Add, edit, delete dealers
- **Tier System**: Bronze, Silver, Gold, Platinum
- **Status Tracking**: Active, inactive, suspended

### Customers (`pages/CustomersPage.tsx`)
Customer directory showing:
- **Table**: Name, email, phone, total spent, active contracts, licenses
- **Filters**: Dealer, status, search
- **Status**: Active, inactive, pending
- **Aggregated Data**: Revenue per customer, contract count

### Devices (`pages/DevicesPage.tsx`)
Device management showing:
- **Status**: Active, locked, inactive, compromised
- **License Status**: Valid, expiring, expired, invalid
- **Last Sync**: Device synchronization timestamp
- **Device Info**: Serial number, type, installation date

### Contracts (`pages/ContractsPage.tsx`)
Contract overview with:
- **Types**: Monthly, quarterly, annual
- **Status**: Active, pending, expired, cancelled
- **Details**: Start/end dates, value, license count
- **Renewal**: Automatic renewal flag

### Payments (`pages/PaymentsPage.tsx`)
Payment tracking with:
- **Status Dashboard**: Total collected, pending, failed
- **Methods**: Card, bank, wallet, manual
- **Details**: Amount, due date, paid date
- **Filtering**: By status, method, date range

### Licenses (`pages/LicensesPage.tsx`)
License management showing:
- **Status**: Valid, expiring, expired, suspended
- **Types**: Standard, professional, enterprise
- **Details**: License key, device assignment, expiration
- **Days Remaining**: Dynamic calculation

### Reports (`pages/ReportsPage.tsx`)
Report generation with:
- **Types**: Revenue, licenses, devices, customers, contracts, payments
- **Date Range**: Customizable report period
- **Formats**: PDF, CSV, JSON export
- **Generation**: Real-time report creation
- **Archive**: View previously generated reports

### Settings (`pages/SettingsPage.tsx`)
Administrator settings:
- **Theme**: Light/Dark/Auto
- **Language**: Multi-language support
- **Notifications**: Email, SMS preferences
- **Security**: Two-factor authentication
- **Session**: Timeout configuration

## Type Definitions

**File**: `types/index.ts`

### Main Types
- `DashboardStats` - KPI data
- `AnalyticsData` - Time-series analytics
- `Dealer` - Dealer information
- `Customer` - Customer details
- `Device` - Device status
- `Contract` - Contract details
- `Payment` - Payment transaction
- `License` - License details
- `Report` - Generated report
- `AdminUser` - Admin user info
- `UserSettings` - User preferences

### Filter Types
- `DealerFilters`, `CustomerFilters`, `DeviceFilters`, etc.

### Response Types
- `ApiResponse<T>` - Standard API response
- `PaginatedResponse<T>` - Paginated results

## Routing

**File**: `routes/index.tsx`

```
/                      → /dashboard (redirect)
/login                 → Login page
/dashboard             → Main dashboard
/dealers               → Dealers management
/customers             → Customers directory
/devices               → Device management
/contracts             → Contract management
/payments              → Payment tracking
/licenses              → License management
/reports               → Report generation
/settings              → Admin settings
*                      → /dashboard (catch-all)
```

## API Integration

### Base Configuration
```ts
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';
```

### Endpoints
```
GET    /dashboard/stats              - Dashboard KPIs
GET    /analytics                    - Analytics data
GET    /dealers                      - List dealers
POST   /dealers                      - Create dealer
PUT    /dealers/:id                  - Update dealer
DELETE /dealers/:id                  - Delete dealer
GET    /customers                    - List customers
GET    /devices                      - List devices
GET    /contracts                    - List contracts
GET    /payments                     - List payments
GET    /licenses                     - List licenses
GET    /reports                      - List reports
POST   /reports/generate             - Generate report
```

## Styling

### Dark Mode Support
All components support light/dark theme via Tailwind CSS

### Color Scheme
- **Primary**: Blue (#3B82F6)
- **Success**: Green (#10B981)
- **Warning**: Yellow (#F59E0B)
- **Danger**: Red (#EF4444)
- **Background**: White / #1F2937 (dark)

### Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)

## Features

### ✅ Implemented
- Dashboard with KPI cards and trends
- Data table with sorting and pagination
- Form fields and validation
- Modal dialogs
- Responsive layout
- Dark mode support
- Error handling
- Loading states

### 🔄 In Development
- Chart visualizations (Chart.js/Recharts)
- Advanced filtering and search
- Export functionality (PDF/CSV)
- Real-time notifications
- Audit logging

### 📋 Planned
- Dashboard customization
- Advanced analytics
- Scheduled reports
- Data visualization dashboard
- Mobile app integration
- Multi-language support
- Biometric login
- API rate limiting
- Webhook integrations

## Development

### Build
```bash
npm run build
```

### Development Server
```bash
npm run dev
```

### Environment Variables
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Project X Admin
VITE_APP_VERSION=1.0.0
```

### Testing
```bash
npm run test
```

## Best Practices

### Component Structure
- Use TypeScript interfaces for props
- Separate business logic from UI
- Use custom hooks for data fetching
- Keep components focused and small

### State Management
- Use AppContext for global state
- Use component state for local UI state
- Use custom hooks for data fetching
- Avoid prop drilling with context

### Performance
- Use React.memo for expensive components
- Lazy load pages with React.lazy
- Memoize callback functions
- Implement virtual scrolling for large lists

### Error Handling
- Catch API errors in hooks
- Display user-friendly messages
- Log errors to monitoring service
- Provide recovery options

## Security

- HTTPS for API communication
- JWT token authentication
- CSRF token handling
- XSS protection via React escaping
- Input validation on forms
- Rate limiting on API calls
- Secure session management

## Performance Optimizations

- Code splitting per route
- Lazy loading of modules
- Image optimization
- CSS/JS minification
- Tree shaking
- Service worker for caching
- Virtualized lists for large datasets

## Accessibility

- ARIA labels
- Keyboard navigation
- Focus management
- Color contrast compliance
- Screen reader support
- Form labels and descriptions
- Error messages and validation

## Monitoring & Analytics

- Error tracking
- Performance monitoring
- User behavior analytics
- API call tracking
- Page load metrics
- User session tracking

## Support & Maintenance

- Bug reporting: Via admin dashboard
- Feature requests: GitHub discussions
- Documentation: Wiki and README
- Support: Email support@projectx.com

## Related Documentation

- [API Documentation](../../docs/API.md)
- [License Engine](../../docs/security/license-engine.md)
- [Anti-Tampering System](../../docs/security/anti-tampering-system.md)
- [Database Schema](../../apps/api/prisma/schema.prisma)

