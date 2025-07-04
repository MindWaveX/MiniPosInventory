import React, { useEffect, useState, useRef } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, FormControl, Input, Button, useToast, HStack, Spinner, Menu, MenuButton, MenuList, MenuItem, Icon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure } from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { collection, addDoc, getDocs, orderBy, query, limit, startAfter, getCountFromServer, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const CustomersPanel = () => {
  const { isAdmin, isManager } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', company: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({});
  const [hasNextPage, setHasNextPage] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', company: '' });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, itemsPerPage]);

  const fetchTotalCount = async () => {
    try {
      const customersRef = collection(db, 'customers');
      const snapshot = await getCountFromServer(customersRef);
      setTotalItems(snapshot.data().count);
    } catch (error) {
      setTotalItems(0);
    }
  };

  const fetchCustomers = async () => {
    setFetching(true);
    try {
      let customersQuery = query(
        collection(db, 'customers'),
        orderBy('name'),
        limit(itemsPerPage)
      );
      if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        customersQuery = query(
          collection(db, 'customers'),
          orderBy('name'),
          startAfter(pageSnapshots[currentPage - 1]),
          limit(itemsPerPage)
        );
      }
      const snapshot = await getDocs(customersQuery);
      const customersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(customersList);
      if (snapshot.docs.length > 0) {
        const lastDocSnapshot = snapshot.docs[snapshot.docs.length - 1];
        setPageSnapshots(prev => ({ ...prev, [currentPage]: lastDocSnapshot }));
        setHasNextPage(snapshot.docs.length === itemsPerPage);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to fetch customers',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setFetching(false);
  };

  const handlePageChange = (newPage) => {
    if (newPage < currentPage) {
      setPageSnapshots(prev => {
        const newSnapshots = {};
        Object.keys(prev).forEach(page => {
          if (parseInt(page) < newPage) {
            newSnapshots[page] = prev[page];
          }
        });
        return newSnapshots;
      });
    }
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setPageSnapshots({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.company) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'customers'), {
        name: form.name,
        company: form.company
      });
      setForm({ name: '', company: '' });
      toast({
        title: 'Customer Added',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      fetchTotalCount();
      setCurrentPage(1);
      setPageSnapshots({});
      fetchCustomers();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add customer',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setEditForm({ name: customer.name, company: customer.company });
    onEditOpen();
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.company) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'customers', editingCustomer.id), {
        name: editForm.name,
        company: editForm.company
      });
      await fetchCustomers();
      onEditClose();
      setEditingCustomer(null);
      setEditForm({ name: '', company: '' });
      toast({
        title: 'Customer Updated',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update customer',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setUpdating(false);
  };

  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;
    setDeleting(prev => ({ ...prev, [customerToDelete.id]: true }));
    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      await fetchTotalCount();
      await fetchCustomers();
      toast({
        title: 'Customer Deleted',
        description: `${customerToDelete.name} has been successfully deleted.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setDeleting(prev => ({ ...prev, [customerToDelete.id]: false }));
    setCustomerToDelete(null);
    onClose();
  };

  if (!isAdmin && !isManager) return null;

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" p={2} textAlign="center" bg="white">
      <Heading mb={6}>Customers</Heading>
      {isAdmin && (
        <Box as="form" onSubmit={handleAdd} mt={6} mb={4} p={2} borderWidth={1} borderRadius="md" bg="gray.50" mx="auto">
          <HStack spacing={3} justifyContent="space-between" w='100%'>
            <Input
              name="name"
              placeholder="Customer Name"
              value={form.name}
              onChange={handleChange}
              required
              size="sm"
              width="40%"
            />
            <Input
              name="company"
              placeholder="Company Name"
              value={form.company}
              onChange={handleChange}
              required
              size="sm"
              width="40%"
            />
            <Button w='20%' size="sm" colorScheme="teal" type="submit" isLoading={loading}>
              Add
            </Button>
          </HStack>
        </Box>
      )}
      <Box maxW="100%" height="300px" overflow="auto" p={2} borderWidth={1} borderRadius="md" mb={4}>
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" size="sm" mx="auto">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Company</Th>
                {isAdmin && <Th textAlign="right">Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {customers.map((customer) => (
                <Tr key={customer.id}>
                  <Td>{customer.name}</Td>
                  <Td>{customer.company}</Td>
                  {isAdmin && (
                    <Td textAlign="right">
                      <Menu>
                        <MenuButton size="xs">
                          <Icon boxSize={4} as={BsThreeDotsVertical} cursor="pointer" />
                        </MenuButton>
                        <MenuList>
                          <MenuItem borderRadius="none" onClick={() => handleEditClick(customer)}>
                            Edit
                          </MenuItem>
                          <MenuItem borderRadius="none" color="red.500" onClick={() => handleDeleteClick(customer)} isDisabled={deleting[customer.id]}>
                            {deleting[customer.id] ? 'Deleting...' : 'Delete'}
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        isLoading={fetching}
      />

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Customer</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleEditSubmit}>
            <ModalBody>
              <FormControl id="edit-name" mb={4} isRequired>
                <Input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  placeholder="Enter customer name"
                />
              </FormControl>
              <FormControl id="edit-company" mb={4} isRequired>
                <Input
                  name="company"
                  value={editForm.company}
                  onChange={handleEditChange}
                  placeholder="Enter company name"
                />
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditClose}>
                Cancel
              </Button>
              <Button colorScheme="teal" type="submit" isLoading={updating}>
                Update Customer
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Customer
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete "{customerToDelete?.name}"? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleDeleteConfirm} ml={3} isLoading={customerToDelete && deleting[customerToDelete.id]}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default CustomersPanel; 