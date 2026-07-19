import React from 'react';
import { Layout } from '@/components/layout';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, LogOut, Settings, CreditCard, Bell } from 'lucide-react';

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto w-full px-6 mt-8">
        <h1 className="text-4xl font-bold text-white mb-8">Account & Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="col-span-1 space-y-4">
            <div className="glass-panel p-6 rounded-3xl text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-bold text-white mb-4 shadow-lg">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h3 className="font-bold text-white text-lg truncate w-full">{user?.email}</h3>
              <p className="text-sm text-slate-400 mb-6">Roamio Member</p>
              
              <Button onClick={handleLogout} variant="destructive" className="w-full rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
            </div>

            <nav className="glass-panel p-2 rounded-3xl flex flex-col gap-1">
              <button className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 text-white font-medium">
                <User className="w-5 h-5 text-blue-400" /> Profile
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors font-medium">
                <Settings className="w-5 h-5" /> Preferences
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors font-medium">
                <Bell className="w-5 h-5" /> Notifications
              </button>
              <button className="flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-colors font-medium">
                <CreditCard className="w-5 h-5" /> Subscription
              </button>
            </nav>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="glass-panel p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6">Personal Details</h2>
              <form className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-slate-300">Email Address</Label>
                  <Input disabled value={user?.email || ''} className="bg-white/5 border-white/10 text-slate-400 rounded-xl h-12" />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-slate-300">Display Name</Label>
                  <Input placeholder="How should we call you?" className="bg-white/5 border-white/10 text-white rounded-xl h-12 focus-visible:ring-blue-500" />
                </div>

                <Button className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-8">Save Changes</Button>
              </form>
            </div>

            <div className="glass-panel p-8 rounded-3xl">
              <h2 className="text-2xl font-bold text-white mb-6">Travel DNA</h2>
              <p className="text-slate-400 mb-6 text-sm">Tell our AI about your travel style for more personalized itineraries.</p>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-slate-300">Pacing</Label>
                  <div className="flex gap-2">
                    {['Relaxed', 'Balanced', 'Action-Packed'].map(pace => (
                      <button key={pace} type="button" className="flex-1 py-2 px-3 border border-white/10 rounded-xl text-sm text-slate-300 hover:bg-white/5">
                        {pace}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}