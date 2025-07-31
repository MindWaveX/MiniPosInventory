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
  Input,
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
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'; // For price visibility toggle
import { collection, getDocs, addDoc, query, where, deleteDoc, doc, limit, startAfter, orderBy, getCountFromServer, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const ProductsPanel = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ sku: '', name: '', price: '', alert_limit: '', quantity: '' }); // Added quantity and alert_limit
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState({});
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Edit modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ sku: '', name: '', price: '', description: '', alert_limit: '' });
  const [updating, setUpdating] = useState(false);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({}); // Store snapshots for each page
  const [hasNextPage, setHasNextPage] = useState(false);
  
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = React.useRef();
  const tableFontSize = useBreakpointValue({ base: 'xs', md: 'sm' });
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [managerCanEditDescription, setManagerCanEditDescription] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); // State for SKU or Name search
  const [showPrice, setShowPrice] = useState(false); // State to control price visibility

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    fetchTotalCount();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, itemsPerPage]);

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

  const fetchProducts = async () => {
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

      const querySnapshot = await getDocs(productsQuery);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        description: doc.data().description || ''
      }));

      setItems(productsList);
      
      // Store the last document snapshot for this page
      if (querySnapshot.docs.length > 0) {
        const lastDocSnapshot = querySnapshot.docs[querySnapshot.docs.length - 1];
        setPageSnapshots(prev => ({
          ...prev,
          [currentPage]: lastDocSnapshot
        }));
        setHasNextPage(querySnapshot.docs.length === itemsPerPage);
      } else {
        setHasNextPage(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error fetching products: ' + error.message,
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (value) => {
    setForm((prev) => ({ ...prev, price: value }));
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price.toString(),
      description: product.description || '',
      alert_limit: (product.alert_limit || 5).toString()
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
    
    setUpdating(true);
    
    try {
      // No duplicate SKU check (allow multiple SKUs)

      // Update the product
      await updateDoc(doc(db, 'products', editingProduct.id), {
        sku: editForm.sku,
        name: editForm.name,
        price: parseFloat(editForm.price),
        alert_limit: parseInt(editForm.alert_limit) || 5,
        ...(isAdmin ? { description: editForm.description } : {})
      });

      // Also update the inventory collection using productId as the doc id
      await setDoc(doc(db, 'inventory', editingProduct.id), {
        productId: editingProduct.id, // Reference to product
        sku: editForm.sku,
        productName: editForm.name,
        alert_limit: parseInt(editForm.alert_limit) || 5
      }, { merge: true });

      // Refresh the data
      await fetchProducts();
      
      onEditClose();
      setEditingProduct(null);
      setEditForm({ sku: '', name: '', price: '', description: '', alert_limit: '' });
      
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
    
    setUpdating(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price || form.quantity === '') return; // Require quantity
    setLoading(true);

    try {
      // Add new product (no SKU uniqueness check)
      const docRef = await addDoc(collection(db, 'products'), {
        sku: form.sku,
        name: form.name,
        price: parseFloat(form.price),
        description: '', // Default empty description - can be set later via edit
        quantity: parseInt(form.quantity) || 0, // Store quantity in products (legacy)
        alert_limit: parseInt(form.alert_limit) || 5 // Use form alert_limit or default to 5
      });
      // Add productId to the product document (using Firestore doc.id)
      await updateDoc(docRef, { productId: docRef.id });

      // Also add to inventory collection for inventory tracking
      await setDoc(doc(db, 'inventory', docRef.id), {
        productId: docRef.id, // Reference to product
        sku: form.sku,
        productName: form.name,
        quantity: parseInt(form.quantity) || 0,
        alert_limit: parseInt(form.alert_limit) || 5 // Store alert_limit in inventory as well
      }, { merge: true });
      
      // Refresh the data to show the new product
      await fetchTotalCount();
      await fetchProducts();
      
      setForm({ sku: '', name: '', price: '', alert_limit: '', quantity: '' }); // Reset form
      
      toast({
        title: 'Product Added',
        description: 'Product has been successfully added to inventory.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error adding product: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    setDeleting(prev => ({ ...prev, [productToDelete.id]: true }));
    
    try {
      // Delete from products collection
      await deleteDoc(doc(db, 'products', productToDelete.id));
      
      // Refresh the data
      await fetchTotalCount();
      await fetchProducts();
      
      toast({
        title: 'Product Deleted',
        description: `${productToDelete.name} has been successfully deleted.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error deleting product: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    setDeleting(prev => ({ ...prev, [productToDelete.id]: false }));
    setProductToDelete(null);
    onClose();
  };

  // Filter items by SKU or Name search, then sort alphabetically by SKU
  const filteredItems = (searchTerm
    ? items.filter((item) =>
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items
  ).slice().sort((a, b) => a.sku.localeCompare(b.sku));

  return (
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH={isMobile ? '' : "100vh"} p={2} textAlign="center" bg="white">
      <Heading mb={4}>Products</Heading>
      <Text mb={8}>This is the products panel. Add your product features here.</Text>
      
        <>
          {/* Add Product Form */}
          <Box as="form" w='100%' onSubmit={handleAdd} mt={2} mb={2} p={2} borderWidth={1} borderRadius="md" bg="gray.50">
            <HStack mb={2} justifyContent='center' bg=''>
                <Input
                  name="searchTerm"
                  placeholder="Search SKU or Name"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  size="sm"
                  autoComplete=''
                />
            </HStack>
            <HStack spacing={3} justifyContent="space-between">
              {/* Search bar for SKU or Product Name */}

              <Input
                name="sku"
                placeholder="SKU"
                value={form.sku}
                onChange={handleChange}
                required
                size="sm"
                width={isMobile ? '16%' : "10%"}
                autoComplete=''
              />
              <Input
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                required
                size="sm"
                width="20%"
                autoComplete=''
              />
              <NumberInput
                size="sm"
                value={form.price}
                onChange={handlePriceChange}
                min={0}
                clampValueOnBlur
                width="20%"
              >
                <NumberInputField name="price" placeholder="Price" px={2} />
              </NumberInput>
              {/* Quantity input (new) */}
              <NumberInput
                size="sm"
                value={form.quantity}
                onChange={value => setForm(prev => ({ ...prev, quantity: value }))}
                min={0}
                clampValueOnBlur
                width={ isMobile ? '20%' : "7%"}
                isRequired
              >
                <NumberInputField name="quantity" placeholder="Qty" px={2} />
              </NumberInput>
              {/* Alert Limit field */}
              <NumberInput
                size="sm"
                value={form.alert_limit}
                onChange={value => setForm(prev => ({ ...prev, alert_limit: value }))}
                min={1}
                clampValueOnBlur
                width="20%"
              >
                <NumberInputField name="alert_limit" placeholder="Alert" px={2} />
              </NumberInput>
              <Button w='10%' size="sm" colorScheme="teal" type="submit" isLoading={loading}>
                Add
              </Button>
            </HStack>
            
          </Box>
        </>
      
      
      <Box maxW="100%" height="23rem" overflow="auto" p={2} overflowY='auto' borderWidth={1} borderRadius="md">
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" overflow='auto' size="sm" fontSize={tableFontSize}>
            <Thead position='sticky' top={-2} zIndex='docked' bg='white'>
              <Tr>
                <Th>SKU</Th>
                <Th>Product Name</Th>
                { isMobile ? '' : <Th>Alert Limit</Th>}
                {/* Price column header with toggle button */}
                <Th>
                  <HStack spacing={1} justify="">
                    <span>Price</span>
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
                {isAdmin && <Th></Th>}
              </Tr>
            </Thead>
            <Tbody>
              {/* Use filteredItems instead of items for display */}
              {filteredItems.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.sku}</Td>
                  <Td>{item.name}</Td>
                  { isMobile ? '' : <Td>{item.alert_limit || 5}</Td>}
                  {/* Price cell with visibility toggle */}
                  <Td textAlign="left">
                    {showPrice ? `Rs ${item.price?.toFixed(2)}` : '********'}
                  </Td>
                  {isAdmin && (
                    <Td textAlign="right">
                      <Menu>
                        <MenuButton size="xs" colorScheme="teal">
                          <Icon boxSize={4} as={BsThreeDotsVertical} cursor="pointer" />
                        </MenuButton>
                        <MenuList>
                          <MenuItem 
                            borderRadius="none"
                            onClick={() => handleEditClick(item)}
                          >
                            Edit
                          </MenuItem>
                          <MenuItem 
                            borderRadius="none" 
                            color="red.500"
                            onClick={() => handleDeleteClick(item)}
                            isDisabled={deleting[item.id]}
                          >
                            {deleting[item.id] ? 'Deleting...' : 'Delete'}
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
              
              <FormControl id="edit-alert-limit" mb={4} isRequired>
                <FormLabel>Alert Limit</FormLabel>
                <NumberInput
                  value={editForm.alert_limit}
                  onChange={(value) => setEditForm(prev => ({ ...prev, alert_limit: value }))}
                  min={1}
                  clampValueOnBlur
                >
                  <NumberInputField placeholder="Enter alert limit" />
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
                isLoading={updating}
              >
                Update Product
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Product
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteConfirm} 
                ml={3}
                isLoading={productToDelete && deleting[productToDelete.id]}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default ProductsPanel;
