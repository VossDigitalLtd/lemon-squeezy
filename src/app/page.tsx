import { redirect } from 'next/navigation';

// The homepage redirects to the recipes page.
// The (frontend) route group handles layout + public pages.
export default function Home() {
  redirect('/recipes');
}
