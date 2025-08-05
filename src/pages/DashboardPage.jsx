import React, { useState } from 'react';
import { Box, Button, Heading, Text, Flex, VStack, Spacer, Badge, useBreakpointValue, IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, List, ListItem } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import DashboardPanel from './DashboardPanel';
import ProductsPanel from './ProductsPanel';
import InventoryPanel from './InventoryPanel';
import SettingsPanel from './SettingsPanel';
import Navbar from '../components/Navbar';
import CustomersPanel from './CustomersPanel';
import SalesPanel from './SalesPanel';
import ReportsPanel from './ReportsPanel';
import Notifications from '../components/Notifications';
import { doc, getDoc, collection, query, orderBy, limit, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { BsBell } from 'react-icons/bs';

const Sidenav = ({ activePanel, setActivePanel, onLogout, userRole, isAdmin, managerCanViewReports }) => (
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
      <Text fontWeight="bold" w='100%' textAlign="center" fontSize="xl" color="teal.600" mb={2} pl={2}>
        Bilal Optics
      </Text>
      <Box w='100%' bg='' style={{ display: 'flex', direction: 'row', alignItems: 'center', justifyContent: 'center'}}>
        {/* <Text fontSize="md" fontWeight={700} color="teal.600">Notifications</Text> */}
        <Notifications />
      </Box>
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
      {(isAdmin || userRole === 'manager') && (
        <Button
          isActive={activePanel === 'sales'}
          w="100%"
          textAlign="center"
          fontWeight="semibold"
          onClick={() => setActivePanel('sales')}
          colorScheme={activePanel === 'sales' ? 'teal' : 'gray'}
          variant={activePanel === 'sales' ? 'solid' : 'ghost'}
        >
          Sales
        </Button>
      )}
      {(isAdmin || (userRole === 'manager' && managerCanViewReports)) && (
        <Button
          isActive={activePanel === 'reports'}
          w="100%"
          textAlign="center"
          fontWeight="semibold"
          onClick={() => setActivePanel('reports')}
          colorScheme={activePanel === 'reports' ? 'teal' : 'gray'}
          variant={activePanel === 'reports' ? 'solid' : 'ghost'}
        >
          Billing
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
    {/* <VStack spacing={2} mt={4}>
      <Badge 
        colorScheme={userRole === 'admin' ? 'red' : 'blue'}
        variant="subtle"
        fontSize="sm"
      >
        {userRole || 'manager'}
      </Badge>
    </VStack> */}
    <Button w="100%" mt={8} onClick={onLogout}>
      Logout
    </Button>
  </Flex>
);

const DashboardPage = () => {
  const { user, logout, userRole, isAdmin } = useAuth();
  const [activePanel, setActivePanel] = useState('dashboard');
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [managerCanViewReports, setManagerCanViewReports] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setManagerCanViewReports(docSnap.data().managerCanViewReports ?? false);
        }
      } catch (err) {
        setManagerCanViewReports(false);
      }
    };
    fetchSettings();
  }, []);

  // Listen for notifications in Firestore
  React.useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      
      // Calculate unread count based on user role
      const unread = notifs.filter(n => {
        if (userRole === 'admin') {
          return !n.admin_read;
        } else if (userRole === 'manager') {
          return !n.manager_read;
        }
        return false;
      });
      setUnreadCount(unread.length);
    });
    return () => unsubscribe();
  }, [userRole]);

  // Mark notifications as read when modal is opened
  const handleNotifOpen = async () => {
    setIsNotifOpen(true);
    
    // Mark unread notifications as read based on user role
    const unread = notifications.filter(n => {
      if (userRole === 'admin') {
        return !n.admin_read;
      } else if (userRole === 'manager') {
        return !n.manager_read;
      }
      return false;
    });
    
    for (const notif of unread) {
      const updateData = {};
      if (userRole === 'admin') {
        updateData.admin_read = true;
      } else if (userRole === 'manager') {
        updateData.manager_read = true;
      }
      
      if (Object.keys(updateData).length > 0) {
        await updateDoc(doc(db, 'notifications', notif.id), updateData);
      }
    }
  };

  const handleNotifClose = () => setIsNotifOpen(false);

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
      case 'sales':
        return <SalesPanel />;
      case 'customers':
        return <CustomersPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'reports':
        return <ReportsPanel />;
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
            managerCanViewReports={managerCanViewReports}
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