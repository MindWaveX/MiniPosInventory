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
import { collection, getDocs, doc, setDoc, limit, startAfter, orderBy, getCountFromServer, query, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

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
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({}); // Store snapshots for each page
  const [hasNextPage, setHasNextPage] = useState(false);
  
  const { isAdmin, isManager } = useAuth();
  const toast = useToast();
  const tableFontSize = useBreakpointValue({ base: 'xs', md: 'sm' });
  const [managerCanEdit, setManagerCanEdit] = useState(true);
  const [managerCanEditDescription, setManagerCanEditDescription] = useState(false);
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchProductsAndInventory();
  }, [currentPage, itemsPerPage]);

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
        inventoryMap[doc.data().sku] = doc.data().quantity;
      });

      // Merge products with their inventory quantities
      const mergedProducts = productsList.map(product => ({
        ...product,
        quantity: inventoryMap[product.sku] || 0,
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
      // Update inventory collection
      const inventoryRef = doc(db, 'inventory', editingQuantityProduct.sku);
      await setDoc(inventoryRef, {
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
      const inventoryRef = doc(db, 'inventory', editingQuantityProduct.sku);
      await setDoc(inventoryRef, {
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
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH={isMobile ? '' : "100vh"} p={ isMobile ? 0 : 2} textAlign="center" bg="white">
      <Heading mb={4}>Inventory</Heading>
      <Text mb={8}>View and edit quantities for your products.</Text>
      
      <Box maxW="100%" height="300px" overflow="auto"  p={ isMobile ? 0 : 2} borderWidth={1} borderRadius="md">
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" size="sm">
            <Thead>
              <Tr>
                <Th>SKU</Th>
                <Th>Product Name</Th>
                { isMobile ? '' : <Th>Description</Th>}
                <Th textAlign="right">Quantity</Th>
                {(isAdmin || (isManager && managerCanEdit)) && <Th textAlign="right">Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {products.map((product) => (
                <Tr key={product.id}>
                  <Td>{product.sku}</Td>
                  <Td>{product.name}</Td>
                  <Td>{product.description}</Td>
                  <Td textAlign="right">{product.quantity}</Td>
                  {(isAdmin || (isManager && managerCanEdit)) && (
                    <Td textAlign="right">
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
    </Box>
  );
};

export default InventoryPanel; 