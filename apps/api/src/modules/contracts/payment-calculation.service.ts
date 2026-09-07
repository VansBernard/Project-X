import { Prisma } from "@prisma/client";
import { AppError } from "../../middleware/error.middleware.js";
import type { CreateContractInput } from "./contract-management.schemas.js";

export type PaymentPlan = "weekly" | "monthly" | "yearly";

export interface PaymentScheduleEntry {
  sequenceNumber: number;
  dueDate: Date;
  amountDuePesewas: number;
  amountDue: Prisma.Decimal;
}

export interface PaymentScheduleResult {
  remainingBalance: Prisma.Decimal;
  baseInstallmentAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  installments: PaymentScheduleEntry[];
}

const validPlans: Set<PaymentPlan> = new Set(["weekly", "monthly", "yearly"]);

function toDecimal(value: number | string): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

function normalizePlan(plan?: unknown): PaymentPlan {
  if (typeof plan !== "string") {
    return "monthly";
  }

  const normalized = plan.trim().toLowerCase();
  if (validPlans.has(normalized as PaymentPlan)) {
    return normalized as PaymentPlan;
  }

  throw new AppError(400, "INVALID_PAYMENT_PLAN", "Payment plan must be weekly, monthly, or yearly.");
}

function toPesewas(amount: Prisma.Decimal): number {
  const amountAsString = amount.toFixed(2);
  const [major, minor] = amountAsString.split(".");
  const minorValue = (minor ?? "00").padEnd(2, "0").slice(0, 2);
  const value = `${major}${minorValue}`;

  if (!/^[-]?\d+$/.test(value)) {
    throw new AppError(400, "INVALID_MONEY_VALUE", "Unable to convert amount to smallest currency unit.");
  }

  return Number(value);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function addYears(date: Date, years: number): Date {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
}

function getDueDate(firstDueDate: Date, index: number, paymentPlan: PaymentPlan): Date {
  if (index === 0) {
    return new Date(Date.UTC(firstDueDate.getUTCFullYear(), firstDueDate.getUTCMonth(), firstDueDate.getUTCDate()));
  }

  return paymentPlan === "weekly"
    ? addDays(firstDueDate, 7 * index)
    : paymentPlan === "monthly"
    ? addMonths(firstDueDate, index)
    : addYears(firstDueDate, index);
}

export function calculatePaymentSchedule(input: CreateContractInput): PaymentScheduleResult {
  const paymentPlan = normalizePlan((input as any).paymentPlan ?? "monthly");
  const devicePrice = toDecimal(input.devicePrice);
  const deposit = toDecimal(input.deposit);
  const firstDueDate = input.firstDueDate;

  if (!firstDueDate || !(firstDueDate instanceof Date)) {
    throw new AppError(400, "INVALID_FIRST_DUE_DATE", "First due date is required.");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const normalizedFirstDueDate = new Date(Date.UTC(firstDueDate.getUTCFullYear(), firstDueDate.getUTCMonth(), firstDueDate.getUTCDate()));

  if (normalizedFirstDueDate < today) {
    throw new AppError(400, "INVALID_FIRST_DUE_DATE", "First due date cannot be in the past.");
  }

  if (deposit.gt(devicePrice)) {
    throw new AppError(400, "INVALID_CONTRACT_AMOUNTS", "Deposit cannot exceed device price.");
  }

  const remainingBalance = devicePrice.minus(deposit);
  if (remainingBalance.lte(0)) {
    throw new AppError(400, "INVALID_REMAINING_BALANCE", "Remaining balance must be greater than zero.");
  }

  if (input.installmentCount <= 0) {
    throw new AppError(400, "INVALID_INSTALLMENT_COUNT", "Installment count must be at least 1.");
  }

  const remainingPesewas = toPesewas(remainingBalance);
  const installmentCount = input.installmentCount;
  const baseInstallmentPesewas = Math.floor(remainingPesewas / installmentCount);
  const remainderPesewas = remainingPesewas - baseInstallmentPesewas * installmentCount;

  if (baseInstallmentPesewas <= 0) {
    throw new AppError(400, "INVALID_INSTALLMENT_AMOUNT", "Installment amount computed from the remaining balance is too small for the selected count.");
  }

  const installments = Array.from({ length: installmentCount }, (_, index) => {
    const amountDuePesewas = index === installmentCount - 1 ? baseInstallmentPesewas + remainderPesewas : baseInstallmentPesewas;
    return {
      sequenceNumber: index + 1,
      dueDate: getDueDate(normalizedFirstDueDate, index, paymentPlan),
      amountDuePesewas,
      amountDue: new Prisma.Decimal(amountDuePesewas).div(100)
    };
  });

  const totalPesewas = installments.reduce((sum, item) => sum + item.amountDuePesewas, 0);
  if (totalPesewas !== remainingPesewas) {
    throw new AppError(400, "INSTALLMENT_SUM_MISMATCH", "Installment schedule does not sum to the remaining balance.");
  }

  return {
    remainingBalance,
    baseInstallmentAmount: new Prisma.Decimal(baseInstallmentPesewas).div(100),
    totalAmount: new Prisma.Decimal(totalPesewas).div(100),
    installments
  };
}
