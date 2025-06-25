import React, { useState } from 'react';
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
  Select,
  NumberInput,
  NumberInputField,
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem
} from '@chakra-ui/react';
import { BsThreeDotsVertical } from 'react-icons/bs';

const initialItems = [
  { id: 1, name: 'Product A', category: 'Category 1', price: 10, quantity: 5 },
  { id: 2, name: 'Product B', category: 'Category 2', price: 20, quantity: 5 },
  { id: 3, name: 'Product C', category: 'Category 1', price: 15, quantity: 5 },
  { id: 4, name: 'Product D', category: 'Category 2', price: 25, quantity: 5 },
  { id: 5, name: 'Product E', category: 'Category 1', price: 30, quantity: 5 },
  { id: 6, name: 'Product F', category: 'Category 2', price: 35, quantity: 5 },
  { id: 7, name: 'Product G', category: 'Category 1', price: 40, quantity: 5 },
  { id: 8, name: 'Product H', category: 'Category 2', price: 45, quantity: 5 },
  { id: 9, name: 'Product I', category: 'Category 1', price: 50, quantity: 5 },
  { id: 10, name: 'Product J', category: 'Category 2', price: 55, quantity: 5 },
];

const categoryOptions = ['Category 1', 'Category 2'];

const ProductsPanel = () => {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState({ name: '', category: '', price: '', quantity: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (value) => {
    setForm((prev) => ({ ...prev, price: value }));
  };

  const handleQuantityChange = (value) => {
    setForm((prev) => ({ ...prev, quantity: value }));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.name || !form.category || !form.price || !form.quantity) return;
    setLoading(true);
    setTimeout(() => {
      setItems((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          name: form.name,
          category: form.category,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity, 10),
        },
      ]);
      setForm({ name: '', category: '', price: '', quantity: '' });
      setLoading(false);
    }, 200);
  };

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" p={8} borderWidth={1} textAlign="center" bg="white">
      <Heading mb={4}>Products</Heading>
      <Text mb={8}>This is the products panel. Add your product features here.</Text>
      <Box maxW="100%" height="300px" overflow="auto">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>SKU</Th>
              <Th>Name</Th>
              <Th>Quantity</Th>
              <Th>Category</Th>
              <Th textAlign="right">Price</Th>
              <Th textAlign="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {items.map((item) => (
              <Tr key={item.id}>
                <Td>{item.name}</Td>
                <Td>RayBan</Td>
                <Td>{item.quantity}</Td>
                <Td>{item.category}</Td>
                <Td textAlign="right">${item.price.toFixed(2)}</Td>
                <Td textAlign="right">
                  <Menu>
                    <MenuButton>
                      <Icon as={BsThreeDotsVertical} boxSize={4} ml={2} cursor="pointer" />
                    </MenuButton>
                    <MenuList>
                      <MenuItem>Edit</MenuItem>
                      <MenuItem>Delete</MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
      <Box as="form" w='' onSubmit={handleAdd} mt={6} p={4} borderWidth={1} borderRadius="md" bg="gray.50">
        <HStack spacing={3}>
          <Input
            name="name"
            placeholder="Product Name"
            value={form.name}
            onChange={handleChange}
            required
            size="sm"
            width="250px"
          />
          <Select
            name="category"
            placeholder="Select"
            value={form.category}
            onChange={handleChange}
            size="sm"
            width="150px"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
          <NumberInput
            size="sm"
            value={form.price}
            onChange={handlePriceChange}
            min={0}
            clampValueOnBlur
            width="150px"
          >
            <NumberInputField name="price" placeholder="Price" />
          </NumberInput>
          <NumberInput
            size="sm"
            value={form.quantity}
            onChange={handleQuantityChange}
            min={0}
            clampValueOnBlur
            width="150px"
          >
            <NumberInputField name="quantity" placeholder="Qty" />
          </NumberInput>
          <Button w='150px' size="sm" colorScheme="teal" type="submit" isLoading={loading}>
            Add
          </Button>
        </HStack>
      </Box>
    </Box>
  );
};

export default ProductsPanel;
