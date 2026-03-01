import { redirect } from 'next/navigation';

// This page is a server component that redirects to the first tool.
// This avoids a persistent and unstable rendering error with the welcome page.
export default function DashboardPage() {
  redirect('/dashboard/digitize');
}
