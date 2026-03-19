import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const GENERAL_ROOM_ID = '6529eba8-f15d-497b-86cd-452f084a5590'

export default function Chat() {
  const [user,         setUser]         = useState(null)
  const [profile,      setProfile]      = useState(null)
  const [profiles,     setProfiles]     = useState({})
  const [onlineIds,    setOnlineIds]    = useState(new Set())
  const [rooms,        setRooms]        = useState([])
  const [activeRoomId, setActiveRoomId] = useState(GENERAL_ROOM_ID)
  const [messages,     setMessages]     = useState([])
  const [newMessage,   setNewMessage]   = useState('')
  const activeRoomIdRef = useRef(GENERAL_ROOM_ID)
  const bottomRef       = useRef(null)
  const navigate        = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: all } = await supabase.from('profiles').select('*')
      const pm = {}; all?.forEach(p => (pm[p.id] = p)); setProfiles(pm)

      // Set presence immediately
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)

      loadMessages(GENERAL_ROOM_ID)
      loadDMRooms(user.id)
      checkOnline()

      const msgInterval      = setInterval(() => loadMessages(activeRoomIdRef.current), 2000)
      const presenceInterval = setInterval(async () => {
        await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
      }, 10000)
      const onlineInterval = setInterval(checkOnline, 10000)

      return () => {
        clearInterval(msgInterval)
        clearInterval(presenceInterval)
        clearInterval(onlineInterval)
      }
    }
    init()
  }, [])

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId
    loadMessages(activeRoomId)
  }, [activeRoomId])

  useEffect(() => {
    const container = bottomRef.current?.parentElement
    if (!container) return
    const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120
    if (nearBottom) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async (roomId) => {
    const { data } = await supabase
      .from('messages').select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
    if (data) setMessages(data)
  }

  const loadDMRooms = async (userId) => {
    const { data: memberRows } = await supabase
      .from('room_members').select('room_id').eq('user_id', userId)
    if (!memberRows?.length) return
    const roomIds = memberRows.map(r => r.room_id)
    const { data: roomData } = await supabase
      .from('rooms').select('*').in('id', roomIds).eq('is_direct', true)
    setRooms(roomData || [])
  }

  const checkOnline = async () => {
    const { data } = await supabase.from('profiles').select('id, last_seen')
    const now = new Date()
    const online = new Set(
      data?.filter(p => p.last_seen && (now - new Date(p.last_seen)) / 1000 < 30).map(p => p.id) || []
    )
    setOnlineIds(online)
  }

  const openDM = async (otherUserId) => {
    if (!user) return
    const { data: myRooms }    = await supabase.from('room_members').select('room_id').eq('user_id', user.id)
    const { data: theirRooms } = await supabase.from('room_members').select('room_id').eq('user_id', otherUserId)
    const myIds    = new Set(myRooms?.map(r => r.room_id) || [])
    const theirIds = new Set(theirRooms?.map(r => r.room_id) || [])
    const shared   = [...myIds].find(id => theirIds.has(id))
    if (shared) { setActiveRoomId(shared); return }

    const { data: newRoom } = await supabase.from('rooms').insert({ is_direct: true }).select().single()
    if (!newRoom) return
    await supabase.from('room_members').insert([
      { room_id: newRoom.id, user_id: user.id },
      { room_id: newRoom.id, user_id: otherUserId },
    ])
    await loadDMRooms(user.id)
    setActiveRoomId(newRoom.id)
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user?.id) return
    await supabase.from('messages').insert({ room_id: activeRoomId, user_id: user.id, content: newMessage.trim() })
    setNewMessage('')
    loadMessages(activeRoomId)
  }

  const flagMessage = async (id, current) => {
    await supabase.from('messages').update({ is_flagged: !current }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_flagged: !current } : m))
  }

  const isGeneral  = activeRoomId === GENERAL_ROOM_ID
  const peopleList = Object.values(profiles)
    .filter(p => p.id !== user?.id)
    .sort((a, b) => (onlineIds.has(b.id) ? 1 : 0) - (onlineIds.has(a.id) ? 1 : 0))

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

      {/* ── Sidebar ── */}
      <div className="flex flex-col border-r flex-shrink-0"
           style={{ width: 220, background: 'white', borderColor: '#E5E5E5', minHeight: 0 }}>

        {/* Channels */}
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: '#E5E5E5' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B0AFBF' }}>Channels</p>
          <button onClick={() => setActiveRoomId(GENERAL_ROOM_ID)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition"
            style={{ background: isGeneral ? '#EDE9FF' : 'transparent', color: isGeneral ? '#7C6AF0' : '#7A788F' }}>
            # general
          </button>
        </div>

        {/* DMs */}
        {rooms.length > 0 && (
          <div className="p-4 border-b flex-shrink-0" style={{ borderColor: '#E5E5E5' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B0AFBF' }}>Direct Messages</p>
            {rooms.map(room => (
              <DMRoomButton key={room.id} room={room} userId={user?.id} profiles={profiles}
                onlineIds={onlineIds} isActive={activeRoomId === room.id}
                onClick={() => setActiveRoomId(room.id)} />
            ))}
          </div>
        )}

        {/* Students list */}
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B0AFBF' }}>
            Students · {onlineIds.size} online
          </p>
          {peopleList.map(p => {
            const isOnline = onlineIds.has(p.id)
            return (
              <div key={p.id} onClick={() => openDM(p.id)}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-gray-50 group">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                     style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }} />
                <span className="text-sm truncate flex-1"
                      style={{ color: isOnline ? '#1A1824' : '#B0AFBF', fontWeight: isOnline ? 600 : 400 }}>
                  {p.full_name || p.email}
                </span>
                <span className="text-xs opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                      style={{ color: '#7C6AF0' }}>DM</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Header */}
        <div className="px-6 py-3 border-b flex-shrink-0"
             style={{ background: 'white', borderColor: '#E5E5E5' }}>
          {isGeneral ? (
            <div>
              <h2 className="font-bold" style={{ color: '#1A1824' }}># general</h2>
              <p className="text-xs" style={{ color: '#7A788F' }}>{onlineIds.size} online</p>
            </div>
          ) : (
            <DMHeader roomId={activeRoomId} userId={user?.id} profiles={profiles} onlineIds={onlineIds} />
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
              <span style={{ fontSize: 40 }}>💬</span>
              <p className="font-bold mt-3" style={{ color: '#7A788F' }}>No messages yet</p>
              <p className="text-sm mt-1" style={{ color: '#B0AFBF' }}>
                {isGeneral ? 'Be the first to say hi!' : 'Start the conversation!'}
              </p>
            </div>
          )}
          {messages.map(msg => {
            const sender = profiles[msg.user_id]
            const isOwn  = msg.user_id === user?.id
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)', color: 'white' }}>
                  {sender?.full_name?.[0] || sender?.email?.[0] || '?'}
                </div>
                <div className={`max-w-sm flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs mb-1" style={{ color: '#B0AFBF' }}>
                    {sender?.full_name || sender?.email}
                  </span>
                  <div className={`px-4 py-2 rounded-2xl text-sm ${msg.is_flagged ? 'border-2' : ''}`}
                       style={{ background: isOwn ? '#7C6AF0' : '#F3F0EA', color: isOwn ? 'white' : '#1A1824', borderColor: msg.is_flagged ? '#EF4444' : 'transparent' }}>
                    {msg.content}
                    {msg.is_flagged && <span className="ml-2 text-xs" style={{ color: isOwn ? '#FFB3B3' : '#EF4444' }}>⚑ flagged</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs" style={{ color: '#B0AFBF' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {profile?.role === 'supervisor' && (
                      <button onClick={() => flagMessage(msg.id, msg.is_flagged)}
                              className="text-xs transition hover:opacity-70"
                              style={{ color: msg.is_flagged ? '#EF4444' : '#B0AFBF' }}>
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
        <form onSubmit={sendMessage} className="px-6 py-4 border-t flex gap-3 flex-shrink-0"
              style={{ background: 'white', borderColor: '#E5E5E5' }}>
          <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
            placeholder={isGeneral ? 'Message #general…' : 'Send a message…'}
            className="flex-1 rounded-xl px-4 py-3 outline-none border text-sm transition"
            style={{ background: '#FAF8F4', border: '1.5px solid #E5E5E5', color: '#1A1824' }}
            onFocus={e => (e.target.style.borderColor = '#7C6AF0')}
            onBlur={e  => (e.target.style.borderColor = '#E5E5E5')} />
          <button type="submit" className="px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 flex-shrink-0"
                  style={{ background: '#7C6AF0', color: 'white' }}>Send</button>
        </form>
      </div>
    </div>
  )
}

function DMRoomButton({ room, userId, profiles, onlineIds, isActive, onClick }) {
  const [partnerName, setPartnerName] = useState('...')
  const [isOnline,    setIsOnline]    = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('room_members').select('user_id').eq('room_id', room.id)
      const other = data?.find(m => m.user_id !== userId)
      if (other) {
        const p = profiles[other.user_id]
        setPartnerName(p?.full_name || p?.email || 'Unknown')
        setIsOnline(onlineIds.has(other.user_id))
      }
    }
    if (Object.keys(profiles).length > 0) load()
  }, [room.id, profiles, onlineIds, userId])

  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition text-left mb-1"
      style={{ background: isActive ? '#EDE9FF' : 'transparent', color: isActive ? '#7C6AF0' : '#7A788F' }}>
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }} />
      <span className="truncate">{partnerName}</span>
    </button>
  )
}

function DMHeader({ roomId, userId, profiles, onlineIds }) {
  const [partnerName, setPartnerName] = useState('')
  const [isOnline,    setIsOnline]    = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('room_members').select('user_id').eq('room_id', roomId)
      const other = data?.find(m => m.user_id !== userId)
      if (other) {
        const p = profiles[other.user_id]
        setPartnerName(p?.full_name || p?.email || 'Unknown')
        setIsOnline(onlineIds.has(other.user_id))
      }
    }
    if (roomId && Object.keys(profiles).length > 0) load()
  }, [roomId, profiles, onlineIds, userId])

  return (
    <div>
      <h2 className="font-bold flex items-center gap-2" style={{ color: '#1A1824' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }} />
        {partnerName}
      </h2>
      <p className="text-xs" style={{ color: isOnline ? '#22C55E' : '#B0AFBF' }}>
        {isOnline ? 'online' : 'offline'}
      </p>
    </div>
  )
}
