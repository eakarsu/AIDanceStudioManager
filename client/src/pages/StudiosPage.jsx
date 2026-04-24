import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Studio Name' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'floor_type', label: 'Floor Type' },
  { key: 'has_mirrors', label: 'Has Mirrors' },
  { key: 'has_barres', label: 'Has Barres' },
];

const formFields = [
  { key: 'name', label: 'Studio Name', type: 'text', required: true },
  { key: 'capacity', label: 'Capacity', type: 'number', required: true },
  { key: 'floor_type', label: 'Floor Type', type: 'select', options: ['Sprung Wood', 'Marley', 'Vinyl', 'Concrete', 'Hardwood'] },
  { key: 'has_mirrors', label: 'Has Mirrors', type: 'select', options: ['true', 'false'] },
  { key: 'has_barres', label: 'Has Barres', type: 'select', options: ['true', 'false'] },
  { key: 'sound_system', label: 'Sound System', type: 'text' },
  { key: 'size_sqft', label: 'Size (sq ft)', type: 'number' },
];

export default function StudiosPage() {
  return <DataPage title="Studios" endpoint="/studios" columns={columns} formFields={formFields} />;
}
