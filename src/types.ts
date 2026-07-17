export type Environment = 'staging' | 'production'
export type FlagType = 'boolean' | 'enum'
export type FlagValue = boolean | string

export interface AuditEvent {
  id: string
  flagId: string
  environment: Environment
  action: 'create' | 'update' | 'request' | 'approve' | 'reject'
  oldValue: FlagValue
  newValue: FlagValue
  actor: string
  timestamp: string
}

export interface ChangeRequest {
  id: string
  flagId: string
  environment: 'production'
  requestedValue: FlagValue
  previousValue: FlagValue
  requestedBy: string
  requestedAt: string
  reason: string
  reviewedAt?: string
  reviewedBy?: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface Flag {
  id: string
  key: string
  name: string
  description: string
  type: FlagType
  options?: string[]
  stagingValue: FlagValue
  productionValue: FlagValue
  sensitive: boolean
  owner: string
  updatedAt: string
  auditLog: AuditEvent[]
}

export interface AppState {
  flags: Flag[]
  requests: ChangeRequest[]
}
