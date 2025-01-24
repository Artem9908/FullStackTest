import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  Box,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  IconButton,
  Stack,
  Heading,
  Text,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Card,
  CardHeader,
  CardBody,
  Divider
} from '@chakra-ui/react'
import { FaTrash } from 'react-icons/fa'
import { useCart } from '../context/CartContext'
import { createOrder } from '../services/api'

export const Cart = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const { state, removeItem, updateQuantity, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      clearCart()
      toast({
        title: 'Order created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
      navigate('/orders')
    },
    onError: () => {
      toast({
        title: 'Error creating order',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
      setIsSubmitting(false)
    }
  })

  const handleQuantityChange = (productId: number, quantity: number) => {
    if (quantity > 0) {
      updateQuantity(productId, quantity)
    }
  }

  const handleCheckout = () => {
    if (state.items.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Please add items to your cart before checking out',
        status: 'warning',
        duration: 3000,
        isClosable: true
      })
      return
    }

    setIsSubmitting(true)
    createOrderMutation.mutate({
      user_id: 1, // TODO: Get from auth context
      items: state.items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    })
  }

  if (state.items.length === 0) {
    return (
      <Box maxW="container.lg" mx="auto" py={8}>
        <Alert status="info">
          <AlertIcon />
          <AlertTitle>Your cart is empty</AlertTitle>
          <AlertDescription>
            <Button
              onClick={() => navigate('/products')}
              colorScheme="blue"
              size="sm"
              ml={4}
            >
              Continue Shopping
            </Button>
          </AlertDescription>
        </Alert>
      </Box>
    )
  }

  return (
    <Box maxW="container.lg" mx="auto" py={8}>
      <Stack spacing={8}>
        <Card>
          <CardHeader>
            <Stack direction="row" justify="space-between" align="center">
              <Heading size="lg">Shopping Cart</Heading>
              <Text>
                {state.items.length} item{state.items.length !== 1 && 's'}
              </Text>
            </Stack>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>Price</Th>
                  <Th>Quantity</Th>
                  <Th isNumeric>Total</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {state.items.map((item) => (
                  <Tr key={item.product.id}>
                    <Td>
                      <Text fontWeight="medium">{item.product.name}</Text>
                      <Text fontSize="sm" color="gray.600">
                        SKU: {item.product.sku}
                      </Text>
                    </Td>
                    <Td>${item.product.price.toFixed(2)}</Td>
                    <Td>
                      <NumberInput
                        size="sm"
                        min={1}
                        max={item.product.stock}
                        value={item.quantity}
                        onChange={(value) =>
                          handleQuantityChange(item.product.id, Number(value))
                        }
                        w="100px"
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Td>
                    <Td isNumeric>
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </Td>
                    <Td>
                      <IconButton
                        aria-label="Remove item"
                        icon={<FaTrash />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => removeItem(item.product.id)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <Stack spacing={4}>
              <Stack direction="row" justify="space-between">
                <Text fontSize="lg" fontWeight="medium">
                  Subtotal
                </Text>
                <Text fontSize="lg" fontWeight="medium">
                  ${state.total.toFixed(2)}
                </Text>
              </Stack>
              <Divider />
              <Stack direction="row" justify="space-between">
                <Text fontSize="xl" fontWeight="bold">
                  Total
                </Text>
                <Text fontSize="xl" fontWeight="bold">
                  ${state.total.toFixed(2)}
                </Text>
              </Stack>
              <Stack direction="row" spacing={4} justify="flex-end">
                <Button
                  variant="outline"
                  onClick={() => navigate('/products')}
                >
                  Continue Shopping
                </Button>
                <Button
                  colorScheme="blue"
                  onClick={handleCheckout}
                  isLoading={isSubmitting}
                  loadingText="Creating Order..."
                >
                  Checkout
                </Button>
              </Stack>
            </Stack>
          </CardBody>
        </Card>
      </Stack>
    </Box>
  )
} 