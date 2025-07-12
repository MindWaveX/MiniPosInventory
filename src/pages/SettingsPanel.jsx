import React, { useEffect, useState } from 'react';
import { Box, Heading, Switch, FormControl, FormLabel, Spinner, useToast, VStack, Input, Button, HStack, Text } from '@chakra-ui/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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
  const [loading, setLoading] = useState(true);
  const [testingEmail, setTestingEmail] = useState(false);
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

  if (!isAdmin) return null;

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" p={2} textAlign="center" bg="white">
      <Heading mb={6}>Settings</Heading>
      <VStack align="stretch" spacing={6} mt={16}>
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
        
        <Box borderWidth={1} borderRadius="md" p={4} bg="gray.50">
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
            Test Email Notification
          </Button>
        </Box>
      </VStack>
    </Box>
  );
};

export default SettingsPanel; 