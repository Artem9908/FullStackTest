import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Box,
  Button,
  Stack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  Badge,
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Grid,
  GridItem,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Divider
} from '@chakra-ui/react'
import { format } from 'date-fns'
import { getOrder, updateOrderStatus, cancelOrder, Order, OrderStatus } from '../services/api'

const statusColors = {
  pending: 'yellow',
  processing: 'blue',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red'
}

export const OrderDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(Number(id)),
    enabled: !!id
  })

  const updateStatusMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(Number(id), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast({
        title: 'Order status updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    },
    onError: () => {
      toast({
        title: 'Error updating order status',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  })

  const cancelOrderMutation = useMutation({
    mutationFn: () => cancelOrder(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] })
      toast({
        title: 'Order cancelled successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
    },
    onError: () => {
      toast({
        title: 'Error cancelling order',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  })

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner size="xl" />
      </Box>
    )
  }

  if (isError || !order) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Error loading order</AlertTitle>
        <AlertDescription>
          Please try again later or contact support if the problem persists.
        </AlertDescription>
      </Alert>
    )
  }

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateStatusMutation.mutate(newStatus)
  }

  const handleCancelOrder = () => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelOrderMutation.mutate()
    }
  }

  return (
    <Box maxW="container.xl" mx="auto" py={8}>
      <Stack spacing={8}>
        <Grid templateColumns="repeat(3, 1fr)" gap={6}>
          <Card>
            <CardHeader>
              <Heading size="md">Order Details</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={4}>
                <Stat>
                  <StatLabel>Order ID</StatLabel>
                  <StatNumber>#{order.id}</StatNumber>
                  <StatHelpText>
                    {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                  </StatHelpText>
                </Stat>
                <Stat>
                  <StatLabel>Status</StatLabel>
                  <StatNumber>
                    <Badge colorScheme={statusColors[order.status]}>
                      {order.status}
                    </Badge>
                  </StatNumber>
                </Stat>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Customer Details</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={4}>
                <Stat>
                  <StatLabel>Name</StatLabel>
                  <StatNumber>{order.user.name}</StatNumber>
                  <StatHelpText>{order.user.email}</StatHelpText>
                </Stat>
              </Stack>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Order Summary</Heading>
            </CardHeader>
            <CardBody>
              <Stack spacing={4}>
                <Stat>
                  <StatLabel>Total Amount</StatLabel>
                  <StatNumber>${order.total.toFixed(2)}</StatNumber>
                  <StatHelpText>{order.items.length} items</StatHelpText>
                </Stat>
              </Stack>
            </CardBody>
          </Card>
        </Grid>

        <Card>
          <CardHeader>
            <Stack direction="row" justify="space-between" align="center">
              <Heading size="md">Order Items</Heading>
              <Stack direction="row" spacing={4}>
                {order.status !== 'cancelled' && (
                  <Select
                    value={order.status}
                    onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                    w="200px"
                    isDisabled={order.status === 'delivered'}
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                  </Select>
                )}
                {order.status === 'pending' && (
                  <Button
                    colorScheme="red"
                    onClick={handleCancelOrder}
                    isLoading={cancelOrderMutation.isPending}
                  >
                    Cancel Order
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardHeader>
          <CardBody>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th isNumeric>Price</Th>
                  <Th isNumeric>Quantity</Th>
                  <Th isNumeric>Total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {order.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>{item.product.name}</Td>
                    <Td>{item.product.sku}</Td>
                    <Td isNumeric>${item.price.toFixed(2)}</Td>
                    <Td isNumeric>{item.quantity}</Td>
                    <Td isNumeric>${(item.price * item.quantity).toFixed(2)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>

        <Stack direction="row" spacing={4} justify="flex-end">
          <Button onClick={() => navigate('/orders')} variant="outline">
            Back to Orders
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
} 