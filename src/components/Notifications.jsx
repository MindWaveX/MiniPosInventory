import React, { useEffect, useState } from 'react';
import { IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Badge, Box, List, ListItem, Text, Flex } from '@chakra-ui/react';
import { BsBell } from 'react-icons/bs';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Notifications = () => {
  const { userRole } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Listen for notifications in Firestore
  useEffect(() => {
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

  // Helper function to check if notification is read by current user
  const isNotificationRead = (notification) => {
    if (userRole === 'admin') {
      return notification.admin_read || false;
    } else if (userRole === 'manager') {
      return notification.manager_read || false;
    }
    return false;
  };

  return (
    <>
        <Box position="relative" display="inline-block">
          <IconButton
            icon={<BsBell size={22} />}
            aria-label="Notifications"
            variant="ghost"
            onClick={handleNotifOpen}
          />
          {unreadCount > 0 && (
            <Badge
              colorScheme="red"
              borderRadius="full"
              position="absolute"
              top="0"
              right="0"
              fontSize="0.7em"
              px={2}
            >
              {unreadCount}
            </Badge>
          )}
        </Box>
        <Modal isOpen={isNotifOpen} onClose={handleNotifClose} scrollBehavior='inside' isCentered size="md">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Notifications</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              {notifications.length === 0 ? (
                <Text>No notifications.</Text>
              ) : (
                <List spacing={3}>
                  {notifications.map((notif) => (
                    <ListItem 
                      key={notif.id} 
                      p={2} 
                      borderBottom="1px solid #eee"
                      bg={isNotificationRead(notif) ? 'transparent' : 'blue.50'}
                    >
                      <Text fontSize="sm">{notif.message}</Text>
                      <Text fontSize="xs" color="gray.500">
                        {notif.timestamp && new Date(notif.timestamp.seconds * 1000).toLocaleString()}
                      </Text>
                    </ListItem>
                  ))}
                </List>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
    </>
  );
};

export default Notifications; 