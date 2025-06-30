import React, { useState } from 'react';
import {
  Box,
  Button,
  Input,
  Heading,
  Alert,
  AlertIcon,
  Text,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { FormControl, FormLabel } from '@chakra-ui/form-control';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

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

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for password reset instructions',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      onClose();
      setResetEmail('');
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to send reset email',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setResetLoading(false);
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
          <FormControl id="password" mb={4} isRequired>
            <FormLabel>Password</FormLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormControl>
          <Box mb={6} textAlign="center">
            <Link color="teal.500" onClick={onOpen} textDecoration="underline">
              Forgot Password?
            </Link>
          </Box>
          <Button colorScheme="teal" type="submit" width="full" isLoading={loading}>
            Login
          </Button>
        </form>
      </Box>

      {/* Password Reset Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Reset Password</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            <FormControl id="reset-email" isRequired>
              <FormLabel>Email</FormLabel>
              <Input 
                type="email" 
                value={resetEmail} 
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email address"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="teal" 
              onClick={handleResetPassword}
              isLoading={resetLoading}
            >
              Send Reset Email
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default LoginPage;
