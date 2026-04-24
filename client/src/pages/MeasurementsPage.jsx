import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'height', label: 'Height' },
  { key: 'weight', label: 'Weight' },
  { key: 'shoe_size', label: 'Shoe Size' },
  { key: 'measured_date', label: 'Date Measured' },
];

const formFields = [
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'height', label: 'Height (inches)', type: 'number' },
  { key: 'weight', label: 'Weight (lbs)', type: 'number' },
  { key: 'shoe_size', label: 'Shoe Size', type: 'text' },
  { key: 'chest', label: 'Chest (inches)', type: 'number' },
  { key: 'waist', label: 'Waist (inches)', type: 'number' },
  { key: 'hips', label: 'Hips (inches)', type: 'number' },
  { key: 'inseam', label: 'Inseam (inches)', type: 'number' },
  { key: 'measured_date', label: 'Date Measured', type: 'date', required: true },
];

export default function MeasurementsPage() {
  return <DataPage title="Measurements" endpoint="/measurements" columns={columns} formFields={formFields} />;
}
