import React, { useState } from 'react';
import { Box, Button, Heading, Text, Flex, VStack, Spacer, Badge, useBreakpointValue } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import DashboardPanel from './DashboardPanel';
import ProductsPanel from './ProductsPanel';
import InventoryPanel from './InventoryPanel';
import SettingsPanel from './SettingsPanel';
import Navbar from '../components/Navbar';
import CustomersPanel from './CustomersPanel';

const Sidenav = ({ activePanel, setActivePanel, onLogout, userRole, isAdmin }) => (
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
      <Button
        isActive={activePanel === 'inventory'}
        w="100%"
        textAlign="center"
        fontWeight="semibold"
        onClick={() => setActivePanel('inventory')}
        colorScheme={activePanel === 'inventory' ? 'teal' : 'gray'}
        variant={activePanel === 'inventory' ? 'solid' : 'ghost'}
      >
        Inventory
      </Button>
      {(isAdmin || userRole === 'manager') && (
        <Button
          isActive={activePanel === 'customers'}
          w="100%"
          textAlign="center"
          fontWeight="semibold"
          onClick={() => setActivePanel('customers')}
          colorScheme={activePanel === 'customers' ? 'teal' : 'gray'}
          variant={activePanel === 'customers' ? 'solid' : 'ghost'}
        >
          Customers
        </Button>
      )}
      {isAdmin && (
        <Button
          isActive={activePanel === 'settings'}
          w="100%"
          textAlign="center"
          fontWeight="semibold"
          onClick={() => setActivePanel('settings')}
          colorScheme={activePanel === 'settings' ? 'teal' : 'gray'}
          variant={activePanel === 'settings' ? 'solid' : 'ghost'}
        >
          Settings
        </Button>
      )}
    </VStack>
    <Spacer />
    <VStack spacing={2} mb={4}>
      <Badge 
        colorScheme={userRole === 'admin' ? 'red' : 'blue'}
        variant="subtle"
        fontSize="sm"
      >
        {userRole || 'manager'}
      </Badge>
    </VStack>
    <Button w="100%" mt={8} onClick={onLogout}>
      Logout
    </Button>
  </Flex>
);

const DashboardPage = () => {
  const { user, logout, userRole, isAdmin } = useAuth();
  const [activePanel, setActivePanel] = useState('dashboard');
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Handle logout
  const handleLogout = async () => {
    await logout();
  };

  const renderPanel = () => {
    switch (activePanel) {
      case 'dashboard':
        return <DashboardPanel />;
      case 'products':
        return <ProductsPanel />;
      case 'inventory':
        return <InventoryPanel />;
      case 'customers':
        return <CustomersPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <DashboardPanel />;
    }
  };

  return (
    <Flex h={ isMobile ? "calc(100vh - 50px)" : '100vh'} minW="100vw" bg="white" direction="column">
      {isMobile && <Navbar activePanel={activePanel} setActivePanel={setActivePanel} />}
      <Flex flex="1" w="100%">
        {!isMobile && (
          <Sidenav 
            activePanel={activePanel} 
            setActivePanel={setActivePanel} 
            onLogout={handleLogout}
            userRole={userRole}
            isAdmin={isAdmin}
          />
        )}
        <Flex flex="1" alignItems="center" justifyContent="center">
          {renderPanel()}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default DashboardPage; 