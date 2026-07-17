import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import RefundsDashboard from './RefundsDashboard.tsx'
import { AllProviders } from './test/wrapper.tsx'

describe('Refunds dashboard', () => {
  it('shows summary metrics and requires assignment before actions', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<RefundsDashboard />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'Refunds dashboard' }))

    expect(screen.getAllByText('Pending review')[0]).toBeInTheDocument()

    const approveButton = screen.getByRole('button', { name: /Approve refund/ })
    const rejectButton = screen.getByRole('button', { name: /Reject refund/ })

    expect(approveButton).toBeDisabled()
    expect(rejectButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await waitFor(() => expect(approveButton).toBeEnabled())
    await waitFor(() => expect(rejectButton).toBeEnabled())
  })

  it('approves a refund and switches to the approved tab', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<RefundsDashboard />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'Refunds dashboard' }))

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await user.click(screen.getByRole('button', { name: /Approve refund/ }))

    await waitFor(() => screen.getByRole('button', { name: /^Approved/ }))
    await user.click(screen.getByRole('button', { name: /^Approved/ }))
  })

  it('rejects a refund using a reason and switches to the rejected tab', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<RefundsDashboard />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'Refunds dashboard' }))

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await user.click(screen.getByRole('button', { name: /Reject refund/ }))

    await waitFor(() => screen.getByText(/You are rejecting/))

    const select = screen.getByLabelText(/Reason/)
    await user.selectOptions(select, 'Suspected fraud / unauthorised')

    const rejectButtons = screen.getAllByRole('button', { name: /Reject refund/ })
    await waitFor(() => expect(rejectButtons[rejectButtons.length - 1]).toBeEnabled())

    const submitButtons = screen.getAllByRole('button', { name: /Reject refund/ })
    await user.click(submitButtons[submitButtons.length - 1])

    await waitFor(() => screen.getByRole('button', { name: /^Rejected/ }))
    await user.click(screen.getByRole('button', { name: /^Rejected/ }))
  })

  it('requests information and supports the Other option', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<RefundsDashboard />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'Refunds dashboard' }))

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await user.click(screen.getByRole('button', { name: /Request information/ }))

    await waitFor(() => screen.getByText(/Choose what the customer or merchant needs to provide/))

    await user.click(screen.getByLabelText('Other'))
    await user.type(screen.getByPlaceholderText(/What information is needed?/i), 'Customer ID')

    const requestButtons = screen.getAllByRole('button', { name: /^Request information$/ })
    await waitFor(() => expect(requestButtons[requestButtons.length - 1]).toBeEnabled())

    const submitButtons = screen.getAllByRole('button', { name: /^Request information$/ })
    await user.click(submitButtons[submitButtons.length - 1])

    await waitFor(() => screen.getByRole('button', { name: /^Waiting for info/ }))
    await user.click(screen.getByRole('button', { name: /^Waiting for info/ }))
  })

  it('adds a note that appears in the audit trail', async () => {
    const user = userEvent.setup()
    localStorage.setItem('novaops-current-user', 'demo-user')
    render(<RefundsDashboard />, { wrapper: AllProviders })

    await waitFor(() => screen.getByRole('heading', { name: 'Refunds dashboard' }))

    await user.click(screen.getByRole('button', { name: /Assign to me/ }))
    await user.type(screen.getByPlaceholderText('Add a note...'), 'Called the customer')
    await user.click(screen.getByRole('button', { name: /Add note/ }))

    await waitFor(() => expect(screen.getAllByText('Called the customer').length).toBeGreaterThanOrEqual(1))
  })
})
