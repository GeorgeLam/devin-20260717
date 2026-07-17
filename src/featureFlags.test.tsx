import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App.tsx'
import { useFlagStore } from './store.ts'
import { AllProviders } from './test/wrapper.tsx'

describe('Feature flags store', () => {
  it('updates a staging value and records an audit event', async () => {
    localStorage.setItem('novaops-current-user', 'demo-user')
    const { result } = renderHook(() => useFlagStore(), { wrapper: AllProviders })

    await waitFor(() => expect(result.current.flags.length).toBeGreaterThan(0))

    act(() => result.current.updateStaging('flag-1', false))

    const flag = result.current.flags.find((f) => f.id === 'flag-1')
    expect(flag?.stagingValue).toBe(false)
    expect(flag?.auditLog.some((e) => e.action === 'update' && e.newValue === false)).toBe(true)
  })

  it('creates a production change request and prevents duplicate pending requests', async () => {
    localStorage.setItem('novaops-current-user', 'demo-user')
    const { result } = renderHook(() => useFlagStore(), { wrapper: AllProviders })

    await waitFor(() => expect(result.current.flags.length).toBeGreaterThan(0))

    act(() => result.current.requestProductionChange('flag-1', false, 'rollback'))
    expect(result.current.pendingRequests.some((r) => r.flagId === 'flag-1')).toBe(true)

    act(() => result.current.requestProductionChange('flag-1', true, 're-enable'))
    expect(result.current.pendingRequests.filter((r) => r.flagId === 'flag-1')).toHaveLength(1)
    expect(result.current.pendingRequests.find((r) => r.flagId === 'flag-1')?.requestedValue).toBe(true)
  })

  it('approves a production change request and applies the new value', async () => {
    localStorage.setItem('novaops-current-user', 'sarah.chen')
    const { result, unmount } = renderHook(() => useFlagStore(), { wrapper: AllProviders })
    await waitFor(() => expect(result.current.pendingRequests.length).toBeGreaterThan(0))

    const req = result.current.pendingRequests[0]
    const requestedValue = req.requestedValue
    unmount()

    localStorage.setItem('novaops-current-user', 'demo-user')
    const { result: result2 } = renderHook(() => useFlagStore(), { wrapper: AllProviders })
    await waitFor(() => expect(result2.current.pendingRequests.length).toBeGreaterThan(0))

    act(() => result2.current.approveRequest(req.id))

    const flag = result2.current.flags.find((f) => f.id === req.flagId)
    expect(flag?.productionValue).toBe(requestedValue)
    expect(result2.current.requests.find((r) => r.id === req.id)?.status).toBe('approved')
    expect(flag?.auditLog.some((e) => e.action === 'approve')).toBe(true)
  })
})

describe('Feature flags UI', () => {
  it('blocks a user from approving their own sensitive production request', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'sarah.chen')
    render(<App />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'Feature flags' }))

    await user.click(screen.getByRole('button', { name: /Approval requests/i }))
    await waitFor(() => screen.getByRole('heading', { name: 'Approval requests' }))

    const requestRow = screen.getByText(/requested by sarah.chen/i).closest('.request-row')
    if (!requestRow) throw new Error('Request row not found')
    const approveButton = within(requestRow).getByRole('button', { name: 'Approve' })
    expect(approveButton).toBeDisabled()

    await user.selectOptions(screen.getByLabelText(/Acting as/i), 'demo-user')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled())
  })
})
