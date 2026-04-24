import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'date', label: 'Date' },
  { key: 'status', label: 'Status' },
  { key: 'notes', label: 'Notes' },
];

const formFields = [
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'class_id', label: 'Class ID', type: 'number', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Present', 'Absent', 'Late', 'Excused'], required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function AttendancePage() {
  return <DataPage title="Attendance" endpoint="/attendance" columns={columns} formFields={formFields} />;
}
