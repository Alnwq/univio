import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [profiles, setProfiles] = useState({})
  const bottomRef = useRef(null)
  const navigate = useNavigate()
  const ROOM_ID = '6529eba8-f15d-497b-86cd-452f084a5590'

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

      // Load messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
      setMessages(msgs || [])

      // Load all profiles
      const { data: allProfiles } = await supabase.from('profiles').select('*')
      const profileMap = {}
      allProfiles?.forEach(p => profileMap[p.id] = p)
      setProfiles(profileMap)

      // Poll for new messages every 2 seconds
      const pollInterval = setInterval(async () => {
        const { data: newMsgs } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true })
        
        if (newMsgs && newMsgs.length > messages.length) {
          setMessages(newMsgs)
        }
      }, 2000)

      // Update "I'm online" every 10 seconds
      const updatePresence = async () => {
        await supabase.rpc('update_last_seen')
      }

      updatePresence()
      const presenceInterval = setInterval(updatePresence, 10000)

      // Check who's online every 10 seconds
      const checkOnline = async () => {
        const { data: allProfiles } = await supabase.from('profiles').select('*')
        const now = new Date()
        const online = allProfiles?.filter(p => {
          if (!p.last_seen) return false
          const lastSeen = new Date(p.last_seen)
          const diffSeconds = (now - lastSeen) / 1000
          return diffSeconds < 30
        }).map(p => p.id) || []
        setOnlineUsers(online)
      }

      checkOnline()
      const onlineInterval = setInterval(checkOnline, 10000)

      // Cleanup ALL intervals on unmount
      return () => {
        clearInterval(pollInterval)
        clearInterval(presenceInterval)
        clearInterval(onlineInterval)
      }
    }

    init()
  }, [])

  useEffect(() => {
    const isNearBottom = () => {
      const container = bottomRef.current?.parentElement
      if (!container) return true
      return container.scrollHeight - container.scrollTop - container.clientHeight < 100
    }
    
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user?.id) return

    const { error } = await supabase.from('messages').insert({
      room_id: ROOM_ID,
      user_id: user.id,
      content: newMessage.trim()
    })

    if (error) {
      console.error('Insert error:', error)
    }
    
    setNewMessage('')
  }

  const flagMessage = async (id, current) => {
    await supabase.from('messages').update({ is_flagged: !current }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_flagged: !current } : m))
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="flex h-screen" style={{background: 'var(--bg)', color: 'var(--text)'}}>
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col" style={{borderColor: 'var(--border)'}}>
        <div className="p-4 border-b" style={{borderColor: 'var(--border)'}}>
          <h1 className="text-2xl font-bold" style={{color: 'var(--accent)', fontFamily: 'system-ui'}}>
            univ<span style={{color: 'var(--text)'}}>io</span>
          </h1>
          <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>{profile?.email}</p>
        </div>

        <div className="p-4 flex-1">
          <p className="text-xs uppercase tracking-wider mb-3" style={{color: 'var(--text-muted)', fontWeight: 600}}>
            Online Students
          </p>
          {Object.values(profiles).map(p => (
            <div key={p.id} className="flex items-center gap-2 py-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{background: onlineUsers.includes(p.id) ? '#22C55E' : '#D1D5DB'}}
              />
              <span className="text-sm" style={{color: 'var(--text)'}}>{p.full_name || p.email}</span>
              {p.role === 'supervisor' && (
                <span 
                  className="text-xs px-2 py-0.5 rounded" 
                  style={{background: 'var(--accent-light)', color: 'var(--accent)', fontSize: '10px', fontWeight: 700}}
                >
                  ADMIN
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t" style={{borderColor: 'var(--border)'}}>
          {profile?.role === 'supervisor' && (
            <button
              onClick={() => navigate('/supervisor')}
              className="w-full text-sm mb-3 transition py-2 px-3 rounded-lg"
              style={{color: 'var(--accent)', background: 'var(--accent-light)', fontWeight: 600}}
            >
              📊 Admin Dashboard
            </button>
          )}
          <button 
            onClick={signOut} 
            className="text-sm transition hover:opacity-70"
            style={{color: 'var(--text-muted)'}}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white" style={{borderColor: 'var(--border)'}}>
          <h2 className="font-semibold text-lg" style={{color: 'var(--text)'}}># general</h2>
          <p className="text-xs" style={{color: 'var(--text-muted)'}}>{onlineUsers.length} online</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map(msg => {
            const sender = profiles[msg.user_id]
            const isOwn = msg.user_id === user?.id
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    color: 'var(--card)'
                  }}
                >
                  {sender?.full_name?.[0] || sender?.email?.[0] || '?'}
                </div>
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>
                    {sender?.full_name || sender?.email}
                  </span>
                  <div 
                    className={`px-4 py-2 rounded-2xl text-sm ${msg.is_flagged ? 'border-2' : ''}`}
                    style={{
                      background: isOwn ? 'var(--accent)' : 'var(--bg2)',
                      color: isOwn ? 'white' : 'var(--text)',
                      borderColor: msg.is_flagged ? '#EF4444' : 'transparent'
                    }}
                  >
                    {msg.content}
                    {msg.is_flagged && (
                      <span className="ml-2 text-red-500 text-xs">⚑ flagged</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs" style={{color: 'var(--text-muted)'}}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {profile?.role === 'supervisor' && (
                      <button
                        onClick={() => flagMessage(msg.id, msg.is_flagged)}
                        className="text-xs transition hover:opacity-70"
                        style={{color: 'var(--text-muted)'}}
                      >
                        {msg.is_flagged ? 'unflag' : 'flag'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        <form 
          onSubmit={sendMessage} 
          className="p-4 border-t flex gap-3" 
          style={{background: 'var(--card)', borderColor: 'var(--border)'}}
        >
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl px-4 py-3 outline-none border text-sm transition"
            style={{background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)'}}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90"
            style={{background: 'var(--accent)', color: 'var(--card)'}}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
