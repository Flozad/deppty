// Redirige a la página de autenticación
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login');
}
