import { redirect } from 'next/navigation'

// Weekly Log has been retired — redirect to Content Calendar
export default function WeeklyLogPage() {
  redirect('/dashboard/calendar')
}
