import React, { useEffect, useState, useRef } from 'react';
import { Box, Heading, Table, Thead, Tbody, Tr, Th, Td, Spinner, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton, FormControl, FormLabel, Input, Select, VStack, HStack, Text, IconButton, useToast, useDisclosure, Menu, MenuButton, MenuList, MenuItem, Icon, useBreakpointValue, List, ListItem } from '@chakra-ui/react';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'; // For eye icon
import { collection, getDocs, orderBy, query, limit, startAfter, getCountFromServer, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { sendLowStockEmail } from '../utils/emailService';

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

  // State for search
  const [searchSaleCustomer, setSearchSaleCustomer] = useState(''); // Search input for sales by customer name

  // State to control price visibility
  const [showPrice, setShowPrice] = useState(false);

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
    // Find the product by productId
    const product = products.find(p => (p.productId || p.id) === productId);
    if (!product) return { available: 0, error: 'Product not found' };
    // Find inventory item by productId
    const inventoryItem = inventory.find(item => (item.productId || item.id) === (product.productId || product.id));
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

  // Utility to add a notification to Firestore
const addNotification = async (message) => {
  await addDoc(collection(db, 'notifications'), {
    message,
    timestamp: serverTimestamp(),
    admin_read: false,
    manager_read: false
  });
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
        // Find product and inventory by productId
        const product = products.find(p => (p.productId || p.id) === item.productId);
        if (!product) continue;
        const inventoryItem = inventory.find(inv => (inv.productId || inv.id) === (product.productId || product.id));
        if (!inventoryItem) continue;
        const newQuantity = (inventoryItem.quantity || 0) - (parseFloat(item.quantity) || 0);
        try {
          await updateDoc(doc(db, 'inventory', inventoryItem.productId || inventoryItem.id), { quantity: newQuantity });
          // If new quantity is below the product's alert limit, add a notification to Firestore and send email
          const productAlertLimit = product.alert_limit || 5;
          if (newQuantity < productAlertLimit) {
            await addNotification(`Low stock alert: ${product.name} (SKU: ${product.sku}) now has only ${newQuantity} left (alert limit: ${productAlertLimit}).`);
            // Send email notification to admin
            try {
              await sendLowStockEmail(
                product.name,
                product.sku,
                newQuantity,
                productAlertLimit
              );
            } catch (emailError) {
              console.error('Failed to send email notification:', emailError);
              // Don't fail the entire operation if email fails
            }
          }
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
      
      // Clear search fields
      setCustomerSearch('');
      setProductSearch([]);
      setShowCustomerDropdown(false);
      setShowProductDropdown([]);
      
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

  // Filter sales based on searchSaleCustomer
  const filteredSales = sales.filter(sale =>
    sale.customerName && sale.customerName.toLowerCase().includes(searchSaleCustomer.toLowerCase())
  );

  if (!isAdmin && !isManager) return null;

  return (
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH="100vh" p={ isMobile ? 0 : 2} textAlign="center" bg="white">
      <Heading mt={3} mb={6}>Sales</Heading>
      {/* Search by customer name for sales records */}
      <Box h='85vh'>
        <HStack mb={2} spacing={0} p={2} bg='gray.50' justifyContent="space-between">
        <Input
          placeholder="Search customer"
          value={searchSaleCustomer}
          onChange={e => setSearchSaleCustomer(e.target.value)}
          width='80%'
          size="sm"
        />
        {(isAdmin || isManager) && (
          <Button w='20%' colorScheme="teal" size='sm' onClick={onOpen}>
            New Sale
          </Button>
        )}
      </HStack>
      <Box maxW="100%" height="27rem" overflowY='auto' p={0} borderWidth={1} borderRadius="md" mb={4}>
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" maxW="100%" size="sm" >
            <Thead position='sticky' top={0} zIndex='docked' bg='white'>
              <Tr>
                <Th>Date</Th>
                <Th>Customer Name</Th>
                { !isMobile && <Th>Quantity</Th>}
                <Th>
                  <HStack spacing={1} justify="">
                    <span>TOTAL</span>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setShowPrice((prev) => !prev)}
                      aria-label={showPrice ? 'Hide Price' : 'Show Price'}
                      px={1}
                    >
                      {showPrice ? <ViewIcon /> : <ViewOffIcon />}
                    </Button>
                  </HStack>
                </Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {/* Use filtered sales */}
              {filteredSales.map((sale) => (
                <Tr key={sale.id}>
                  <Td>{sale.date}</Td>
                  <Td>{sale.customerName}</Td>
                  {/* Sum of all item quantities in the sale */}
                  {!isMobile && <Td>{Array.isArray(sale.items) ? sale.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) : 0}</Td>}
                  <Td>
                    {showPrice
                      ? `Rs ${sale.total?.toFixed(2)}`
                      : '********'}
                  </Td>
                  <Td textAlign="right">
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<BsThreeDotsVertical />}
                        variant=""
                        size="sm"
                        aria-label="Options"
                      />
                      <MenuList>
                        <MenuItem onClick={() => handleViewInvoice(sale)}>
                          View Invoice
                        </MenuItem>
                        <MenuItem color="red.500" onClick={() => handleDeleteSale(sale.id)}>
                          Delete Invoice
                        </MenuItem>
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
                  
                  <Box h='12rem' w='' overflow='auto'>
                    {items.map((item, index) => (
                      <Box key={index} p={2} borderWidth={1} borderRadius="md" mb={2} >
                        <HStack spacing={2}>
                          <FormControl w='' isRequired>
                            <FormLabel fontSize="sm">Product</FormLabel>
                            <Input
                              size="sm"
                              placeholder="Search"
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
                                        {/* Show SKU - Product Name - Product Description */}
                                        {product.sku} - {product.name} - {product.description}
                                      </ListItem>
                                    ))}
                                </List>
                              </Box>
                            )}
                          </FormControl>
                          {/* Available Quantity Field */}
                          <FormControl w=''>
                            <FormLabel fontSize="sm">Available</FormLabel>
                            <Input size="sm"
                              value={(() => {
                                const product = products.find(p => p.id === item.productId);
                                if (!product) return '';
                                const inventoryItem = inventory.find(inv => inv.productId === product.productId);
                                return inventoryItem ? inventoryItem.quantity : 'N/A';
                              })()}
                              isReadOnly
                              bg="gray.100"
                              color="gray.500"
                            />
                          </FormControl>
                          <FormControl w='' isRequired>
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
                          
                          <FormControl w='' isRequired>
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
                          
                          <FormControl w=''>
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
    </Box>
  );
};

export default SalesPanel;