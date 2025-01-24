import { Link } from 'react-router-dom'
import {
  IconButton,
  Badge,
  Box,
  Tooltip,
  useColorModeValue
} from '@chakra-ui/react'
import { FaShoppingCart } from 'react-icons/fa'
import { useCart } from '../context/CartContext'

export const CartButton = () => {
  const { state } = useCart()
  const itemCount = state.items.reduce((total, item) => total + item.quantity, 0)
  const badgeBg = useColorModeValue('blue.500', 'blue.200')
  const badgeColor = useColorModeValue('white', 'gray.800')

  return (
    <Box position="relative">
      <Tooltip label="View Cart" placement="bottom">
        <Link to="/cart">
          <IconButton
            aria-label="Shopping cart"
            icon={<FaShoppingCart />}
            variant="ghost"
            size="lg"
          />
        </Link>
      </Tooltip>
      {itemCount > 0 && (
        <Badge
          position="absolute"
          top="-1"
          right="-1"
          px={2}
          py={1}
          fontSize="xs"
          fontWeight="bold"
          borderRadius="full"
          bg={badgeBg}
          color={badgeColor}
        >
          {itemCount}
        </Badge>
      )}
    </Box>
  )
} 