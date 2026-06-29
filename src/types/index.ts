// Single import surface for the entire app.
// Root core files stay framework-agnostic; all app code imports from here.

export type {
  Personnel,
  CreatePersonnel,
  UpdatePersonnel,
  Shift,
  CreateShift,
  ShiftPost,
  ShiftStatus,
  ShiftType,
  OfficerRank,
  CertificationCode,
  ShiftAssignmentRequest,
} from "@core/overtime.schema";

export {
  PersonnelSchema,
  ShiftSchema,
  CreateShiftSchema,
  CreatePersonnelSchema,
  ShiftAssignmentRequestSchema,
  ShiftPostEnum,
  ShiftStatusEnum,
  ShiftTypeEnum,
  OfficerRankEnum,
  POST_CERTIFICATION_REQUIREMENTS,
  validatePostCertifications,
  CERTIFICATION_CODES,
} from "@core/overtime.schema";

export { checkAntiFatigueWindow } from "@core/overtime-core";
export type {
  ProposedShift,
  FatigueCheckResult,
  FatigueViolationType,
} from "@core/overtime-core";
