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
import { collection, getDocs, addDoc, query, where, deleteDoc, doc, limit, startAfter, orderBy, getCountFromServer, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const ProductsPanel = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ sku: '', name: '', price: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [deleting, setDeleting] = useState({});
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Edit modal state
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({ sku: '', name: '', price: '', description: '' });
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
    
    setUpdating(true);
    
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
          setUpdating(false);
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
      await fetchProducts();
      
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
    
    setUpdating(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.price) return;
    setLoading(true);

    try {
      // Check for duplicate SKU
      const q = query(collection(db, 'products'), where('sku', '==', form.sku));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({
          title: 'Duplicate SKU',
          description: 'A product with this SKU already exists!',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        setLoading(false);
        return;
      }

      // Add new product if SKU is unique
      const docRef = await addDoc(collection(db, 'products'), {
        sku: form.sku,
        name: form.name,
        price: parseFloat(form.price),
        description: form.description || ''
      });
      
      // Refresh the data to show the new product
      await fetchTotalCount();
      await fetchProducts();
      
      setForm({ sku: '', name: '', price: '', description: '' });
      
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

  return (
    <Box minW={isMobile ? "100vw" : "calc(100vw - 220px)"} minH={isMobile ? '' : "100vh"} p={2} textAlign="center" bg="white">
      <Heading mb={4}>Products</Heading>
      <Text mb={8}>This is the products panel. Add your product features here.</Text>
      
      {isAdmin && (
        <Box as="form" w='' onSubmit={handleAdd} mt={6} mb={4} p={2} borderWidth={1} borderRadius="md" bg="gray.50">
          <HStack spacing={3} justifyContent="space-between">
            <Input
              name="sku"
              placeholder="SKU"
              value={form.sku}
              onChange={handleChange}
              required
              size="sm"
              width="19%"
            />
            <Input
              name="name"
              placeholder="Product Name"
              value={form.name}
              onChange={handleChange}
              required
              size="sm"
              width="30%"
            />

            <NumberInput
              size="sm"
              value={form.price}
              onChange={handlePriceChange}
              min={0}
              clampValueOnBlur
              width="28%"
            >
              <NumberInputField name="price" placeholder="Price" />
            </NumberInput>
            <Button w='20%' size="sm" colorScheme="teal" type="submit" isLoading={loading}>
              Add
            </Button>
          </HStack>
        </Box>
      )}
      
      <Box maxW="100%" height="300px" overflow="auto" p={2} borderWidth={1} borderRadius="md">
        {fetching ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" size="sm" fontSize={tableFontSize}>
            <Thead>
              <Tr>
                <Th>SKU</Th>
                <Th>Product Name</Th>
                { isMobile ? '' : <Th>Description</Th>}
                <Th>Price</Th>
                {isAdmin && <Th textAlign="right">Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {items.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.sku}</Td>
                  <Td>{item.name}</Td>
                  { isMobile ? '' : <Td>{item.description}</Td>}
                  <Td textAlign="left">Rs {item.price?.toFixed(2)}</Td>
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
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
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
