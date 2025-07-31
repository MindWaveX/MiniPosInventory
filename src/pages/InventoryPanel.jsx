import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  HStack,
  NumberInput,
  NumberInputField,
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Spinner,
  useToast,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  NumberIncrementStepper,
  NumberDecrementStepper,
  NumberInputStepper
} from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { collection, getDocs, doc, setDoc, limit, startAfter, orderBy, getCountFromServer, query, updateDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';
import { sendLowStockEmail } from '../utils/emailService';

// Utility to add a notification to Firestore
const addNotification = async (message) => {
  await addDoc(collection(db, 'notifications'), {
    message,
    timestamp: serverTimestamp(),
    admin_read: false,
    manager_read: false
  });
};

const InventoryPanel = () => {
  const [products, setProducts] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [updatingQuantities, setUpdatingQuantities] = useState({});
  
  // Edit modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ sku: '', name: '', price: '', description: '' });
  const [updatingProduct, setUpdatingProduct] = useState(false);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  
  // Quantity edit modal state
  const [editingQuantityProduct, setEditingQuantityProduct] = useState(null);
  const [quantityForm, setQuantityForm] = useState({ quantity: '' });
  const [incrementForm, setIncrementForm] = useState({ increment: '' });
  const [updatingQuantity, setUpdatingQuantity] = useState(false);
  const { isOpen: isQuantityOpen, onOpen: onQuantityOpen, onClose: onQuantityClose } = useDisclosure();
  
  // Alert limit edit modal state
  const [editingAlertLimitProduct, setEditingAlertLimitProduct] = useState(null);
  const [alertLimitForm, setAlertLimitForm] = useState({ alert_limit: '' });
  const [updatingAlertLimit, setUpdatingAlertLimit] = useState(false);
  const { isOpen: isAlertLimitOpen, onOpen: onAlertLimitOpen, onClose: onAlertLimitClose } = useDisclosure();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({}); // Store snapshots for each page
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // State for search and sort
  const [searchTerm, setSearchTerm] = useState(''); // Search input for SKU or Name
  const [sortBySKUAsc, setSortBySKUAsc] = useState(true); // Sort order for SKU
  
  const { isAdmin, isManager } = useAuth();
  const toast = useToast();
  const tableFontSize = useBreakpointValue({ base: 'xs', md: 'sm' });
  const [managerCanEdit, setManagerCanEdit] = useState(true);
  const [managerCanEditDescription, setManagerCanEditDescription] = useState(false);
  const [managerCanEditAlertLimit, setManagerCanEditAlertLimit] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchProductsAndInventory();
  }, [currentPage, itemsPerPage]);

  // Filter and sort products based on searchTerm (SKU or Name) and sortBySKUAsc
  const filteredProducts = products
    .filter(product =>
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBySKUAsc) {
        return a.sku.localeCompare(b.sku);
      } else {
        return b.sku.localeCompare(a.sku);
      }
    });

  useEffect(() => {
    // Fetch the managerCanEditInventory setting
    const fetchManagerCanEdit = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setManagerCanEdit(docSnap.data().managerCanEditInventory ?? true);
        }
      } catch (err) {
        // Default to true if error
        setManagerCanEdit(true);
      }
    };
    fetchManagerCanEdit();
  }, []);

  useEffect(() => {
    // Fetch managerCanEditDescription setting
    const fetchManagerCanEditDescription = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setManagerCanEditDescription(docSnap.data().managerCanEditDescription ?? false);
        }
      } catch (err) {
        setManagerCanEditDescription(false);
      }
    };
    fetchManagerCanEditDescription();
  }, []);

  useEffect(() => {
    // Fetch managerCanEditAlertLimit setting
    const fetchManagerCanEditAlertLimit = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setManagerCanEditAlertLimit(docSnap.data().managerCanEditAlertLimit ?? false);
        }
      } catch (err) {
        setManagerCanEditAlertLimit(false);
      }
    };
    fetchManagerCanEditAlertLimit();
  }, []);



  const fetchTotalCount = async () => {
    try {
      const productsRef = collection(db, 'products');
      const snapshot = await getCountFromServer(productsRef);
      setTotalItems(snapshot.data().count);
    } catch (error) {
      console.error('Error fetching total count:', error);
    }
  };

  const fetchProductsAndInventory = async () => {
    setFetching(true);
    try {
      let productsQuery = query(
        collection(db, 'products'),
        orderBy('name'), // Order by name for consistent pagination
        limit(itemsPerPage)
      );

      // If not on first page, use the snapshot from the previous page
      if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        productsQuery = query(
          collection(db, 'products'),
          orderBy('name'),
          startAfter(pageSnapshots[currentPage - 1]),
          limit(itemsPerPage)
        );
      }

      const productsSnapshot = await getDocs(productsQuery);
      const productsList = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        quantity: 0, // Default quantity
        description: doc.data().description || ''
      }));

      // Fetch inventory data and merge with products
      const inventorySnapshot = await getDocs(collection(db, 'inventory'));
      const inventoryMap = {};
      inventorySnapshot.docs.forEach(doc => {
        // Use productId as the key if available, otherwise fallback to doc.id or SKU for legacy data
        const inv = doc.data();
        const key = inv.productId || doc.id || inv.sku;
        inventoryMap[key] = inv.quantity;
      });

      // Merge products with their inventory quantities using productId
      const mergedProducts = productsList.map(product => ({
        ...product,
        quantity: inventoryMap[product.productId || product.id] || 0,
        description: product.description || ''
      }));

      setProducts(mergedProducts);
      
      // Store the last document snapshot for this page
      if (productsSnapshot.docs.length > 0) {
        const lastDocSnapshot = productsSnapshot.docs[productsSnapshot.docs.length - 1];
        setPageSnapshots(prev => ({
          ...prev,
          [currentPage]: lastDocSnapshot
        }));
        setHasNextPage(productsSnapshot.docs.length === itemsPerPage);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error fetching products and inventory: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setFetching(false);
  };

  const handlePageChange = (newPage) => {
    // Clear snapshots beyond the new page to ensure fresh data
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
    setCurrentPage(1); // Reset to first page when changing items per page
    setPageSnapshots({}); // Clear all snapshots
  };

  // Quantity edit modal handlers
  const handleQuantityEditClick = (product) => {
    setEditingQuantityProduct(product);
    setQuantityForm({
      quantity: product.quantity.toString()
    });
    setIncrementForm({
      increment: ''
    });
    onQuantityOpen();
  };

  // Alert limit edit modal handlers
  const handleAlertLimitEditClick = (product) => {
    setEditingAlertLimitProduct(product);
    setAlertLimitForm({
      alert_limit: (product.alert_limit || 5).toString()
    });
    onAlertLimitOpen();
  };

  const handleQuantityChange = (value) => {
    const newQuantity = parseInt(value) || 0;
    const currentQuantity = editingQuantityProduct?.quantity || 0;
    
    // Only apply increase restriction for managers, admins can decrease
    if (isAdmin || newQuantity >= currentQuantity) {
      setQuantityForm(prev => ({ ...prev, quantity: value }));
    }
  };

  const handleIncrementChange = (value) => {
    setIncrementForm(prev => ({ ...prev, increment: value }));
  };

  const handleQuantitySubmit = async (e) => {
    e.preventDefault();
    if (!quantityForm.quantity) return;
    
    const newQuantity = parseInt(quantityForm.quantity) || 0;
    const currentQuantity = editingQuantityProduct?.quantity || 0;
    
    // Only validate increase restriction for managers, admins can decrease
    if (!isAdmin && newQuantity < currentQuantity) {
      toast({
        title: 'Invalid Quantity',
        description: `Quantity cannot be decreased. Current quantity is ${currentQuantity}. Please enter a value of ${currentQuantity} or higher.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setUpdatingQuantity(true);
    
    try {
      // Update inventory collection using productId as the doc id
      const inventoryRef = doc(db, 'inventory', editingQuantityProduct.productId || editingQuantityProduct.id);
      await setDoc(inventoryRef, {
        productId: editingQuantityProduct.productId || editingQuantityProduct.id, // Reference to product
        sku: editingQuantityProduct.sku,
        productName: editingQuantityProduct.name,
        quantity: newQuantity
      }, { merge: true });

      // If new quantity is below the product's alert limit, add a notification to Firestore and send email
      const productAlertLimit = editingQuantityProduct.alert_limit || 5;
      if (newQuantity < productAlertLimit) {
        await addNotification(`Low stock alert: ${editingQuantityProduct.name} (SKU: ${editingQuantityProduct.sku}) now has only ${newQuantity} left (alert limit: ${productAlertLimit}).`);
        
        // Send email notification to admin
        try {
          await sendLowStockEmail(
            editingQuantityProduct.name,
            editingQuantityProduct.sku,
            newQuantity,
            productAlertLimit
          );
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the entire operation if email fails
        }
      }

      // Refresh the data
      await fetchProductsAndInventory();
      
      onQuantityClose();
      setEditingQuantityProduct(null);
      setQuantityForm({ quantity: '' });
      setIncrementForm({ increment: '' });
      
      toast({
        title: 'Quantity Updated',
        description: `Quantity for ${editingQuantityProduct.name} has been updated to ${newQuantity}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error updating quantity: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    setUpdatingQuantity(false);
  };

  const handleAlertLimitSubmit = async (e) => {
    e.preventDefault();
    if (!alertLimitForm.alert_limit) return;
    
    const newAlertLimit = parseInt(alertLimitForm.alert_limit) || 5;
    
    if (newAlertLimit < 1) {
      toast({
        title: 'Invalid Alert Limit',
        description: 'Alert limit must be at least 1.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setUpdatingAlertLimit(true);
    
    try {
      // Update the product's alert limit
      await updateDoc(doc(db, 'products', editingAlertLimitProduct.id), {
        alert_limit: newAlertLimit
      });

      // Refresh the data
      await fetchProductsAndInventory();
      
      onAlertLimitClose();
      setEditingAlertLimitProduct(null);
      setAlertLimitForm({ alert_limit: '' });
      
      toast({
        title: 'Alert Limit Updated',
        description: `Alert limit for ${editingAlertLimitProduct.name} has been updated to ${newAlertLimit}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error updating alert limit: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    setUpdatingAlertLimit(false);
  };

  const handleIncrementSubmit = async (e) => {
    e.preventDefault();
    if (!incrementForm.increment) return;
    
    const increment = parseInt(incrementForm.increment) || 0;
    const currentQuantity = editingQuantityProduct?.quantity || 0;
    const newQuantity = currentQuantity + increment;
    
    if (increment <= 0) {
      toast({
        title: 'Invalid Increment',
        description: 'Please enter a positive number to add to the quantity.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    
    setUpdatingQuantity(true);
    
    try {
      // Update inventory collection
      const inventoryRef = doc(db, 'inventory', editingQuantityProduct.productId || editingQuantityProduct.id);
      await setDoc(inventoryRef, {
        productId: editingQuantityProduct.productId || editingQuantityProduct.id, // Reference to product
        sku: editingQuantityProduct.sku,
        productName: editingQuantityProduct.name,
        quantity: newQuantity
      }, { merge: true });

      // Refresh the data
      await fetchProductsAndInventory();
      
      onQuantityClose();
      setEditingQuantityProduct(null);
      setQuantityForm({ quantity: '' });
      setIncrementForm({ increment: '' });
      
      toast({
        title: 'Quantity Updated',
        description: `Added ${increment} to ${editingQuantityProduct.name}. New quantity: ${newQuantity}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error updating quantity: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    setUpdatingQuantity(false);
  };

  // Product edit modal handlers
  const handleProductEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price.toString(),
      description: product.description || ''
    });
    onEditOpen();
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditPriceChange = (value) => {
    setEditForm((prev) => ({ ...prev, price: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.sku || !editForm.name || !editForm.price) return;
    
    setUpdatingProduct(true);
    
    try {
      // Check for duplicate SKU (excluding the current product)
      if (editForm.sku !== editingProduct.sku) {
        const q = query(collection(db, 'products'), where('sku', '==', editForm.sku));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          toast({
            title: 'Duplicate SKU',
            description: 'A product with this SKU already exists!',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          setUpdatingProduct(false);
          return;
        }
      }

      // Update the product
      await updateDoc(doc(db, 'products', editingProduct.id), {
        sku: editForm.sku,
        name: editForm.name,
        price: parseFloat(editForm.price),
        ...(isAdmin ? { description: editForm.description } : {})
      });

      // Refresh the data
      await fetchProductsAndInventory();
      
      onEditClose();
      setEditingProduct(null);
      setEditForm({ sku: '', name: '', price: '', description: '' });
      
      toast({
        title: 'Product Updated',
        description: 'Product has been successfully updated.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error updating product: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    setUpdatingProduct(false);
  };

  return (
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH={isMobile ? '' : "100vh"} p={ isMobile ? 0 : 2} textAlign="center">
      <Box>
        <Heading mt={3} mb={4}>Inventory</Heading>
        <Text mb={8}>View and edit quantities for your products.</Text>
      </Box>
      {/* Search and Sort Controls */}
      <Box h='' bg=''>
        <HStack mb={2} spacing={0} p={2} bg='gray.50' justifyContent="space-between">
        {/* Search by SKU or Product Name */}
        <Input
          placeholder="Search by SKU or Name"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          width='80%'
          size="sm"
        />
        {/* Sort by SKU toggle */}
        <Button w='20%' size="sm" width='auto' onClick={() => setSortBySKUAsc(prev => !prev)}>
          SKU {sortBySKUAsc ? '▲' : '▼'}
        </Button>
      </HStack> 
      <Box maxW="100%" h='24rem'  p={ isMobile ? 0 : 2} borderWidth={1} overflowY='auto' borderRadius="md">
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" maxW='100%' size="sm">
            <Thead position='sticky' top={-2} zIndex='docked' bg='white'>
              <Tr>
                <Th>SKU</Th>
                <Th>Product Name</Th>
                { !isMobile && <Th>Description</Th>}
                <Th textAlign="">Quantity</Th>
                <Th textAlign="">Alert</Th>
                {/* Actions header removed as requested */}
              </Tr>
            </Thead>
            <Tbody>
              {/* Use filtered and sorted products */}
              {filteredProducts.map((product) => (
                <Tr key={product.id}>
                  <Td>{product.sku}</Td>
                  <Td>{product.name}</Td>
                  { !isMobile && <Td>{product.description}</Td>}
                  <Td textAlign="" textColor={ (product.quantity < product.alert_limit) ? 'red' : '' }>{product.quantity}</Td>
                  <Td textAlign="">{product.alert_limit}</Td>
                  {(isAdmin || (isManager && managerCanEdit)) ? (
                    <Td textAlign="">
                      <Menu>
                        <MenuButton>
                          <Icon boxSize={4} as={BsThreeDotsVertical} cursor="pointer" />
                        </MenuButton>
                        <MenuList>
                          <MenuItem 
                            borderRadius="none"
                            onClick={() => handleQuantityEditClick(product)}
                          >
                            Edit Quantity
                          </MenuItem>
                          {(isAdmin || (isManager && managerCanEditAlertLimit)) && (
                            <MenuItem 
                              borderRadius="none"
                              onClick={() => handleAlertLimitEditClick(product)}
                            >
                              Set Alert Limit
                            </MenuItem>
                          )}
                          {isAdmin && (
                            <MenuItem 
                              borderRadius="none"
                              onClick={() => handleProductEditClick(product)}
                            >
                              Edit Product
                            </MenuItem>
                          )}
                        </MenuList>
                      </Menu>
                    </Td>
                  ) : (
                    <Td textAlign=""></Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      {/* Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={handlePageChange}
        onItemsPerPageChange={handleItemsPerPageChange}
        isLoading={fetching}
      />

      {/* Edit Quantity Modal */}
      <Modal isOpen={isQuantityOpen} onClose={onQuantityClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Quantity</ModalHeader>
          <ModalCloseButton />
          
          {isAdmin ? (
            // Admin interface - existing functionality
            <form onSubmit={handleQuantitySubmit}>
              <ModalBody>
                <Text mb={4}>
                  Update quantity for <strong>{editingQuantityProduct?.name}</strong>
                </Text>
                
                <HStack spacing={4} align="end">
                  <FormControl id="current-quantity" flex="1">
                    <FormLabel>Current Quantity</FormLabel>
                    <Input
                      value={editingQuantityProduct?.quantity || 0}
                      isReadOnly
                      bg="gray.100"
                    />
                  </FormControl>
                  
                  <FormControl id="edit-quantity" flex="1" isRequired>
                    <FormLabel>New Quantity</FormLabel>
                    <NumberInput
                      value={quantityForm.quantity}
                      onChange={handleQuantityChange}
                      min={0}
                      clampValueOnBlur
                    >
                      <NumberInputField placeholder="Enter new quantity" />
                    </NumberInput>
                  </FormControl>
                  
                  <Button 
                    colorScheme="teal" 
                    type="submit"
                    isLoading={updatingQuantity}
                    height="40px"
                    mt="auto"
                  >
                    Change
                  </Button>
                </HStack>
              </ModalBody>

              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onQuantityClose}>
                  Cancel
                </Button>
              </ModalFooter>
            </form>
          ) : (
            // Manager interface - increment functionality
            <form onSubmit={handleIncrementSubmit}>
              <ModalBody>
                <Text mb={4}>
                  Add to quantity for <strong>{editingQuantityProduct?.name}</strong>
                </Text>
                
                <HStack spacing={4} align="end">
                  <FormControl id="current-quantity" flex="1">
                    <FormLabel>Current Quantity</FormLabel>
                    <Input
                      value={editingQuantityProduct?.quantity || 0}
                      isReadOnly
                      bg="gray.100"
                    />
                  </FormControl>
                  
                  <FormControl id="increment-amount" flex="1" isRequired>
                    <FormLabel>Add Amount</FormLabel>
                    <NumberInput
                      value={incrementForm.increment}
                      onChange={handleIncrementChange}
                      min={1}
                      clampValueOnBlur
                    >
                      <NumberInputField placeholder="Increment By" />
                    </NumberInput>
                  </FormControl>
                  
                  <Button 
                    colorScheme="teal" 
                    type="submit"
                    isLoading={updatingQuantity}
                    height="40px"
                    mt="auto"
                  >
                    Add
                  </Button>
                </HStack>
              </ModalBody>

              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onQuantityClose}>
                  Cancel
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>

      {/* Edit Product Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Product</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleEditSubmit}>
            <ModalBody>
              <FormControl id="edit-sku" mb={4} isRequired>
                <FormLabel>SKU</FormLabel>
                <Input
                  name="sku"
                  value={editForm.sku}
                  onChange={handleEditChange}
                  placeholder="Enter SKU"
                />
              </FormControl>
              
              <FormControl id="edit-name" mb={4} isRequired>
                <FormLabel>Product Name</FormLabel>
                <Input
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  placeholder="Enter product name"
                />
              </FormControl>
              
              <FormControl id="edit-price" mb={4} isRequired>
                <FormLabel>Price</FormLabel>
                <NumberInput
                  value={editForm.price}
                  onChange={handleEditPriceChange}
                  min={0}
                  clampValueOnBlur
                >
                  <NumberInputField placeholder="Enter price" />
                </NumberInput>
              </FormControl>
              {(isAdmin || managerCanEditDescription) && (
                <FormControl id="edit-description" mb={4}>
                  <FormLabel>Description</FormLabel>
                  <Input
                    name="description"
                    value={editForm.description}
                    onChange={handleEditChange}
                    placeholder="Enter product description"
                  />
                </FormControl>
              )}
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onEditClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="teal" 
                type="submit"
                isLoading={updatingProduct}
              >
                Update Product
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Edit Alert Limit Modal */}
      <Modal isOpen={isAlertLimitOpen} onClose={onAlertLimitClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Alert Limit</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleAlertLimitSubmit}>
            <ModalBody>
              <Text mb={4}>
                Update alert limit for <strong>{editingAlertLimitProduct?.name}</strong>
              </Text>
              
              <FormControl id="edit-alert-limit" isRequired>
                <FormLabel>Alert Limit</FormLabel>
                <NumberInput
                  value={alertLimitForm.alert_limit}
                  onChange={(value) => setAlertLimitForm(prev => ({ ...prev, alert_limit: value }))}
                  min={1}
                  clampValueOnBlur
                >
                  <NumberInputField placeholder="Enter alert limit" />
                </NumberInput>
              </FormControl>
              
              <Text fontSize="sm" color="gray.600" mt={2}>
                Alerts will be sent when quantity falls below this number
              </Text>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onAlertLimitClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="teal" 
                type="submit"
                isLoading={updatingAlertLimit}
              >
                Update Alert Limit
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
      </Box>
    </Box>
  );
};

export default InventoryPanel; 