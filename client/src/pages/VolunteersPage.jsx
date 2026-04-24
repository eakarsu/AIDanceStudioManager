import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'shift', label: 'Shift' },
  { key: 'confirmed', label: 'Confirmed' },
];

const formFields = [
  { key: 'recital_id', label: 'Recital ID', type: 'number', required: true },
  { key: 'name', label: 'Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'role', label: 'Role', type: 'select', options: ['Backstage', 'Front of House', 'Concessions', 'Setup/Teardown', 'Costume Helper', 'Photography', 'Other'] },
  { key: 'shift', label: 'Shift', type: 'text' },
  { key: 'confirmed', label: 'Confirmed', type: 'select', options: ['true', 'false'] },
];

export default function VolunteersPage() {
  return <DataPage title="Volunteers" endpoint="/volunteers" columns={columns} formFields={formFields} />;
}
