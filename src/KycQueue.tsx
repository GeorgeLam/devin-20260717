import { useMemo, useState } from 'react'
import type { KycCase, KycStatus, KycRiskLevel } from './kycTypes'
import { useKycStore } from './kycStore'

const currentUser = 'demo-user'

const STATUS_LABELS: Record<KycStatus, string> = {
  'in-review': 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  'waiting-for-info': 'Waiting for customer information',
}

const STATUS_ORDER: KycStatus[] = ['in-review', 'approved', 'rejected', 'waiting-for-info']

const REJECT_REASONS = [
  'Document unclear / illegible',
  'Expired document',
  'Name or DOB mismatch',
  'Address not verified',
  'Incomplete application',
  'Unresolvable PEP / sanctions match',
  'Suspected fraud',
  'Other',
]

const INFO_OPTIONS = [
  'Clearer ID photo',
  'Proof of address',
  'Better selfie',
  'Source of funds documentation',
  'Updated ID',
  'Other',
]

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

function formatUtc(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
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

function ageInStatus(item: KycCase): string {
  return formatAgeMs(Date.now() - new Date(item.lastStatusAt).getTime())
}

function isOverdue(item: KycCase): boolean {
  const threshold = item.risk.overall === 'critical' || item.risk.overall === 'high' ? 1000 * 60 * 60 : 1000 * 60 * 60 * 4
  return Date.now() - new Date(item.lastStatusAt).getTime() > threshold
}

function maskEmail(email: string): string {
  const [user, domain] = email.split('@')
  if (!user || !domain) return email
  return `${user.slice(0, 2)}***@${domain}`
}

function maskPhone(phone: string): string {
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
}

function statusBadgeClass(status: KycStatus): string {
  switch (status) {
    case 'in-review':
      return 'badge-status-in-review'
    case 'approved':
      return 'badge-status-approved'
    case 'rejected':
      return 'badge-status-rejected'
    case 'waiting-for-info':
      return 'badge-status-waiting'
    default:
      return 'badge-status-in-review'
  }
}

function riskBadgeClass(risk: KycRiskLevel): string {
  switch (risk) {
    case 'low':
      return 'badge-risk-low'
    case 'medium':
      return 'badge-risk-medium'
    case 'high':
      return 'badge-risk-high'
    case 'critical':
      return 'badge-risk-critical'
    default:
      return 'badge-risk-low'
  }
}

function ShieldCheckIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 12 15 17 10" />
    </svg>
  )
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

