import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Program Name' },
  { key: 'start_date', label: 'Start Date' },
  { key: 'end_date', label: 'End Date' },
  { key: 'level', label: 'Level' },
  { key: 'max_students', label: 'Max Students' },
  { key: 'fee', label: 'Fee' },
];

const formFields = [
  { key: 'name', label: 'Program Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'start_date', label: 'Start Date', type: 'date', required: true },
  { key: 'end_date', label: 'End Date', type: 'date', required: true },
  { key: 'instructor', label: 'Instructor', type: 'text' },
  { key: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'All Levels'] },
  { key: 'max_students', label: 'Max Students', type: 'number' },
  { key: 'fee', label: 'Fee ($)', type: 'number' },
  { key: 'registered_count', label: 'Registered Count', type: 'number' },
];

export default function SummerIntensivesPage() {
  return <DataPage title="Summer Intensives" endpoint="/summer-intensives" columns={columns} formFields={formFields} />;
}
