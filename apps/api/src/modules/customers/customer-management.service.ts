import { AppError } from "../../middleware/error.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import type {
  CreateCustomerProfileInput,
  CustomerSearchQuery,
  UpdateCustomerProfileInput
} from "./customer-management.schemas.js";

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? fullName,
    lastName: parts.slice(1).join(" ") || parts[0] || fullName
  };
}

function pagination(query: CustomerSearchQuery) {
  return {
    take: query.take + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {})
  };
}

function pageResult<T extends { id: string }>(items: T[], take: number) {
  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;

  return {
    data,
    nextCursor: hasMore ? data[data.length - 1]?.id ?? null : null
  };
}

async function requireCustomer(dealerId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      dealerId,
      deletedAt: null
    }
  });

  if (!customer) {
    throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
  }

  return customer;
}

export const customerManagementService = {
  async createProfile(dealerId: string, input: CreateCustomerProfileInput) {
    const names = splitFullName(input.fullName);

    return prisma.customer.create({
      data: {
        dealerId,
        fullName: input.fullName,
        firstName: names.firstName,
        lastName: names.lastName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        nationalId: input.nationalId,
        emergencyContact: (input.emergencyContact ?? {}) as Prisma.JsonObject,
        city: input.city,
        state: input.state,
        country: input.country,
        metadata: input.metadata as Prisma.JsonObject
      }
    });
  },

  async profile(dealerId: string, customerId: string) {
    await requireCustomer(dealerId, customerId);

    return prisma.customer.findFirst({
      where: {
        id: customerId,
        dealerId,
        deletedAt: null
      },
      include: {
        contracts: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" }
        },
        devices: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" }
        },
        payments: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" }
        }
      }
    });
  },

  async updateProfile(dealerId: string, customerId: string, input: UpdateCustomerProfileInput) {
    await requireCustomer(dealerId, customerId);

    const names = input.fullName ? splitFullName(input.fullName) : {};

    return prisma.customer.update({
      where: { id: customerId },
      data: {
        ...names,
        fullName: input.fullName,
        phone: input.phone,
        email: input.email,
        address: input.address,
        nationalId: input.nationalId,
        emergencyContact: input.emergencyContact as Prisma.JsonObject | undefined,
        city: input.city,
        state: input.state,
        country: input.country,
        metadata: input.metadata as Prisma.JsonObject | undefined
      }
    });
  },

  async search(dealerId: string, query: CustomerSearchQuery) {
    const customers = await prisma.customer.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.email ? { email: { contains: query.email, mode: "insensitive" } } : {}),
        ...(query.phone ? { phone: { contains: query.phone, mode: "insensitive" } } : {}),
        ...(query.nationalId ? { nationalId: { contains: query.nationalId, mode: "insensitive" } } : {}),
        ...(query.q
          ? {
              OR: [
                { fullName: { contains: query.q, mode: "insensitive" } },
                { firstName: { contains: query.q, mode: "insensitive" } },
                { lastName: { contains: query.q, mode: "insensitive" } },
                { email: { contains: query.q, mode: "insensitive" } },
                { phone: { contains: query.q, mode: "insensitive" } },
                { nationalId: { contains: query.q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    return pageResult(customers, query.take);
  },

  async contractHistory(dealerId: string, customerId: string) {
    await requireCustomer(dealerId, customerId);

    return prisma.contract.findMany({
      where: {
        dealerId,
        customerId,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
      include: {
        device: true
      }
    });
  },

  async paymentHistory(dealerId: string, customerId: string) {
    await requireCustomer(dealerId, customerId);

    return prisma.payment.findMany({
      where: {
        dealerId,
        customerId,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" },
      include: {
        contract: true
      }
    });
  },

  async assignedDevices(dealerId: string, customerId: string) {
    await requireCustomer(dealerId, customerId);

    return prisma.device.findMany({
      where: {
        dealerId,
        customerId,
        deletedAt: null
      },
      orderBy: { createdAt: "desc" }
    });
  }
};
