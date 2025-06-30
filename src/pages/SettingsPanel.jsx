import React, { useEffect, useState } from 'react';
import { Box, Heading, Switch, FormControl, FormLabel, Spinner, useToast } from '@chakra-ui/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const SETTINGS_DOC_ID = 'global';

const SettingsPanel = () => {
  const { isAdmin } = useAuth();
  const [managerCanEdit, setManagerCanEdit] = useState(true);
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

  if (!isAdmin) return null;

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" p={2} borderWidth={1} textAlign="center" bg="white">
      <Heading mb={6}>Settings</Heading>
      <FormControl display="flex" alignItems="center" justifyContent="center" mt={16}>
        <FormLabel htmlFor="manager-edit-toggle" mb="0">
          Allow managers to edit inventory
        </FormLabel>
        {/* {loading ? <Spinner size="sm" ml={4} /> : ( */}
        {/* //   <Switch */}
        {/* //     id="manager-edit-toggle"
        //     isChecked={managerCanEdit}
        //     onChange={handleToggle}
        //     colorScheme="teal"
        //   />
        // )} */}
        <Switch
            id="manager-edit-toggle"
            isChecked={managerCanEdit}
            onChange={handleToggle}
            colorScheme="teal"
          />
      </FormControl>
    </Box>
  );
};

export default SettingsPanel; 