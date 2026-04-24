import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'report_type', label: 'Report Type' },
  { key: 'period', label: 'Period' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'expenses', label: 'Expenses' },
  { key: 'net_income', label: 'Net Income' },
];

const formFields = [
  { key: 'report_type', label: 'Report Type', type: 'text', required: true },
  { key: 'period', label: 'Period', type: 'select', options: ['Monthly', 'Quarterly', 'Annual', 'Custom'], required: true },
  { key: 'revenue', label: 'Revenue ($)', type: 'number' },
  { key: 'expenses', label: 'Expenses ($)', type: 'number' },
  { key: 'net_income', label: 'Net Income ($)', type: 'number' },
  { key: 'details', label: 'Details', type: 'textarea' },
];

export default function FinancialReportsPage() {
  return <DataPage title="Financial Reports" endpoint="/financial-reports" columns={columns} formFields={formFields} />;
}
