import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Image,
  IconButton,
  Divider,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { FaTrash } from 'react-icons/fa';
import { CartItem, Product } from '../types';

interface CartItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemove: (productId: number) => void;
}

const CartItemComponent: React.FC<CartItemProps> = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <HStack spacing={4} w="100%" p={2} bg="white" borderRadius="md" shadow="sm">
      <Image
        src={item.product.image_url || '/placeholder.png'}
        alt={item.product.name}
        boxSize="100px"
        objectFit="cover"
        borderRadius="md"
      />
      <VStack align="start" flex={1} spacing={1}>
        <Text fontWeight="medium">{item.product.name}</Text>
        <Text color="gray.600" fontSize="sm">
          ${item.product.price.toFixed(2)} each
        </Text>
      </VStack>
      <NumberInput
        value={item.quantity}
        min={1}
        max={item.product.stock}
        onChange={(_, value) => onUpdateQuantity(item.product.id, value)}
        size="sm"
        w="100px"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <Text fontWeight="medium" w="100px" textAlign="right">
        ${(item.quantity * item.product.price).toFixed(2)}
      </Text>
      <IconButton
        aria-label="Remove item"
        icon={<FaTrash />}
        size="sm"
        colorScheme="red"
        variant="ghost"
        onClick={() => onRemove(item.product.id)}
      />
    </HStack>
  );
};

export const ShoppingCart: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: cart, isLoading, error } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const response = await fetch('/api/cart');
      if (!response.ok) {
        throw new Error('Failed to fetch cart');
      }
      return response.json();
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      const response = await fetch('/api/cart/items', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ product_id: productId, quantity }),
      });

      if (!response.ok) {
        throw new Error('Failed to update quantity');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update quantity',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove item');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: 'Item removed',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove item',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast({
        title: 'Order placed successfully',
        description: `Order #${data.id} has been created`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to place order',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleUpdateQuantity = async (productId: number, quantity: number) => {
    await updateQuantityMutation.mutateAsync({ productId, quantity });
  };

  const handleRemoveItem = async (productId: number) => {
    await removeItemMutation.mutateAsync(productId);
  };

  const handleCheckout = async () => {
    await checkoutMutation.mutateAsync();
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
        Failed to load cart
      </Alert>
    );
  }

  const total = cart?.items.reduce(
    (sum: number, item: CartItem) => sum + item.quantity * item.product.price,
    0
  ) || 0;

  return (
    <Box p={4}>
      <VStack spacing={4} align="stretch">
        {cart?.items.length === 0 ? (
          <Text textAlign="center" color="gray.500">
            Your cart is empty
          </Text>
        ) : (
          <>
            {cart?.items.map((item: CartItem) => (
              <CartItemComponent
                key={item.product.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
              />
            ))}
            <Divider />
            <HStack justify="space-between" px={4}>
              <Text fontSize="lg" fontWeight="medium">
                Total
              </Text>
              <Text fontSize="lg" fontWeight="bold">
                ${total.toFixed(2)}
              </Text>
            </HStack>
            <Button
              colorScheme="blue"
              size="lg"
              onClick={handleCheckout}
              isLoading={checkoutMutation.isPending}
              loadingText="Processing..."
            >
              Checkout
            </Button>
          </>
        )}
      </VStack>
    </Box>
  );
}; 