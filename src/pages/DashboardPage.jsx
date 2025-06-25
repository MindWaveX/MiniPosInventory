import React, { useState } from 'react';
import { Box, Button, Heading, Text, Flex, VStack, Spacer } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import DashboardPanel from './DashboardPanel';
import ProductsPanel from './ProductsPanel';

const Sidenav = ({ activePanel, setActivePanel, onLogout }) => (
  <Flex
    direction="column"
    w="220px"
    h="100vh"
    bg="white"
    borderRightWidth={1}
    boxShadow="sm"
    p={6}
  >
    <VStack align="stretch" spacing={4} w="100%">
      <Text fontWeight="bold" w='100%' textAlign="center" fontSize="xl" color="teal.600" mb={8} pl={2}>
        Inventory
      </Text>
      <Button
        isActive={activePanel === 'dashboard'}
        w="100%"
        textAlign="center"
        fontWeight="semibold"
        onClick={() => setActivePanel('dashboard')}
        colorScheme={activePanel === 'dashboard' ? 'teal' : 'gray'}
        variant={activePanel === 'dashboard' ? 'solid' : 'ghost'}
      >
        Dashboard
      </Button>
      <Button
        isActive={activePanel === 'products'}
        w="100%"
        textAlign="center"
        fontWeight="semibold"
        onClick={() => setActivePanel('products')}
        colorScheme={activePanel === 'products' ? 'teal' : 'gray'}
        variant={activePanel === 'products' ? 'solid' : 'ghost'}
      >
        Products
      </Button>
    </VStack>
    <Spacer />
    <Button w="100%" mt={8} onClick={onLogout}>
      Logout
    </Button>
  </Flex>
);

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [activePanel, setActivePanel] = useState('dashboard');

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  return (
    <Flex minH="100vh" minW="100vw" bg="gray.50">
      <Sidenav activePanel={activePanel} setActivePanel={setActivePanel} onLogout={handleLogout} />
      <Flex flex="1" alignItems="center" justifyContent="center">
        {activePanel === 'dashboard' ? <DashboardPanel /> : <ProductsPanel />}
      </Flex>
    </Flex>
  );
};

export default DashboardPage; 