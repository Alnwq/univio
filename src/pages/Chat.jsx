import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const [user,        setUser]        = useState(null)
  const [profile,     setProfile]     = useState(null)
  const [messages,    setMessages]    = useState([])
  const [newMessage,  setNewMessage]  = useState('')
  const [onlineUsers, setOnlineUsers] = useState([])
  const [profiles,    setProfiles]    = useState({})
  const bottomRef  = useRef(null)
  const messagesRef = useRef([])
  const navigate   = useNavigate()
  const ROOM_ID    = '6529eba8-f15d-497b-86cd-452f084a5590'

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)

      const { data: prof } = await supabase
        .from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: msgs } = await supabase
        .from('messages').select('*').order('created_at', { ascending: true })
      setMessages(msgs || [])
      messagesRef.current = msgs || []

      const { data: allProfiles } = await supabase.from('profiles').select('*')
      const profileMap = {}
      allProfiles?.forEach(p => (profileMap[p.id] = p))
      setProfiles(profileMap)

      // Poll messages
      const pollInterval = setInterval(async () => {
        const { data: newMsgs } = await supabase
          .from('messages').select('*').order('created_at', { ascending: true })
        if (newMsgs && newMsgs.length !== messagesRef.current.length) {
          setMessages(newMsgs)
          messagesRef.current = newMsgs
        }
      }, 2000)

      // Presence
      const updatePresence = () => supabase.rpc('update_last_seen')
      updatePresence()
      const presenceInterval = setInterval(updatePresence, 10000)

      // Online check
      const checkOnline = async () => {
        const { data: ap } = await supabase.from('profiles').select('*')
        const now = new Date()
        const online = ap?.filter(p => {
          if (!p.last_seen) return false
          return (now - new Date(p.last_seen)) / 1000 < 30
        }).map(p => p.id) || []
        setOnlineUsers(online)
      }
      checkOnline()
      const onlineInterval = setInterval(checkOnline, 10000)

      return () => {
        clearInterval(pollInterval)
        clearInterval(presenceInterval)
        clearInterval(onlineInterval)
      }
    }
    init()
  }, [])

  // Auto-scroll
  useEffect(() => {
    const container = bottomRef.current?.parentElement
    if (!container) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user?.id) return
    await supabase.from('messages').insert({
      room_id: ROOM_ID,
      user_id: user.id,
      content: newMessage.trim(),
    })
    setNewMessage('')
  }

  const flagMessage = async (id, current) => {
    await supabase.from('messages').update({ is_flagged: !current }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_flagged: !current } : m))
  }

  const onlineCount = onlineUsers.length

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

      {/* ── Online Users Panel ── */}
      <div
        className="flex flex-col border-r"
        style={{
          width: '220px',
          minWidth: '220px',
          background: 'white',
          borderColor: '#E5E5E5',
        }}
      >
        <div className="p-4 border-b" style={{ borderColor: '#E5E5E5' }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B0AFBF' }}>
            Online Now
          </p>
          <p className="text-xs mt-1" style={{ color: '#7A788F' }}>
            {onlineCount} active
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {Object.values(profiles).map(p => {
            const isOnline = onlineUsers.includes(p.id)
            return (
              <div
                key={p.id}
                className="flex items-center gap-2 px-2 py-2 rounded-lg"
                style={{ background: isOnline ? '#F8F7FF' : 'transparent' }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }}
                />
                <span
                  className="text-sm truncate flex-1"
                  style={{ color: isOnline ? '#1A1824' : '#B0AFBF', fontWeight: isOnline ? 600 : 400 }}
                >
                  {p.full_name || p.email}
                </span>
                {p.role === 'supervisor' && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: '#EDE9FF', color: '#7C6AF0', fontSize: '9px', fontWeight: 700 }}
                  >
                    MOD
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Channel header */}
        <div
          className="px-6 py-3 border-b flex items-center gap-3 flex-shrink-0"
          style={{ background: 'white', borderColor: '#E5E5E5' }}
        >
          <div>
            <h2 className="font-bold text-base" style={{ color: '#1A1824' }}># general</h2>
            <p className="text-xs" style={{ color: '#7A788F' }}>
              {onlineCount} online · {messages.length} messages
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 text-center py-16">
              <span style={{ fontSize: 40 }}>💬</span>
              <p className="font-bold mt-3" style={{ color: '#7A788F' }}>No messages yet</p>
              <p className="text-sm mt-1" style={{ color: '#B0AFBF' }}>Be the first to say hi!</p>
            </div>
          )}

          {messages.map(msg => {
            const sender = profiles[msg.user_id]
            const isOwn  = msg.user_id === user?.id

            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)', color: 'white' }}
                >
                  {sender?.full_name?.[0] || sender?.email?.[0] || '?'}
                </div>

                {/* Bubble */}
                <div className={`max-w-sm flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs mb-1" style={{ color: '#B0AFBF' }}>
                    {sender?.full_name || sender?.email}
                  </span>
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm ${msg.is_flagged ? 'border-2' : ''}`}
                    style={{
                      background:   isOwn ? '#7C6AF0' : '#F3F0EA',
                      color:        isOwn ? 'white'   : '#1A1824',
                      borderColor:  msg.is_flagged ? '#EF4444' : 'transparent',
                    }}
                  >
                    {msg.content}
                    {msg.is_flagged && (
                      <span className="ml-2 text-xs" style={{ color: isOwn ? '#FFB3B3' : '#EF4444' }}>
                        ⚑ flagged
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs" style={{ color: '#B0AFBF' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {profile?.role === 'supervisor' && (
                      <button
                        onClick={() => flagMessage(msg.id, msg.is_flagged)}
                        className="text-xs transition hover:opacity-70"
                        style={{ color: msg.is_flagged ? '#EF4444' : '#B0AFBF' }}
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

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="px-6 py-4 border-t flex gap-3 flex-shrink-0"
          style={{ background: 'white', borderColor: '#E5E5E5' }}
        >
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-xl px-4 py-3 outline-none border text-sm transition"
            style={{ background: '#FAF8F4', border: '1.5px solid #E5E5E5', color: '#1A1824' }}
            onFocus={e  => (e.target.style.borderColor = '#7C6AF0')}
            onBlur={e   => (e.target.style.borderColor = '#E5E5E5')}
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-xl font-semibold text-sm transition hover:opacity-90 flex-shrink-0"
            style={{ background: '#7C6AF0', color: 'white' }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
