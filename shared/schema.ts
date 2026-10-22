import { z } from "zod";
import indonesian from "zod/v4/locales/id.js";
z.config(indonesian());
const fieldLabels: Record<string, string> = {
  name: "Nama lembaga",
  category: "Kategori",
  city: "Kota",
  address: "Alamat",
  summary: "Ringkasan",
  story: "Cerita",
  needs: "Kebutuhan",
  manager_name: "Nama pengelola",
  manager_email: "Email pengelola",
  manager_phone: "Telepon pengelola",
  recipient_name: "Nama penerima QRIS",
  photo_path: "Foto",
  qr_path: "QRIS",
  consent: "Persetujuan",
  decision: "Keputusan",
  notes: "Catatan",
  amount: "Nominal",
  entry_date: "Tanggal",
  description: "Keterangan",
  reason: "Alasan",
  message: "Rincian",
  resolution: "Penyelesaian",
};
export function validationMessage(error: z.ZodError) {
  return error.issues
    .map(
      (issue) =>
        `${fieldLabels[String(issue.path[0])] || "Data"}: ${issue.message}`,
    )
    .join("; ");
}
export const categories = ["Masjid", "Panti", "Komunitas"] as const;
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const submissionSchema = z
  .object({
    name: text(3, 120),
    category: z.enum(categories),
    city: text(2, 80),
    address: text(8, 400),
    summary: text(20, 220),
    story: text(50, 6000),
    needs: z.array(text(2, 80)).min(1).max(8),
    manager_name: text(3, 100),
    manager_email: z.email().max(200),
    manager_phone: text(8, 30).regex(/^[+\d ()-]+$/),
    recipient_name: text(3, 120),
    photo_path: z.string().max(240).nullable(),
    qr_path: z.string().max(240).nullable(),
    consent: z.literal(true),
  })
  .strict();
export const reviewSchema = z
  .object({
    decision: z.enum(["approve", "reject", "revoke"]),
    notes: text(5, 2000),
    identity_checked: z.boolean(),
    qris_checked: z.boolean(),
  })
  .strict()
  .refine(
    (v) => v.decision !== "approve" || (v.identity_checked && v.qris_checked),
    "Pemeriksaan identitas dan QRIS wajib diselesaikan.",
  );
export const ledgerSchema = z
  .object({
    entry_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (v) =>
          !Number.isNaN(Date.parse(v)) &&
          new Date(v).toISOString().slice(0, 10) === v,
        "Tanggal tidak valid",
      ),
    kind: z.enum(["income", "expense"]),
    category: text(3, 80),
    description: text(10, 300),
    amount: z.number().int().min(1).max(1_000_000_000),
    reference: z.string().trim().max(160).default(""),
  })
  .strict();
export const reportSchema = z
  .object({
    organization_id: z.uuid(),
    reason: z.enum(["qris", "identity", "information", "other"]),
    message: text(20, 2000),
  })
  .strict();
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type LedgerInput = z.infer<typeof ledgerSchema>;
export interface Organization {
  id: string;
  name: string;
  category: (typeof categories)[number];
  city: string;
  address: string;
  summary: string;
  story: string;
  needs: string[];
  recipient_name: string;
  photo_path: string | null;
  qr_path: string;
  verified_at: string;
  published_at: string;
}
export interface Submission
  extends Omit<Organization, "verified_at" | "published_at" | "qr_path"> {
  qr_path: string | null;
  owner_id: string;
  status: "draft" | "pending" | "approved" | "rejected" | "archived";
  manager_name: string;
  manager_email: string;
  manager_phone: string;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  consent: boolean;
}
export interface LedgerEntry extends LedgerInput {
  id: string;
  created_at: string;
  voided_at: string | null;
  void_reason: string | null;
}
