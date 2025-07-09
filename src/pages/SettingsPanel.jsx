import React, { useEffect, useState } from 'react';
import { Box, Heading, Switch, FormControl, FormLabel, Spinner, useToast, VStack } from '@chakra-ui/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SETTINGS_DOC_ID = 'global';

const SettingsPanel = () => {
  const { isAdmin } = useAuth();
  const [managerCanEdit, setManagerCanEdit] = useState(true);
  const [managerCanEditDescription, setManagerCanEditDescription] = useState(false);
  const [managerCanViewReports, setManagerCanViewReports] = useState(false);
  const [loading, setLoading] = useState(true);
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
      </VStack>
    </Box>
  );
};

export default SettingsPanel; 