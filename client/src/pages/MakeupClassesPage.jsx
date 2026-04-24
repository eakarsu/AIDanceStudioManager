import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'original_class_id', label: 'Original Class ID' },
  { key: 'original_date', label: 'Original Date' },
  { key: 'makeup_class_id', label: 'Makeup Class ID' },
  { key: 'makeup_date', label: 'Makeup Date' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'original_class_id', label: 'Original Class ID', type: 'number', required: true },
  { key: 'makeup_class_id', label: 'Makeup Class ID', type: 'number', required: true },
  { key: 'original_date', label: 'Original Date', type: 'date', required: true },
  { key: 'makeup_date', label: 'Makeup Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'No Show', 'Cancelled'] },
  { key: 'reason', label: 'Reason', type: 'textarea' },
];

export default function MakeupClassesPage() {
  return <DataPage title="Makeup Classes" endpoint="/makeup-classes" columns={columns} formFields={formFields} />;
}
