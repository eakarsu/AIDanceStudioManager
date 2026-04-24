import React from 'react';
import DataPage from '../components/DataPage';

const columns = [
  { key: 'name', label: 'Item' },
  { key: 'category', label: 'Category' },
  { key: 'price', label: 'Price' },
  { key: 'stock_quantity', label: 'Stock' },
  { key: 'size', label: 'Size' },
];

const formFields = [
  { key: 'name', label: 'Item Name', type: 'text', required: true },
  { key: 'description', label: 'Description', type: 'textarea' },
  { key: 'category', label: 'Category', type: 'select', options: ['Apparel', 'Shoes', 'Accessories', 'Dance Bags', 'Water Bottles', 'Other'] },
  { key: 'price', label: 'Price ($)', type: 'number', required: true },
  { key: 'stock_quantity', label: 'Stock Quantity', type: 'number', required: true },
  { key: 'size', label: 'Size', type: 'text' },
  { key: 'image_url', label: 'Image URL', type: 'text' },
];

export default function MerchandisePage() {
  return <DataPage title="Merchandise" endpoint="/merchandise" columns={columns} formFields={formFields} />;
}
