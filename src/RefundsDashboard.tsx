import { useMemo, useState } from 'react'
import type { RefundRequest, RefundStatus } from './refundTypes'
import { useRefundStore } from './refundStore'

const currentUser = 'demo-user'

const STATUS_LABELS: Record<RefundStatus, string> = {
  'pending-review': 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  processed: 'Processed',
  failed: 'Failed',
  'waiting-for-info': 'Waiting for info',
}

const STATUS_ORDER: RefundStatus[] = ['pending-review', 'waiting-for-info', 'approved', 'processed', 'failed', 'rejected']

const SORT_OPTIONS = [
  { value: 'lastStatusAt-desc', label: 'Time in status: newest first' },
  { value: 'lastStatusAt-asc', label: 'Time in status: oldest first' },
  { value: 'submittedAt-desc', label: 'Submitted: newest first' },
  { value: 'submittedAt-asc', label: 'Submitted: oldest first' },
  { value: 'name-asc', label: 'Customer: A-Z' },
  { value: 'name-desc', label: 'Customer: Z-A' },
  { value: 'amount-desc', label: 'Amount: highest first' },
  { value: 'amount-asc', label: 'Amount: lowest first' },
]

const REJECT_REASONS = [
  'Outside refund policy window',
  'Duplicate refund already submitted',
  'No matching transaction found',
  'Suspected fraud / unauthorised',
  'Refund amount exceeds original charge',
  'Insufficient documentation',
  'Other',
]

