import type { KycCase, KycStatus, KycRiskLevel, KycDocType, KycAuditEvent } from './kycTypes'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function createCase(
  overrides: Omit<KycCase, 'auditLog' | 'notes' | 'lastStatusAt' | 'updatedAt'> & {
    status: KycStatus
    requestedInfo?: string[]
    rejectionReason?: string
  }
): KycCase {
  const now = new Date().toISOString()
  const auditLog: KycAuditEvent[] = [
    {
      id: generateId('audit'),
      caseId: overrides.id,
      action: 'case_created',
      actor: overrides.submission.channel,
      timestamp: overrides.submission.submittedAt,
      newStatus: overrides.status,
    },
  ]

  if (overrides.status !== 'in-review') {
    auditLog.push({
      id: generateId('audit'),
      caseId: overrides.id,
      action:
        overrides.status === 'approved'
          ? 'approved'
          : overrides.status === 'rejected'
            ? 'rejected'
            : 'info_requested',
      actor: overrides.reviewedBy || 'system',
      timestamp: overrides.reviewedAt || now,
      previousStatus: 'in-review',
      newStatus: overrides.status,
      reason: overrides.rejectionReason,
      requestedItems: overrides.requestedInfo,
    })
  }

  return {
    ...overrides,
    notes: [],
    lastStatusAt: overrides.reviewedAt || overrides.submission.submittedAt,
    updatedAt: overrides.reviewedAt || now,
    auditLog,
  }
}

function placeholder(type: string, side: string): string {
  return `https://placehold.co/320x200/e2e8f0/64748b?text=${encodeURIComponent(`${type} - ${side}`)}`
}

