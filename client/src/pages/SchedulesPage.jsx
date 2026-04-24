import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'class_id', label: 'Class ID' },
  { key: 'teacher_id', label: 'Teacher ID' },
  { key: 'day_of_week', label: 'Day' },
  { key: 'start_time', label: 'Start Time' },
  { key: 'end_time', label: 'End Time' },
  { key: 'studio_id', label: 'Studio ID' },
];

const formFields = [
  { key: 'class_id', label: 'Class ID', type: 'number', required: true },
  { key: 'teacher_id', label: 'Teacher ID', type: 'number', required: true },
  { key: 'studio_id', label: 'Studio ID', type: 'number', required: true },
  { key: 'day_of_week', label: 'Day of Week', type: 'select', options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  { key: 'start_time', label: 'Start Time', type: 'time', required: true },
  { key: 'end_time', label: 'End Time', type: 'time', required: true },
  { key: 'recurring', label: 'Recurring', type: 'select', options: ['Weekly', 'Bi-Weekly', 'Monthly', 'One-Time'] },
];

export default function SchedulesPage() {
  return <DataPage title="Schedules" endpoint="/schedules" columns={columns} formFields={formFields} />;
}
