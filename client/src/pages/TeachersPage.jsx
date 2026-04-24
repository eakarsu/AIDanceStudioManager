import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'specialties', label: 'Specialties' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'first_name', label: 'First Name', type: 'text', required: true },
  { key: 'last_name', label: 'Last Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'specialties', label: 'Specialties', type: 'text' },
  { key: 'bio', label: 'Bio', type: 'textarea' },
  { key: 'hourly_rate', label: 'Hourly Rate ($)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
];

export default function TeachersPage() {
  return <DataPage title="Teachers" endpoint="/teachers" columns={columns} formFields={formFields} />;
}
