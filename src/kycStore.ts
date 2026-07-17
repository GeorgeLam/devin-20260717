import { useState, useEffect } from 'react'
import type { KycCase, KycAuditEvent } from './kycTypes'
import { initialKycCases } from './kycData'
import { getCurrentUser } from './user'

const STORAGE_KEY = 'kyc-review-queue-state'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function loadState(): { cases: KycCase[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { cases: KycCase[] }
      if (parsed.cases?.length) return parsed
    }
  } catch {
    // fall through
  }
  return { cases: initialKycCases }
}

function addAuditEvent(
  item: KycCase,
  action: KycAuditEvent['action'],
  meta: Omit<KycAuditEvent, 'id' | 'caseId' | 'action' | 'actor' | 'timestamp'>
): KycCase {
  const now = new Date().toISOString()
  const event: KycAuditEvent = {
    id: generateId('audit'),
    caseId: item.id,
    action,
    actor: getCurrentUser(),
    timestamp: now,
    ...meta,
  }
  return {
    ...item,
    updatedAt: now,
    auditLog: [...item.auditLog, event],
  }
}

export function useKycStore() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function updateCase(caseId: string, updater: (item: KycCase) => KycCase) {
    setState((prev) => ({
      ...prev,
      cases: prev.cases.map((c) => (c.id === caseId ? updater(c) : c)),
    }))
  }

  function assignCase(caseId: string) {
    updateCase(caseId, (item) => {
      if (item.assignedTo === getCurrentUser()) return item
      const updated = {
        ...item,
        assignedTo: getCurrentUser(),
        assignedAt: new Date().toISOString(),
      }
      return addAuditEvent(updated, 'assigned', {
        metadata: {
          assignedTo: getCurrentUser(),
          previouslyAssignedTo: item.assignedTo ?? null,
        },
      })
    })
  }

  function approveCase(caseId: string) {
    updateCase(caseId, (item) => {
      if (item.status === 'approved') return item
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: KycCase = {
        ...item,
        status: 'approved',
        reviewedBy: getCurrentUser(),
        reviewedAt: now,
        lastStatusAt: now,
      }
      return addAuditEvent(updated, 'approved', { previousStatus, newStatus: 'approved' })
    })
  }

  function rejectCase(caseId: string, reason: string) {
    updateCase(caseId, (item) => {
      if (item.status === 'rejected') return item
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: KycCase = {
        ...item,
        status: 'rejected',
        reviewedBy: getCurrentUser(),
        reviewedAt: now,
        lastStatusAt: now,
        rejectionReason: reason,
      }
      return addAuditEvent(updated, 'rejected', {
        previousStatus,
        newStatus: 'rejected',
        reason,
      })
    })
  }

  function requestInfo(caseId: string, items: string[], note: string) {
    updateCase(caseId, (item) => {
      if (item.status === 'waiting-for-info') return item
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: KycCase = {
        ...item,
        status: 'waiting-for-info',
        lastStatusAt: now,
        requestedInfo: items,
      }
      return addAuditEvent(updated, 'info_requested', {
        previousStatus,
        newStatus: 'waiting-for-info',
        requestedItems: items,
        note,
      })
    })
  }

  function reopenCase(caseId: string) {
    updateCase(caseId, (item) => {
      if (item.status === 'in-review') return item
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: KycCase = {
        ...item,
        status: 'in-review',
        lastStatusAt: now,
      }
      return addAuditEvent(updated, 'reopened', {
        previousStatus,
        newStatus: 'in-review',
      })
    })
  }

  function addNote(caseId: string, text: string) {
    if (!text.trim()) return
    updateCase(caseId, (item) => {
      const now = new Date().toISOString()
      const updated: KycCase = {
        ...item,
        notes: [
          ...item.notes,
          { id: generateId('note'), author: getCurrentUser(), text: text.trim(), timestamp: now },
        ],
      }
      return addAuditEvent(updated, 'note_added', { note: text.trim() })
    })
  }

  function unassignCase(caseId: string) {
    updateCase(caseId, (item) => {
      if (item.assignedTo !== getCurrentUser()) return item
      const updated: KycCase = {
        ...item,
        assignedTo: undefined,
        assignedAt: undefined,
      }
      return addAuditEvent(updated, 'unassigned', {
        metadata: { previouslyAssignedTo: getCurrentUser() },
      })
    })
  }

  return {
    cases: state.cases,
    assignCase,
    unassignCase,
    approveCase,
    rejectCase,
    requestInfo,
    reopenCase,
    addNote,
  }
}
