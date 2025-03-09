'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { 
  HomeIcon, 
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { User as SupabaseUser } from '@supabase/auth-helpers-nextjs';

const sidebarItems = [
  {
    name: 'Propiedades',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Calendario',
    href: '/dashboard/calendar',
    icon: CalendarIcon,
  },
];

interface User extends Omit<SupabaseUser, 'email' | 'user_metadata'> {
  email: string | undefined;
  user_metadata: Record<string, string> | null;
}

interface Agent {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        router.push('/login');
        return;
      }

      setUser(session.user as User);

      // Fetch agent data
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('id, first_name, last_name, profile_image_url')
        .eq('email', session.user.email)
        .single();

      if (!agentError && agentData) {
        setAgent(agentData);
      }
    };

    checkUser();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        } else if (session) {
          setUser(session.user as User);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  // Show loading state while checking auth
  if (!user) {
    return <div>Loading...</div>;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Sidebar */}
      <aside className="w-72 border-r border-gray-800/50 bg-gray-900/50 backdrop-blur-sm p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/agent-logo.svg"
            alt="Logo"
            width={40}
            height={40}
            className="drop-shadow-lg"
          />
          <span className="font-bold text-xl text-white">Deppty</span>
        </div>
        
        <nav className="space-y-2 flex-1">
          {sidebarItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-800/50 pt-6 mt-6">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              {agent?.profile_image_url ? (
                <Image
                  src={agent.profile_image_url}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <UserCircleIcon className="w-10 h-10 text-gray-400" />
              )}
              <div className="flex-1 text-left">
                <div className="font-medium text-white">
                  {agent ? `${agent.first_name} ${agent.last_name}` : user?.email}
                </div>
                <div className="text-sm text-gray-400">Agente</div>
              </div>
            </button>

            {/* Profile Popup */}
            {isProfileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      className="w-full px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Tu teléfono"
                    />
                  </div>
                  <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200">
                    Guardar Cambios
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 mt-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-all duration-200"
            >
              <ArrowLeftOnRectangleIcon className="w-5 h-5" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
} 