import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'recital_id', label: 'Recital ID' },
  { key: 'buyer_name', label: 'Buyer' },
  { key: 'quantity', label: 'Qty' },
  { key: 'total_price', label: 'Total Price' },
  { key: 'seat_section', label: 'Section' },
  { key: 'status', label: 'Status' },
];

const formFields = [
  { key: 'recital_id', label: 'Recital ID', type: 'number', required: true },
  { key: 'buyer_name', label: 'Buyer Name', type: 'text', required: true },
  { key: 'buyer_email', label: 'Buyer Email', type: 'email' },
  { key: 'quantity', label: 'Quantity', type: 'number', required: true },
  { key: 'seat_section', label: 'Seat Section', type: 'text' },
  { key: 'total_price', label: 'Total Price ($)', type: 'number', required: true },
  { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Reserved', 'Purchased', 'Checked In', 'Cancelled', 'Refunded'] },
];

export default function TicketsPage() {
  return <DataPage title="Tickets" endpoint="/tickets" columns={columns} formFields={formFields} />;
}
