import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function SupervisorDashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [flaggedMessages, setFlaggedMessages] = useState([])
  const [allMessages, setAllMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [view, setView] = useState('flagged')
  const navigate = useNavigate()

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
      
      if (profile?.role !== 'supervisor') {
        alert('Access denied: Admins only')
        return navigate('/chat')
      }
      
      setProfile(profile)

      // Load all profiles
      const { data: allProfiles } = await supabase.from('profiles').select('*')
      const profileMap = {}
      allProfiles?.forEach(p => profileMap[p.id] = p)
      setProfiles(profileMap)

      loadMessages()
    }

    init()

    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadMessages = async () => {
    const { data: flagged } = await supabase
      .from('messages')
      .select('*')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false })
    setFlaggedMessages(flagged || [])

    const { data: all } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setAllMessages(all || [])
  }

  const unflagMessage = async (id) => {
    await supabase.from('messages').update({ is_flagged: false }).eq('id', id)
    loadMessages()
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const messages = view === 'flagged' ? flaggedMessages : allMessages

  return (
    <div className="min-h-screen p-6" style={{background: '#FAF8F4', color: '#1A1824'}}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{color: '#7C6AF0'}}>Admin Dashboard</h1>
            <p className="mt-1" style={{color: '#7A788F'}}>{profile?.email}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="px-4 py-2 rounded-lg transition hover:opacity-80"
              style={{background: '#F3F0EA', color: '#1A1824', fontWeight: 600}}
            >
              Go to Chat
            </button>
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-lg transition hover:opacity-80"
              style={{background: '#F3F0EA', color: '#1A1824', fontWeight: 600}}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b" style={{borderColor: '#E5E5E5'}}>
          <button
            onClick={() => setView('flagged')}
            className={`px-4 py-2 border-b-2 transition font-semibold`}
            style={{
              borderColor: view === 'flagged' ? '#EF4444' : 'transparent',
              color: view === 'flagged' ? '#1A1824' : '#7A788F'
            }}
          >
            Flagged Messages ({flaggedMessages.length})
          </button>
          <button
            onClick={() => setView('all')}
            className={`px-4 py-2 border-b-2 transition font-semibold`}
            style={{
              borderColor: view === 'all' ? '#7C6AF0' : 'transparent',
              color: view === 'all' ? '#1A1824' : '#7A788F'
            }}
          >
            All Messages (Recent 50)
          </button>
        </div>

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="text-center py-12" style={{color: '#7A788F'}}>
            {view === 'flagged' ? 'No flagged messages' : 'No messages yet'}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(msg => {
              const sender = profiles[msg.user_id]
              return (
                <div
                  key={msg.id}
                  className="rounded-lg p-4"
                  style={{
                    background: 'white',
                    border: msg.is_flagged ? '2px solid #EF4444' : '1px solid #E5E5E5',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
                        style={{background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)', color: 'white'}}
                      >
                        {sender?.full_name?.[0] || sender?.email?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold" style={{color: '#1A1824'}}>
                            {sender?.full_name || sender?.email}
                          </span>
                          <span className="text-xs" style={{color: '#B0AFBF'}}>
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                          {msg.is_flagged && (
                            <span 
                              className="text-xs px-2 py-0.5 rounded"
                              style={{background: '#FEE2E2', color: '#DC2626', fontWeight: 700}}
                            >
                              ⚑ FLAGGED
                            </span>
                          )}
                        </div>
                        <p style={{color: '#1A1824'}}>{msg.content}</p>
                      </div>
                    </div>
                    {msg.is_flagged && (
                      <button
                        onClick={() => unflagMessage(msg.id)}
                        className="px-3 py-1 text-sm rounded transition hover:opacity-80"
                        style={{background: '#F3F0EA', color: '#1A1824', fontWeight: 600}}
                      >
                        Unflag
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
