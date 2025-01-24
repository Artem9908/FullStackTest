import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Card,
  CardHeader,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Grid,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { User, Order, OrderStatus } from '../types';

const statusColors = {
  [OrderStatus.Pending]: 'yellow',
  [OrderStatus.Processing]: 'blue',
  [OrderStatus.Shipped]: 'purple',
  [OrderStatus.Delivered]: 'green',
  [OrderStatus.Cancelled]: 'red',
};

export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
  });

  const { data: orders, isLoading: ordersLoading, error: ordersError } = useQuery<Order[]>({
    queryKey: ['userOrders', id],
    queryFn: async () => {
      const response = await fetch(`/api/users/${id}/orders`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      return response.json();
    },
    enabled: !!user,
  });

  if (userLoading || ordersLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (userError || ordersError) {
    return (
      <Alert status="error">
        <AlertIcon />
        {userError ? 'Failed to load user' : 'Failed to load orders'}
      </Alert>
    );
  }

  if (!user) {
    return (
      <Alert status="error">
        <AlertIcon />
        User not found
      </Alert>
    );
  }

  const totalOrders = orders?.length || 0;
  const totalSpent = orders?.reduce((sum, order) => sum + order.total, 0) || 0;
  const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  return (
    <VStack spacing={6} align="stretch" p={4}>
      <Card>
        <CardHeader>
          <Heading size="lg">{user.name}</Heading>
          <Text color="gray.600">{user.email}</Text>
          <Text fontSize="sm" color="gray.500">
            Member since {format(new Date(user.created_at), 'PPP')}
          </Text>
        </CardHeader>
        <CardBody>
          <StatGroup>
            <Stat>
              <StatLabel>Total Orders</StatLabel>
              <StatNumber>{totalOrders}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Total Spent</StatLabel>
              <StatNumber>${totalSpent.toFixed(2)}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Average Order</StatLabel>
              <StatNumber>${averageOrderValue.toFixed(2)}</StatNumber>
            </Stat>
          </StatGroup>
        </CardBody>
      </Card>

      <Box>
        <Heading size="md" mb={4}>Order History</Heading>
        {orders && orders.length > 0 ? (
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Order ID</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th isNumeric>Total</Th>
                <Th>Items</Th>
              </Tr>
            </Thead>
            <Tbody>
              {orders.map((order) => (
                <Tr key={order.id}>
                  <Td>#{order.id}</Td>
                  <Td>{format(new Date(order.created_at), 'PP')}</Td>
                  <Td>
                    <Badge colorScheme={statusColors[order.status]}>
                      {order.status}
                    </Badge>
                  </Td>
                  <Td isNumeric>${order.total.toFixed(2)}</Td>
                  <Td>{order.items.length} items</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        ) : (
          <Text color="gray.500">No orders found</Text>
        )}
      </Box>
    </VStack>
  );
}; 