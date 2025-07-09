import React, { useEffect, useState, useRef } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, Input, Select, VStack, HStack, Text, IconButton, useToast, useDisclosure, Menu, MenuButton, MenuList, MenuItem, Icon, useBreakpointValue, List, ListItem } from '@chakra-ui/react';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';
import { collection, getDocs, orderBy, query, limit, startAfter, getCountFromServer, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import { BsThreeDotsVertical } from 'react-icons/bs';

const SalesPanel = () => {
  const { isAdmin, isManager } = useAuth();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({});
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    invoiceNo: '',
    date: new Date().toISOString().split('T')[0],
    customerId: '',
    customerName: ''
  });
  const [items, setItems] = useState([]);
  const [nextSequence, setNextSequence] = useState(1);
  const [selectedSale, setSelectedSale] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState([]);
  
  // Refs for click-outside detection
  const customerDropdownRef = useRef(null);
  const productDropdownRefs = useRef([]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    fetchTotalCount();
    fetchCustomers();
    fetchProducts();
    fetchInventory();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    generateInvoiceNumber();
  }, [form.date]);

  // Click-outside handler for customer dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };

    if (showCustomerDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCustomerDropdown]);

  // Click-outside handler for product dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutsideAll = productDropdownRefs.current.every(ref => 
        !ref || !ref.contains(event.target)
      );
      
      if (clickedOutsideAll && showProductDropdown.some(show => show)) {
        setShowProductDropdown(prev => prev.map(() => false));
      }
    };

    if (showProductDropdown.some(show => show)) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductDropdown]);

  const generateInvoiceNumber = async () => {
    if (!form.date) return;
    
    try {
      // Format date as YYYYMMDD
      const dateStr = form.date.replace(/-/g, '');
      
      // Query for existing invoices on this date
      const q = query(
        collection(db, 'sales'),
        orderBy('invoiceNo', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      let sequence = 1;
      if (!snapshot.empty) {
        const lastInvoice = snapshot.docs[0].data().invoiceNo;
        // Check if last invoice is from same date
        if (lastInvoice.startsWith(dateStr)) {
          const lastSequence = parseInt(lastInvoice.split('-')[1]);
          sequence = lastSequence + 1;
        }
      }
      
      const invoiceNo = `${dateStr}-${sequence.toString().padStart(3, '0')}`;
      setForm(prev => ({ ...prev, invoiceNo }));
      setNextSequence(sequence);
    } catch (err) {
      console.error('Error generating invoice number:', err);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const salesRef = collection(db, 'sales');
      const snapshot = await getCountFromServer(salesRef);
      setTotalItems(snapshot.data().count);
    } catch (error) {
      setTotalItems(0);
    }
  };

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'customers'), orderBy('name'));
      const snapshot = await getDocs(q);
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, 'products'), orderBy('name'));
      const snapshot = await getDocs(q);
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const q = query(collection(db, 'inventory'), orderBy('productName'));
      const snapshot = await getDocs(q);
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const fetchSales = async () => {
    setFetching(true);
    try {
      let salesQuery = query(
        collection(db, 'sales'),
        orderBy('invoiceNo', 'desc'),
        limit(itemsPerPage)
      );
      if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        salesQuery = query(
          collection(db, 'sales'),
          orderBy('invoiceNo', 'desc'),
          startAfter(pageSnapshots[currentPage - 1]),
          limit(itemsPerPage)
        );
      }
      const snapshot = await getDocs(salesQuery);
      const salesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(salesList);
      if (snapshot.docs.length > 0) {
        const lastDocSnapshot = snapshot.docs[snapshot.docs.length - 1];
        setPageSnapshots(prev => ({ ...prev, [currentPage]: lastDocSnapshot }));
        setHasNextPage(snapshot.docs.length === itemsPerPage);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    if (name === 'customerId') {
      const customer = customers.find(c => c.id === value);
      setForm(prev => ({ ...prev, customerName: customer ? customer.name : '' }));
    }
  };

  const addItem = () => {
    setItems(prev => [...prev, { productId: '', productName: '', quantity: '', price: 0, total: 0 }]);
    setProductSearch(prev => [...prev, '']);
    setShowProductDropdown(prev => [...prev, false]);
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    setProductSearch(prev => prev.filter((_, i) => i !== index));
    setShowProductDropdown(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        newItems[index].productName = product ? product.name : '';
        newItems[index].price = product ? product.price : 0;
      }
      
      if (field === 'quantity' || field === 'price') {
        const quantity = field === 'quantity' ? value : newItems[index].quantity;
        const price = field === 'price' ? value : newItems[index].price;
        newItems[index].total = (parseFloat(quantity) || 0) * (parseFloat(price) || 0);
      }
      
      return newItems;
    });
  };

  const checkInventoryQuantity = (productId, requestedQuantity) => {
    // Find the product to get its SKU
    const product = products.find(p => p.id === productId);
    if (!product) return { available: 0, error: 'Product not found' };
    
    // Find inventory item by SKU
    const inventoryItem = inventory.find(item => item.sku === product.sku);
    if (!inventoryItem) return { available: 0, error: 'Product not found in inventory' };
    
    const available = inventoryItem.quantity || 0;
    if (requestedQuantity > available) {
      return { 
        available, 
        error: `Insufficient stock. Available: ${available}, Requested: ${requestedQuantity}` 
      };
    }
    return { available, error: null };
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.invoiceNo || !form.date || !form.customerId || items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields and add at least one item',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    // Check inventory quantities
    for (const item of items) {
      if (!item.productId || !item.quantity) continue;
      
      const { error } = checkInventoryQuantity(item.productId, item.quantity);
      if (error) {
        toast({
          title: 'Insufficient Stock',
          description: error,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }
    }

    setLoading(true);
    try {
      const saleData = {
        invoiceNo: form.invoiceNo,
        date: form.date,
        customerId: form.customerId,
        customerName: form.customerName,
        items: items,
        total: calculateTotal(),
        createdAt: new Date()
      };

      await addDoc(collection(db, 'sales'), saleData);
      
      // Deduct sold quantities from inventory
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        const inventoryItem = inventory.find(inv => inv.sku === product.sku);
        if (!inventoryItem) continue;
        const newQuantity = (inventoryItem.quantity || 0) - (parseFloat(item.quantity) || 0);
        try {
          await updateDoc(doc(db, 'inventory', inventoryItem.id), { quantity: newQuantity });
        } catch (err) {
          toast({
            title: 'Inventory Update Error',
            description: `Failed to update inventory for ${product.name}`,
            status: 'error',
            duration: 4000,
            isClosable: true,
          });
        }
      }
      
      toast({
        title: 'Sale Added',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });

      // Reset form
      setForm({
        invoiceNo: form.invoiceNo,
        date: new Date().toISOString().split('T')[0],
        customerId: '',
        customerName: ''
      });
      setItems([]);
      onClose();
      
      // Generate new invoice number for next sale
      setTimeout(() => {
        generateInvoiceNumber();
      }, 100);
      
      // Refresh data
      fetchTotalCount();
      setCurrentPage(1);
      setPageSnapshots({});
      fetchSales();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add sale',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleViewInvoice = (sale) => {
    setSelectedSale(sale);
    onViewOpen();
  };

  const handleDeleteSale = async (saleId) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'sales', saleId));
      toast({
        title: 'Sale Deleted',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
      // Refresh data
      fetchTotalCount();
      setCurrentPage(1);
      setPageSnapshots({});
      fetchSales();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete sale',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  if (!isAdmin && !isManager) return null;

  return (
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH="100vh" p={ isMobile ? 0 : 2} textAlign="center" bg="white">
      <Heading mb={6}>Sales</Heading>
      {(isAdmin || isManager) && (
        <Button colorScheme="teal" mb={4} onClick={onOpen} leftIcon={<AddIcon />}>
          Add New Sale
        </Button>
      )}
      <Box maxW="100%" height="300px" p={0} borderWidth={1} borderRadius="md" mb={4}>
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" maxW="100%" size="sm">
            <Thead>
              <Tr>
                <Th>Invoice No</Th>
                <Th>Date</Th>
                <Th>Customer Name</Th>
                { !isMobile && <Th>Total</Th>}
                <Th textAlign="right">Menu</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sales.map((sale) => (
                <Tr key={sale.id}>
                  <Td>{sale.invoiceNo}</Td>
                  <Td>{sale.date}</Td>
                  <Td>{sale.customerName}</Td>
                  { !isMobile && <Td>Rs {sale.total?.toFixed(2)}</Td>}
                  <Td textAlign="right">
                    <Menu>
                      <MenuButton size="xs">
                        <Icon boxSize={4} as={BsThreeDotsVertical} cursor="pointer" />
                      </MenuButton>
                      <MenuList>
                        <MenuItem borderRadius="none" onClick={() => handleViewInvoice(sale)}>
                          View Invoice
                        </MenuItem>
                        {isAdmin && (
                          <MenuItem borderRadius="none" color="red.500" onClick={() => handleDeleteSale(sale.id)}>
                            Delete
                          </MenuItem>
                        )}
                      </MenuList>
                    </Menu>
                  </Td>
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

      {/* View Invoice Modal */}
      <Modal isOpen={isViewOpen} onClose={onViewClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invoice Details</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedSale && (
              <VStack spacing={4} align="stretch">
                <Box p={4} borderWidth={1} borderRadius="md">
                  <HStack justify="space-between" mb={4}>
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="bold" fontSize="lg">Invoice #{selectedSale.invoiceNo}</Text>
                      <Text color="gray.600">Date: {selectedSale.date}</Text>
                    </VStack>
                    <VStack align="end" spacing={1}>
                      <Text fontWeight="bold">Customer</Text>
                      <Text>{selectedSale.customerName}</Text>
                    </VStack>
                  </HStack>
                  
                  <Box mt={6}>
                    <Text fontWeight="bold" mb={3}>Items</Text>
                    <Table variant="simple" size="sm">
                      <Thead>
                        <Tr>
                          <Th>Product</Th>
                          <Th>Quantity</Th>
                          <Th>Price</Th>
                          <Th textAlign="right">Total</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {selectedSale.items?.map((item, index) => (
                          <Tr key={index}>
                            <Td>{item.productName}</Td>
                            <Td>{item.quantity}</Td>
                            <Td>Rs {item.price?.toFixed(2)}</Td>
                            <Td textAlign="right">Rs {item.total?.toFixed(2)}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>
                  
                  <Box mt={4} textAlign="right">
                    <Text fontSize="lg" fontWeight="bold">
                      Total: Rs {selectedSale.total?.toFixed(2)}
                    </Text>
                  </Box>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={onViewClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add Sale Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent>  
          <ModalHeader>Add New Sale</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <VStack spacing={4}>
                <HStack spacing={4} w="100%">
                  <FormControl isRequired>
                    <FormLabel>Invoice No</FormLabel>
                    <Input
                      name="invoiceNo"
                      value={form.invoiceNo}
                      isReadOnly
                      placeholder="Enter invoice number"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Date</FormLabel>
                    <Input
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={handleFormChange}
                    />
                  </FormControl>
                </HStack>
                
                <FormControl isRequired>
                  <FormLabel>Customer</FormLabel>
                  <Input
                    placeholder="Search customer by name"
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    autoComplete="off"
                    onFocus={() => setShowCustomerDropdown(true)}
                    ref={customerDropdownRef}
                  />
                  {showCustomerDropdown && (
                    <Box ref={customerDropdownRef} borderWidth={1} borderRadius="md" bg="white" maxH="120px" overflowY="auto" position="absolute" zIndex={10} w="100%">
                      <List spacing={0}>
                        {customers
                          .filter(c =>
                            !customerSearch
                              ? true
                              : c.name.toLowerCase().includes(customerSearch.toLowerCase())
                          )
                          .map(customer => (
                            <ListItem
                              key={customer.id}
                              px={3} py={2} _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                              onClick={() => {
                                setForm(prev => ({ ...prev, customerId: customer.id, customerName: customer.name }));
                                setCustomerSearch(customer.name);
                                setShowCustomerDropdown(false);
                              }}
                            >
                              {customer.name} - {customer.company}
                            </ListItem>
                          ))}
                      </List>
                    </Box>
                  )}
                </FormControl>

                <Box w="100%" bg='' overflow='auto'>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold">Items</Text>
                    <Button size="sm" onClick={addItem} leftIcon={<AddIcon />}>
                      Add Item
                    </Button>
                  </HStack>
                  
                  <Box h='12rem' overflow='auto'>
                    {items.map((item, index) => (
                      <Box key={index} p={2} borderWidth={1} borderRadius="md" mb={2} >
                        <HStack spacing={2}>
                          <FormControl isRequired>
                            <FormLabel fontSize="sm">Product</FormLabel>
                            <Input
                              size="sm"
                              placeholder="Search product by name or SKU"
                              value={productSearch[index] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setProductSearch(prev => prev.map((s, i) => i === index ? val : s));
                                setShowProductDropdown(prev => prev.map((show, i) => i === index ? true : show));
                              }}
                              autoComplete="off"
                              onFocus={() => setShowProductDropdown(prev => prev.map((show, i) => i === index ? true : show))}
                              ref={el => productDropdownRefs.current[index] = el}
                            />
                            {showProductDropdown[index] && (
                              <Box ref={el => productDropdownRefs.current[index] = el} borderWidth={1} borderRadius="md" bg="white" maxH="120px" overflowY="auto" position="absolute" zIndex={10} w="200%" minW="300px">
                                <List spacing={0}>
                                  {products
                                    .filter(product =>
                                      !productSearch[index]
                                        ? true
                                        : product.name.toLowerCase().includes(productSearch[index].toLowerCase()) ||
                                          (product.sku && product.sku.toLowerCase().includes(productSearch[index].toLowerCase()))
                                    )
                                    .map(product => (
                                      <ListItem
                                        key={product.id}
                                        px={3} py={2} _hover={{ bg: 'gray.100', cursor: 'pointer' }}
                                        onClick={() => {
                                          updateItem(index, 'productId', product.id);
                                          setProductSearch(prev => prev.map((s, i) => i === index ? product.name : s));
                                          setShowProductDropdown(prev => prev.map((show, i) => i === index ? false : show));
                                        }}
                                      >
                                        {product.name} - Rs {product.price} {product.sku ? `(${product.sku})` : ''}
                                      </ListItem>
                                    ))}
                                </List>
                              </Box>
                            )}
                          </FormControl>
                          
                          <FormControl isRequired>
                            <FormLabel fontSize="sm">Quantity</FormLabel>
                            <Input size="sm"
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              bg="gray.50"
                              color="gray.600"
                              _placeholder={{ color: "gray.400" }}
                            />
                          </FormControl>
                          
                          <FormControl isRequired>
                            <FormLabel fontSize="sm">Price</FormLabel>
                            <Input size="sm"
                              type="number"
                              min="0"
                              value={item.price}
                              isDisabled
                              bg="gray.100"
                              color="gray.500"
                            />
                          </FormControl>
                          
                          <FormControl>
                            <FormLabel fontSize="sm">Total</FormLabel>
                            <Input size="sm"
                              value={`Rs ${item.total?.toFixed(2)}`}
                              isDisabled
                              bg="gray.100"
                              color="gray.500"
                            />
                          </FormControl>
                          
                          <IconButton
                            icon={<CloseIcon />}
                            onClick={() => removeItem(index)}
                            colorScheme="red"
                            size="xs"
                            mt={8}
                          />
                        </HStack>
                      </Box>
                    ))}
                  
                    {items.length > 0 && (
                      <Box textAlign="right">
                        <Text fontSize="lg" fontWeight="bold">
                          Total: Rs {calculateTotal().toFixed(2)}
                        </Text>
                      </Box>
                    )}
                  </Box>
                </Box>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="teal" type="submit" isLoading={loading}>
                Create Sale
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SalesPanel; 