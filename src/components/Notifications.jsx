import React, { useEffect, useState } from 'react';
import { IconButton, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Badge, Box, List, ListItem, Text, Flex } from '@chakra-ui/react';
import { BsBell } from 'react-icons/bs';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Listen for notifications in Firestore
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    });
    return () => unsubscribe();
  }, []);

  // Mark all as read when modal is opened
  const handleNotifOpen = async () => {
    setIsNotifOpen(true);
    // Mark all unread notifications as read in Firestore
    const unread = notifications.filter(n => !n.read);
    for (const notif of unread) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
  };

  const handleNotifClose = () => setIsNotifOpen(false);

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
                    <ListItem key={notif.id} p={2} borderBottom="1px solid #eee">
                      <Text fontSize="sm">{notif.message}</Text>
                      <Text fontSize="xs" color="gray.500">{notif.timestamp && new Date(notif.timestamp.seconds * 1000).toLocaleString()}</Text>
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