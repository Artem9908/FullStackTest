import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Select,
  Button,
  Badge,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  List,
  ListItem,
  Heading,
  Divider,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { Order, OrderStatus, OrderSearchParams } from '../types';

const statusColors = {
  [OrderStatus.Pending]: 'yellow',
  [OrderStatus.Processing]: 'blue',
  [OrderStatus.Shipped]: 'purple',
  [OrderStatus.Delivered]: 'green',
  [OrderStatus.Cancelled]: 'red',
};

export const OrderManagement: React.FC = () => {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchParams, setSearchParams] = useState<OrderSearchParams>({
    page: 1,
    per_page: 10,
    status: undefined,
  });

  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast({
        title: 'Order status updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update order status',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
    await updateStatusMutation.mutateAsync({ orderId, status: newStatus });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Failed to load orders
      </Alert>
    );
  }

  return (
    <Box p={4}>
      <VStack spacing={4} align="stretch">
        {/* Filters */}
        <HStack spacing={4}>
          <Select
            value={searchParams.status || ''}
            onChange={(e) => setSearchParams(prev => ({
              ...prev,
              status: e.target.value as OrderStatus | undefined,
              page: 1,
            }))}
            placeholder="Filter by status"
            w="200px"
          >
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </HStack>

        {/* Orders Table */}
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Order ID</Th>
              <Th>Date</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th isNumeric>Total</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data?.orders.map((order: Order) => (
              <Tr key={order.id}>
                <Td>#{order.id}</Td>
                <Td>{format(new Date(order.created_at), 'PP')}</Td>
                <Td>{order.user?.name || 'Unknown'}</Td>
                <Td>
                  <Badge colorScheme={statusColors[order.status]}>
                    {order.status}
                  </Badge>
                </Td>
                <Td isNumeric>${order.total.toFixed(2)}</Td>
                <Td>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      Details
                    </Button>
                    <Select
                      size="sm"
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      w="150px"
                    >
                      {Object.values(OrderStatus).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </HStack>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>

        {data?.orders.length === 0 && (
          <Text textAlign="center" color="gray.500">
            No orders found
          </Text>
        )}

        {/* Pagination */}
        <HStack justify="center" spacing={2}>
          <Button
            onClick={() => setSearchParams(prev => ({
              ...prev,
              page: Math.max(1, prev.page - 1),
            }))}
            isDisabled={searchParams.page === 1}
          >
            Previous
          </Button>
          <Text>
            Page {searchParams.page} of {Math.ceil((data?.total || 0) / searchParams.per_page)}
          </Text>
          <Button
            onClick={() => setSearchParams(prev => ({
              ...prev,
              page: prev.page + 1,
            }))}
            isDisabled={
              searchParams.page >= Math.ceil((data?.total || 0) / searchParams.per_page)
            }
          >
            Next
          </Button>
        </HStack>
      </VStack>

      {/* Order Details Drawer */}
      <Drawer
        isOpen={!!selectedOrder}
        placement="right"
        onClose={() => setSelectedOrder(null)}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            Order #{selectedOrder?.id}
          </DrawerHeader>

          <DrawerBody>
            {selectedOrder && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Heading size="sm">Order Details</Heading>
                  <Text>Date: {format(new Date(selectedOrder.created_at), 'PPp')}</Text>
                  <Text>Status: <Badge colorScheme={statusColors[selectedOrder.status]}>{selectedOrder.status}</Badge></Text>
                  <Text>Total: ${selectedOrder.total.toFixed(2)}</Text>
                </Box>

                <Divider />

                <Box>
                  <Heading size="sm">Customer Information</Heading>
                  <Text>Name: {selectedOrder.user?.name}</Text>
                  <Text>Email: {selectedOrder.user?.email}</Text>
                </Box>

                <Divider />

                <Box>
                  <Heading size="sm">Items</Heading>
                  <List spacing={3}>
                    {selectedOrder.items.map((item) => (
                      <ListItem key={item.id}>
                        <HStack justify="space-between">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">{item.product?.name}</Text>
                            <Text fontSize="sm" color="gray.600">
                              Quantity: {item.quantity}
                            </Text>
                          </VStack>
                          <Text>${(item.price * item.quantity).toFixed(2)}</Text>
                        </HStack>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}; 