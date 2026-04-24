import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'family_name', label: 'Family Name' },
  { key: 'parent_name', label: 'Parent Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'auto_pay_enabled', label: 'Auto Pay' },
];

const formFields = [
  { key: 'family_name', label: 'Family Name', type: 'text', required: true },
  { key: 'parent_name', label: 'Parent Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'address', label: 'Address', type: 'textarea' },
  { key: 'payment_method', label: 'Payment Method', type: 'select', options: ['Credit Card', 'Cash', 'Check', 'Bank Transfer', 'Online'] },
  { key: 'auto_pay_enabled', label: 'Auto Pay Enabled', type: 'select', options: ['true', 'false'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function FamiliesPage() {
  return <DataPage title="Families" endpoint="/families" columns={columns} formFields={formFields} />;
}
