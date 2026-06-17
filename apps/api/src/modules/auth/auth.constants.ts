export const Roles = {
  SuperAdmin: "Super Admin",
  Dealer: "Dealer",
  SalesAgent: "Sales Agent",
  Customer: "Customer"
} as const;

export const Permissions = {
  AuthLogin: "auth:login",
  AuthRefresh: "auth:refresh",
  AuthLogout: "auth:logout",
  UsersRead: "users:read",
  UsersManage: "users:manage",
  RolesManage: "roles:manage",
  PlatformManage: "platform:manage",
  DealersCreate: "dealers:create",
  DealersSuspend: "dealers:suspend",
  DealersDelete: "dealers:delete",
  DealersStatistics: "dealers:statistics",
  CustomersCreate: "customers:create",
  CustomersRead: "customers:read",
  CustomersManage: "customers:manage",
  CustomersHistoryRead: "customers:history:read",
  DevicesRegister: "devices:register",
  ContractsCreate: "contracts:create",
  ContractsRead: "contracts:read",
  ContractsManage: "contracts:manage",
  ContractsStatus: "contracts:status",
  PaymentsRead: "payments:read",
  PaymentsInitialize: "payments:initialize",
  PaymentsValidate: "payments:validate",
  LicensesIssue: "licenses:issue",
  LicensesRead: "licenses:read",
  LicensesVerify: "licenses:verify",
  LicensesDeliver: "licenses:deliver",
  LicensesDeliveryRetry: "licenses:delivery:retry",
  ReportsRead: "reports:read"
} as const;
