import { useState, useEffect } from 'react'
import type { AppState, AuditEvent, ChangeRequest, Flag, FlagValue } from './types'
import { initialFlags, initialRequests } from './data'

const STORAGE_KEY = 'ff-admin-demo-state'

const currentUser = 'demo-user'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.flags?.length) return parsed
    }
  } catch {
    // fall through
  }
  return { flags: initialFlags, requests: initialRequests }
}

function addAuditEvent(
  flag: Flag,
  action: AuditEvent['action'],
  oldValue: FlagValue,
  newValue: FlagValue
): Flag {
  const event: AuditEvent = {
    id: generateId('audit'),
    flagId: flag.id,
    environment: action === 'request' || action === 'approve' || action === 'reject' ? 'production' : 'staging',
    action,
    oldValue,
    newValue,
    actor: currentUser,
    timestamp: new Date().toISOString(),
  }
  return {
    ...flag,
    updatedAt: event.timestamp,
    auditLog: [...flag.auditLog, event],
  }
}

export function useFlagStore() {
  const [state, setState] = useState<AppState>(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const flags = state.flags
  const requests = state.requests
  const pendingRequests = state.requests.filter((r) => r.status === 'pending')

  function updateFlag(flagId: string, updater: (flag: Flag) => Flag) {
    setState((prev) => ({
      ...prev,
      flags: prev.flags.map((f) => (f.id === flagId ? updater(f) : f)),
    }))
  }

  function updateStaging(flagId: string, value: FlagValue) {
    updateFlag(flagId, (flag) => {
      const updated = { ...flag, stagingValue: value }
      return addAuditEvent(updated, 'update', flag.stagingValue, value)
    })
  }

  function requestProductionChange(flagId: string, value: FlagValue, reason: string) {
    setState((prev) => {
      const flag = prev.flags.find((f) => f.id === flagId)
      if (!flag) return prev

      const now = new Date().toISOString()
      const updatedFlag = addAuditEvent(flag, 'request', flag.productionValue, value)
      const existingIndex = prev.requests.findIndex((r) => r.flagId === flagId && r.status === 'pending')

      if (existingIndex >= 0) {
        const updatedRequest: ChangeRequest = {
          ...prev.requests[existingIndex],
          previousValue: flag.productionValue,
          requestedValue: value,
          requestedBy: currentUser,
          requestedAt: now,
          reason,
        }
        return {
          flags: prev.flags.map((f) => (f.id === flagId ? updatedFlag : f)),
          requests: prev.requests.map((r, i) => (i === existingIndex ? updatedRequest : r)),
        }
      }

      const request: ChangeRequest = {
        id: generateId('req'),
        flagId,
        environment: 'production',
        previousValue: flag.productionValue,
        requestedValue: value,
        requestedBy: currentUser,
        requestedAt: now,
        reason,
        status: 'pending',
      }

      return {
        flags: prev.flags.map((f) => (f.id === flagId ? updatedFlag : f)),
        requests: [...prev.requests, request],
      }
    })
  }

  function reviewRequest(requestId: string, decision: 'approved' | 'rejected') {
    setState((prev) => {
      const request = prev.requests.find((r) => r.id === requestId)
      if (!request || request.status !== 'pending') return prev

      const flag = prev.flags.find((f) => f.id === request.flagId)
      if (!flag) return prev

      const reviewedRequest: ChangeRequest = {
        ...request,
        status: decision,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser,
      }

      let updatedFlag = flag
      if (decision === 'approved') {
        updatedFlag = addAuditEvent(
          { ...flag, productionValue: request.requestedValue },
          'approve',
          request.previousValue,
          request.requestedValue
        )
      } else {
        updatedFlag = addAuditEvent(flag, 'reject', request.previousValue, request.requestedValue)
      }

      return {
        flags: prev.flags.map((f) => (f.id === flag.id ? updatedFlag : f)),
        requests: prev.requests.map((r) => (r.id === requestId ? reviewedRequest : r)),
      }
    })
  }

  return {
    flags,
    requests,
    pendingRequests,
    updateStaging,
    requestProductionChange,
    approveRequest: (id: string) => reviewRequest(id, 'approved'),
    rejectRequest: (id: string) => reviewRequest(id, 'rejected'),
  }
}
