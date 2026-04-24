import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Date' },
  { key: 'competition_name', label: 'Competition' },
];

const formFields = [
  { key: 'student_id', label: 'Student ID', type: 'number', required: true },
  { key: 'title', label: 'Title', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'category', label: 'Category', type: 'select', options: ['Competition Award', 'Exam Pass', 'Performance', 'Attendance', 'Skill Milestone', 'Leadership', 'Other'] },
  { key: 'competition_name', label: 'Competition Name', type: 'text' },
];

export default function AchievementsPage() {
  return <DataPage title="Achievements" endpoint="/achievements" columns={columns} formFields={formFields} />;
}
