import React, { useEffect, useState } from 'react';
import { Box, Heading, Switch, FormControl, FormLabel, Spinner, SimpleGrid, useToast, VStack, Input, Button, HStack, Text } from '@chakra-ui/react';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { testEmailJS } from '../utils/emailService';

const SETTINGS_DOC_ID = 'global';

const SettingsPanel = () => {
  const { isAdmin } = useAuth();
  const [managerCanEdit, setManagerCanEdit] = useState(true);
  const [managerCanEditDescription, setManagerCanEditDescription] = useState(false);
  const [managerCanViewReports, setManagerCanViewReports] = useState(false);
  const [managerCanEditAlertLimit, setManagerCanEditAlertLimit] = useState(false);
  const [alertEmail, setAlertEmail] = useState(''); // New state for alert email
  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false); // New state for saving email
  const [notificationsDate, setNotificationsDate] = useState(''); // Date for deleting old notifications
  const [salesDate, setSalesDate] = useState(''); // Date for deleting old sales
  const [deletingOldNotifications, setDeletingOldNotifications] = useState(false);
  const [deletingOldSales, setDeletingOldSales] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setManagerCanEdit(docSnap.data().managerCanEditInventory ?? true);
          setManagerCanEditDescription(docSnap.data().managerCanEditDescription ?? false);
          setManagerCanViewReports(docSnap.data().managerCanViewReports ?? false);
          setManagerCanEditAlertLimit(docSnap.data().managerCanEditAlertLimit ?? false);
          setAlertEmail(docSnap.data().alert_email ?? ''); // Load alert email from settings
        }
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to load settings',
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      }
      setLoading(false);
    };
    fetchSettings();
  }, [toast]);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const newValue = !managerCanEdit;
      setManagerCanEdit(newValue);
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), { managerCanEditInventory: newValue }, { merge: true });
      toast({
        title: 'Setting Updated',
        description: `Managers can ${newValue ? '' : 'no longer '}edit inventory.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleDescriptionToggle = async () => {
    setLoading(true);
    try {
      const newValue = !managerCanEditDescription;
      setManagerCanEditDescription(newValue);
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), { managerCanEditDescription: newValue }, { merge: true });
      toast({
        title: 'Setting Updated',
        description: `Managers can ${newValue ? '' : 'no longer '}edit product descriptions.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleReportsToggle = async () => {
    setLoading(true);
    try {
      const newValue = !managerCanViewReports;
      setManagerCanViewReports(newValue);
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), { managerCanViewReports: newValue }, { merge: true });
      toast({
        title: 'Setting Updated',
        description: `Managers can ${newValue ? '' : 'no longer '}view the Reports Panel.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleAlertLimitToggle = async () => {
    setLoading(true);
    try {
      const newValue = !managerCanEditAlertLimit;
      setManagerCanEditAlertLimit(newValue);
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), { managerCanEditAlertLimit: newValue }, { merge: true });
      toast({
        title: 'Setting Updated',
        description: `Managers can ${newValue ? '' : 'no longer '}edit alert limits.`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update setting',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setLoading(false);
  };

  const handleAlertEmailSave = async () => {
    setSavingEmail(true);
    try {
      await setDoc(doc(db, 'settings', SETTINGS_DOC_ID), { alert_email: alertEmail }, { merge: true });
      toast({
        title: 'Email Updated',
        description: 'Alert email has been saved successfully.',
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save alert email',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setSavingEmail(false);
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await testEmailJS();
      toast({
        title: 'Test Email Sent',
        description: 'Test email sent successfully! Check your inbox.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Test Email Failed',
        description: `Failed to send test email: ${error.message}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    setTestingEmail(false);
  };

  // Function to delete notifications older than specified date
  const handleDeleteOldNotifications = async () => {
    if (!notificationsDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a date before deleting old notifications.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setDeletingOldNotifications(true);
    try {
      const selectedDate = new Date(notificationsDate);
      const timestamp = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
      
      // Get notifications older than the specified date
      const notificationsRef = collection(db, 'notifications');
      const q = query(notificationsRef, where('timestamp', '<', timestamp));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({
          title: 'No Notifications Found',
          description: 'No notifications found older than the selected date.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Delete each notification document
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      toast({
        title: 'Notifications Deleted',
        description: `Successfully deleted ${snapshot.docs.length} notifications older than ${notificationsDate}.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
      setNotificationsDate(''); // Reset the date input
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete old notifications: ${error.message}`,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setDeletingOldNotifications(false);
  };

  // Function to delete sales older than specified date
  const handleDeleteOldSales = async () => {
    if (!salesDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a date before deleting old sales.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setDeletingOldSales(true);
    try {
      const selectedDate = new Date(salesDate);
      const timestamp = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
      
      // Get sales older than the specified date
      const salesRef = collection(db, 'sales');
      const q = query(salesRef, where('timestamp', '<', timestamp));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({
          title: 'No Sales Found',
          description: 'No sales found older than the selected date.',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Delete each sale document
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      toast({
        title: 'Sales Deleted',
        description: `Successfully deleted ${snapshot.docs.length} sales older than ${salesDate}.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
      
      setSalesDate(''); // Reset the date input
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete old sales: ${error.message}`,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
    setDeletingOldSales(false);
  };

  if (!isAdmin) return null;

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" px={6} py={2} textAlign="center" bg="white" overflowY='auto'>
      <Heading>Settings</Heading>
      <SimpleGrid pt={16} columns={{base: 1, sm: 2}} spacing={20}>
        <FormControl display="flex" alignItems="center" justifyContent="center">
          <FormLabel htmlFor="manager-edit-toggle" mb="0">
            Allow managers to edit inventory
          </FormLabel>
          <Switch
              id="manager-edit-toggle"
              isChecked={managerCanEdit}
              onChange={handleToggle}
              colorScheme="teal"
          />
        </FormControl>
        <FormControl display="flex" alignItems="center" justifyContent="center">
          <FormLabel htmlFor="manager-edit-description-toggle" mb="0">
            Allow managers to edit product description
          </FormLabel>
          <Switch
              id="manager-edit-description-toggle"
              isChecked={managerCanEditDescription}
              onChange={handleDescriptionToggle}
              colorScheme="teal"
          />
        </FormControl>
        <FormControl display="flex" alignItems="center" justifyContent="center">
          <FormLabel htmlFor="manager-reports-toggle" mb="0">
            Allow managers to view Reports Panel
          </FormLabel>
          <Switch
            id="manager-reports-toggle"
            isChecked={managerCanViewReports}
            onChange={handleReportsToggle}
            colorScheme="teal"
          />
        </FormControl>
        <FormControl display="flex" alignItems="center" justifyContent="center">
          <FormLabel htmlFor="manager-alert-limit-toggle" mb="0">
            Allow managers to edit alert limits
          </FormLabel>
          <Switch
            id="manager-alert-limit-toggle"
            isChecked={managerCanEditAlertLimit}
            onChange={handleAlertLimitToggle}
            colorScheme="teal"
          />
        </FormControl>
        
        {/* Alert Email Configuration */}
        <Box borderWidth={1} borderRadius="sm">
          <Text fontWeight="bold" mb={2}>Alert Email Configuration</Text>
          <Text fontSize="sm" color="gray.600" mb={3}>
            Configure the email address to receive low stock alerts and notifications
          </Text>
          <HStack spacing={3} justify="center">
            <Input
              type="email"
              placeholder="Enter email address for alerts"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              maxW="300px"
            />
            <Button
              colorScheme="blue"
              size="sm"
              onClick={handleAlertEmailSave}
              isLoading={savingEmail}
            >
              Save
            </Button>
          </HStack>
        </Box>
        
        <Box borderWidth={1} borderRadius="sm">
          <Text fontWeight="bold" mb={2}>Email Notifications</Text>
          <Text fontSize="sm" color="gray.600" mb={3}>
            Test the email notification system
          </Text>
          <Button
            colorScheme="blue"
            size="sm"
            onClick={handleTestEmail}
            isLoading={testingEmail}
          >
            Test Notification
          </Button>
        </Box>

        {/* Delete Old Notifications Section */}
        <Box borderWidth={1} borderRadius="sm">
          <Text fontWeight="bold" mb={2}>Delete Old Notifications</Text>
          <Text fontSize="sm" color="gray.600" mb={3}>
            Delete notifications older than the selected date. This action cannot be undone.
          </Text>
          <HStack spacing={3} justify="center">
            <Input
              type="date"
              value={notificationsDate}
              onChange={(e) => setNotificationsDate(e.target.value)}
              maxW="200px"
            />
            <Button
              colorScheme="red"
              size="sm"
              onClick={handleDeleteOldNotifications}
              isLoading={deletingOldNotifications}
            >
              Delete
            </Button>
          </HStack>
        </Box>

        {/* Delete Old Sales Section */}
        <Box borderWidth={1} borderRadius="sm">
          <Text fontWeight="bold" mb={2}>Delete Old Sales</Text>
          <Text fontSize="sm" color="gray.600" mb={3}>
            Delete sales records older than the selected date. This action cannot be undone.
          </Text>
          <HStack spacing={3} justify="center">
            <Input
              type="date"
              value={salesDate}
              onChange={(e) => setSalesDate(e.target.value)}
              maxW="200px"
            />
            <Button
              colorScheme="red"
              size="sm"
              onClick={handleDeleteOldSales}
              isLoading={deletingOldSales}
            >
              Delete
            </Button>
          </HStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default SettingsPanel; 