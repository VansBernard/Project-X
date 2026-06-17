import { ContractStatus, DealerStatus, DeviceStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware.js";
import { prisma } from "../../lib/prisma.js";
import { contractManagementService } from "../contracts/contract-management.service.js";
import type {
  CreateContractInput,
  CreateCustomerInput,
  CreateDealerInput,
  ListQueryInput,
  RegisterDeviceInput,
  SuspendDealerInput,
  UpdateCustomerInput
} from "./dealer-management.schemas.js";

function pagination(query: ListQueryInput) {
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

async function ensureActiveDealer(dealerId: string) {
  const dealer = await prisma.dealer.findFirst({
    where: {
      id: dealerId,
      status: DealerStatus.active,
      deletedAt: null
    }
  });

  if (!dealer) {
    throw new AppError(403, "DEALER_INACTIVE", "Dealer is not active.");
  }

  return dealer;
}

export const dealerManagementService = {
  async createDealer(input: CreateDealerInput) {
    return prisma.dealer.create({
      data: {
        name: input.name,
        legalName: input.legalName,
        slug: input.slug,
        email: input.email,
        phone: input.phone,
        country: input.country,
        timezone: input.timezone,
        metadata: input.metadata as Prisma.JsonObject
      }
    });
  },

  async suspendDealer(dealerId: string, input: SuspendDealerInput) {
    const dealer = await prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    }

    return prisma.dealer.update({
      where: { id: dealerId },
      data: {
        status: DealerStatus.suspended,
        suspendedAt: new Date(),
        suspendedReason: input.reason
      }
    });
  },

  async deleteDealer(dealerId: string) {
    const dealer = await prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    }

    return prisma.dealer.update({
      where: { id: dealerId },
      data: {
        status: DealerStatus.deleted,
        deletedAt: new Date()
      }
    });
  },

  async listDealers(query: ListQueryInput) {
    const dealers = await prisma.dealer.findMany({
      where: {
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {})
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    return pageResult(dealers, query.take);
  },

  async dealerStatistics(dealerId: string) {
    const dealer = await prisma.dealer.findFirst({
      where: { id: dealerId, deletedAt: null }
    });

    if (!dealer) {
      throw new AppError(404, "DEALER_NOT_FOUND", "Dealer was not found.");
    }

    const [
      customers,
      devices,
      activeContracts,
      completedContracts,
      successfulPayments,
      paymentTotals
    ] = await Promise.all([
      prisma.customer.count({ where: { dealerId, deletedAt: null } }),
      prisma.device.count({ where: { dealerId, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, status: ContractStatus.active, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, status: ContractStatus.completed, deletedAt: null } }),
      prisma.payment.count({ where: { dealerId, status: PaymentStatus.successful, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { dealerId, status: PaymentStatus.successful, deletedAt: null },
        _sum: { amount: true }
      })
    ]);

    return {
      dealer,
      totals: {
        customers,
        devices,
        activeContracts,
        completedContracts,
        successfulPayments,
        successfulPaymentAmount: paymentTotals._sum.amount ?? 0
      }
    };
  },

  async createCustomer(dealerId: string, input: CreateCustomerInput) {
    await ensureActiveDealer(dealerId);

    return prisma.customer.create({
      data: {
        dealerId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        metadata: input.metadata as Prisma.JsonObject
      }
    });
  },

  async listCustomers(dealerId: string, query: ListQueryInput) {
    await ensureActiveDealer(dealerId);

    const customers = await prisma.customer.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {})
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    return pageResult(customers, query.take);
  },

  async updateCustomer(dealerId: string, customerId: string, input: UpdateCustomerInput) {
    await ensureActiveDealer(dealerId);

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, dealerId, deletedAt: null }
    });

    if (!customer) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
    }

    return prisma.customer.update({
      where: { id: customerId },
      data: {
        ...input,
        metadata: input.metadata as Prisma.JsonObject | undefined
      }
    });
  },

  async registerDevice(dealerId: string, input: RegisterDeviceInput) {
    await ensureActiveDealer(dealerId);

    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: input.customerId, dealerId, deletedAt: null }
      });

      if (!customer) {
        throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
      }
    }

    return prisma.device.create({
      data: {
        dealerId,
        customerId: input.customerId,
        serialNumber: input.serialNumber,
        manufacturer: input.manufacturer,
        model: input.model,
        hardwareFingerprint: input.hardwareFingerprint,
        status: input.customerId ? DeviceStatus.assigned : DeviceStatus.inventory,
        metadata: input.metadata as Prisma.JsonObject
      }
    });
  },

  async createContract(dealerId: string, input: CreateContractInput) {
    await ensureActiveDealer(dealerId);
    return contractManagementService.create(dealerId, input);
  },

  async listPayments(dealerId: string, query: ListQueryInput) {
    await ensureActiveDealer(dealerId);

    const payments = await prisma.payment.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status as never } : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        contract: true
      },
      ...pagination(query)
    });

    return pageResult(payments, query.take);
  },

  async reports(dealerId: string) {
    await ensureActiveDealer(dealerId);

    const [
      customerCount,
      deviceCount,
      contractCount,
      defaultedContracts,
      paymentCount,
      paymentTotals
    ] = await Promise.all([
      prisma.customer.count({ where: { dealerId, deletedAt: null } }),
      prisma.device.count({ where: { dealerId, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, deletedAt: null } }),
      prisma.contract.count({ where: { dealerId, status: ContractStatus.defaulted, deletedAt: null } }),
      prisma.payment.count({ where: { dealerId, deletedAt: null } }),
      prisma.payment.aggregate({
        where: { dealerId, status: PaymentStatus.successful, deletedAt: null },
        _sum: { amount: true }
      })
    ]);

    return {
      totals: {
        customers: customerCount,
        devices: deviceCount,
        contracts: contractCount,
        defaultedContracts,
        payments: paymentCount,
        successfulPaymentAmount: paymentTotals._sum.amount ?? 0
      }
    };
  }
};
