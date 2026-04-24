import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'family_id', label: 'Family ID' },
  { key: 'student_id', label: 'Student ID' },
  { key: 'amount', label: 'Amount' },
  { key: 'type', label: 'Type' },
  { key: 'due_date', label: 'Due Date' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'family_id', label: 'Family ID', type: 'number', required: true },
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'amount', label: 'Amount ($)', type: 'number', required: true },
  { key: 'type', label: 'Type', type: 'text', required: true },
  { key: 'due_date', label: 'Due Date', type: 'date', required: true },
  { key: 'paid_date', label: 'Paid Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Pending', 'Paid', 'Overdue', 'Cancelled', 'Refunded'], required: true },
  { key: 'auto_pay', label: 'Auto Pay', type: 'select', options: ['true', 'false'] },
];

export default function BillingPage() {
  return <DataPage title="Billing" endpoint="/billing" columns={columns} formFields={formFields} />;
}