export default function KycQueue() {
  const { cases, assignCase, approveCase, rejectCase, requestInfo, reopenCase, addNote } = useKycStore()
  const [activeTab, setActiveTab] = useState<KycStatus>('in-review')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<KycCase | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectOther, setRejectOther] = useState('')
  const [requesting, setRequesting] = useState<KycCase | null>(null)
  const [selectedInfo, setSelectedInfo] = useState<Set<string>>(new Set())
  const [infoOther, setInfoOther] = useState('')
  const [noteText, setNoteText] = useState('')

  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => c.status === activeTab)
      .filter(
        (c) =>
          c.applicant.fullName.toLowerCase().includes(search.toLowerCase()) ||
          c.id.toLowerCase().includes(search.toLowerCase()) ||
          c.applicant.email.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.lastStatusAt).getTime() - new Date(a.lastStatusAt).getTime())
  }, [cases, activeTab, search])

  const selectedCase = useMemo(() => cases.find((c) => c.id === selectedId) || filteredCases[0] || null, [cases, selectedId, filteredCases])

  const counts = useMemo(() => {
    return STATUS_ORDER.reduce(
      (acc, status) => {
        acc[status] = cases.filter((c) => c.status === status).length
        return acc
      },
      {} as Record<KycStatus, number>
    )
  }, [cases])

  function openReject(item: KycCase) {
    setRejecting(item)
    setRejectReason('')
    setRejectOther('')
  }

  function submitReject() {
    if (!rejecting) return
    const reason = rejectReason === 'Other' ? `Other: ${rejectOther.trim()}` : rejectReason
    if (!reason) return
    rejectCase(rejecting.id, reason)
    setRejecting(null)
  }

  function openRequestInfo(item: KycCase) {
    setRequesting(item)
    setSelectedInfo(new Set())
    setInfoOther('')
  }

  function toggleInfoOption(option: string) {
    setSelectedInfo((prev) => {
      const next = new Set(prev)
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return next
    })
  }

  function submitRequestInfo() {
    if (!requesting) return
    const items = Array.from(selectedInfo)
    if (items.length === 0 && !infoOther.trim()) return
    const note = items.includes('Other') && infoOther.trim() ? `Other: ${infoOther.trim()}` : infoOther.trim()
    const filteredItems = items.filter((i) => i !== 'Other')
    if (items.includes('Other') && infoOther.trim()) {
      filteredItems.push(`Other: ${infoOther.trim()}`)
    }
    requestInfo(requesting.id, filteredItems, note)
    setRequesting(null)
  }

  function submitNote() {
    if (!selectedCase || !noteText.trim()) return
    addNote(selectedCase.id, noteText)
    setNoteText('')
  }

  return (
    <>
      <div className="page-header">
        <h2>KYC review queue</h2>
        <p>Review customer identity cases and maintain the FCA audit trail.</p>
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
              {counts[status] > 0 && <span className="pending-pill">{counts[status]}</span>}
            </button>
          ))}
        </div>

        <div className="search-wrapper">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, email or case ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="kyc-layout">
        <div className="kyc-list">
          {filteredCases.length === 0 && <div className="panel-empty">No cases match this tab.</div>}
          {filteredCases.map((item) => (
            <button
              key={item.id}
              className={classNames('kyc-list-item', selectedCase?.id === item.id && 'active')}
              onClick={() => setSelectedId(item.id)}
            >
              <div className="kyc-list-header">
                <span className="kyc-list-id">{item.id}</span>
                <span className={classNames('badge', statusBadgeClass(item.status))}>{STATUS_LABELS[item.status]}</span>
                <span className={classNames('badge', riskBadgeClass(item.risk.overall))}>{item.risk.overall}</span>
              </div>
              <div className="kyc-list-name">{item.applicant.fullName}</div>
              <div className="kyc-list-meta">
                <span>{item.document.type.replace('-', ' ')}</span>
                <span>·</span>
                <span className={isOverdue(item) ? 'kyc-overdue' : ''}>{ageInStatus(item)}</span>
                {item.assignedTo && (
                  <>
                    <span>·</span>
                    <span>{item.assignedTo === currentUser ? 'Assigned to you' : `Assigned to ${item.assignedTo}`}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="kyc-detail">
          {selectedCase ? (
            <>
              <div className="kyc-detail-header">
                <div>
                  <div className="kyc-detail-title">
                    {selectedCase.applicant.fullName}
                    <span className={classNames('badge', statusBadgeClass(selectedCase.status))}>{STATUS_LABELS[selectedCase.status]}</span>
                    <span className={classNames('badge', riskBadgeClass(selectedCase.risk.overall))}>{selectedCase.risk.overall} risk</span>
                  </div>
                  <div className="kyc-detail-meta">
                    {selectedCase.id} · Submitted {formatUtc(selectedCase.submission.submittedAt)} · In status for{' '}
                    <span className={isOverdue(selectedCase) ? 'kyc-overdue' : ''}>{ageInStatus(selectedCase)}</span>
                  </div>
                </div>
                <div className="kyc-detail-actions">
                  {selectedCase.status === 'in-review' && (
                    <>
                      <button
                        className="btn btn-approve"
                        onClick={() => approveCase(selectedCase.id)}
                        disabled={!!selectedCase.assignedTo && selectedCase.assignedTo !== currentUser}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-reject"
                        onClick={() => openReject(selectedCase)}
                        disabled={!!selectedCase.assignedTo && selectedCase.assignedTo !== currentUser}
                      >
                        Reject
                      </button>
                      <button
                        className="btn"
                        onClick={() => openRequestInfo(selectedCase)}
                        disabled={!!selectedCase.assignedTo && selectedCase.assignedTo !== currentUser}
                      >
                        Request information
                      </button>
                    </>
                  )}
                  {selectedCase.status === 'waiting-for-info' && (
                    <>
                      <button className="btn btn-approve" onClick={() => reopenCase(selectedCase.id)}>
                        Re-open for review
                      </button>
                    </>
                  )}
                  {(selectedCase.status === 'approved' || selectedCase.status === 'rejected') && (
                    <button className="btn" onClick={() => reopenCase(selectedCase.id)}>
                      Re-open
                    </button>
                  )}
                  <button
                    className="btn"
                    onClick={() => assignCase(selectedCase.id)}
                    disabled={selectedCase.assignedTo === currentUser}
                  >
                    {selectedCase.assignedTo === currentUser ? 'Assigned to you' : 'Assign to me'}
                  </button>
                </div>
              </div>

              {selectedCase.assignedTo && selectedCase.assignedTo !== currentUser && (
                <div className="alert">
                  <UserIcon className="alert-icon" />
                  This case is assigned to {selectedCase.assignedTo}. You can still view details, but you should assign it to yourself before taking action.
                </div>
              )}

              <div className="kyc-grid">
                <div className="kyc-section">
                  <h4 className="section-title">Applicant identity</h4>
                  <div className="kyc-field">
                    <span className="kyc-label">Full name</span>
                    <span className="kyc-value">{selectedCase.applicant.fullName}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Date of birth</span>
                    <span className="kyc-value">{selectedCase.applicant.dateOfBirth}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Nationality</span>
                    <span className="kyc-value">{selectedCase.applicant.nationality}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Address</span>
                    <span className="kyc-value">{selectedCase.applicant.address}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Email</span>
                    <span className="kyc-value">{maskEmail(selectedCase.applicant.email)}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Phone</span>
                    <span className="kyc-value">{maskPhone(selectedCase.applicant.phone)}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Applicant ID</span>
                    <span className="kyc-value">{selectedCase.applicant.id}</span>
                  </div>
                </div>

                <div className="kyc-section">
                  <h4 className="section-title">Submitted documents</h4>
                  <div className="kyc-docs">
                    <div className="kyc-doc">
                      <img src={selectedCase.document.frontImageUrl} alt="Document front" />
                      <span>Front</span>
                    </div>
                    {selectedCase.document.backImageUrl && (
                      <div className="kyc-doc">
                        <img src={selectedCase.document.backImageUrl} alt="Document back" />
                        <span>Back</span>
                      </div>
                    )}
                    {selectedCase.document.selfieImageUrl && (
                      <div className="kyc-doc">
                        <img src={selectedCase.document.selfieImageUrl} alt="Selfie" />
                        <span>Selfie</span>
                      </div>
                    )}
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Document type</span>
                    <span className="kyc-value">{selectedCase.document.type.replace('-', ' ')}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Document number</span>
                    <span className="kyc-value">{selectedCase.document.number}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Issuing country</span>
                    <span className="kyc-value">{selectedCase.document.issuingCountry}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Expiry date</span>
                    <span className="kyc-value">{selectedCase.document.expiryDate}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Tampering score</span>
                    <span className="kyc-value">{selectedCase.document.tamperingScore}%</span>
                  </div>
                  {selectedCase.document.livenessScore && (
                    <div className="kyc-field">
                      <span className="kyc-label">Liveness score</span>
                      <span className="kyc-value">{selectedCase.document.livenessScore}%</span>
                    </div>
                  )}
                </div>

                <div className="kyc-section">
                  <h4 className="section-title">Risk & screening</h4>
                  <div className="kyc-field">
                    <span className="kyc-label">Overall risk</span>
                    <span className={classNames('badge', riskBadgeClass(selectedCase.risk.overall))}>{selectedCase.risk.overall}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Verification score</span>
                    <span className="kyc-value">{selectedCase.risk.verificationScore}%</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">PEP match</span>
                    <span className="kyc-value">{selectedCase.risk.pepMatch ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Sanctions match</span>
                    <span className="kyc-value">{selectedCase.risk.sanctionsMatch ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Adverse media match</span>
                    <span className="kyc-value">{selectedCase.risk.adverseMediaMatch ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedCase.risk.flags.length > 0 && (
                    <div className="kyc-flags">
                      {selectedCase.risk.flags.map((flag) => (
                        <div key={flag} className="kyc-flag">
                          <ShieldCheckIcon className="kyc-flag-icon" />
                          {flag}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="kyc-section">
                  <h4 className="section-title">Case metadata</h4>
                  <div className="kyc-field">
                    <span className="kyc-label">Case ID</span>
                    <span className="kyc-value">{selectedCase.id}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Submitted at</span>
                    <span className="kyc-value">{formatUtc(selectedCase.submission.submittedAt)}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">Channel</span>
                    <span className="kyc-value">{selectedCase.submission.channel}</span>
                  </div>
                  <div className="kyc-field">
                    <span className="kyc-label">IP address</span>
                    <span className="kyc-value">{selectedCase.submission.ipAddress}</span>
                  </div>
                  {selectedCase.assignedTo && (
                    <div className="kyc-field">
                      <span className="kyc-label">Assigned to</span>
                      <span className="kyc-value">{selectedCase.assignedTo}</span>
                    </div>
                  )}
                  {selectedCase.reviewedBy && (
                    <div className="kyc-field">
                      <span className="kyc-label">Last reviewer</span>
                      <span className="kyc-value">{selectedCase.reviewedBy} · {formatUtc(selectedCase.reviewedAt || '')}</span>
                    </div>
                  )}
                  {selectedCase.rejectionReason && (
                    <div className="kyc-field">
                      <span className="kyc-label">Rejection reason</span>
                      <span className="kyc-value">{selectedCase.rejectionReason}</span>
                    </div>
                  )}
                  {selectedCase.requestedInfo && selectedCase.requestedInfo.length > 0 && (
                    <div className="kyc-field">
                      <span className="kyc-label">Requested information</span>
                      <span className="kyc-value">{selectedCase.requestedInfo.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="kyc-section kyc-notes-section">
                <h4 className="section-title">Case notes</h4>
                {selectedCase.notes.length === 0 && <div className="kyc-note-empty">No notes yet.</div>}
                {selectedCase.notes.map((note) => (
                  <div className="kyc-note" key={note.id}>
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
                    placeholder="Add a case note..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={submitNote} disabled={!noteText.trim()}>
                    Add note
                  </button>
                </div>
              </div>

              <div className="kyc-section kyc-audit-section">
                <h4 className="section-title">Audit trail</h4>
                <div className="audit-table-wrapper">
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Status change</th>
                        <th>Reason / Note</th>
                        <th>Timestamp (UTC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedCase.auditLog].reverse().map((event) => (
                        <tr key={event.id}>
                          <td>{event.action.replace(/_/g, ' ')}</td>
                          <td>{event.actor}</td>
                          <td>
                            {event.previousStatus && event.newStatus
                              ? `${STATUS_LABELS[event.previousStatus]} → ${STATUS_LABELS[event.newStatus]}`
                              : event.newStatus
                                ? STATUS_LABELS[event.newStatus]
                                : '—'}
                          </td>
                          <td>
                            {event.reason}
                            {event.requestedItems && `Requested: ${event.requestedItems.join(', ')}`}
                            {event.note}
                          </td>
                          <td>{formatUtc(event.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="panel-empty">Select a case to review.</div>
          )}
        </div>
      </div>

      {rejecting && (
        <div className="modal-overlay" onClick={() => setRejecting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Reject {rejecting.applicant.fullName}</h3>
            <p>Please select a reason for rejection. This will be recorded in the audit trail.</p>

            <div className="field">
              <label className="field-label">
                Rejection reason <span className="required">*</span>
              </label>
              <select
                className="textarea"
                style={{ minHeight: 0, resize: 'none' }}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              >
                <option value="">Select a reason...</option>
                {REJECT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            {rejectReason === 'Other' && (
              <div className="field">
                <label className="field-label">
                  Other reason <span className="required">*</span>
                </label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Explain the rejection reason..."
                  value={rejectOther}
                  onChange={(e) => setRejectOther(e.target.value)}
                />
              </div>
            )}

            <footer>
              <button className="btn" onClick={() => setRejecting(null)}>
                Cancel
              </button>
              <button
                className="btn btn-reject"
                onClick={submitReject}
                disabled={!rejectReason || (rejectReason === 'Other' && !rejectOther.trim())}
              >
                Reject case
              </button>
            </footer>
          </div>
        </div>
      )}

      {requesting && (
        <div className="modal-overlay" onClick={() => setRequesting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request information from {requesting.applicant.fullName}</h3>
            <p>Select the documents or information needed before the case can proceed.</p>

            <div className="field">
              <label className="field-label">Requested items</label>
              <div className="kyc-checkboxes">
                {INFO_OPTIONS.map((option) => (
                  <label key={option} className="kyc-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedInfo.has(option)}
                      onChange={() => toggleInfoOption(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedInfo.has('Other') && (
              <div className="field">
                <label className="field-label">
                  Other information <span className="required">*</span>
                </label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder="Describe what additional information is required..."
                  value={infoOther}
                  onChange={(e) => setInfoOther(e.target.value)}
                />
              </div>
            )}

            <footer>
              <button className="btn" onClick={() => setRequesting(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={submitRequestInfo}
                disabled={selectedInfo.size === 0 && !infoOther.trim()}
              >
                Request information
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
