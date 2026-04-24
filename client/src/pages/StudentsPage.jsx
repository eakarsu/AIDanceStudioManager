import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'level', label: 'Level' },
];

const formFields = [
  { key: 'first_name', label: 'First Name', type: 'text', required: true },
  { key: 'last_name', label: 'Last Name', type: 'text', required: true },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
  { key: 'age_group', label: 'Age Group', type: 'text' },
  { key: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Pre-Professional'] },
  { key: 'family_id', label: 'Family ID', type: 'number' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'emergency_contact', label: 'Emergency Contact', type: 'text' },
  { key: 'medical_notes', label: 'Medical Notes', type: 'textarea' },
];

export default function StudentsPage() {
  return <DataPage title="Students" endpoint="/students" columns={columns} formFields={formFields} />;
}
