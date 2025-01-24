import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Button,
  Input,
  Stack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  IconButton,
  Badge,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  HStack,
  FormControl,
  FormLabel
} from '@chakra-ui/react'
import { FaEdit } from 'react-icons/fa'
import { format } from 'date-fns'
import { getProducts, updateStock, Product } from '../services/api'
import { Link } from 'react-router-dom'

export const ProductList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', { search, page, minPrice, maxPrice }],
    queryFn: () => getProducts({
      search,
      page,
      per_page: 10,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined
    })
  })

  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }: { id: number; stock: number }) => updateStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: 'Stock updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    },
    onError: () => {
      toast({
        title: 'Error updating stock',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  })

  const handleStockUpdate = (id: number, stock: number) => {
    updateStockMutation.mutate({ id, stock })
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner data-testid="loading-spinner" size="xl" />
      </Box>
    )
  }

  if (isError) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Error loading products</AlertTitle>
        <AlertDescription>
          <Button onClick={() => refetch()} colorScheme="red" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Box>
      <Stack spacing={4} mb={4}>
        <Input
          placeholder="Search products by name or SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <HStack>
          <FormControl>
            <FormLabel>Min Price</FormLabel>
            <NumberInput
              min={0}
              value={minPrice}
              onChange={(value) => setMinPrice(value)}
            >
              <NumberInputField placeholder="Min price" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
          <FormControl>
            <FormLabel>Max Price</FormLabel>
            <NumberInput
              min={0}
              value={maxPrice}
              onChange={(value) => setMaxPrice(value)}
            >
              <NumberInputField placeholder="Max price" />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>
        </HStack>
      </Stack>

      {data?.data.length === 0 ? (
        <Text>No products found</Text>
      ) : (
        <>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>SKU</Th>
                <Th>Price</Th>
                <Th>Stock</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.data.map((product: Product) => (
                <Tr key={product.id}>
                  <Td>{product.name}</Td>
                  <Td>{product.sku}</Td>
                  <Td>${product.price.toFixed(2)}</Td>
                  <Td>
                    <NumberInput
                      size="sm"
                      min={0}
                      value={product.stock}
                      onChange={(value) => handleStockUpdate(product.id, Number(value))}
                      w="100px"
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={product.stock > 0 ? 'green' : 'red'}
                    >
                      {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </Td>
                  <Td>
                    <Link to={`/products/${product.id}`}>
                      <IconButton
                        aria-label="Edit product"
                        icon={<FaEdit />}
                        size="sm"
                        colorScheme="blue"
                      />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>

          <Stack direction="row" spacing={2} mt={4} justify="center">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              isDisabled={page === 1}
            >
              Previous
            </Button>
            <Button
              onClick={() => setPage((p) => p + 1)}
              isDisabled={!data?.data.length || data?.data.length < 10}
            >
              Next
            </Button>
          </Stack>
        </>
      )}
    </Box>
  )
} 