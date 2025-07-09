import React, { useState } from 'react';
import { Box, Heading, Button, FormControl, FormLabel, Input, VStack, Spinner, Text, useToast, Checkbox } from '@chakra-ui/react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportsPanel = () => {
  const { isAdmin, isManager } = useAuth();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);
  const [fetched, setFetched] = useState(false);
  const [showPrice, setShowPrice] = useState(true);
  const toast = useToast();

  // Only allow admin or manager (if allowed by DashboardPage) to view
  if (!isAdmin && !isManager) return null;

  const fetchSales = async () => {
    setLoading(true);
    setFetched(false);
    setSales([]);
    try {
      if (!startDate || !endDate) {
        toast({ title: 'Error', description: 'Please select both start and end dates.', status: 'error', duration: 3000, isClosable: true });
        setLoading(false);
        return;
      }
      const q = query(
        collection(db, 'sales'),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      const salesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSales(salesList);
      setFetched(true);
      setLoading(false);
      return salesList;
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch sales.', status: 'error', duration: 4000, isClosable: true });
      setLoading(false);
      return [];
    }
  };

  const handleExport = async () => {
    const salesList = await fetchSales();
    if (!salesList || salesList.length === 0) {
      toast({ title: 'No Data', description: 'No invoices found in the selected date range.', status: 'info', duration: 3000, isClosable: true });
      return;
    }
    // Group sales by customer name and sort
    const grouped = {};
    salesList.forEach(sale => {
      if (!grouped[sale.customerName]) grouped[sale.customerName] = [];
      grouped[sale.customerName].push(sale);
    });
    const sortedCustomers = Object.keys(grouped).sort();

    // Generate PDF
    const doc = new jsPDF();
    let y = 16;
    doc.text('Invoices Report', 14, y);
    y += 8;
    doc.text(` From: ${startDate} To: ${endDate}`, 12, y);
    y += 10;
    sortedCustomers.forEach(customer => {
      doc.setFont('helvetica', 'normal');
      doc.text(' Customer Name: ' + customer, 12, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      // Gather all items for this customer
      const tableBody = [];
      grouped[customer].forEach(sale => {
        if (Array.isArray(sale.items)) {
          sale.items.forEach(item => {
            const row = [
              sale.date,
              item.productName,
              item.quantity,
              showPrice ? `Rs ${item.price?.toFixed(2)}` : ''
            ];
            tableBody.push(row);
          });
        }
      });
      // Add table for this customer
      const headers = ['Date', 'Product Name', 'Quantity', 'Price'];
      autoTable(doc, {
        head: [headers],
        body: tableBody,
        startY: y + 2,
        margin: { left: 14, right: 14 },
        styles: { font: 'helvetica', fontSize: 10 },
        headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });
      y = doc.lastAutoTable.finalY + 10;
      if (y > 260) { doc.addPage(); y = 16; }
    });
    doc.save(`invoices_${startDate}_to_${endDate}.pdf`);
  };

  return (
    <Box minW="calc(100vw - 220px)" minH="100vh" p={2} textAlign="center" bg="white">
      <Heading mb={6}>Reports</Heading>
      <VStack spacing={6} align="center" mt={8}>
        <FormControl maxW="400px">
          <FormLabel>Start Date</FormLabel>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </FormControl>
        <FormControl maxW="400px">
          <FormLabel>End Date</FormLabel>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </FormControl>
        <FormControl maxW="400px">
          <Checkbox 
            isChecked={showPrice} 
            onChange={(e) => setShowPrice(e.target.checked)}
            colorScheme="teal"
          >
            Show Price Column
          </Checkbox>
        </FormControl>
        <Button colorScheme="teal" onClick={handleExport} isLoading={loading} loadingText="Exporting...">
          Export Invoices to PDF
        </Button>
        {loading && <Spinner mt={4} />}
        {fetched && sales.length === 0 && <Text color="gray.500">No invoices found in the selected date range.</Text>}
      </VStack>
    </Box>
  );
};

export default ReportsPanel; 