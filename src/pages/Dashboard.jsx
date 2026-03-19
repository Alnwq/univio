import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import Feed from './Feed'
import Courses from './Courses'
import StudyMap from './StudyMap'
import People from './People'
import Profile from './Profile'
import Chat from './Chat'

const NAV = [
  { id: 'feed',    label: 'Feed',        icon: <HomeIcon /> },
  { id: 'courses', label: 'Courses',     icon: <CoursesIcon /> },
  { id: 'map',     label: 'Study Map',   icon: <MapIcon /> },
  { id: 'people',  label: 'People',      icon: <PeopleIcon /> },
  { id: 'groups',  label: 'Messages',    icon: <ChatIcon /> },
  { id: 'profile', label: 'My Profile',  icon: <ProfileIcon /> },
]

const PAGE_TITLES = {
  feed: 'Feed', courses: 'My Courses', map: 'Study Spots',
  people: 'Find People', groups: 'Messages', profile: 'My Profile',
}

export default function Dashboard() {
  const [user,      setUser]      = useState(null)
  const [profile,   setProfile]   = useState(null)
  const [activeTab, setActiveTab] = useState('feed')
  const navigate  = useNavigate()
  const location  = useLocation()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profile)
    }
    init()
    const path = location.pathname.substring(1)
    if (NAV.some(n => n.id === path)) setActiveTab(path)
  }, [location])

  const signOut = async () => { await supabase.auth.signOut(); navigate('/') }

  const navigateTo = (tab) => { setActiveTab(tab); navigate(`/${tab}`) }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() || 'U'

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Dark Sidebar ── */}
      <aside style={{
        width: 240,
        minWidth: 240,
        background: 'var(--sidebar-bg)',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle gradient orb */}
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(123,94,167,0.3) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(123,94,167,0.4)',
            }}>
              <span style={{ color: 'white', fontSize: 16, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>U</span>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'white', letterSpacing: '-0.5px' }}>
              univio
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', color: 'var(--sidebar-muted)', padding: '0 12px', marginBottom: 8, textTransform: 'uppercase' }}>
            Navigate
          </p>
          {NAV.map(({ id, label, icon }) => {
            const isActive = activeTab === id
            return (
              <button key={id} onClick={() => navigateTo(id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  marginBottom: 2, textAlign: 'left',
                  background: isActive ? 'rgba(123,94,167,0.25)' : 'transparent',
                  color: isActive ? 'white' : 'var(--sidebar-text)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 14,
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 20, borderRadius: 99,
                    background: 'linear-gradient(180deg, #9B7FCC, #7B5EA7)',
                  }} />
                )}
                <span style={{ opacity: isActive ? 1 : 0.7, display: 'flex', alignItems: 'center' }}>{icon}</span>
                {label}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {profile?.role === 'supervisor' && (
            <button onClick={() => navigate('/supervisor')}
              style={{
                width: '100%', marginBottom: 8, padding: '8px 12px',
                borderRadius: 8, border: '1px solid rgba(123,94,167,0.4)',
                background: 'rgba(123,94,167,0.15)', color: '#C4A8F0',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
              }}>
              📊 Admin Dashboard
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}
               onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
               onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: 13,
              fontFamily: 'Syne, sans-serif',
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile?.full_name || 'Student'}
              </p>
              <p style={{ color: 'var(--sidebar-muted)', fontSize: 11, margin: 0 }}>Online</p>
            </div>
            <button onClick={signOut}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--sidebar-muted)', fontSize: 11, flexShrink: 0 }}
              title="Sign out">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <header style={{
          height: 60, padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--card)', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', margin: 0 }}>
            {PAGE_TITLES[activeTab]}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 14px', borderRadius: 10,
              background: 'var(--bg)', border: '1.5px solid var(--border)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input placeholder="Search…" style={{
                background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: 'var(--text)', width: 160,
              }} />
            </div>

            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, color: 'white', fontSize: 12,
              fontFamily: 'Syne, sans-serif',
              boxShadow: '0 2px 8px rgba(123,94,167,0.3)',
              cursor: 'pointer',
            }} onClick={() => navigateTo('profile')}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'feed'    && <Feed />}
          {activeTab === 'courses' && <Courses />}
          {activeTab === 'map'     && <StudyMap />}
          {activeTab === 'people'  && <People />}
          {activeTab === 'groups'  && <Chat />}
          {activeTab === 'profile' && <Profile />}
        </main>
      </div>
    </div>
  )
}

// ── SVG Icons ──────────────────────────────────────────────────────────────────
function HomeIcon()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> }
function CoursesIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> }
function MapIcon()     { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg> }
function PeopleIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> }
function ChatIcon()    { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> }
function ProfileIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }
function LogoutIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> }
