import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Grid,
  VStack,
  HStack,
  Input,
  Select,
  RangeSlider,
  RangeSliderTrack,
  RangeSliderFilledTrack,
  RangeSliderThumb,
  Text,
  Card,
  CardBody,
  Image,
  Stack,
  Heading,
  Button,
  Badge,
  Spinner,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import debounce from 'lodash/debounce';
import { Product, ProductSearchParams } from '../types';

const ITEMS_PER_PAGE = 12;

export const ProductCatalog: React.FC = () => {
  const [searchParams, setSearchParams] = useState<ProductSearchParams>({
    page: 1,
    per_page: ITEMS_PER_PAGE,
    category: '',
    min_price: 0,
    max_price: 1000,
    in_stock: true,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['products', searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    },
  });

  const debouncedSearch = useCallback(
    debounce((newParams: Partial<ProductSearchParams>) => {
      setSearchParams(prev => ({ ...prev, ...newParams, page: 1 }));
    }, 300),
    []
  );

  const handlePriceChange = useCallback((values: number[]) => {
    debouncedSearch({ min_price: values[0], max_price: values[1] });
  }, [debouncedSearch]);

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
        Failed to load products
      </Alert>
    );
  }

  return (
    <Box p={4}>
      <Grid templateColumns={{ base: '1fr', md: '250px 1fr' }} gap={6}>
        {/* Filters */}
        <VStack spacing={4} align="stretch">
          <Card>
            <CardBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Search</FormLabel>
                  <Input
                    placeholder="Search products..."
                    onChange={(e) => debouncedSearch({ search: e.target.value })}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <Select
                    value={searchParams.category}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      category: e.target.value,
                      page: 1,
                    }))}
                  >
                    <option value="">All Categories</option>
                    <option value="electronics">Electronics</option>
                    <option value="clothing">Clothing</option>
                    <option value="books">Books</option>
                    <option value="home">Home & Garden</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Price Range</FormLabel>
                  <RangeSlider
                    defaultValue={[searchParams.min_price || 0, searchParams.max_price || 1000]}
                    min={0}
                    max={1000}
                    step={10}
                    onChange={handlePriceChange}
                  >
                    <RangeSliderTrack>
                      <RangeSliderFilledTrack />
                    </RangeSliderTrack>
                    <RangeSliderThumb index={0} />
                    <RangeSliderThumb index={1} />
                  </RangeSlider>
                  <HStack justify="space-between">
                    <Text>${searchParams.min_price}</Text>
                    <Text>${searchParams.max_price}</Text>
                  </HStack>
                </FormControl>

                <FormControl>
                  <FormLabel>Stock Status</FormLabel>
                  <Select
                    value={searchParams.in_stock ? 'true' : 'false'}
                    onChange={(e) => setSearchParams(prev => ({
                      ...prev,
                      in_stock: e.target.value === 'true',
                      page: 1,
                    }))}
                  >
                    <option value="true">In Stock</option>
                    <option value="false">All Items</option>
                  </Select>
                </FormControl>
              </VStack>
            </CardBody>
          </Card>
        </VStack>

        {/* Product Grid */}
        <Box>
          <Grid
            templateColumns={{
              base: '1fr',
              sm: 'repeat(2, 1fr)',
              lg: 'repeat(3, 1fr)',
              xl: 'repeat(4, 1fr)',
            }}
            gap={6}
          >
            {data?.products.map((product: Product) => (
              <Card key={product.id} maxW="sm">
                <CardBody>
                  <Image
                    src={`/images/products/${product.sku}.jpg`}
                    alt={product.name}
                    borderRadius="lg"
                    fallbackSrc="https://via.placeholder.com/300"
                  />
                  <Stack mt="6" spacing="3">
                    <Heading size="md">{product.name}</Heading>
                    <Text>{product.description}</Text>
                    <HStack justify="space-between">
                      <Text color="blue.600" fontSize="2xl">
                        ${product.price}
                      </Text>
                      <Badge
                        colorScheme={product.stock > 0 ? 'green' : 'red'}
                      >
                        {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </Badge>
                    </HStack>
                    <Button
                      colorScheme="blue"
                      isDisabled={product.stock === 0}
                    >
                      Add to Cart
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Grid>

          {data?.products.length === 0 && (
            <Text textAlign="center" color="gray.500" mt={4}>
              No products found
            </Text>
          )}

          {/* Pagination */}
          <HStack justify="center" mt={6} spacing={2}>
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
              Page {searchParams.page} of {Math.ceil((data?.total || 0) / ITEMS_PER_PAGE)}
            </Text>
            <Button
              onClick={() => setSearchParams(prev => ({
                ...prev,
                page: prev.page + 1,
              }))}
              isDisabled={
                searchParams.page >= Math.ceil((data?.total || 0) / ITEMS_PER_PAGE)
              }
            >
              Next
            </Button>
          </HStack>
        </Box>
      </Grid>
    </Box>
  );
}; 