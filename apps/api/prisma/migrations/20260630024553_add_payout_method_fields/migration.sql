-- AlterTable
ALTER TABLE "dealers" ADD COLUMN     "payout_method" TEXT,
ADD COLUMN     "paystack_transfer_recipient_code" TEXT,
ADD COLUMN     "paystack_transfer_recipient_status" TEXT,
ADD COLUMN     "paystack_transfer_recipient_updated_at" TIMESTAMPTZ(6);
