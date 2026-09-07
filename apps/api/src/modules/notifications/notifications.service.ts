import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../middleware/error.middleware.js";

export type NotificationRecord = {
  id: string;
  dealerId: string;
  title: string;
  message: string;
  category: string;
  severity: "info" | "warning" | "critical" | "success";
  source: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  dealerName?: string | null;
  dealerSlug?: string | null;
  customerName?: string | null;
};

export function detectServerClockDrift(deviceTime: Date, serverTime: Date, toleranceMs = 60_000) {
  const driftMs = deviceTime.getTime() - serverTime.getTime();
  const isDetected = driftMs < -toleranceMs;

  return {
    isDetected,
    driftMs,
    toleranceMs,
    message: isDetected
      ? `Device time is ${Math.abs(driftMs)} ms behind server time beyond the allowed ${toleranceMs} ms tolerance.`
      : `Device time skew is within tolerance (${Math.abs(driftMs)} ms).`
  };
}

export async function listNotificationsForActor(actor: { roleName?: string; dealerId?: string }) {
  const isSuperAdmin = actor.roleName === "Super Admin";

  const rows = await prisma.notification.findMany({
    where: {
      deletedAt: null,
      ...(isSuperAdmin ? {} : { dealerId: actor.dealerId ?? "" }),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      dealer: { select: { id: true, name: true, slug: true } },
      customer: { select: { id: true, firstName: true, lastName: true, fullName: true } },
      user: { select: { id: true, email: true } }
    }
  });

  return rows.map((row) => ({
    id: row.id,
    dealerId: row.dealerId,
    title: row.subject ?? "System update",
    message: row.body ?? "No details provided.",
    category: row.metadata && typeof row.metadata === "object" && "category" in (row.metadata as Record<string, unknown>)
      ? String((row.metadata as Record<string, unknown>).category ?? "system")
      : "system",
    severity: row.metadata && typeof row.metadata === "object" && "severity" in (row.metadata as Record<string, unknown>)
      ? (String((row.metadata as Record<string, unknown>).severity ?? "info") as NotificationRecord["severity"])
      : "info",
    source: row.metadata && typeof row.metadata === "object" && "source" in (row.metadata as Record<string, unknown>)
      ? String((row.metadata as Record<string, unknown>).source ?? "system")
      : "system",
    createdAt: row.createdAt.toISOString(),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    dealerName: row.dealer?.name ?? null,
    dealerSlug: row.dealer?.slug ?? null,
    customerName: row.customer ? row.customer.fullName ?? `${row.customer.firstName ?? ""} ${row.customer.lastName ?? ""}`.trim() : null
  }));
}

export async function createSystemNotification(input: {
  dealerId: string;
  title: string;
  message: string;
  category: string;
  severity?: "info" | "warning" | "critical" | "success";
  source?: string;
  customerId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!input.dealerId) {
    throw new AppError(400, "INVALID_NOTIFICATION_TARGET", "A dealer scope is required for notifications.");
  }

  const row = await prisma.notification.create({
    data: {
      dealerId: input.dealerId,
      customerId: input.customerId ?? null,
      userId: input.userId ?? null,
      channel: "in_app",
      status: "sent",
      recipient: input.title,
      subject: input.title,
      body: input.message,
      metadata: {
        category: input.category,
        severity: input.severity ?? "info",
        source: input.source ?? "system",
        ...(input.metadata ?? {})
      },
      sentAt: new Date()
    }
  });

  return row;
}

export async function reportDeviceTamperEvent(input: {
  dealerId: string;
  deviceId?: string | null;
  contractId?: string | null;
  eventType: string;
  message: string;
  occurredAt?: string;
  severity?: "info" | "warning" | "critical" | "success";
  source?: string;
}) {
  const serverNow = new Date();
  const eventAt = input.occurredAt ? new Date(input.occurredAt) : serverNow;
  const drift = detectServerClockDrift(eventAt, serverNow);

  const audit = await prisma.auditLog.create({
    data: {
      dealerId: input.dealerId,
      actorType: "device",
      deviceId: input.deviceId ?? null,
      contractId: input.contractId ?? null,
      action: input.eventType,
      entityType: "Device",
      entityId: input.deviceId ?? null,
      metadata: {
        eventType: input.eventType,
        message: input.message,
        occurredAt: eventAt.toISOString(),
        severity: input.severity ?? "critical",
        source: input.source ?? "desktop-device",
        contractId: input.contractId ?? null,
        driftDetected: drift.isDetected,
        driftMs: drift.driftMs,
        toleranceMs: drift.toleranceMs,
        serverTime: serverNow.toISOString()
      }
    }
  });

  await createSystemNotification({
    dealerId: input.dealerId,
    title: drift.isDetected ? "Device time drift detected" : "Tamper event detected",
    message: drift.isDetected
      ? `${input.message} Device clock is behind server time by ${Math.abs(drift.driftMs)} ms beyond the allowed tolerance.`
      : input.message,
    category: drift.isDetected ? "security" : "system",
    severity: drift.isDetected ? "warning" : (input.severity ?? "critical"),
    source: input.source ?? "desktop-device",
    metadata: {
      eventType: input.eventType,
      occurredAt: eventAt.toISOString(),
      deviceId: input.deviceId ?? null,
      contractId: input.contractId ?? null,
      driftDetected: drift.isDetected,
      driftMs: drift.driftMs,
      toleranceMs: drift.toleranceMs,
      auditLogId: audit.id
    }
  });

  return audit;
}
