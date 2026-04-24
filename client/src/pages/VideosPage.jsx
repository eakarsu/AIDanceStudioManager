import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'title', label: 'Title' },
  { key: 'class_id', label: 'Class ID' },
  { key: 'shared_date', label: 'Shared Date' },
  { key: 'visibility', label: 'Visibility' },
];

const formFields = [
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'class_id', label: 'Class ID', type: 'number' },
  { key: 'url', label: 'Video URL', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'shared_date', label: 'Shared Date', type: 'date' },
  { key: 'visibility', label: 'Visibility', type: 'select', options: ['Public', 'Private', 'Unlisted'] },
];

export default function VideosPage() {
  return <DataPage title="Videos" endpoint="/videos" columns={columns} formFields={formFields} />;
}
