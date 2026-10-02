import type { Metadata } from 'next';
import ShoppingListClient from './ShoppingListClient';

export const metadata: Metadata = { title: 'Shopping list' };

export default function ShoppingListPage() {
  return <ShoppingListClient />;
}
