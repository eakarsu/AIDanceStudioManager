import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'photographer', label: 'Photographer' },
  { key: 'location', label: 'Location' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'photographer', label: 'Photographer', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'class_id', label: 'Class ID', type: 'number' },
  { key: 'package_info', label: 'Package Info', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Completed', 'Editing', 'Delivered', 'Cancelled'] },
];

export default function PhotosPage() {
  return <DataPage title="Photos" endpoint="/photos" columns={columns} formFields={formFields} />;
}
