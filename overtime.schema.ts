import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const ShiftPostEnum = z.enum([
  "Vacation/Sick Leave Relief",
  "Gun Position / Court Detail / Transport",
  "Intake & Releases",
  "Visiting Control",
  "Hospital Watch",
  "Response and Movement Officer",
  "Central Control",
]);
export type ShiftPost = z.infer<typeof ShiftPostEnum>;

export const ShiftStatusEnum = z.enum([
  "pending",
  "approved",
  "active",
  "completed",
  "cancelled",
]);
export type ShiftStatus = z.infer<typeof ShiftStatusEnum>;

export const ShiftTypeEnum = z.enum([
  "regular",
  "overtime",
  "voluntary_overtime",
  "mandatory_overtime",
]);
export type ShiftType = z.infer<typeof ShiftTypeEnum>;

export const OfficerRankEnum = z.enum([
  "Corrections Officer",
  "Senior Corrections Officer",
  "Corrections Sergeant",
  "Corrections Lieutenant",
  "Corrections Captain",
]);
export type OfficerRank = z.infer<typeof OfficerRankEnum>;

// ─── Certifications ───────────────────────────────────────────────────────────

export const CERTIFICATION_CODES = [
  "FIREARMS_CERT",
  "CENTRAL_CONTROL_CERT",
  "MEDICAL_WATCH_CERT",
  "INTAKE_CERT",
  "TRANSPORT_CERT",
  "COURT_DETAIL_CERT",
] as const;
export type CertificationCode = (typeof CERTIFICATION_CODES)[number];

// Authoritative map of posts to their required certifications.
// An officer must hold ALL listed certs to be eligible for that post.
export const POST_CERTIFICATION_REQUIREMENTS: Record<ShiftPost, CertificationCode[]> = {
  "Vacation/Sick Leave Relief":               [],
  "Gun Position / Court Detail / Transport":  ["FIREARMS_CERT", "TRANSPORT_CERT"],
  "Intake & Releases":                        ["INTAKE_CERT"],
  "Visiting Control":                         [],
  "Hospital Watch":                           ["MEDICAL_WATCH_CERT"],
  "Response and Movement Officer":            ["FIREARMS_CERT"],
  "Central Control":                          ["CENTRAL_CONTROL_CERT"],
};

export function validatePostCertifications(
  post: ShiftPost,
  officerCertifications: string[]
): { valid: boolean; missing: CertificationCode[] } {
  const required = POST_CERTIFICATION_REQUIREMENTS[post];
  const missing = required.filter(
    (cert) => !officerCertifications.includes(cert)
  ) as CertificationCode[];
  return { valid: missing.length === 0, missing };
}

// ─── Personnel ────────────────────────────────────────────────────────────────

export const PersonnelSchema = z.object({
  id:             z.string().uuid(),
  employee_id:    z.string().min(1).max(20),
  badge_number:   z.string().min(1).max(10),
  first_name:     z.string().min(1).max(100),
  last_name:      z.string().min(1).max(100),
  rank:           OfficerRankEnum,
  hire_date:      z.coerce.date(),
  seniority_date: z.coerce.date(),
  certifications: z.array(z.string()).default([]),
  unit:           z.string().max(100).nullable().optional(),
  email:          z.string().email().max(255),
  phone:          z.string().max(20).nullable().optional(),
  is_active:      z.boolean().default(true),
  created_at:     z.coerce.date().optional(),
  updated_at:     z.coerce.date().optional(),
});
export type Personnel = z.infer<typeof PersonnelSchema>;

export const CreatePersonnelSchema = PersonnelSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type CreatePersonnel = z.infer<typeof CreatePersonnelSchema>;

export const UpdatePersonnelSchema = CreatePersonnelSchema.partial();
export type UpdatePersonnel = z.infer<typeof UpdatePersonnelSchema>;

// ─── Shifts ───────────────────────────────────────────────────────────────────

export const ShiftSchema = z.object({
  id:          z.string().uuid(),
  officer_id:  z.string().uuid(),
  post:        ShiftPostEnum,
  shift_type:  ShiftTypeEnum.default("overtime"),
  shift_start: z.coerce.date(),
  shift_end:   z.coerce.date(),
  status:      ShiftStatusEnum.default("pending"),
  notes:       z.string().nullable().optional(),
  approved_by: z.string().uuid().nullable().optional(),
  approved_at: z.coerce.date().nullable().optional(),
  created_by:  z.string().uuid().nullable().optional(),
  created_at:  z.coerce.date().optional(),
  updated_at:  z.coerce.date().optional(),
});
export type Shift = z.infer<typeof ShiftSchema>;

export const CreateShiftSchema = ShiftSchema.omit({
  id:          true,
  status:      true,
  approved_by: true,
  approved_at: true,
  created_at:  true,
  updated_at:  true,
}).superRefine((data, ctx) => {
  const start = new Date(data.shift_start).getTime();
  const end   = new Date(data.shift_end).getTime();

  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["shift_end"],
      message: "Shift end must be after shift start.",
    });
    return;
  }

  const durationHours = (end - start) / (1000 * 60 * 60);
  if (durationHours > 16) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["shift_end"],
      message: `Shift duration of ${durationHours.toFixed(1)} hours exceeds the 16-hour maximum.`,
    });
  }
});
export type CreateShift = z.infer<typeof CreateShiftSchema>;

// ─── Assignment Request (shift + officer together) ────────────────────────────
//
// Used at the API boundary when a supervisor submits an overtime assignment.
// Validates certifications cross-field so the UI can surface specific
// missing-cert errors before the request ever reaches the database.

export const ShiftAssignmentRequestSchema = z
  .object({
    officer: PersonnelSchema,
    shift:   CreateShiftSchema,
  })
  .superRefine(({ officer, shift }, ctx) => {
    if (!officer.is_active) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["officer", "is_active"],
        message: "Cannot assign a shift to an inactive officer.",
      });
    }

    const { valid, missing } = validatePostCertifications(
      shift.post,
      officer.certifications
    );
    if (!valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["officer", "certifications"],
        message: `Officer is missing required certification(s) for post "${shift.post}": ${missing.join(", ")}.`,
      });
    }
  });
export type ShiftAssignmentRequest = z.infer<typeof ShiftAssignmentRequestSchema>;
