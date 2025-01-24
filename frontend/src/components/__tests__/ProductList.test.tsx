import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakraProvider } from '@chakra-ui/react'
import { MemoryRouter } from 'react-router-dom'
import { ProductList } from '../ProductList'
import { vi } from 'vitest'
import { getProducts, updateStock } from '../../services/api'

// Mock API calls
vi.mock('../../services/api', () => ({
  getProducts: vi.fn(),
  updateStock: vi.fn()
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

describe('ProductList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
  })

  it('displays loading state initially', () => {
    // Mock loading state
    vi.mocked(getProducts).mockImplementation(() => new Promise(() => {}))
    
    renderWithProviders(<ProductList />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays products when data is loaded', async () => {
    // Mock successful response
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 99.99, stock: 10, sku: 'SKU1', description: 'Description 1' },
      { id: 2, name: 'Product 2', price: 149.99, stock: 5, sku: 'SKU2', description: 'Description 2' }
    ]
    
    vi.mocked(getProducts).mockResolvedValue({
      data: mockProducts,
      total: 2,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<ProductList />)
    
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
      expect(screen.getByText('$99.99')).toBeInTheDocument()
      expect(screen.getByText('Product 2')).toBeInTheDocument()
      expect(screen.getByText('$149.99')).toBeInTheDocument()
    })
  })

  it('handles error state', async () => {
    // Mock error response
    vi.mocked(getProducts).mockRejectedValue(new Error('Failed to fetch products'))
    
    renderWithProviders(<ProductList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading products/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('filters products by price range', async () => {
    // Mock filtered response
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 99.99, stock: 10, sku: 'SKU1', description: 'Description 1' }
    ]
    
    vi.mocked(getProducts).mockResolvedValue({
      data: mockProducts,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<ProductList />)
    
    const minPriceInput = screen.getByPlaceholderText(/min price/i)
    const maxPriceInput = screen.getByPlaceholderText(/max price/i)
    
    fireEvent.change(minPriceInput, { target: { value: '50' } })
    fireEvent.change(maxPriceInput, { target: { value: '100' } })
    
    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledWith(expect.objectContaining({
        minPrice: 50,
        maxPrice: 100
      }))
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    })
  })

  it('handles stock updates', async () => {
    // Mock successful stock update
    vi.mocked(updateStock).mockResolvedValue({ success: true })
    
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 99.99, stock: 10, sku: 'SKU1', description: 'Description 1' }
    ]
    
    vi.mocked(getProducts).mockResolvedValue({
      data: mockProducts,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<ProductList />)
    
    // Wait for product to be displayed
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    })
    
    // Update stock
    const stockInput = screen.getByRole('spinbutton', { name: /stock/i })
    fireEvent.change(stockInput, { target: { value: '15' } })
    fireEvent.blur(stockInput)
    
    await waitFor(() => {
      expect(updateStock).toHaveBeenCalledWith(1, 15)
      expect(screen.getByText(/stock updated/i)).toBeInTheDocument()
    })
  })

  it('displays out of stock badge', async () => {
    // Mock product with zero stock
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 99.99, stock: 0, sku: 'SKU1', description: 'Description 1' }
    ]
    
    vi.mocked(getProducts).mockResolvedValue({
      data: mockProducts,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<ProductList />)
    
    await waitFor(() => {
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument()
    })
  })

  it('handles search by SKU', async () => {
    // Mock filtered response
    const mockProducts = [
      { id: 1, name: 'Product 1', price: 99.99, stock: 10, sku: 'SKU123', description: 'Description 1' }
    ]
    
    vi.mocked(getProducts).mockResolvedValue({
      data: mockProducts,
      total: 1,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<ProductList />)
    
    const searchInput = screen.getByPlaceholderText(/search by sku/i)
    fireEvent.change(searchInput, { target: { value: 'SKU123' } })
    
    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledWith(expect.objectContaining({
        sku: 'SKU123'
      }))
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    })
  })

  it('displays no products message when list is empty', async () => {
    // Mock empty response
    vi.mocked(getProducts).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      per_page: 10
    })
    
    renderWithProviders(<ProductList />)
    
    await waitFor(() => {
      expect(screen.getByText(/no products found/i)).toBeInTheDocument()
    })
  })

  it('handles network errors gracefully', async () => {
    // Mock network error
    vi.mocked(getProducts).mockRejectedValue(new Error('Network error'))
    
    renderWithProviders(<ProductList />)
    
    await waitFor(() => {
      expect(screen.getByText(/error loading products/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
    
    // Test retry functionality
    vi.mocked(getProducts).mockResolvedValueOnce({
      data: [{ id: 1, name: 'Product 1', price: 99.99, stock: 10, sku: 'SKU1', description: 'Description 1' }],
      total: 1,
      page: 1,
      per_page: 10
    })
    
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument()
    })
  })
}) 