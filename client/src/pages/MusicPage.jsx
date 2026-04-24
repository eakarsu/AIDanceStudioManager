import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'license_type', label: 'License Type' },
  { key: 'license_expiry', label: 'License Expiry' },
  { key: 'usage_context', label: 'Usage Context' },
];

const formFields = [
  { key: 'title', label: 'Song Title', type: 'text', required: true },
  { key: 'artist', label: 'Artist', type: 'text', required: true },
  { key: 'license_type', label: 'License Type', type: 'select', options: ['Licensed', 'Pending', 'Expired', 'Not Required', 'Public Domain'] },
  { key: 'license_expiry', label: 'License Expiry', type: 'date' },
  { key: 'usage_context', label: 'Usage Context', type: 'text' },
  { key: 'cost', label: 'Cost ($)', type: 'number' },
  { key: 'file_url', label: 'File URL', type: 'text' },
];

export default function MusicPage() {
  return <DataPage title="Music Licensing" endpoint="/music" columns={columns} formFields={formFields} />;
}