const INFO_OPTIONS = [
  'Bank statement showing original charge',
  'Updated payment method details',
  'Proof of address',
  'Customer ID verification',
  'Merchant invoice / receipt',
  'Other',
]

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function formatUtc(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function formatMoney(m: { value: number; currency: string }) {
  const symbol = m.currency === 'GBP' ? '£' : m.currency === 'USD' ? '$' : m.currency === 'EUR' ? '€' : m.currency + ' '
  return `${symbol}${m.value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAgeMs(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

function ageInStatus(item: RefundRequest): string {
  return formatAgeMs(Date.now() - new Date(item.lastStatusAt).getTime())
}

function isOverdue(item: RefundRequest): boolean {
  if (item.status !== 'pending-review') return false
  return Date.now() - new Date(item.lastStatusAt).getTime() > 1000 * 60 * 60 * 24
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return email
  return `${user.slice(0, 2)}***@${domain}`
}

function statusBadgeClass(status: RefundStatus): string {
  switch (status) {
    case 'pending-review':
      return 'badge-status-pending-review'
    case 'approved':
      return 'badge-status-approved'
    case 'rejected':
      return 'badge-status-rejected'
    case 'processed':
      return 'badge-status-processed'
    case 'failed':
      return 'badge-status-failed'
    case 'waiting-for-info':
      return 'badge-status-waiting-info'
    default:
      return 'badge-status-pending-review'
  }
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    'duplicate-charge': 'Duplicate charge',
    'unauthorised': 'Unauthorised / fraud',
    'fraud': 'Confirmed fraud',
    'service-issue': 'Service issue',
    'customer-request': 'Customer request',
    'chargeback': 'Chargeback / dispute',
    'other': 'Other',
  }
  return map[reason] || reason
}

function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    'customer-portal': 'Customer portal',
    'support-agent': 'Support agent',
    'chargeback': 'Chargeback team',
    'compliance': 'Compliance',
  }
  return map[channel] || channel
}

function paymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    card: 'Card',
    'bank-transfer': 'Bank transfer',
    wallet: 'Wallet',
    crypto: 'Crypto',
    other: 'Other',
  }
  return map[method] || method
}

function initialsFromName(name: string): string {
  const parts = name.split(/[.\-_\s]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function UserIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function SearchIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function XIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function AlertIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export default function RefundsDashboard() {
  const {
    refunds,
    assignRefund,
    unassignRefund,
    approveRefund,
    rejectRefund,
    processRefund,
    failRefund,
    requestInfo,
    reopenRefund,
    addNote,
  } = useRefundStore()
  const [activeTab, setActiveTab] = useState<RefundStatus>('pending-review')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('lastStatusAt-desc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<RefundRequest | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectOther, setRejectOther] = useState('')
  const [requestingInfo, setRequestingInfo] = useState<RefundRequest | null>(null)
  const [selectedInfo, setSelectedInfo] = useState<Set<string>>(new Set())
  const [infoOther, setInfoOther] = useState('')
  const [failing, setFailing] = useState<RefundRequest | null>(null)
  const [failureReason, setFailureReason] = useState('')
  const [noteText, setNoteText] = useState('')

  const searchMatches = useMemo(() => {
    const term = search.toLowerCase()
    return refunds.filter(
      (r) => r.id.toLowerCase().includes(term) || r.customer.fullName.toLowerCase().includes(term) || r.customer.email.toLowerCase().includes(term)
    )
  }, [refunds, search])

  const filteredRefunds = useMemo(() => {
    const [field, direction] = sortBy.split('-')
    const dir = direction === 'asc' ? 1 : -1
    return searchMatches
      .filter((r) => r.status === activeTab)
      .sort((a, b) => {
        let cmp = 0
        if (field === 'lastStatusAt') {
          cmp = new Date(a.lastStatusAt).getTime() - new Date(b.lastStatusAt).getTime()
        } else if (field === 'submittedAt') {
          cmp = new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime()
        } else if (field === 'name') {
          cmp = a.customer.fullName.localeCompare(b.customer.fullName)
        } else if (field === 'amount') {
          cmp = a.refundAmount.value - b.refundAmount.value
        }
        return cmp * dir
      })
  }, [searchMatches, activeTab, sortBy])

  const tabCounts = useMemo(() => {
    const counts: Record<RefundStatus, number> = {
      'pending-review': 0,
      'waiting-for-info': 0,
      approved: 0,
      processed: 0,
      failed: 0,
      rejected: 0,
    }
    for (const r of searchMatches) {
      counts[r.status]++
    }
    return counts
  }, [searchMatches])

  const selected = useMemo(() => refunds.find((r) => r.id === selectedId) || filteredRefunds[0] || null, [refunds, selectedId, filteredRefunds])

  const isAssigned = selected?.assignedTo === currentUser

  const metrics = useMemo(() => {
    const pending = refunds.filter((r) => r.status === 'pending-review')
    const totalPendingAmount = pending.reduce((sum, r) => sum + r.refundAmount.value, 0)
    const highValue = pending.filter((r) => r.refundAmount.value >= 500).length
    return {
      total: refunds.length,
      pending: pending.length,
      pendingAmount: { value: totalPendingAmount, currency: 'GBP' },
      highValue,
      overdue: pending.filter(isOverdue).length,
    }
  }, [refunds])

  function resetReject() {
    setRejecting(null)
    setRejectReason('')
    setRejectOther('')
  }

  function submitReject() {
    if (!rejecting) return
    const reason = rejectReason === 'Other' ? rejectOther : rejectReason
    if (!reason.trim()) return
    rejectRefund(rejecting.id, reason.trim())
    resetReject()
  }

  function resetInfo() {
    setRequestingInfo(null)
    setSelectedInfo(new Set())
    setInfoOther('')
  }

  function submitInfo() {
    if (!requestingInfo) return
    const items = Array.from(selectedInfo).filter((i) => i !== 'Other')
    if (selectedInfo.has('Other') && infoOther.trim()) items.push(`Other: ${infoOther.trim()}`)
    requestInfo(requestingInfo.id, items, items.join(', '))
    resetInfo()
  }

  function resetFail() {
    setFailing(null)
    setFailureReason('')
  }

  function submitFail() {
    if (!failing || !failureReason.trim()) return
    failRefund(failing.id, failureReason.trim())
    resetFail()
  }

  function handleAddNote() {
    if (!selected || !noteText.trim()) return
    addNote(selected.id, noteText)
    setNoteText('')
  }

  return (
    <>
      <div className="page-header">
        <h2>Refunds dashboard</h2>
        <p>Review, approve, and track customer refunds and chargebacks.</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Pending review</div>
          <div className="metric-value">{metrics.pending}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Pending value</div>
          <div className="metric-value">{formatMoney(metrics.pendingAmount)}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Overdue</div>
          <div className={classNames('metric-value', metrics.overdue > 0 && 'metric-value-alert')}>{metrics.overdue}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">High-value pending</div>
          <div className="metric-value">{metrics.highValue}</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="tabs">
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              className={classNames(activeTab === status && 'active')}
              onClick={() => {
                setActiveTab(status)
                setSelectedId(null)
              }}
            >
              {STATUS_LABELS[status]}
              {tabCounts[status] > 0 && <span className="tab-count">{tabCounts[status]}</span>}
            </button>
          ))}
        </div>

        <div className="search-wrapper">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search refunds by ID, customer or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')}>
              <XIcon className="icon-small" />
            </button>
          )}
        </div>
      </div>

      <div className="kyc-layout">
        <div className="kyc-list">
          <div className="kyc-list-sort">
            <label htmlFor="refund-sort">Sort by</label>
            <select id="refund-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {filteredRefunds.map((r) => (
            <button
              key={r.id}
              className={classNames('kyc-list-item', selected?.id === r.id && 'active')}
              onClick={() => setSelectedId(r.id)}
            >
              <div className="kyc-list-header">
                <span className="kyc-list-id">{r.id}</span>
                <span className={classNames('badge', statusBadgeClass(r.status))}>{STATUS_LABELS[r.status]}</span>
                <span
                  className={classNames('kyc-list-assignee', !r.assignedTo && 'kyc-list-assignee-unassigned')}
                  title={r.assignedTo ? `Assigned to ${r.assignedTo}` : 'Unassigned'}
                >
                  {r.assignedTo ? initialsFromName(r.assignedTo) : <UserIcon className="kyc-list-assignee-icon" />}
                </span>
              </div>
              <div className="kyc-list-name">{r.customer.fullName}</div>
              <div className="kyc-list-meta">
                <span>{formatMoney(r.refundAmount)}</span>
                <span>·</span>
                <span>{ageInStatus(r)}</span>
                <span>·</span>
                <span>{channelLabel(r.requestChannel)}</span>
              </div>
              {(r.risk.isHighValue || r.requestChannel === 'chargeback') && (
                <div className="refund-list-warning">
                  {r.risk.isHighValue && <span className="badge badge-sensitive">High value</span>}
                  {r.requestChannel === 'chargeback' && <span className="badge badge-warning">Disputed</span>}
                </div>
              )}
            </button>
          ))}
          {filteredRefunds.length === 0 && <div className="panel-empty">No refunds match this search.</div>}
        </div>

        {selected ? (
          <div className="kyc-detail">
            <div className="kyc-detail-header">
              <div>
                <div className="kyc-detail-title">
                  <span>{selected.customer.fullName}</span>
                  <span className={classNames('badge', statusBadgeClass(selected.status))}>{STATUS_LABELS[selected.status]}</span>
                </div>
                <div className="kyc-detail-meta">
                  {selected.id} · {maskEmail(selected.customer.email)} · {ageInStatus(selected)} in {STATUS_LABELS[selected.status].toLowerCase()}
                </div>
              </div>
              <div className="kyc-detail-actions">
                {selected.assignedTo === currentUser ? (
                  <button className="btn" onClick={() => unassignRefund(selected.id)}>
                    Unassign
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => assignRefund(selected.id)}>
                    Assign to me
                  </button>
                )}
                {selected.assignedTo && selected.assignedTo !== currentUser && (
                  <span className="assigned-hint">Assigned to {selected.assignedTo}</span>
                )}
              </div>
            </div>

            {(selected.risk.isHighValue || selected.requestChannel === 'chargeback') && (
              <div className="refund-risk-banner">
                <AlertIcon className="refund-risk-icon" />
                <div>
                  <strong>
                    {selected.risk.isHighValue ? 'High-value refund' : 'Disputed refund'}
                    {selected.risk.isHighValue && selected.requestChannel === 'chargeback' && ' + disputed'}
                  </strong>
                  <p>This refund needs extra care before processing. Review risk flags and verify customer identity.</p>
                </div>
              </div>
            )}

            <div className="kyc-grid">
              <div className="kyc-section">
                <h4 className="section-title">Customer</h4>
                <div className="kyc-field">
                  <span className="kyc-label">Full name</span>
                  <span className="kyc-value">{selected.customer.fullName}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Email</span>
                  <span className="kyc-value">{maskEmail(selected.customer.email)}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Account age</span>
                  <span className="kyc-value">{selected.customer.accountAgeDays} days</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Risk flags</span>
                  <div className="kyc-flags">
                    {selected.risk.flags.length > 0 ? (
                      selected.risk.flags.map((flag) => (
                        <div key={flag} className="kyc-flag">
                          <AlertIcon className="kyc-flag-icon" />
                          {flag}
                        </div>
                      ))
                    ) : (
                      <span className="kyc-value">No flags</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="kyc-section">
                <h4 className="section-title">Transaction</h4>
                <div className="kyc-field">
                  <span className="kyc-label">Original amount</span>
                  <span className="kyc-value">{formatMoney(selected.transaction.originalAmount)}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Refund amount</span>
                  <span className="kyc-value">{formatMoney(selected.refundAmount)}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Payment method</span>
                  <span className="kyc-value">{paymentMethodLabel(selected.transaction.paymentMethod)}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Transaction ID</span>
                  <span className="kyc-value">{selected.transaction.id}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Processed at</span>
                  <span className="kyc-value">{formatUtc(selected.transaction.processedAt)}</span>
                </div>
              </div>

              <div className="kyc-section">
                <h4 className="section-title">Refund request</h4>
                <div className="kyc-field">
                  <span className="kyc-label">Reason</span>
                  <span className="kyc-value">{reasonLabel(selected.reason)}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Channel</span>
                  <span className="kyc-value">{channelLabel(selected.requestChannel)}</span>
                </div>
                <div className="kyc-field">
                  <span className="kyc-label">Requested</span>
                  <span className="kyc-value">
                    {selected.requestedBy || 'Customer'} at {formatUtc(selected.requestedAt)}
                  </span>
                </div>
                {selected.rejectionReason && (
                  <div className="kyc-field">
                    <span className="kyc-label">Rejection reason</span>
                    <span className="kyc-value">{selected.rejectionReason}</span>
                  </div>
                )}
                {selected.failureReason && (
                  <div className="kyc-field">
                    <span className="kyc-label">Failure reason</span>
                    <span className="kyc-value">{selected.failureReason}</span>
                  </div>
                )}
              </div>

              <div className="kyc-section">
                <h4 className="section-title">Assignment</h4>
                <div className="kyc-field">
                  <span className="kyc-label">Assigned to</span>
                  <span className="kyc-value">{selected.assignedTo || 'Unassigned'}</span>
                </div>
                {selected.reviewedBy && (
                  <div className="kyc-field">
                    <span className="kyc-label">Reviewed by</span>
                    <span className="kyc-value">
                      {selected.reviewedBy} at {formatUtc(selected.reviewedAt || '')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="kyc-section kyc-actions-section" style={{ marginTop: 20 }}>
              <h4 className="section-title">Actions</h4>
              {!isAssigned && (
                <div className="alert alert-info">
                  Assign this refund to yourself before approving, rejecting, or processing it.
                </div>
              )}
              <div className="kyc-detail-actions">
                {selected.status === 'pending-review' && (
                  <>
                    <button className="btn btn-approve" onClick={() => approveRefund(selected.id)} disabled={!isAssigned}>
                      Approve refund
                    </button>
                    <button className="btn btn-reject" onClick={() => setRejecting(selected)} disabled={!isAssigned}>
                      Reject refund
                    </button>
                    <button className="btn" onClick={() => setRequestingInfo(selected)} disabled={!isAssigned}>
                      Request information
                    </button>
                  </>
                )}
                {selected.status === 'approved' && (
                  <>
                    <button className="btn btn-approve" onClick={() => processRefund(selected.id)} disabled={!isAssigned}>
                      Mark as processed
                    </button>
                    <button className="btn btn-reject" onClick={() => setFailing(selected)} disabled={!isAssigned}>
                      Mark as failed
                    </button>
                  </>
                )}
                {selected.status === 'waiting-for-info' && (
                  <button className="btn" onClick={() => reopenRefund(selected.id)} disabled={!isAssigned}>
                    Reopen for review
                  </button>
                )}
                {(selected.status === 'rejected' || selected.status === 'processed' || selected.status === 'failed') && (
                  <button className="btn" onClick={() => reopenRefund(selected.id)} disabled={!isAssigned}>
                    Reopen for review
                  </button>
                )}
              </div>
            </div>

            <div className="kyc-notes-section kyc-section" style={{ marginTop: 20 }}>
              <h4 className="section-title">Notes</h4>
              {selected.notes.length === 0 && <div className="kyc-note-empty">No notes yet.</div>}
              {selected.notes.map((note) => (
                <div key={note.id} className="kyc-note">
                  <div className="kyc-note-meta">
                    {note.author} · {formatUtc(note.timestamp)}
                  </div>
                  <div className="kyc-note-text">{note.text}</div>
                </div>
              ))}
              <div className="kyc-note-input">
                <textarea
                  className="textarea"
                  rows={2}
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
                <button className="btn" onClick={handleAddNote} disabled={!noteText.trim()}>
                  Add note
                </button>
              </div>
            </div>

            <div className="kyc-audit-section kyc-section" style={{ marginTop: 20 }}>
              <h4 className="section-title">Audit trail</h4>
              <div className="audit-table-wrapper">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Previous</th>
                      <th>New</th>
                      <th>Actor</th>
                      <th>Timestamp (UTC)</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...selected.auditLog].reverse().map((event) => (
                      <tr key={event.id}>
                        <td>{event.action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</td>
                        <td>{event.previousStatus ? STATUS_LABELS[event.previousStatus] : '—'}</td>
                        <td>{event.newStatus ? STATUS_LABELS[event.newStatus] : '—'}</td>
                        <td>{event.actor}</td>
                        <td>{formatUtc(event.timestamp)}</td>
                        <td>{event.reason || event.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="kyc-detail panel-empty">Select a refund to review.</div>
        )}
      </div>

      {rejecting && (
        <div className="modal-overlay" onClick={resetReject}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject refund</h3>
            <p>
              You are rejecting <strong>{rejecting.id}</strong> for <strong>{formatMoney(rejecting.refundAmount)}</strong>.
            </p>
            <div className="field">
              <label className="field-label" htmlFor="reject-reason">
                Reason
              </label>
              <select id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                <option value="">Select a reason</option>
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            {rejectReason === 'Other' && (
              <div className="field">
                <label className="field-label" htmlFor="reject-other">
                  Please specify <span className="required">*</span>
                </label>
                <textarea
                  id="reject-other"
                  className="textarea"
                  rows={3}
                  value={rejectOther}
                  onChange={(e) => setRejectOther(e.target.value)}
                  placeholder="Enter the rejection reason..."
                />
              </div>
            )}
            <footer>
              <button className="btn" onClick={resetReject}>
                Cancel
              </button>
              <button
                className="btn btn-reject"
                onClick={submitReject}
                disabled={!rejectReason || (rejectReason === 'Other' ? !rejectOther.trim() : false)}
              >
                Reject refund
              </button>
            </footer>
          </div>
        </div>
      )}

      {requestingInfo && (
        <div className="modal-overlay" onClick={resetInfo}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request information</h3>
            <p>Choose what the customer or merchant needs to provide before this refund can proceed.</p>
            <div className="kyc-checkboxes">
              {INFO_OPTIONS.map((option) => (
                <label key={option} className="kyc-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedInfo.has(option)}
                    onChange={(e) => {
                      const next = new Set(selectedInfo)
                      if (e.target.checked) next.add(option)
                      else next.delete(option)
                      setSelectedInfo(next)
                    }}
                  />
                  {option}
                </label>
              ))}
            </div>
            {selectedInfo.has('Other') && (
              <div className="field" style={{ marginTop: 12 }}>
                <label className="field-label" htmlFor="info-other">
                  Please specify <span className="required">*</span>
                </label>
                <textarea
                  id="info-other"
                  className="textarea"
                  rows={2}
                  value={infoOther}
                  onChange={(e) => setInfoOther(e.target.value)}
                  placeholder="What information is needed?"
                />
              </div>
            )}
            <footer>
              <button className="btn" onClick={resetInfo}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitInfo} disabled={selectedInfo.size === 0}>
                Request information
              </button>
            </footer>
          </div>
        </div>
      )}

      {failing && (
        <div className="modal-overlay" onClick={resetFail}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Mark refund as failed</h3>
            <p>
              You are marking <strong>{failing.id}</strong> as failed. Provide a reason for the failure.
            </p>
            <div className="field">
              <label className="field-label" htmlFor="failure-reason">
                Failure reason <span className="required">*</span>
              </label>
              <textarea
                id="failure-reason"
                className="textarea"
                rows={3}
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder="e.g. Bank account closed, payment processor error..."
              />
            </div>
            <footer>
              <button className="btn" onClick={resetFail}>
                Cancel
              </button>
              <button className="btn btn-reject" onClick={submitFail} disabled={!failureReason.trim()}>
                Mark as failed
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
