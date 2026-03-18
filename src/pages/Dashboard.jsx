import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate, useLocation } from 'react-router-dom'
import Feed from './Feed'
import Courses from './Courses'
import StudyMap from './StudyMap'
import People from './People'
import Profile from './Profile'
import Chat from './Chat'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('feed')
  const [messageCount, setMessageCount] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profile)

      // Get real message count
      const { data: messages } = await supabase
        .from('messages')
        .select('id')
      setMessageCount(messages?.length || 0)
    }
    init()

    // Set active tab based on URL
    const path = location.pathname.substring(1)
    if (['feed', 'courses', 'map', 'people', 'groups', 'profile'].includes(path)) {
      setActiveTab(path)
    }
  }, [location])

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const navigateTo = (tab) => {
    setActiveTab(tab)
    navigate(`/${tab}`)
  }

  return (
    <div className="flex h-screen" style={{background: '#FAF8F4'}}>
      {/* Sidebar */}
      <div 
        className="w-64 flex flex-col border-r"
        style={{background: 'white', borderColor: '#E5E5E5'}}
      >
        {/* Logo */}
        <div className="p-6 border-b" style={{borderColor: '#E5E5E5'}}>
          <h1 className="text-2xl font-bold" style={{fontFamily: 'system-ui'}}>
            <span style={{color: '#7C6AF0'}}>univ</span>
            <span style={{color: '#1A1824'}}>io</span>
          </h1>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <p className="text-xs font-bold uppercase tracking-wide mb-3 px-2" style={{color: '#B0AFBF'}}>
            Navigation
          </p>
          <div className="space-y-1">
            <NavLink 
              icon="🏠" 
              label="Feed" 
              active={activeTab === 'feed'}
              onClick={() => navigateTo('feed')}
            />
            <NavLink 
              icon="📚" 
              label="Courses" 
              active={activeTab === 'courses'}
              onClick={() => navigateTo('courses')}
            />
            <NavLink 
              icon="🗺️" 
              label="Study Map" 
              active={activeTab === 'map'}
              onClick={() => navigateTo('map')}
            />
            <NavLink 
              icon="👥" 
              label="People" 
              active={activeTab === 'people'}
              onClick={() => navigateTo('people')}
            />
            <NavLink 
              icon="💬" 
              label="Groups" 
              active={activeTab === 'groups'}
              onClick={() => navigateTo('groups')}
              badge={null}
            />
            <NavLink 
              icon="👤" 
              label="My Profile" 
              active={activeTab === 'profile'}
              onClick={() => navigateTo('profile')}
            />
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t" style={{borderColor: '#E5E5E5'}}>
          {profile?.role === 'supervisor' && (
            <button
              onClick={() => navigate('/supervisor')}
              className="w-full text-sm mb-3 transition py-2 px-3 rounded-lg text-left"
              style={{color: '#7C6AF0', background: '#EDE9FF', fontWeight: 600}}
            >
              📊 Admin Dashboard
            </button>
          )}
          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg cursor-pointer hover:bg-gray-50">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
              style={{background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)'}}
            >
              {profile?.full_name?.[0] || profile?.email?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{color: '#1A1824'}}>
                {profile?.full_name || 'User'}
              </p>
              <p className="text-xs truncate" style={{color: '#7A788F'}}>
                🌱 Open to meet
              </p>
            </div>
          </div>
          <button 
            onClick={signOut}
            className="text-sm w-full text-left transition hover:opacity-70"
            style={{color: '#7A788F'}}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div 
          className="h-16 px-8 flex items-center justify-between border-b"
          style={{background: 'white', borderColor: '#E5E5E5'}}
        >
          <h2 className="text-xl font-bold" style={{color: '#1A1824'}}>
            {activeTab === 'feed' && 'Feed'}
            {activeTab === 'courses' && 'My Courses'}
            {activeTab === 'map' && 'Study Spots Map'}
            {activeTab === 'people' && 'Find People'}
            {activeTab === 'groups' && 'My Groups'}
            {activeTab === 'profile' && 'My Profile'}
          </h2>
          
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-lg border"
              style={{background: '#FAF8F4', borderColor: '#E5E5E5'}}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A788F" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input 
                placeholder="Search students, courses..."
                className="text-sm outline-none bg-transparent"
                style={{color: '#1A1824', width: '200px'}}
              />
            </div>
            
            <button 
              className="w-10 h-10 rounded-lg flex items-center justify-center relative"
              style={{background: '#FAF8F4'}}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A788F" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Page Content */}
        {activeTab === 'feed' && <Feed />}
        {activeTab === 'courses' && <Courses />}
        {activeTab === 'map' && <StudyMap />}
        {activeTab === 'people' && <People />}
        {activeTab === 'groups' && <Chat />}
        {activeTab === 'profile' && <Profile />}
      </div>
    </div>
  )
}

function NavLink({ icon, label, active, onClick, badge }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition"
      style={{
        background: active ? '#EDE9FF' : 'transparent',
        color: active ? '#7C6AF0' : '#7A788F'
      }}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-semibold flex-1">{label}</span>
      {badge && (
        <span 
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{background: '#7C6AF0', color: 'white'}}
        >
          {badge}
        </span>
      )}
    </div>
  )
}
