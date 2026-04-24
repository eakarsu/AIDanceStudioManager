import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Class Name' },
  { key: 'style', label: 'Style' },
  { key: 'level', label: 'Level' },
  { key: 'age_group', label: 'Age Group' },
  { key: 'schedule_day', label: 'Day' },
  { key: 'max_students', label: 'Max Students' },
];

const formFields = [
  { key: 'name', label: 'Class Name', type: 'text', required: true },
  { key: 'style', label: 'Style', type: 'select', options: ['Ballet', 'Jazz', 'Contemporary', 'Hip Hop', 'Tap', 'Lyrical', 'Acro', 'Musical Theater', 'Pointe', 'Modern'], required: true },
  { key: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Pre-Professional', 'Professional'], required: true },
  { key: 'age_group', label: 'Age Group', type: 'select', options: ['3-5', '6-8', '9-11', '12-14', '15-17', '18+', 'Adult'] },
  { key: 'teacher_id', label: 'Teacher ID', type: 'number', required: true },
  { key: 'studio_id', label: 'Studio ID', type: 'number' },
  { key: 'schedule_day', label: 'Schedule Day', type: 'text' },
  { key: 'schedule_time', label: 'Schedule Time', type: 'time' },
  { key: 'max_students', label: 'Max Students', type: 'number', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'monthly_fee', label: 'Monthly Fee ($)', type: 'number' },
];

export default function ClassesPage() {
  return <DataPage title="Classes" endpoint="/classes" columns={columns} formFields={formFields} />;
}
