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
  HStack,
  IconButton
} from '@chakra-ui/react'
import { FaEye } from 'react-icons/fa'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { getOrders, updateOrderStatus, Order, OrderStatus } from '../services/api'

const statusColors = {
  pending: 'yellow',
  processing: 'blue',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red'
}

export const OrderList = () => {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['orders', { page, status }],
    queryFn: () => getOrders({ page, per_page: 10, status: status || undefined })
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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

  const handleStatusChange = (orderId: number, newStatus: OrderStatus) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus })
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
        <AlertTitle>Error loading orders</AlertTitle>
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
        <Select
          placeholder="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
        >
          <option value="">All Orders</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Stack>

      {data?.data.length === 0 ? (
        <Text>No orders found</Text>
      ) : (
        <>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Order ID</Th>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Total</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.data.map((order: Order) => (
                <Tr key={order.id}>
                  <Td>#{order.id}</Td>
                  <Td>{format(new Date(order.created_at), 'MMM d, yyyy')}</Td>
                  <Td>{order.user.name}</Td>
                  <Td>${order.total.toFixed(2)}</Td>
                  <Td>
                    <Select
                      size="sm"
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value as OrderStatus)
                      }
                      w="150px"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </Select>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Badge colorScheme={statusColors[order.status]}>
                        {order.status}
                      </Badge>
                      <Link to={`/orders/${order.id}`}>
                        <IconButton
                          aria-label="View order details"
                          icon={<FaEye />}
                          size="sm"
                          colorScheme="blue"
                        />
                      </Link>
                    </HStack>
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