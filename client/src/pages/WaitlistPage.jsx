import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'position', label: 'Position' },
  { key: 'added_date', label: 'Date Added' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'class_id', label: 'Class ID', type: 'number', required: true },
  { key: 'position', label: 'Position', type: 'number' },
  { key: 'added_date', label: 'Date Added', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Waiting', 'Offered', 'Enrolled', 'Declined', 'Expired'] },
  { key: 'notified', label: 'Notified', type: 'select', options: ['true', 'false'] },
];

export default function WaitlistPage() {
  return <DataPage title="Waitlist" endpoint="/waitlist" columns={columns} formFields={formFields} />;
}
