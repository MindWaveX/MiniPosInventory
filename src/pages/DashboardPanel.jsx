import React from 'react';
import { Box, Heading, Text, VStack, Badge, HStack, Stat, StatLabel, StatNumber, StatGroup, useBreakpointValue } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPanel = () => {
  const { user, userRole, isAdmin, isManager } = useAuth();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  return (
    <Box p={8} h={ isMobile ? "calc(100vh - 50px)" : '100vh'} borderWidth={1} minW={isMobile ? "100vw" : "calc(100vw - 220px)"} textAlign="center" bg="white">
      <Heading mb={4}>Dashboard</Heading>
      <Text mb={6}>Welcome, <b>{user?.email}</b>!</Text>
      
      <VStack spacing={6} align="stretch" maxW="600px" mx="auto">
        <Box p={6} borderWidth={1} borderRadius="lg" bg="gray.50">
          <HStack justify="center" spacing={4} mb={4}>
            <Text fontWeight="semibold">Your Role:</Text>
            <Badge 
              colorScheme={userRole === 'admin' ? 'red' : 'blue'}
              variant="subtle"
              fontSize="md"
              px={3}
              py={1}
            >
              {userRole || 'manager'}
            </Badge>
          </HStack>
          
          <Text fontSize="sm" color="gray.600">
            {isAdmin 
              ? "You have full administrative access to manage users, products, and inventory."
              : "You have manager access to view and edit products and inventory."
            }
          </Text>
        </Box>

        <StatGroup>
          <Stat>
            <StatLabel>Access Level</StatLabel>
            <StatNumber fontSize="2xl">
              {isAdmin ? 'Full Access' : 'Limited Access'}
            </StatNumber>
          </Stat>
          
          <Stat>
            <StatLabel>User Management</StatLabel>
            <StatNumber fontSize="2xl">
              {isAdmin ? 'Enabled' : 'Disabled'}
            </StatNumber>
          </Stat>
        </StatGroup>
      </VStack>
    </Box>
  );
};

export default DashboardPanel; 