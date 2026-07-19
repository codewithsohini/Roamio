import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Compass } from 'lucide-react';
import { StaggeredMenu, type StaggeredMenuItem } from '@/components/StaggeredMenu';

export const Navbar = () => {
  const [location, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const menuItems: StaggeredMenuItem[] = [
    {
      label: 'Home',
      ariaLabel: 'Go to home page',
      link: '/',
      onClick: (e) => { e.preventDefault(); navigate('/'); },
    },
    {
      label: 'Explore',
      ariaLabel: 'Explore destinations',
      link: '/explore',
      onClick: (e) => { e.preventDefault(); navigate('/explore'); },
    },
    {
      label: 'AI Planner',
      ariaLabel: 'Open AI travel planner',
      link: '/planner',
      onClick: (e) => { e.preventDefault(); navigate('/planner'); },
    },
    ...(isAuthenticated
      ? [
          {
            label: 'My Trips',
            ariaLabel: 'View my trips',
            link: '/trips',
            onClick: (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); navigate('/trips'); },
          },
          {
            label: 'Profile',
            ariaLabel: 'My profile',
            link: '/profile',
            onClick: (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); navigate('/profile'); },
          },
        ]
      : [
          {
            label: 'Sign In',
            ariaLabel: 'Sign in to Roamio',
            link: '/login',
            onClick: (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); navigate('/login'); },
          },
        ]),
  ];

  const logoContent = (
    <a
      href="/"
      onClick={(e) => { e.preventDefault(); navigate('/'); }}
      className="flex items-center gap-3 group"
      style={{ textDecoration: 'none' }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(59,130,246,0.15)',
          border: '1px solid rgba(59,130,246,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#60a5fa',
          transition: 'background 0.3s',
          boxShadow: '0 0 12px rgba(59,130,246,0.3)',
        }}
      >
        <Compass size={20} />
      </div>
      <span
        style={{
          fontWeight: 800,
          letterSpacing: '0.18em',
          fontSize: '1.1rem',
          color: '#ffffff',
          fontFamily: 'inherit',
          textTransform: 'uppercase' as const,
        }}
      >
        ROAMIO
      </span>
    </a>
  );

  return (
    <StaggeredMenu
      isFixed
      position="right"
      colors={['#060c1a', '#0a1628']}
      accentColor="#3b82f6"
      menuButtonColor="#ffffff"
      openMenuButtonColor="#ffffff"
      logoContent={logoContent}
      items={menuItems}
      displaySocials={false}
      displayItemNumbering
      changeMenuColorOnOpen={false}
    />
  );
};