import React from 'react';
import { Box, Heading, Text } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPanel = () => {
  const { user } = useAuth();
  return (
    <Box p={8} minH={"100vh"} borderWidth={1} minW={"calc(100vw - 220px)"} textAlign="center" bg="white">
      <Heading mb={4}>Dashboard</Heading>
      <Text mb={6}>Welcome, <b>{user?.email}</b>!</Text>
    </Box>
  );
};

export default DashboardPanel; 