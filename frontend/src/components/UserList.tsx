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
  Input,
  Stack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton
} from '@chakra-ui/react'
import { FaTrash, FaEdit } from 'react-icons/fa'
import { format } from 'date-fns'
import { getUsers, deleteUser, User } from '../services/api'
import { Link } from 'react-router-dom'

export const UserList = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', { search, page }],
    queryFn: () => getUsers({ search, page, per_page: 10 })
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast({
        title: 'User deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      })
      onClose()
    },
    onError: () => {
      toast({
        title: 'Error deleting user',
        description: 'Please try again later',
        status: 'error',
        duration: 3000,
        isClosable: true
      })
    }
  })

  const handleDelete = (userId: number) => {
    setSelectedUser(userId)
    onOpen()
  }

  const confirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser)
    }
  }

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="200px">
        <Spinner data-testid="loading-spinner" size="xl" />
      </Box>
    )
  }

  if (isError) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertTitle>Error loading users</AlertTitle>
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
        <Input
          placeholder="Search users by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Stack>

      {data?.data.length === 0 ? (
        <Text>No users found</Text>
      ) : (
        <>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Created At</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data?.data.map((user: User) => (
                <Tr key={user.id}>
                  <Td>{user.name}</Td>
                  <Td>{user.email}</Td>
                  <Td>{format(new Date(user.created_at), 'PP')}</Td>
                  <Td>
                    <Stack direction="row" spacing={2}>
                      <Link to={`/users/${user.id}`}>
                        <IconButton
                          aria-label="Edit user"
                          icon={<FaEdit />}
                          size="sm"
                          colorScheme="blue"
                        />
                      </Link>
                      <IconButton
                        aria-label="Delete user"
                        icon={<FaTrash />}
                        size="sm"
                        colorScheme="red"
                        onClick={() => handleDelete(user.id)}
                      />
                    </Stack>
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

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            Are you sure you want to delete this user? This action cannot be undone.
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="gray" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={confirmDelete} isLoading={deleteMutation.isPending}>
              Confirm
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  )
} 