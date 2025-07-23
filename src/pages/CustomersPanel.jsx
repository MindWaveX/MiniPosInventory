import React, { useEffect, useState, useRef } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Divider , FormControl, Input, Button, useToast, HStack, Spinner, Menu, MenuButton, MenuList, MenuItem, Icon, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent, AlertDialogOverlay, useDisclosure, useBreakpointValue, FormLabel, NumberInput, NumberInputField, NumberInputStepper, NumberIncrementStepper, NumberDecrementStepper, } from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { collection, addDoc, getDocs, orderBy, query, limit, startAfter, getCountFromServer, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const CustomersPanel = () => {
  const { isAdmin, isManager } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: '', company: '', credit: 0 });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({});
  const [hasNextPage, setHasNextPage] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', company: '', credit: 0 });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState({});
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Add state to track which credit is being updated and its value
  const [creditEdits, setCreditEdits] = useState({});
  const [creditLoading, setCreditLoading] = useState({});
  // Add state to track the delta input for each customer
  const [creditDeltaEdits, setCreditDeltaEdits] = useState({});

  // State for search
  const [searchCustomer, setSearchCustomer] = useState(''); // Search input for customer

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
      const customersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), credit: doc.data().credit ?? 0 }));
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
    setForm(prev => ({ ...prev, [name]: name === 'credit' ? Number(value) : value }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.company) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'customers'), {
        name: form.name,
        company: form.company,
        credit: form.credit || 0
      });
      setForm({ name: '', company: '', credit: 0 });
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
    setEditForm({ name: customer.name, company: customer.company, credit: customer.credit ?? 0 });
    onEditOpen();
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: name === 'credit' ? Number(value) : value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.company) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'customers', editingCustomer.id), {
        name: editForm.name,
        company: editForm.company,
        credit: editForm.credit || 0
      });
      await fetchCustomers();
      onEditClose();
      setEditingCustomer(null);
      setEditForm({ name: '', company: '', credit: 0 });
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

  // Handler for credit input change in the table
  const handleCreditInputChange = (customerId, valueAsString) => {
    setCreditEdits(prev => ({ ...prev, [customerId]: valueAsString }));
  };
  // Handler for credit input blur or Enter
  const handleCreditInputSave = async (customer) => {
    const newCredit = Number(creditEdits[customer.id]);
    if (isNaN(newCredit) || newCredit === customer.credit) return;
    setCreditLoading(prev => ({ ...prev, [customer.id]: true }));
    try {
      await updateDoc(doc(db, 'customers', customer.id), { credit: newCredit });
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, credit: newCredit } : c));
      toast({ title: 'Credit Updated', status: 'success', duration: 1500, isClosable: true });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update credit', status: 'error', duration: 3000, isClosable: true });
    }
    setCreditLoading(prev => ({ ...prev, [customer.id]: false }));
  };

  // Filter customers based on searchCustomer
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
    customer.company.toLowerCase().includes(searchCustomer.toLowerCase())
  );

  if (!isAdmin && !isManager) return null;

  return (
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH="100vh" p={isMobile ? 0 : 2} textAlign="center" bg="white">
      <Heading mb={6}>Customers</Heading>
      {/* Search by customer name or company */}
    
        <Box as="form" maxW={ isMobile ? '100vw' : '100%'} onSubmit={handleAdd} mt={6} mb={4} p={2} borderWidth={1} borderRadius="md" bg="gray.50">
          <HStack px={2} mb={1}>
            <Input
              placeholder="Search Customer"
              value={searchCustomer}
              onChange={e => setSearchCustomer(e.target.value)}
              width="100%"
              size="sm"
            />
          </HStack>
          <HStack spacing={3} p={2} justifyContent="space-between" w='100%'>
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
      <Box maxW="100vw" height="24rem" p={0} overflowX='auto' borderWidth={1} borderRadius="md" mb={4}>
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" size="sm" overflow='auto'>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Company</Th>
                <Th>Rs Credit</Th>
                {isAdmin && <Th></Th>}
              </Tr>
            </Thead>
            <Tbody>
              {/* Use filtered customers */}
              {filteredCustomers.map((customer) => (
                <Tr key={customer.id}>
                  <Td>{customer.name}</Td>
                  <Td>{customer.company}</Td>
                  <Td>
                    {isAdmin ? (
                      <HStack spacing={1} maxW={60}>
                        {/* Display current credit value (uneditable) */}
                        <Box minW={16} textAlign="center">{customer.credit}</Box>
                        {/* Decrement Button */}
                        <Button
                          size="xs"
                          onClick={() => {
                            const delta = Number(creditDeltaEdits[customer.id]);
                            if (!isNaN(delta) && delta !== 0) {
                              const newCredit = customer.credit - delta;
                              setCreditLoading(prev => ({ ...prev, [customer.id]: true }));
                              updateDoc(doc(db, 'customers', customer.id), { credit: newCredit })
                                .then(() => {
                                  setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, credit: newCredit } : c));
                                  toast({ title: 'Credit Updated', status: 'success', duration: 1500, isClosable: true });
                                })
                                .catch(() => {
                                  toast({ title: 'Error', description: 'Failed to update credit', status: 'error', duration: 3000, isClosable: true });
                                })
                                .finally(() => {
                                  setCreditLoading(prev => ({ ...prev, [customer.id]: false }));
                                });
                              // Clear the delta input after operation
                              setCreditDeltaEdits(prev => ({ ...prev, [customer.id]: '' }));
                            }
                          }}
                          isDisabled={creditLoading[customer.id] || !creditDeltaEdits[customer.id] || isNaN(Number(creditDeltaEdits[customer.id]))}
                        >
                          -
                        </Button>
                        {/* Editable delta input field */}
                        <NumberInput
                          size="sm"
                          value={creditDeltaEdits[customer.id] !== undefined ? creditDeltaEdits[customer.id] : ''}
                          onChange={(valueAsString) => setCreditDeltaEdits(prev => ({ ...prev, [customer.id]: valueAsString }))}
                          isDisabled={creditLoading[customer.id]}
                          maxW={20}
                        >
                          <NumberInputField
                            type='number'
                            placeholder="0"
                            onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                            // Only allow digits (no +, - or other non-numeric chars)
                            onInput={e => {
                              const cleaned = e.target.value.replace(/[^\d]/g, '');
                              e.target.value = cleaned;
                              setCreditDeltaEdits(prev => ({ ...prev, [customer.id]: cleaned }));
                            }}
                          />
                        </NumberInput>
                        {/* Increment Button */}
                        <Button
                          size="xs"
                          onClick={() => {
                            const delta = Number(creditDeltaEdits[customer.id]);
                            if (!isNaN(delta) && delta !== 0) {
                              const newCredit = customer.credit + delta;
                              setCreditLoading(prev => ({ ...prev, [customer.id]: true }));
                              updateDoc(doc(db, 'customers', customer.id), { credit: newCredit })
                                .then(() => {
                                  setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, credit: newCredit } : c));
                                  toast({ title: 'Credit Updated', status: 'success', duration: 1500, isClosable: true });
                                })
                                .catch(() => {
                                  toast({ title: 'Error', description: 'Failed to update credit', status: 'error', duration: 3000, isClosable: true });
                                })
                                .finally(() => {
                                  setCreditLoading(prev => ({ ...prev, [customer.id]: false }));
                                });
                              // Clear the delta input after operation
                              setCreditDeltaEdits(prev => ({ ...prev, [customer.id]: '' }));
                            }
                          }}
                          isDisabled={creditLoading[customer.id] || !creditDeltaEdits[customer.id] || isNaN(Number(creditDeltaEdits[customer.id]))}
                        >
                          +
                        </Button>
                      </HStack>
                    ) : (
                      customer.credit
                    )}
                  </Td>
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
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Customer</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleEditSubmit}>
            <ModalBody>
              <FormControl id="edit-name" mb={4} isRequired>
                {/* Label for Name field */}
                <FormLabel>Name</FormLabel>
                <Input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  placeholder="Enter customer name"
                />
              </FormControl>
              <FormControl id="edit-company" mb={4} isRequired>
                {/* Label for Company field */}
                <FormLabel>Company</FormLabel>
                <Input
                  name="company"
                  value={editForm.company}
                  onChange={handleEditChange}
                  placeholder="Enter company name"
                />
              </FormControl>
              <FormControl id="edit-credit" mb={4} isRequired>
                <FormLabel>Rs Credit</FormLabel>
                <Input
                  name="credit"
                  type="number"
                  value={editForm.credit}
                  onChange={handleEditChange}
                  placeholder="Enter credit amount"
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