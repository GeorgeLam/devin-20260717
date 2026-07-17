import { useState } from 'react'
import type { Flag, FlagValue, Environment, ChangeRequest } from './types'
import { useFlagStore } from './store'
import KycQueue from './KycQueue'
import RefundsDashboard from './RefundsDashboard'
import './index.css'

function FlagIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
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

function AlertIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function HistoryIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function FileTextIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

function ShieldCheckIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 12 15 17 10" />
    </svg>
  )
}

function CreditCardIcon(props: { className?: string }) {
  return (
    <svg className={props.className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function displayValue(value: FlagValue): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  return value
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatUtcTime(iso: string): string {
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

function classNames(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

const currentUser = 'demo-user'

type Page = 'flags' | 'approvals' | 'kyc' | 'refunds'

export default function App() {
  const { flags, pendingRequests, updateStaging, requestProductionChange, approveRequest, rejectRequest } = useFlagStore()
  const [page, setPage] = useState<Page>('flags')
  const [env, setEnv] = useState<Environment>('staging')
  const [search, setSearch] = useState('')
  const [detailFlag, setDetailFlag] = useState<Flag | null>(null)
  const [confirm, setConfirm] = useState<{ flag: Flag; value: FlagValue; reason: string } | null>(null)

  const filteredFlags = flags.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.key.toLowerCase().includes(search.toLowerCase())
  )

  function pendingFor(flagId: string): ChangeRequest | undefined {
    return pendingRequests.find((r) => r.flagId === flagId)
  }

  function handleToggle(flag: Flag) {
    if (flag.type !== 'boolean') return
    if (env === 'production') {
      const current = flag.productionValue as boolean
      setConfirm({ flag, value: !current, reason: '' })
      return
    }
    updateStaging(flag.id, !(flag.stagingValue as boolean))
  }

  function handleEnumChange(flag: Flag, value: string) {
    if (flag.type !== 'enum' || !flag.options) return
    if (env === 'production') {
      setConfirm({ flag, value, reason: '' })
      return
    }
    updateStaging(flag.id, value)
  }

  function submitRequest() {
    if (!confirm) return
    if (confirm.flag.sensitive && !confirm.reason.trim()) return
    requestProductionChange(confirm.flag.id, confirm.value, confirm.reason.trim())
    setConfirm(null)
  }

  const isConfirmDisabled = !!confirm && confirm.flag.sensitive && !confirm.reason.trim()

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">N</span>
          <span className="brand-name">NovaOps</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Tools</div>
          <div className="nav-group">
            <button className="nav-item nav-parent">
              <FlagIcon className="nav-icon" />
              Feature flags
            </button>
            <button
              className={classNames('nav-item nav-sub', page === 'flags' && 'active')}
              onClick={() => setPage('flags')}
            >
              <span className="nav-sub-dot" />
              Flags
            </button>
            <button
              className={classNames('nav-item nav-sub', page === 'approvals' && 'active')}
              onClick={() => setPage('approvals')}
            >
              <FileTextIcon className="nav-icon" />
              Approval requests
              {pendingRequests.length > 0 && <span className="pending-pill">{pendingRequests.length}</span>}
            </button>
            <button
              className={classNames('nav-item', page === 'kyc' && 'active')}
              onClick={() => setPage('kyc')}
            >
              <ShieldCheckIcon className="nav-icon" />
              KYC Review
            </button>
            <button
              className={classNames('nav-item', page === 'refunds' && 'active')}
              onClick={() => setPage('refunds')}
            >
              <CreditCardIcon className="nav-icon" />
              Refunds
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-row">
            <div className="avatar">DU</div>
            <div>
              <div className="user-name">demo-user</div>
              <div className="user-role">Internal admin</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>
              {page === 'kyc'
                ? 'KYC Review'
                : page === 'approvals'
                  ? 'Approval requests'
                  : page === 'refunds'
                    ? 'Refunds'
                    : 'Feature flags'}
            </h1>
            <span className="topbar-meta">
              {page === 'kyc'
                ? 'Customer identity compliance queue'
                : page === 'approvals'
                  ? 'Review pending production changes'
                  : page === 'refunds'
                    ? 'Review and track refund requests'
                    : 'Manage staging and production configuration'}
            </span>
          </div>
          <div className="topbar-actions">
            <div className="avatar">DU</div>
          </div>
        </header>

        <div className="content">
          {page === 'kyc' ? (
            <KycQueue />
          ) : page === 'refunds' ? (
            <RefundsDashboard />
          ) : page === 'flags' ? (
            <>
              <div className="page-header">
                <h2>{env === 'staging' ? 'Staging flags' : 'Production flags'}</h2>
                <p>
                  {env === 'staging'
                    ? 'Changes here take effect immediately.'
                    : 'All changes require approval before they take effect.'}
                </p>
              </div>

              <div className="toolbar">
                <div className="tabs">
                  <button className={classNames(env === 'staging' && 'active')} onClick={() => setEnv('staging')}>
                    Staging
                  </button>
                  <button className={classNames(env === 'production' && 'active')} onClick={() => setEnv('production')}>
                    Production
                  </button>
                </div>

                <div className="search-wrapper">
                  <SearchIcon className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search flags by name or key..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="card">
                <table>
                  <thead>
                    <tr>
                      <th>Flag</th>
                      <th>Type</th>
                      <th>{env === 'staging' ? 'Staging value' : 'Production value'}</th>
                      <th>Environment</th>
                      <th>Owner</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFlags.map((flag) => {
                      const pending = pendingFor(flag.id)
                      const currentValue = env === 'staging' ? flag.stagingValue : flag.productionValue
                      const isProduction = env === 'production'

                      return (
                        <tr key={flag.id}>
                          <td>
                            <div className="flag-name">{flag.name}</div>
                            <div className="flag-key">{flag.key}</div>
                            <div className="flag-meta">
                              {flag.sensitive && <span className="badge badge-sensitive">Sensitive</span>}
                            </div>
                          </td>
                          <td>{flag.type === 'boolean' ? 'Boolean' : 'Enum'}</td>
                          <td>
                            {flag.type === 'boolean' ? (
                              <button
                                className={classNames('toggle', currentValue && 'on')}
                                onClick={() => handleToggle(flag)}
                                aria-label={displayValue(currentValue)}
                              >
                                <span className="toggle-knob" />
                              </button>
                            ) : (
                              <select
                                value={String(currentValue)}
                                onChange={(e) => handleEnumChange(flag, e.target.value)}
                              >
                                {flag.options?.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            )}
                            {isProduction && pending && (
                              <div className="request-pending-note">
                                {pending.requestedBy === currentUser ? (
                                  <>
                                    You have a pending approval request. You tried to change this value to{' '}
                                    <strong>{displayValue(pending.requestedValue)}</strong> at {formatTime(pending.requestedAt)}.
                                  </>
                                ) : (
                                  <>
                                    A pending approval request exists to change this value to{' '}
                                    <strong>{displayValue(pending.requestedValue)}</strong> by {pending.requestedBy} at{' '}
                                    {formatTime(pending.requestedAt)}.
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={classNames('badge', isProduction ? 'badge-production' : 'badge-staging')}>
                              {env}
                            </span>
                          </td>
                          <td>{flag.owner}</td>
                          <td>
                            <button
                              className="icon-button"
                              title="View history"
                              onClick={() => setDetailFlag(flag)}
                            >
                              <HistoryIcon className="icon-history" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredFlags.length === 0 && (
                      <tr>
                        <td colSpan={6} className="panel-empty">
                          No flags match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="page-header">
                <h2>Pending approval requests</h2>
                <p>Review and approve or reject production change requests before they take effect.</p>
              </div>

              <div className="card">
                {pendingRequests.length === 0 && <div className="panel-empty">No pending approval requests.</div>}
                {pendingRequests.map((req) => {
                  const flag = flags.find((f) => f.id === req.flagId)
                  if (!flag) return null
                  return (
                    <div className="request-row" key={req.id}>
                      <div className="request-info">
                        <div className="flag-name">{flag.name}</div>
                        <div className="flag-key">
                          <span className="badge badge-production">production</span>
                          {flag.sensitive && <span className="badge badge-sensitive">Sensitive</span>}
                          <span>
                            Change <strong>{displayValue(req.previousValue)}</strong> → <strong>{displayValue(req.requestedValue)}</strong>
                          </span>
                          <span className="request-meta">
                            requested by {req.requestedBy} · {formatTime(req.requestedAt)}
                          </span>
                        </div>
                        {req.reason && (
                          <div className="request-reason">
                            <strong>Reason:</strong> {req.reason}
                          </div>
                        )}
                      </div>
                      <div className="actions">
                        <button className="btn btn-approve" onClick={() => approveRequest(req.id)}>
                          Approve
                        </button>
                        <button className="btn btn-reject" onClick={() => rejectRequest(req.id)}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {detailFlag && (
        <div className="modal-overlay" onClick={() => setDetailFlag(null)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <h3>{detailFlag.name}</h3>
            <p>{detailFlag.description}</p>
            <div style={{ marginBottom: 12 }}>
              <strong>Key:</strong> <code className="flag-key">{detailFlag.key}</code>
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Owner:</strong> {detailFlag.owner}
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>Sensitive:</strong> {detailFlag.sensitive ? 'Yes' : 'No'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>Values:</strong> Staging {displayValue(detailFlag.stagingValue)} · Production{' '}
              {displayValue(detailFlag.productionValue)}
            </div>
            <h4 className="section-title">Audit log</h4>
            <div className="audit-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Environment</th>
                    <th>Old value</th>
                    <th>New value</th>
                    <th>Actor</th>
                    <th>Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...detailFlag.auditLog].reverse().map((event) => (
                    <tr key={event.id}>
                      <td>{event.action.charAt(0).toUpperCase() + event.action.slice(1)}</td>
                      <td>{event.environment}</td>
                      <td>{displayValue(event.oldValue)}</td>
                      <td>{displayValue(event.newValue)}</td>
                      <td>{event.actor}</td>
                      <td>{formatUtcTime(event.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {detailFlag.auditLog.length === 0 && (
                <div className="panel-empty">No history yet.</div>
              )}
            </div>
            <footer>
              <button className="btn" onClick={() => setDetailFlag(null)}>
                Close
              </button>
            </footer>
          </div>
        </div>
      )}

      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Request production change</h3>
            <p>
              You are requesting to change <strong>{confirm.flag.name}</strong> in production from{' '}
              <strong>{displayValue(confirm.flag.productionValue)}</strong> to{' '}
              <strong>{displayValue(confirm.value)}</strong>.
            </p>
            {confirm.flag.sensitive && (
              <div className="alert">
                <AlertIcon className="alert-icon" />
                This is a sensitive flag. Make sure the change is approved by the relevant owner.
              </div>
            )}
            {confirm.flag.sensitive && (
              <div className="field">
                <label className="field-label" htmlFor="change-reason">
                  Reason for change <span className="required">*</span>
                </label>
                <textarea
                  id="change-reason"
                  className="textarea"
                  rows={3}
                  placeholder="Explain why this change is needed..."
                  value={confirm.reason}
                  onChange={(e) => setConfirm({ ...confirm, reason: e.target.value })}
                />
              </div>
            )}
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              The value will not change until the request is approved.
            </p>
            <footer>
              <button className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={submitRequest} disabled={isConfirmDisabled}>
                Submit request
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
