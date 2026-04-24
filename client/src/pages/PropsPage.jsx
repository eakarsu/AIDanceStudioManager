import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Prop Name' },
  { key: 'description', label: 'Description' },
  { key: 'condition', label: 'Condition' },
  { key: 'storage_location', label: 'Storage Location' },
  { key: 'quantity', label: 'Qty' },
];

const formFields = [
  { key: 'name', label: 'Prop Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'condition', label: 'Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Needs Repair', 'Replace'] },
  { key: 'storage_location', label: 'Storage Location', type: 'text' },
  { key: 'associated_class', label: 'Associated Class', type: 'text' },
  { key: 'quantity', label: 'Quantity', type: 'number' },
];

export default function PropsPage() {
  return <DataPage title="Props" endpoint="/props" columns={columns} formFields={formFields} />;
}
