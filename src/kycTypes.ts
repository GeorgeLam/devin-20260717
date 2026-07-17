export type KycStatus = 'in-review' | 'approved' | 'rejected' | 'waiting-for-info'

export type KycRiskLevel = 'low' | 'medium' | 'high' | 'critical'

export type KycDocType = 'passport' | 'driving-licence' | 'national-id' | 'proof-of-address'

export interface KycApplicant {
  id: string
  fullName: string
  dateOfBirth: string
  nationality: string
  address: string
  email: string
  phone: string
}

export interface KycDocument {
  type: KycDocType
  number: string
  issuingCountry: string
  expiryDate: string
  frontImageUrl: string
  backImageUrl?: string
  selfieImageUrl?: string
  tamperingScore: number
  livenessScore?: number
}

export interface KycRisk {
  overall: KycRiskLevel
  pepMatch: boolean
  sanctionsMatch: boolean
  adverseMediaMatch: boolean
  verificationScore: number
  flags: string[]
}

export interface KycSubmission {
  submittedAt: string
  channel: string
  ipAddress: string
}

export interface KycNote {
  id: string
  author: string
  text: string
  timestamp: string
}

export interface KycAuditEvent {
  id: string
  caseId: string
  action:
    | 'case_created'
    | 'viewed'
    | 'assigned'
    | 'status_changed'
    | 'approved'
    | 'rejected'
    | 'info_requested'
    | 'reopened'
    | 'note_added'
  actor: string
  timestamp: string
  previousStatus?: KycStatus
  newStatus?: KycStatus
  reason?: string
  requestedItems?: string[]
  note?: string
  metadata?: Record<string, unknown>
}

export interface KycCase {
  id: string
  applicant: KycApplicant
  document: KycDocument
  risk: KycRisk
  submission: KycSubmission
  status: KycStatus
  assignedTo?: string
  assignedAt?: string
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  requestedInfo?: string[]
  notes: KycNote[]
  auditLog: KycAuditEvent[]
  lastStatusAt: string
  updatedAt: string
}

export interface KycState {
  cases: KycCase[]
}
