import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakraProvider } from '@chakra-ui/react'
import { MemoryRouter } from 'react-router-dom'
import { OrderList } from '../OrderList'
import { vi } from 'vitest'
import { getOrders, updateOrderStatus } from '../../services/api'
import { format } from 'date-fns'

// Mock API calls
vi.mock('../../services/api', () => ({
  getOrders: vi.fn(),
  updateOrderStatus: vi.fn()
}))

// Setup test utils
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          {component}
        </MemoryRouter>
      </QueryClientProvider>
    </ChakraProvider>
  )
}

describe('OrderList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('displays loading state initially', () => {
    // Mock loading state
    vi.mocked(getOrders).mockImplementation(() => new Promise(() => {}))
    
    renderWithProviders(<OrderList />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays orders when data is loaded', async () => {
    const today = new Date()
    // Mock successful response
    const mockOrders = [
      { 
        id: 1, 
        user_id: 1,
        status: 'pending',
        total: 199.98,
        created_at: today.toISOString(),
        items: [
          { id: 1, product_id: 1, quantity: 2, price: 99.99, product: { name: 'Product 1' } }
        ]
      },
      {
        id: 2,
        user_id: 1,
        status: 'completed',
        total: 149.99,
        created_at: today.toISOString(),
        items: [
          { id: 2, product_id: 2, quantity: 1, price: 149.99, product: { name: 'Product 2' } }
        ]
      }
    ]
    
    vi.mocked(getOrders).mockResolvedValue({
      data: mockOrders,
      total: 2,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<OrderList />)
    
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('$199.98')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
      expect(screen.getByText('$149.99')).toBeInTheDocument()
      expect(screen.getByText(format(today, 'PP'))).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    // Mock error response
    vi.mocked(getOrders).mockRejectedValue(new Error('Failed to fetch orders'))
    
    renderWithProviders(<OrderList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading orders/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('filters orders by status', async () => {
    // Mock filtered response
    const mockOrders = [
      {
        id: 1,
        user_id: 1,
        status: 'pending',
        total: 199.98,
        created_at: new Date().toISOString(),
        items: [
          { id: 1, product_id: 1, quantity: 2, price: 99.99, product: { name: 'Product 1' } }
        ]
      }
    ]
    
    vi.mocked(getOrders).mockResolvedValue({
      data: mockOrders,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<OrderList />)
    
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    fireEvent.change(statusSelect, { target: { value: 'pending' } })
    
    await waitFor(() => {
      expect(getOrders).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending'
      }))
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
  })

  it('handles order status updates', async () => {
    // Mock successful status update
    vi.mocked(updateOrderStatus).mockResolvedValue({ success: true })
    
    const mockOrders = [
      {
        id: 1,
        user_id: 1,
        status: 'pending',
        total: 199.98,
        created_at: new Date().toISOString(),
        items: [
          { id: 1, product_id: 1, quantity: 2, price: 99.99, product: { name: 'Product 1' } }
        ]
      }
    ]
    
    vi.mocked(getOrders).mockResolvedValue({
      data: mockOrders,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<OrderList />)
    
    // Wait for order to be displayed
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
    
    // Update status
    const statusSelect = screen.getByTestId('order-status-1')
    fireEvent.change(statusSelect, { target: { value: 'completed' } })
    
    await waitFor(() => {
      expect(updateOrderStatus).toHaveBeenCalledWith(1, 'completed')
      expect(screen.getByText(/status updated/i)).toBeInTheDocument()
    })
  })

  it('displays order details', async () => {
    // Mock order with multiple items
    const mockOrders = [
      {
        id: 1,
        user_id: 1,
        status: 'pending',
        total: 249.97,
        created_at: new Date().toISOString(),
        items: [
          { id: 1, product_id: 1, quantity: 2, price: 99.99, product: { name: 'Product 1' } },
          { id: 2, product_id: 2, quantity: 1, price: 49.99, product: { name: 'Product 2' } }
        ]
      }
    ]
    
    vi.mocked(getOrders).mockResolvedValue({
      data: mockOrders,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<OrderList />)
    
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('2x')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
      expect(screen.getByText('1x')).toBeInTheDocument()
      expect(screen.getByText('$249.97')).toBeInTheDocument()
    })
  })

  it('displays no orders message when list is empty', async () => {
    // Mock empty response
    vi.mocked(getOrders).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<OrderList />)
    
    await waitFor(() => {
      expect(screen.getByText(/no orders found/i)).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    // Mock network error
    vi.mocked(getOrders).mockRejectedValue(new Error('Network error'))
    
    renderWithProviders(<OrderList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading orders/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
    
    // Test retry functionality
    vi.mocked(getOrders).mockResolvedValueOnce({
      data: [{
        id: 1,
        user_id: 1,
        status: 'pending',
        total: 99.99,
        created_at: new Date().toISOString(),
        items: [
          { id: 1, product_id: 1, quantity: 1, price: 99.99, product: { name: 'Product 1' } }
        ]
      }],
      total: 1,
      page: 1,
      per_page: 10
    })
    
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument()
    })
  })
}) 