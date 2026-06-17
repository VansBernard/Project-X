import { ContractInstallmentStatus, ContractStatus, DeviceStatus, Prisma } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware.js";
import { prisma } from "../../lib/prisma.js";
import type {
  CreateContractInput,
  ListContractsQuery,
  UpdateContractStatusInput
} from "./contract-management.schemas.js";

const terminalStatuses = new Set<ContractStatus>([
  ContractStatus.completed,
  ContractStatus.defaulted,
  ContractStatus.cancelled
]);

function addMonths(date: Date, months: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function pagination(query: ListContractsQuery) {
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

function validateFinancing(input: CreateContractInput) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (input.firstDueDate < today) {
    throw new AppError(400, "INVALID_FIRST_DUE_DATE", "First due date cannot be in the past.");
  }

  if (input.deposit > input.devicePrice) {
    throw new AppError(400, "INVALID_CONTRACT_AMOUNTS", "Deposit cannot exceed device price.");
  }

  const remainingBalance = input.devicePrice - input.deposit;
  const scheduledTotal = input.installmentAmount * input.installmentCount;

  if (remainingBalance <= 0) {
    throw new AppError(400, "INVALID_REMAINING_BALANCE", "Remaining balance must be greater than zero.");
  }

  if (Math.round(scheduledTotal * 100) !== Math.round(remainingBalance * 100)) {
    throw new AppError(
      400,
      "INSTALLMENTS_DO_NOT_MATCH_BALANCE",
      "Installment amount multiplied by installment count must equal the remaining balance."
    );
  }

  return {
    remainingBalance,
    scheduledTotal
  };
}

async function requireContract(dealerId: string, contractId: string) {
  const contract = await prisma.contract.findFirst({
    where: {
      id: contractId,
      dealerId,
      deletedAt: null
    }
  });

  if (!contract) {
    throw new AppError(404, "CONTRACT_NOT_FOUND", "Contract was not found.");
  }

  return contract;
}

function assertStatusTransition(current: ContractStatus, next: ContractStatus) {
  if (current === next) {
    return;
  }

  if (terminalStatuses.has(current)) {
    throw new AppError(400, "INVALID_STATUS_TRANSITION", "Terminal contracts cannot change status.");
  }

  const allowed: Record<ContractStatus, ContractStatus[]> = {
    [ContractStatus.active]: [
      ContractStatus.completed,
      ContractStatus.defaulted,
      ContractStatus.cancelled
    ],
    [ContractStatus.completed]: [],
    [ContractStatus.defaulted]: [],
    [ContractStatus.cancelled]: []
  };

  if (!allowed[current].includes(next)) {
    throw new AppError(400, "INVALID_STATUS_TRANSITION", "Contract status transition is not allowed.");
  }
}

export const contractManagementService = {
  async create(dealerId: string, input: CreateContractInput) {
    const { remainingBalance, scheduledTotal } = validateFinancing(input);

    const [customer, device] = await Promise.all([
      prisma.customer.findFirst({
        where: { id: input.customerId, dealerId, deletedAt: null }
      }),
      input.deviceId
        ? prisma.device.findFirst({
            where: { id: input.deviceId, dealerId, deletedAt: null }
          })
        : Promise.resolve(null)
    ]);

    if (!customer) {
      throw new AppError(404, "CUSTOMER_NOT_FOUND", "Customer was not found.");
    }

    if (input.deviceId && !device) {
      throw new AppError(404, "DEVICE_NOT_FOUND", "Device was not found.");
    }

    const dueDates = Array.from({ length: input.installmentCount }, (_, index) => ({
      dealerId,
      sequenceNumber: index + 1,
      dueDate: addMonths(input.firstDueDate, index),
      amountDue: input.installmentAmount
    }));

    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.create({
        data: {
          dealerId,
          customerId: input.customerId,
          deviceId: input.deviceId,
          contractNumber: input.contractNumber,
          status: ContractStatus.active,
          currency: input.currency,
          devicePrice: input.devicePrice,
          depositAmount: input.deposit,
          remainingBalance,
          installmentAmount: input.installmentAmount,
          principalAmount: input.devicePrice,
          totalAmount: scheduledTotal,
          amountPaid: input.deposit,
          firstDueDate: input.firstDueDate,
          nextDueDate: input.firstDueDate,
          startDate: new Date(),
          endDate: addMonths(input.firstDueDate, input.installmentCount - 1),
          metadata: input.metadata as Prisma.JsonObject,
          installments: {
            create: dueDates
          }
        },
        include: {
          installments: {
            orderBy: { sequenceNumber: "asc" }
          }
        }
      });

      if (input.deviceId) {
        await tx.device.update({
          where: { id: input.deviceId },
          data: {
            customerId: input.customerId,
            status: DeviceStatus.assigned
          }
        });
      }

      return contract;
    });
  },

  async list(dealerId: string, query: ListContractsQuery) {
    const contracts = await prisma.contract.findMany({
      where: {
        dealerId,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.deviceId ? { deviceId: query.deviceId } : {}),
        ...(query.dueBefore || query.dueAfter
          ? {
              nextDueDate: {
                ...(query.dueBefore ? { lte: query.dueBefore } : {}),
                ...(query.dueAfter ? { gte: query.dueAfter } : {})
              }
            }
          : {})
      },
      include: {
        customer: true,
        device: true
      },
      orderBy: { createdAt: "desc" },
      ...pagination(query)
    });

    return pageResult(contracts, query.take);
  },

  async detail(dealerId: string, contractId: string) {
    await requireContract(dealerId, contractId);

    return prisma.contract.findFirst({
      where: { id: contractId, dealerId, deletedAt: null },
      include: {
        customer: true,
        device: true,
        installments: {
          where: { deletedAt: null },
          orderBy: { sequenceNumber: "asc" }
        }
      }
    });
  },

  async updateStatus(dealerId: string, contractId: string, input: UpdateContractStatusInput) {
    const contract = await requireContract(dealerId, contractId);
    assertStatusTransition(contract.status, input.status);
    const existingMetadata =
      contract.metadata && typeof contract.metadata === "object" && !Array.isArray(contract.metadata)
        ? (contract.metadata as Prisma.JsonObject)
        : {};
    const nextMetadata: Prisma.JsonObject = input.reason
      ? { ...existingMetadata, lastStatusReason: input.reason }
      : existingMetadata;

    return prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: input.status,
          metadata: nextMetadata
        }
      });

      if (input.status === ContractStatus.cancelled || input.status === ContractStatus.defaulted) {
        await tx.contractInstallment.updateMany({
          where: {
            dealerId,
            contractId,
            status: ContractInstallmentStatus.pending,
            deletedAt: null
          },
          data: {
            status:
              input.status === ContractStatus.cancelled
                ? ContractInstallmentStatus.cancelled
                : ContractInstallmentStatus.defaulted
          }
        });
      }

      if (input.status === ContractStatus.completed) {
        await tx.contractInstallment.updateMany({
          where: {
            dealerId,
            contractId,
            status: ContractInstallmentStatus.pending,
            deletedAt: null
          },
          data: {
            status: ContractInstallmentStatus.completed
          }
        });
      }

      return updated;
    });
  },

  async schedule(dealerId: string, contractId: string) {
    await requireContract(dealerId, contractId);

    return prisma.contractInstallment.findMany({
      where: {
        dealerId,
        contractId,
        deletedAt: null
      },
      orderBy: { sequenceNumber: "asc" }
    });
  }
};
