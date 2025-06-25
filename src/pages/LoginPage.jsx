import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Heading,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      console.log('Login successful:', result);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    }
    setLoading(false);
  };

  return (
    <Box bg="gray.50" minH="100vh" minW="100vw" display="flex" alignItems="center" justifyContent="center">
      <Box maxW="md" mx="auto" p={8} borderWidth={1} borderRadius="lg" boxShadow="lg" bg="white">
        <Heading mb={6} textAlign="center">Login</Heading>
        {error && (
          <Alert status="error" mb={4} borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <FormControl id="email" mb={4} isRequired>
            <FormLabel>Email</FormLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormControl>
          <FormControl id="password" mb={6} isRequired>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormControl>
          <Button colorScheme="teal" type="submit" width="full" isLoading={loading}>
            Login
          </Button>
        </form>
      </Box>
    </Box>
  );
};

export default LoginPage;
