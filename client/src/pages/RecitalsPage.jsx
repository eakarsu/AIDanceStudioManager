import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Recital Name' },
  { key: 'date', label: 'Date' },
  { key: 'venue', label: 'Venue' },
  { key: 'theme', label: 'Theme' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'name', label: 'Recital Name', type: 'text', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'venue', label: 'Venue', type: 'text', required: true },
  { key: 'theme', label: 'Theme', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'ticket_price', label: 'Ticket Price ($)', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Planning', 'Rehearsing', 'Ready', 'Completed', 'Cancelled'] },
  { key: 'rehearsal_dates', label: 'Rehearsal Dates', type: 'text' },
];

export default function RecitalsPage() {
  return <DataPage title="Recitals" endpoint="/recitals" columns={columns} formFields={formFields} />;
}
