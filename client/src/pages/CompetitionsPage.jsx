import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Competition' },
  { key: 'date', label: 'Date' },
  { key: 'location', label: 'Location' },
  { key: 'organization', label: 'Organization' },
  { key: 'registration_deadline', label: 'Deadline' },
];

const formFields = [
  { key: 'name', label: 'Competition Name', type: 'text', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'location', label: 'Location', type: 'text', required: true },
  { key: 'organization', label: 'Organization', type: 'text' },
  { key: 'registration_deadline', label: 'Registration Deadline', type: 'date' },
  { key: 'entry_fee', label: 'Entry Fee ($)', type: 'number' },
  { key: 'categories', label: 'Categories', type: 'text' },
  { key: 'results', label: 'Results', type: 'textarea' },
];

export default function CompetitionsPage() {
  return <DataPage title="Competitions" endpoint="/competitions" columns={columns} formFields={formFields} />;
}
