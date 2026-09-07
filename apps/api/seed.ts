/**
 * Database seed script.
 * Creates a development dealer and super admin user for the admin dashboard.
 */

import { prisma } from "./src/lib/prisma.js";
import { hashPassword } from "./src/lib/crypto.js";
import { Permissions, Roles } from "./src/modules/auth/auth.constants.js";

const seedDealer = {
  name: "Test Dealer",
  slug: "test-dealer",
  email: "dealer@test.com",
  phone: "+234 123 456 7890",
  country: "NG"
};

const seedAdmin = {
  email: "admin@test.com",
  password: "password123",
  firstName: "Admin",
  lastName: "User"
};

const permissionLabels: Record<string, { name: string; description: string }> = {
  [Permissions.AuthLogin]: { name: "Login", description: "Authenticate into Project X" },
  [Permissions.AuthRefresh]: { name: "Refresh Session", description: "Refresh access tokens" },
  [Permissions.AuthLogout]: { name: "Logout", description: "Revoke own session" },
  [Permissions.UsersRead]: { name: "Read Users", description: "Read users within a dealer" },
  [Permissions.UsersManage]: { name: "Manage Users", description: "Create and manage dealer users" },
  [Permissions.RolesManage]: { name: "Manage Roles", description: "Create and manage roles and permissions" },
  [Permissions.PlatformManage]: { name: "Platform Management", description: "Manage platform settings" },
  [Permissions.DealersCreate]: { name: "Create Dealers", description: "Create dealer tenants" },
  [Permissions.DealersSuspend]: { name: "Suspend Dealers", description: "Suspend dealer tenants" },
  [Permissions.DealersDelete]: { name: "Delete Dealers", description: "Soft-delete dealer tenants" },
  [Permissions.DealersStatistics]: { name: "Dealer Statistics", description: "Read dealer statistics" },
  [Permissions.CustomersCreate]: { name: "Create Customers", description: "Create customer profiles" },
  [Permissions.CustomersRead]: { name: "Read Customers", description: "Read customer profiles" },
  [Permissions.CustomersManage]: { name: "Manage Customers", description: "Update customer profiles" },
  [Permissions.CustomersHistoryRead]: { name: "Read Customer History", description: "Read customer history" },
  [Permissions.DevicesRegister]: { name: "Register Devices", description: "Register customer devices" },
  [Permissions.ContractsCreate]: { name: "Create Contracts", description: "Create customer contracts" },
  [Permissions.ContractsRead]: { name: "Read Contracts", description: "Read customer contracts" },
  [Permissions.ContractsManage]: { name: "Manage Contracts", description: "Manage customer contracts" },
  [Permissions.ContractsStatus]: { name: "Update Contract Status", description: "Update contract status" },
  [Permissions.PaymentsRead]: { name: "Read Payments", description: "Read payment records" },
  [Permissions.PaymentsInitialize]: { name: "Initialize Payments", description: "Initialize payment collection" },
  [Permissions.PaymentsValidate]: { name: "Validate Payments", description: "Validate payment references" },
  [Permissions.LicensesIssue]: { name: "Issue Licenses", description: "Issue device licenses" },
  [Permissions.LicensesRead]: { name: "Read Licenses", description: "Read device licenses" },
  [Permissions.LicensesVerify]: { name: "Verify Licenses", description: "Verify device licenses" },
  [Permissions.LicensesDeliver]: { name: "Deliver Licenses", description: "Send license delivery emails" },
  [Permissions.LicensesDeliveryRetry]: { name: "Retry License Delivery", description: "Retry license delivery jobs" },
  [Permissions.ReportsRead]: { name: "Read Reports", description: "Read reports and analytics" }
};

async function main() {
  console.log("Seeding development admin data...");

  const dealer = await prisma.dealer.upsert({
    where: { slug: seedDealer.slug },
    update: {
      name: seedDealer.name,
      email: seedDealer.email,
      phone: seedDealer.phone,
      country: seedDealer.country,
      status: "active",
      deletedAt: null
    },
    create: {
      ...seedDealer,
      status: "active",
      metadata: { source: "seed_script" }
    }
  });

  const role = await prisma.role.upsert({
    where: {
      dealerId_name: {
        dealerId: dealer.id,
        name: Roles.SuperAdmin
      }
    },
    update: {
      description: "Full platform administration role",
      isSystem: true,
      deletedAt: null
    },
    create: {
      dealerId: dealer.id,
      name: Roles.SuperAdmin,
      description: "Full platform administration role",
      isSystem: true
    }
  });

  const permissions = await Promise.all(
    Object.values(Permissions).map((key) => {
      const label = permissionLabels[key];

      return prisma.permission.upsert({
        where: {
          dealerId_key: {
            dealerId: dealer.id,
            key
          }
        },
        update: {
          name: label.name,
          description: label.description,
          deletedAt: null
        },
        create: {
          dealerId: dealer.id,
          key,
          name: label.name,
          description: label.description
        }
      });
    })
  );

  await Promise.all(
    permissions.map((permission) =>
      prisma.rolePermission.upsert({
        where: {
          dealerId_roleId_permissionId: {
            dealerId: dealer.id,
            roleId: role.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          dealerId: dealer.id,
          roleId: role.id,
          permissionId: permission.id
        }
      })
    )
  );

  const passwordHash = await hashPassword(seedAdmin.password);
  const user = await prisma.user.upsert({
    where: {
      dealerId_email: {
        dealerId: dealer.id,
        email: seedAdmin.email
      }
    },
    update: {
      roleId: role.id,
      passwordHash,
      firstName: seedAdmin.firstName,
      lastName: seedAdmin.lastName,
      status: "active",
      emailVerifiedAt: new Date(),
      deletedAt: null
    },
    create: {
      dealerId: dealer.id,
      roleId: role.id,
      email: seedAdmin.email,
      passwordHash,
      firstName: seedAdmin.firstName,
      lastName: seedAdmin.lastName,
      status: "active",
      emailVerifiedAt: new Date()
    }
  });

  console.log("Seed complete.");
  console.log(`Dealer slug: ${dealer.slug}`);
  console.log(`Admin email: ${user.email}`);
  console.log(`Admin password: ${seedAdmin.password}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
