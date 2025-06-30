import React from 'react';
import {
  HStack,
  Button,
  Text,
  Select,
  Box,
  useBreakpointValue
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';

const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  isLoading = false
}) => {
  const isMobile = useBreakpointValue({ base: true, md: false });

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && !isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newItemsPerPage = parseInt(e.target.value);
    onItemsPerPageChange(newItemsPerPage);
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <Box 
      display="flex" 
      justifyContent="space-between" 
      alignItems="center" 
      p={2} 
      borderTop="1px" 
      borderColor="gray.200"
      bg="gray.50"
      flexDirection={isMobile ? "column" : "row"}
      gap={isMobile ? 3 : 0}
    >
      {/* Items per page selector */}
      <HStack spacing={2}>
        <Text fontSize="sm" color="gray.600">Show:</Text>
        <Select
          size="sm"
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          width="70px"
          isDisabled={isLoading}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </Select>
        <Text fontSize="sm" color="gray.600">items per page</Text>
      </HStack>

      {/* Page info */}
      <Text fontSize="sm" color="gray.600">
        Showing {startItem} to {endItem} of {totalItems} items
      </Text>

      {/* Pagination controls */}
      <HStack spacing={2}>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePrevious}
          isDisabled={currentPage === 1 || isLoading}
          leftIcon={<ChevronLeftIcon />}
        >
          Previous
        </Button>
        
        <Text fontSize="sm" color="gray.600" px={2}>
          Page {currentPage} of {totalPages}
        </Text>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleNext}
          isDisabled={currentPage === totalPages || isLoading}
          rightIcon={<ChevronRightIcon />}
        >
          Next
        </Button>
      </HStack>
    </Box>
  );
};

export default Pagination; 