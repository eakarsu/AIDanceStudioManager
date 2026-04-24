import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Costume Name' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'vendor', label: 'Vendor' },
  { key: 'cost_per_unit', label: 'Cost/Unit' },
  { key: 'order_status', label: 'Status' },
];

const formFields = [
  { key: 'class_id', label: 'Class ID', type: 'number', required: true },
  { key: 'name', label: 'Costume Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'cost_per_unit', label: 'Cost Per Unit ($)', type: 'number' },
  { key: 'sizes_needed', label: 'Sizes Needed', type: 'text' },
  { key: 'order_status', label: 'Order Status', type: 'select', options: ['Not Ordered', 'Ordered', 'Shipped', 'Delivered', 'Returned'] },
  { key: 'order_date', label: 'Order Date', type: 'date' },
  { key: 'delivery_date', label: 'Delivery Date', type: 'date' },
];

export default function CostumesPage() {
  return <DataPage title="Costumes" endpoint="/costumes" columns={columns} formFields={formFields} />;
}
