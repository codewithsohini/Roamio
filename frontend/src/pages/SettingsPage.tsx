import { Plane, User, Mail, LogOut, Shield, Bell, Palette } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./DashboardPage";

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const initial = user?.email?.charAt(0).toUpperCase() || "U";
  const name = user?.email?.split("@")[0] || "User";

  return (
    <div className="flex min-h-screen bg-[#F8FAFF] font-sans">
      <Sidebar />

      <main className="flex-1 md:ml-[240px] p-6 md:p-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-bold text-secondary-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

          {/* Profile card */}
          <section className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-secondary-foreground text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Account
            </h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center font-bold text-2xl">
                {initial}
              </div>
              <div>
                <p className="font-bold text-secondary-foreground text-lg capitalize">{name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-accent/10 text-accent text-[11px] font-bold rounded-full uppercase tracking-wide">Premium</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Display Name</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl border border-border text-sm text-secondary-foreground">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="capitalize">{name}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Email Address</label>
                <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl border border-border text-sm text-secondary-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences — visual only, no backend yet */}
          <section className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-secondary-foreground text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" /> Preferences
            </h2>
            <div className="space-y-3">
              {[
                { label: "Email notifications", desc: "Trip updates and travel tips" },
                { label: "AI personalisation", desc: "Use your profile to tailor recommendations" },
                { label: "Marketing emails", desc: "Deals, destination guides, and offers" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-secondary-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Security */}
          <section className="bg-white rounded-2xl border border-border shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-secondary-foreground text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Security
            </h2>
            <button className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-secondary-foreground transition-colors">
              Change Password
            </button>
          </section>

          {/* Danger zone */}
          <section className="bg-white rounded-2xl border border-destructive/20 shadow-sm p-6">
            <h2 className="font-semibold text-destructive text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Session
            </h2>
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive text-destructive hover:text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <LogOut className="h-4 w-4" /> Log out of Roamio
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
