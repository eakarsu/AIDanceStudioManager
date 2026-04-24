import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_name', label: 'Student' },
  { key: 'parent_name', label: 'Parent' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'trial_date', label: 'Trial Date' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'student_name', label: 'Student Name', type: 'text', required: true },
  { key: 'parent_name', label: 'Parent Name', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'class_id', label: 'Class ID', type: 'number', required: true },
  { key: 'trial_date', label: 'Trial Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'No Show', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function TrialClassesPage() {
  return <DataPage title="Trial Classes" endpoint="/trial-classes" columns={columns} formFields={formFields} />;
}
