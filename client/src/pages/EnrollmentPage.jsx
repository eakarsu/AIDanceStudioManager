import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'enrollment_date', label: 'Enrolled On' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'class_id', label: 'Class ID', type: 'number', required: true },
  { key: 'enrollment_date', label: 'Enrollment Date', type: 'date', required: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Dropped', 'Completed', 'Pending'], required: true },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

export default function EnrollmentPage() {
  return <DataPage title="Enrollments" endpoint="/enrollment" columns={columns} formFields={formFields} />;
}
