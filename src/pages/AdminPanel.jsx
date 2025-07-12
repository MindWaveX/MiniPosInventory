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
  Select,
  Button,
  Spinner,
  useToast,
  Badge
} from '@chakra-ui/react';
import { collection, getDocs, doc, updateDoc, limit, startAfter, orderBy, getCountFromServer, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from '../components/Pagination';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSnapshots, setPageSnapshots] = useState({}); // Store snapshots for each page
  const [hasNextPage, setHasNextPage] = useState(false);
  
  const { updateUserRole, isAdmin } = useAuth();
  const toast = useToast();

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (isAdmin) {
      fetchTotalCount();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, currentPage, itemsPerPage]);

  const fetchTotalCount = async () => {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getCountFromServer(usersRef);
      setTotalItems(snapshot.data().count);
    } catch (error) {
      console.error('Error fetching total count:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let usersQuery = query(
        collection(db, 'users'),
        orderBy('role'), // Order by role for consistent pagination
        limit(itemsPerPage)
      );

      // If not on first page, use the snapshot from the previous page
      if (currentPage > 1 && pageSnapshots[currentPage - 1]) {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('role'),
          startAfter(pageSnapshots[currentPage - 1]),
          limit(itemsPerPage)
        );
      }

      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersList);
      
      // Store the last document snapshot for this page
      if (usersSnapshot.docs.length > 0) {
        const lastDocSnapshot = usersSnapshot.docs[usersSnapshot.docs.length - 1];
        setPageSnapshots(prev => ({
          ...prev,
          [currentPage]: lastDocSnapshot
        }));
        setHasNextPage(usersSnapshot.docs.length === itemsPerPage);
      } else {
        setHasNextPage(false);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error fetching users: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setLoading(false);
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

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(prev => ({ ...prev, [userId]: true }));
    
    try {
      await updateUserRole(userId, newRole);
      
      // Update local state
      setUsers(prev => 
        prev.map(user => 
          user.id === userId 
            ? { ...user, role: newRole }
            : user
        )
      );

      toast({
        title: 'Role Updated',
        description: `User role has been updated to ${newRole}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Error updating user role: ' + err.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    setUpdating(prev => ({ ...prev, [userId]: false }));
  };

  if (!isAdmin) {
    return (
      <Box minW="calc(100vw - 220px)" minH="100vh" p={8} borderWidth={1} textAlign="center" bg="white">
        <Heading mb={4}>Access Denied</Heading>
        <Text>You don't have permission to access this panel.</Text>
      </Box>
    );
  }

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" p={8} borderWidth={1} textAlign="center" bg="white">
      <Heading mb={4}>Admin Panel</Heading>
      <Text mb={8}>Manage user roles and permissions.</Text>
      
      <Box maxW="100%" height="400px" overflow="auto" borderWidth={1} borderRadius="md">
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="300px">
            <Spinner />
          </Box>
        ) : (
          <Table variant="striped" size="sm">
            <Thead>
              <Tr>
                <Th>User ID</Th>
                <Th>Role</Th>
                <Th></Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.map((user) => (
                <Tr key={user.id}>
                  <Td>{user.id}</Td>
                  <Td>
                    <Badge 
                      colorScheme={user.role === 'admin' ? 'red' : 'blue'}
                      variant="subtle"
                    >
                      {user.role || 'manager'}
                    </Badge>
                  </Td>
                  <Td>
                    <Select
                      size="sm"
                      value={user.role || 'manager'}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      width="120px"
                      isDisabled={updating[user.id]}
                    >
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </Td>
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
        isLoading={loading}
      />
    </Box>
  );
};

export default AdminPanel; 