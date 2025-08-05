import React from 'react';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Button,
  useDisclosure,
  Stack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import { useAuth } from '../contexts/AuthContext';
import Notifications from './Notifications';

const Navbar = ({ activePanel, setActivePanel }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { logout, isAdmin, isManager } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Dynamically add Settings link for admins
  const navLinks = [
    { name: 'Dashboard', panel: 'dashboard' },
    { name: 'Products', panel: 'products' },
    { name: 'Inventory', panel: 'inventory' },
    ...(isAdmin || isManager ? [
      { name: 'Customers', panel: 'customers' }
    ] : []),
    { name: 'Sales', panel: 'sales' },
    ...(isAdmin ? [
      {name: 'Billing', panel: 'reports'},
      { name: 'Settings', panel: 'settings' },
    ] : [])
  ];

  return (
    <Box bg="teal.500" px={4} w='100%'>
      <Flex h='50px' alignItems="center" justifyContent="space-between">
        <IconButton
          size="sm"
          icon={isOpen ? <CloseIcon /> : <HamburgerIcon boxSize={4} />}
          aria-label="Open Menu"
          display={{ md: 'none' }}
          onClick={isOpen ? onClose : onOpen}
        />

        <HStack spacing={8} alignItems="center">
          <Box fontWeight="bold" color="white">Inventory App</Box>
          <HStack as="nav" spacing={4} display={{ base: 'none', md: 'flex' }}>
            {navLinks.map((link) => (
              <Button
                key={link.name}
                onClick={() => setActivePanel(link.panel)}
                variant={activePanel === link.panel ? 'solid' : 'ghost'}
                colorScheme={activePanel === link.panel ? 'teal' : undefined}
              >
                {link.name}
              </Button>
            ))}
          </HStack>
        </HStack>

        <Flex alignItems="center" bg='white' borderRadius='md' bgSize='cover'>
          {/* <Menu>
            <MenuButton
              as={Button}
              rounded="full"
              variant="link"
              cursor="pointer"
              minW={0}
              _focus={{ boxShadow: 'none' }}
            >
              <Box color="white" fontWeight="medium">⋮</Box>
            </MenuButton>
            <MenuList>
              <MenuItem onClick={handleLogout}>Logout</MenuItem>
            </MenuList>
          </Menu> */}
          <Notifications />
        </Flex>
      </Flex>

      {isOpen ? (
        <Box pb={4} display={{ md: 'none' }}>
          <Stack as="nav" spacing={4}>
            {navLinks.map((link) => (
              <Button
                key={link.name}
                onClick={() => {
                  setActivePanel(link.panel);
                  onClose();
                }}
                variant={activePanel === link.panel ? 'solid' : 'ghost'}
                colorScheme={activePanel === link.panel ? 'teal' : undefined}
                w="full"
                justifyContent="flex-start"
              >
                {link.name}
              </Button>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
};

export default Navbar;
