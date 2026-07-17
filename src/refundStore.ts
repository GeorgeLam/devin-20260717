import { useState, useEffect } from 'react'
import type { RefundRequest, RefundStatus, RefundAuditEvent, RefundNote } from './refundTypes'
import { initialRefunds } from './refundData'
import { getCurrentUser } from './user'

const STORAGE_KEY = 'refunds-dashboard-state'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function loadState(): { refunds: RefundRequest[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { refunds: RefundRequest[] }
      if (parsed.refunds?.length) return parsed
    }
  } catch {
    // fall through
  }
  return { refunds: initialRefunds }
}

function addAuditEvent(
  item: RefundRequest,
  action: RefundAuditEvent['action'],
  meta: Omit<RefundAuditEvent, 'id' | 'refundId' | 'action' | 'actor' | 'timestamp'>
): RefundRequest {
  const now = new Date().toISOString()
  const event: RefundAuditEvent = {
    id: generateId('audit'),
    refundId: item.id,
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

export function useRefundStore() {
  const [state, setState] = useState(loadState)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  function updateRefund(refundId: string, updater: (item: RefundRequest) => RefundRequest) {
    setState((prev) => ({
      ...prev,
      refunds: prev.refunds.map((r) => (r.id === refundId ? updater(r) : r)),
    }))
  }

  function addNote(refundId: string, text: string) {
    if (!text.trim()) return
    updateRefund(refundId, (item) => {
      const now = new Date().toISOString()
      const note: RefundNote = { id: generateId('note'), author: getCurrentUser(), text: text.trim(), timestamp: now }
      const updated: RefundRequest = { ...item, notes: [...item.notes, note] }
      return addAuditEvent(updated, 'note_added', { note: text.trim() })
    })
  }

  function assignRefund(refundId: string) {
    updateRefund(refundId, (item) => {
      if (item.assignedTo === getCurrentUser()) return item
      const updated: RefundRequest = {
        ...item,
        assignedTo: getCurrentUser(),
        assignedAt: new Date().toISOString(),
      }
      return addAuditEvent(updated, 'assigned', {
        previousStatus: item.status,
        newStatus: item.status,
        metadata: {
          assignedTo: getCurrentUser(),
          previouslyAssignedTo: item.assignedTo ?? null,
        },
      })
    })
  }

  function unassignRefund(refundId: string) {
    updateRefund(refundId, (item) => {
      if (item.assignedTo !== getCurrentUser()) return item
      const updated: RefundRequest = {
        ...item,
        assignedTo: undefined,
        assignedAt: undefined,
      }
      return addAuditEvent(updated, 'unassigned', {
        metadata: { previouslyAssignedTo: getCurrentUser() },
      })
    })
  }

  function changeStatus(refundId: string, status: RefundStatus, meta: Partial<RefundAuditEvent> & { reason?: string } = {}) {
    updateRefund(refundId, (item) => {
      if (item.status === status) return item
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: RefundRequest = {
        ...item,
        status,
        lastStatusAt: now,
        updatedAt: now,
        ...(status === 'approved' || status === 'rejected' || status === 'failed' || status === 'processed'
          ? { reviewedBy: getCurrentUser(), reviewedAt: now }
          : {}),
      }
      const mapAction: Record<RefundStatus, RefundAuditEvent['action']> = {
        'pending-review': 'reopened',
        'waiting-for-info': 'info_requested',
        approved: 'approved',
        rejected: 'rejected',
        processed: 'processed',
        failed: 'failed',
      }
      return addAuditEvent(updated, mapAction[status], {
        previousStatus,
        newStatus: status,
        refundAmount: item.refundAmount,
        reason: meta.reason,
      })
    })
  }

  function approveRefund(refundId: string) {
    changeStatus(refundId, 'approved')
  }

  function rejectRefund(refundId: string, reason: string) {
    changeStatus(refundId, 'rejected', { reason })
  }

  function requestInfo(refundId: string, items: string[], note: string) {
    updateRefund(refundId, (item) => {
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: RefundRequest = {
        ...item,
        status: 'waiting-for-info',
        lastStatusAt: now,
        updatedAt: now,
        requestedInfo: items,
      }
      return addAuditEvent(updated, 'info_requested', {
        previousStatus,
        newStatus: 'waiting-for-info',
        requestedItems: items,
        reason: note,
      })
    })
  }

  function processRefund(refundId: string) {
    changeStatus(refundId, 'processed')
  }

  function failRefund(refundId: string, reason: string) {
    updateRefund(refundId, (item) => {
      const previousStatus = item.status
      const now = new Date().toISOString()
      const updated: RefundRequest = {
        ...item,
        status: 'failed',
        lastStatusAt: now,
        updatedAt: now,
        failureReason: reason,
        reviewedBy: getCurrentUser(),
        reviewedAt: now,
      }
      return addAuditEvent(updated, 'failed', {
        previousStatus,
        newStatus: 'failed',
        reason,
        refundAmount: item.refundAmount,
      })
    })
  }

  function reopenRefund(refundId: string) {
    changeStatus(refundId, 'pending-review')
  }

  return {
    refunds: state.refunds,
    assignRefund,
    unassignRefund,
    approveRefund,
    rejectRefund,
    processRefund,
    failRefund,
    requestInfo,
    reopenRefund,
    addNote,
  }
}