export const initialKycCases: KycCase[] = [
  createCase({
    id: 'KYC-1001',
    applicant: {
      id: 'appl-001',
      fullName: 'Amelia Hartley',
      dateOfBirth: '1990-03-12',
      nationality: 'British',
      address: '12 Maple Drive, London, NW1 6XE',
      email: 'amelia.hartley@example.com',
      phone: '+44 7700 900123',
    },
    document: {
      type: 'passport' as KycDocType,
      number: 'GB123456789',
      issuingCountry: 'United Kingdom',
      expiryDate: '2030-04-18',
      frontImageUrl: placeholder('Passport', 'front'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 98,
      livenessScore: 96,
    },
    risk: {
      overall: 'low' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      verificationScore: 96,
      flags: [],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      channel: 'mobile-app',
      ipAddress: '203.0.113.12',
    },
    status: 'in-review' as KycStatus,
  }),
  createCase({
    id: 'KYC-1002',
    applicant: {
      id: 'appl-002',
      fullName: 'Rajesh Patel',
      dateOfBirth: '1985-07-23',
      nationality: 'British',
      address: '45 Queen Street, Manchester, M2 5BB',
      email: 'rajesh.patel@example.com',
      phone: '+44 7700 900456',
    },
    document: {
      type: 'driving-licence' as KycDocType,
      number: 'PATEL123456RJ85',
      issuingCountry: 'United Kingdom',
      expiryDate: '2028-09-30',
      frontImageUrl: placeholder('Driving licence', 'front'),
      backImageUrl: placeholder('Driving licence', 'back'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 72,
      livenessScore: 68,
    },
    risk: {
      overall: 'medium' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      verificationScore: 70,
      flags: ['Selfie quality below threshold'],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      channel: 'web',
      ipAddress: '198.51.100.44',
    },
    status: 'waiting-for-info' as KycStatus,
    reviewedBy: 'demo-user',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    requestedInfo: ['Better selfie'],
  }),
  createCase({
    id: 'KYC-1003',
    applicant: {
      id: 'appl-003',
      fullName: 'Chen Wei',
      dateOfBirth: '1988-11-05',
      nationality: 'Chinese',
      address: 'Flat 9, Tower Court, Birmingham, B1 1AA',
      email: 'chen.wei@example.com',
      phone: '+44 7700 900789',
    },
    document: {
      type: 'national-id' as KycDocType,
      number: 'ID-99887766',
      issuingCountry: 'China',
      expiryDate: '2026-01-15',
      frontImageUrl: placeholder('National ID', 'front'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 85,
      livenessScore: 91,
    },
    risk: {
      overall: 'high' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      verificationScore: 62,
      flags: ['Name mismatch between ID and application', 'Non-UK issued ID'],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
      channel: 'web',
      ipAddress: '198.51.100.77',
    },
    status: 'rejected' as KycStatus,
    reviewedBy: 'sarah.chen',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    rejectionReason: 'Name or DOB mismatch',
  }),
  createCase({
    id: 'KYC-1004',
    applicant: {
      id: 'appl-004',
      fullName: 'Maria Gonzalez',
      dateOfBirth: '1992-01-30',
      nationality: 'Spanish',
      address: '89 Kentish Town Road, London, NW5 2AG',
      email: 'maria.gonzalez@example.com',
      phone: '+44 7700 900321',
    },
    document: {
      type: 'passport' as KycDocType,
      number: 'ESP987654321',
      issuingCountry: 'Spain',
      expiryDate: '2031-06-22',
      frontImageUrl: placeholder('Passport', 'front'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 99,
      livenessScore: 97,
    },
    risk: {
      overall: 'low' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      verificationScore: 97,
      flags: [],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      channel: 'mobile-app',
      ipAddress: '203.0.113.88',
    },
    status: 'approved' as KycStatus,
    reviewedBy: 'demo-user',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  }),
  createCase({
    id: 'KYC-1005',
    applicant: {
      id: 'appl-005',
      fullName: 'Lukas Schmidt',
      dateOfBirth: '1974-09-14',
      nationality: 'German',
      address: '14 Threadneedle Street, London, EC2R 8AH',
      email: 'lukas.schmidt@example.com',
      phone: '+44 7700 900654',
    },
    document: {
      type: 'passport' as KycDocType,
      number: 'DEU112233445',
      issuingCountry: 'Germany',
      expiryDate: '2029-12-10',
      frontImageUrl: placeholder('Passport', 'front'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 92,
      livenessScore: 94,
    },
    risk: {
      overall: 'critical' as KycRiskLevel,
      pepMatch: true,
      sanctionsMatch: false,
      adverseMediaMatch: true,
      verificationScore: 55,
      flags: ['PEP match: senior government official', 'Adverse media reference', 'High-value occupation mismatch'],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      channel: 'web',
      ipAddress: '203.0.113.19',
    },
    status: 'in-review' as KycStatus,
  }),
  createCase({
    id: 'KYC-1006',
    applicant: {
      id: 'appl-006',
      fullName: 'Aisha Mensah',
      dateOfBirth: '1995-04-08',
      nationality: 'British',
      address: '27 Clapham Common South Side, London, SW4 7AB',
      email: 'aisha.mensah@example.com',
      phone: '+44 7700 900987',
    },
    document: {
      type: 'national-id' as KycDocType,
      number: 'NI-55667788',
      issuingCountry: 'United Kingdom',
      expiryDate: '2027-03-20',
      frontImageUrl: placeholder('National ID', 'front'),
      backImageUrl: placeholder('National ID', 'back'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 88,
      livenessScore: 90,
    },
    risk: {
      overall: 'medium' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      verificationScore: 78,
      flags: ['Proof of address not yet provided'],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      channel: 'mobile-app',
      ipAddress: '203.0.113.53',
    },
    status: 'waiting-for-info' as KycStatus,
    reviewedBy: 'demo-user',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    requestedInfo: ['Proof of address'],
  }),
  createCase({
    id: 'KYC-1007',
    applicant: {
      id: 'appl-007',
      fullName: "James O'Connor",
      dateOfBirth: '1983-12-19',
      nationality: 'Irish',
      address: '3 O’Connell Street, Dublin, D01 F5P2',
      email: 'james.oconnor@example.com',
      phone: '+44 7700 900147',
    },
    document: {
      type: 'driving-licence' as KycDocType,
      number: 'OC12345678',
      issuingCountry: 'Ireland',
      expiryDate: '2023-08-14',
      frontImageUrl: placeholder('Driving licence', 'front'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 90,
      livenessScore: 89,
    },
    risk: {
      overall: 'medium' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: false,
      adverseMediaMatch: false,
      verificationScore: 74,
      flags: ['Expired document'],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
      channel: 'web',
      ipAddress: '198.51.100.92',
    },
    status: 'in-review' as KycStatus,
  }),
  createCase({
    id: 'KYC-1008',
    applicant: {
      id: 'appl-008',
      fullName: 'Fatima Al-Rashid',
      dateOfBirth: '1979-06-02',
      nationality: 'Emirati',
      address: 'Suite 402, Harbour Exchange Square, London, E14 9GE',
      email: 'fatima.alrashid@example.com',
      phone: '+44 7700 900258',
    },
    document: {
      type: 'passport' as KycDocType,
      number: 'ARE998877661',
      issuingCountry: 'United Arab Emirates',
      expiryDate: '2028-11-30',
      frontImageUrl: placeholder('Passport', 'front'),
      selfieImageUrl: placeholder('Selfie', 'live'),
      tamperingScore: 87,
      livenessScore: 92,
    },
    risk: {
      overall: 'critical' as KycRiskLevel,
      pepMatch: false,
      sanctionsMatch: true,
      adverseMediaMatch: true,
      verificationScore: 48,
      flags: ['Sanctions list potential match', 'Adverse media: regulatory investigation'],
    },
    submission: {
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
      channel: 'web',
      ipAddress: '198.51.100.31',
    },
    status: 'rejected' as KycStatus,
    reviewedBy: 'sarah.chen',
    reviewedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    rejectionReason: 'Unresolvable PEP / sanctions match',
  }),
]
