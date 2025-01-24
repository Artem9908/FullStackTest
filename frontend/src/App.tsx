import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ChakraProvider,
  Box,
  Container,
  Flex,
  Heading,
  HStack,
  Button,
  useColorMode,
  IconButton,
} from '@chakra-ui/react';
import { FaSun, FaMoon, FaShoppingCart } from 'react-icons/fa';
import { UserList } from './components/UserList';
import { UserDetails } from './components/UserDetails';
import { ProductCatalog } from './components/ProductCatalog';
import { ShoppingCart } from './components/ShoppingCart';
import { OrderManagement } from './components/OrderManagement';
import theme from './theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const Navigation: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <Box as="nav" py={4} bg={colorMode === 'light' ? 'white' : 'gray.800'} shadow="sm">
      <Container maxW="container.xl">
        <Flex justify="space-between" align="center">
          <HStack spacing={8}>
            <Heading size="md" as={Link} to="/" color={colorMode === 'light' ? 'brand.700' : 'brand.200'}>
              FullStack Store
            </Heading>
            <HStack spacing={4}>
              <Button as={Link} to="/products" variant="ghost">
                Products
              </Button>
              <Button as={Link} to="/orders" variant="ghost">
                Orders
              </Button>
              <Button as={Link} to="/users" variant="ghost">
                Users
              </Button>
            </HStack>
          </HStack>
          <HStack spacing={4}>
            <IconButton
              as={Link}
              to="/cart"
              aria-label="Shopping cart"
              icon={<FaShoppingCart />}
              variant="ghost"
            />
            <IconButton
              aria-label="Toggle color mode"
              icon={colorMode === 'light' ? <FaMoon /> : <FaSun />}
              onClick={toggleColorMode}
              variant="ghost"
            />
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <Router>
          <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }}>
            <Navigation />
            <Container maxW="container.xl" py={8}>
              <Routes>
                <Route path="/" element={<ProductCatalog />} />
                <Route path="/products" element={<ProductCatalog />} />
                <Route path="/cart" element={<ShoppingCart />} />
                <Route path="/orders" element={<OrderManagement />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/users/:id" element={<UserDetails />} />
              </Routes>
            </Container>
          </Box>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  );
};
