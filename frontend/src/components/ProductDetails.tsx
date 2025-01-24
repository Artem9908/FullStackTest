import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useToast,
  Heading,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@chakra-ui/react'
import { getProduct, updateProduct, Product } from '../services/api'

export const ProductDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    sku: '',
    stock: 0
  })

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(Number(id)),
    enabled: !!id
  })

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price,
        sku: product.sku,
        stock: product.stock
      })
    }
  }, [product])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Product>) => updateProduct(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product', id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        title: 'Product updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
      navigate('/products')
    },
    onError: () => {
      toast({
        title: 'Error updating product',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate(formData)
  }

  const handleInputChange = (field: keyof Product, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="xl" />
      </Box>
    )
  }

  if (isError) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Error loading product</AlertTitle>
        <AlertDescription>
          Please try again later or contact support if the problem persists.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Box maxW="container.md" mx="auto" py={8}>
      <Heading mb={6}>Edit Product</Heading>
      <form onSubmit={handleSubmit}>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Description</FormLabel>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>SKU</FormLabel>
            <Input
              value={formData.sku}
              onChange={(e) => handleInputChange('sku', e.target.value)}
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Price</FormLabel>
            <NumberInput
              min={0}
              value={formData.price}
              onChange={(value) => handleInputChange('price', Number(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Stock</FormLabel>
            <NumberInput
              min={0}
              value={formData.stock}
              onChange={(value) => handleInputChange('stock', Number(value))}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </FormControl>

          <Stack direction="row" spacing={4} justify="flex-end">
            <Button onClick={() => navigate('/products')} variant="outline">
              Cancel
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={updateMutation.isPending}
            >
              Save Changes
            </Button>
          </Stack>
        </Stack>
      </form>
    </Box>
  )
} 