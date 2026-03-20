import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const GENERAL_ROOM_ID = '6529eba8-f15d-497b-86cd-452f084a5590'
const REACTIONS = ['👍','❤️','😂','😮','😢','🔥']

export default function Chat() {
  const [user,          setUser]          = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [profiles,      setProfiles]      = useState({})
  const [onlineIds,     setOnlineIds]     = useState(new Set())
  const [rooms,         setRooms]         = useState([])
  const [activeRoomId,  setActiveRoomId]  = useState(GENERAL_ROOM_ID)
  const [messages,      setMessages]      = useState([])
  const [newMessage,    setNewMessage]    = useState('')
  const [editingId,     setEditingId]     = useState(null)
  const [editText,      setEditText]      = useState('')
  const [replyTo,       setReplyTo]       = useState(null)
  const [hoveredId,     setHoveredId]     = useState(null)
  const [showReactions, setShowReactions] = useState(null) // msgId or null
  const activeRoomIdRef = useRef(GENERAL_ROOM_ID)
  const isNearBottomRef = useRef(true)
  const deletedIdsRef   = useRef(new Set())
  const bottomRef       = useRef(null)
  const inputRef        = useRef(null)
  const navigate        = useNavigate()

  // Close reaction picker when clicking outside
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('[data-reaction-picker]')) {
        setShowReactions(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  useEffect(() => {
    let msgInterval, presenceInterval, onlineInterval
    let currentUserId = null

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      currentUserId = user.id
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: all } = await supabase.from('profiles').select('*')
      const pm = {}; all?.forEach(p => (pm[p.id] = p)); setProfiles(pm)
      await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
      loadMessages(GENERAL_ROOM_ID)
      loadDMRooms(user.id)
      checkOnline()
      msgInterval      = setInterval(() => loadMessages(activeRoomIdRef.current), 2000)
      presenceInterval = setInterval(async () => {
        if (currentUserId) await supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', currentUserId)
      }, 10000)
      onlineInterval = setInterval(checkOnline, 10000)
    }
    init()
    return () => { clearInterval(msgInterval); clearInterval(presenceInterval); clearInterval(onlineInterval) }
  }, [])

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId
    loadMessages(activeRoomId)
    isNearBottomRef.current = true
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 100)
  }, [activeRoomId])

  useEffect(() => {
    if (isNearBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleScroll = (e) => {
    const el = e.target
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150
  }

  const loadMessages = async (roomId) => {
    const { data } = await supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true })
    if (data) setMessages(data.filter(m => !deletedIdsRef.current.has(m.id)))
  }

  const loadDMRooms = async (userId) => {
    const { data: memberRows } = await supabase.from('room_members').select('room_id').eq('user_id', userId)
    if (!memberRows?.length) return
    const roomIds = memberRows.map(r => r.room_id)
    const { data: roomData } = await supabase.from('rooms').select('*').in('id', roomIds).eq('is_direct', true)
    setRooms(roomData || [])
  }

  const checkOnline = async () => {
    const { data } = await supabase.from('profiles').select('id, last_seen')
    const now = new Date()
    setOnlineIds(new Set(data?.filter(p => p.last_seen && (now - new Date(p.last_seen)) / 1000 < 30).map(p => p.id) || []))
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
    await supabase.from('room_members').insert([{ room_id: newRoom.id, user_id: user.id }, { room_id: newRoom.id, user_id: otherUserId }])
    await loadDMRooms(user.id)
    setActiveRoomId(newRoom.id)
  }

  const deleteDM = async (roomId) => {
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id)
    setRooms(prev => prev.filter(r => r.id !== roomId))
    if (activeRoomId === roomId) setActiveRoomId(GENERAL_ROOM_ID)
  }

  // ── Message actions ────────────────────────────────────────────────────
  const sendMessage = async (e) => {
    e?.preventDefault()
    if (!newMessage.trim() || !user?.id) return
    await supabase.from('messages').insert({
      room_id: activeRoomId,
      user_id: user.id,
      content: newMessage.trim(),
      reply_to_id: replyTo?.id || null,
      reply_preview: replyTo ? replyTo.content.slice(0, 80) : null,
    })
    setNewMessage('')
    setReplyTo(null)
    loadMessages(activeRoomId)
    isNearBottomRef.current = true
  }

  const deleteMessage = async (msgId) => {
    deletedIdsRef.current.add(msgId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setHoveredId(null)
    const { error } = await supabase.from('messages').delete().eq('id', msgId)
    if (error) {
      // Revert if delete failed
      deletedIdsRef.current.delete(msgId)
      loadMessages(activeRoomId)
    }
    // Keep in deletedIds for 10s to be safe against polling
    setTimeout(() => deletedIdsRef.current.delete(msgId), 10000)
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.content)
    setHoveredId(null)
  }

  const saveEdit = async (msgId) => {
    if (!editText.trim()) return
    await supabase.from('messages').update({ content: editText.trim(), edited: true }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: editText.trim(), edited: true } : m))
    setEditingId(null)
  }

  const addReaction = async (msgId, emoji) => {
    const msg = messages.find(m => m.id === msgId)
    const reactions = msg?.reactions || {}
    const current = reactions[emoji] || []
    const updated  = current.includes(user.id)
      ? current.filter(id => id !== user.id)
      : [...current, user.id]
    const newReactions = { ...reactions, [emoji]: updated }
    if (newReactions[emoji].length === 0) delete newReactions[emoji]
    await supabase.from('messages').update({ reactions: newReactions }).eq('id', msgId)
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: newReactions } : m))
    setShowReactions(null)
  }

  const clearChat = async () => {
    if (!window.confirm('Clear all messages in this chat? This cannot be undone.')) return
    await supabase.from('messages').delete().eq('room_id', activeRoomId)
    setMessages([])
  }

  const flagMessage = async (id, current) => {
    await supabase.from('messages').update({ is_flagged: !current }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_flagged: !current } : m))
  }

  // ── Group messages by sender + time ──────────────────────────────────
  const groupedMessages = messages.reduce((groups, msg, i) => {
    const prev = messages[i - 1]
    const sameAuthor = prev?.user_id === msg.user_id
    const closeInTime = prev && (new Date(msg.created_at) - new Date(prev.created_at)) < 5 * 60 * 1000
    const isGrouped = sameAuthor && closeInTime
    groups.push({ ...msg, isGrouped })
    return groups
  }, [])

  const isAdmin   = profile?.role === 'supervisor'
  const isGeneral = activeRoomId === GENERAL_ROOM_ID

  const peopleList = Object.values(profiles)
    .filter(p => p.id !== user?.id)
    .sort((a, b) => (onlineIds.has(b.id) ? 1 : 0) - (onlineIds.has(a.id) ? 1 : 0))

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>

      {/* ── Sidebar ── */}
      <div className="flex flex-col border-r flex-shrink-0" style={{ width: 220, background: 'var(--card)', borderColor: 'var(--border)', minHeight: 0 }}>
        <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Channels</p>
          <button onClick={() => setActiveRoomId(GENERAL_ROOM_ID)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold"
            style={{ background: isGeneral ? 'var(--accent-light)' : 'transparent', color: isGeneral ? 'var(--accent)' : 'var(--text-muted)' }}
            onMouseEnter={e => { if (!isGeneral) e.currentTarget.style.background = 'var(--bg)' }}
            onMouseLeave={e => { if (!isGeneral) e.currentTarget.style.background = 'transparent' }}>
            # general
          </button>
        </div>

        {rooms.length > 0 && (
          <div className="p-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Direct Messages</p>
            {rooms.map(room => (
              <DMRoomButton key={room.id} room={room} userId={user?.id} profiles={profiles}
                onlineIds={onlineIds} isActive={activeRoomId === room.id}
                onClick={() => setActiveRoomId(room.id)} onDelete={() => deleteDM(room.id)} />
            ))}
          </div>
        )}

        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Students · {onlineIds.size} online
          </p>
          {peopleList.map(p => {
            const isOnline = onlineIds.has(p.id)
            return (
              <div key={p.id} onClick={() => openDM(p.id)}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer group"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }} />
                <span className="text-sm truncate flex-1" style={{ color: isOnline ? 'var(--text)' : 'var(--text-muted)', fontWeight: isOnline ? 600 : 400 }}>
                  {p.full_name || p.email}
                </span>
                <span className="text-xs opacity-0 group-hover:opacity-100 flex-shrink-0" style={{ color: 'var(--accent)' }}>DM</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Chat ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Header */}
        <div className="px-6 py-3 border-b flex-shrink-0 flex items-center justify-between"
             style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div>
            {isGeneral ? (
              <>
                <h2 className="font-bold" style={{ color: 'var(--text)' }}># general</h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{onlineIds.size} online · {messages.length} messages</p>
              </>
            ) : (
              <DMHeader roomId={activeRoomId} userId={user?.id} profiles={profiles} onlineIds={onlineIds} />
            )}
          </div>
          {(isAdmin || !isGeneral) && (
            <button onClick={clearChat}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: '#FEE2E2', color: '#EF4444' }}>
              🗑 Clear chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-0.5" onScroll={handleScroll}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-center">
              <span style={{ fontSize: 40 }}>💬</span>
              <p className="font-bold mt-3" style={{ color: 'var(--text-muted)' }}>No messages yet</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{isGeneral ? 'Be the first to say hi!' : 'Start the conversation!'}</p>
            </div>
          )}

          {groupedMessages.map(msg => {
            const sender  = profiles[msg.user_id]
            const isOwn   = msg.user_id === user?.id
            const isEditing = editingId === msg.id
            const isHovered = hoveredId === msg.id
            const reactions = msg.reactions || {}

            return (
              <div key={msg.id}
                className={`flex gap-2 px-2 py-1 rounded-xl ${isOwn ? 'flex-row-reverse' : ''}`}
                style={{ background: isHovered ? 'var(--bg)' : 'transparent' }}
                onMouseEnter={() => setHoveredId(msg.id)}
                onMouseLeave={() => setHoveredId(null)}>

                {/* Avatar — only show for first in group */}
                <div className="w-8 flex-shrink-0 flex items-end">
                  {!msg.isGrouped && (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                         style={{ background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)' }}>
                      {sender?.full_name?.[0] || sender?.email?.[0] || '?'}
                    </div>
                  )}
                </div>

                <div className={`max-w-sm flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1`}>
                  {/* Name + time — only for first in group */}
                  {!msg.isGrouped && (
                    <div className={`flex items-baseline gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                        {isOwn ? 'You' : (sender?.full_name || sender?.email)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Reply preview */}
                  {msg.reply_preview && (
                    <div className="px-3 py-1.5 rounded-lg mb-1 text-xs border-l-2 max-w-xs"
                         style={{ background: 'var(--bg2)', borderColor: 'var(--accent)', color: 'var(--text-muted)' }}>
                      ↩ {msg.reply_preview}
                    </div>
                  )}

                  {/* Message bubble */}
                  {isEditing ? (
                    <div className="flex gap-2 w-full">
                      <input value={editText} onChange={e => setEditText(e.target.value)}
                        className="flex-1 rounded-xl px-3 py-2 text-sm outline-none border"
                        style={{ background: 'var(--bg)', border: '1.5px solid var(--accent)', color: 'var(--text)' }}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(msg.id); if (e.key === 'Escape') setEditingId(null) }}
                        autoFocus />
                      <button onClick={() => saveEdit(msg.id)} className="px-3 py-1 rounded-lg text-xs font-bold text-white" style={{ background: 'var(--accent)' }}>Save</button>
                      <button onClick={() => setEditingId(null)} className="px-3 py-1 rounded-lg text-xs font-bold" style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}>Cancel</button>
                    </div>
                  ) : (
                    <div className={`px-4 py-2 rounded-2xl text-sm ${msg.is_flagged ? 'border-2' : ''} ${msg.isGrouped ? (isOwn ? 'rounded-tr-md' : 'rounded-tl-md') : ''}`}
                         style={{ background: isOwn ? 'var(--accent)' : 'var(--bg2)', color: isOwn ? 'white' : 'var(--text)', borderColor: msg.is_flagged ? '#EF4444' : 'transparent', wordBreak: 'break-word' }}>
                      {msg.content}
                      {msg.edited && <span className="ml-1 text-xs opacity-60">(edited)</span>}
                      {msg.is_flagged && <span className="ml-2 text-xs" style={{ color: isOwn ? '#FFB3B3' : '#EF4444' }}>⚑</span>}
                    </div>
                  )}

                  {/* Reactions */}
                  {Object.keys(reactions).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(reactions).map(([emoji, userIds]) =>
                        userIds.length > 0 ? (
                          <button key={emoji} onClick={() => addReaction(msg.id, emoji)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
                            style={{
                              background: userIds.includes(user?.id) ? 'var(--accent-light)' : 'var(--bg)',
                              borderColor: userIds.includes(user?.id) ? 'var(--accent)' : 'var(--border)',
                              color: 'var(--text)'
                            }}>
                            {emoji} {userIds.length}
                          </button>
                        ) : null
                      )}
                    </div>
                  )}

                  {/* Reaction picker — opens inline below bubble on click, closes on outside click */}
                  {showReactions === msg.id && (
                    <div className="flex gap-1 p-2 rounded-xl mt-1"
                         data-reaction-picker="true"
                         style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
                      {REACTIONS.map(emoji => (
                        <button key={emoji} onClick={() => addReaction(msg.id, emoji)}
                          className="text-xl w-9 h-9 flex items-center justify-center rounded-lg transition"
                          style={{ background: 'transparent' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons — inline beside bubble */}
                {isHovered && !isEditing && (
                  <div className="flex items-center gap-1 flex-shrink-0 self-center">

                    {/* Emoji reaction — click toggles picker */}
                    <button
                      data-reaction-picker="true"
                      onClick={() => setShowReactions(showReactions === msg.id ? null : msg.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition"
                      style={{ background: showReactions === msg.id ? 'var(--accent-light)' : 'var(--bg2)', color: 'var(--text-muted)' }}
                      title="React">
                      😊
                    </button>

                    {/* Reply */}
                    <button onClick={() => { setReplyTo(msg); inputRef.current?.focus() }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition"
                      style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}
                      title="Reply">
                      ↩
                    </button>

                    {/* Edit (own only) */}
                    {isOwn && (
                      <button onClick={() => startEdit(msg)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition"
                        style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}
                        title="Edit">
                        ✏️
                      </button>
                    )}

                    {/* Delete */}
                    {(isOwn || isAdmin) && (
                      <button onClick={() => deleteMessage(msg.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition"
                        style={{ background: '#FEE2E2', color: '#EF4444' }}
                        title="Delete">
                        🗑
                      </button>
                    )}

                    {/* Flag (admin) */}
                    {isAdmin && (
                      <button onClick={() => flagMessage(msg.id, msg.is_flagged)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition"
                        style={{ background: msg.is_flagged ? '#FEE2E2' : 'var(--bg2)', color: msg.is_flagged ? '#EF4444' : 'var(--text-muted)' }}
                        title="Flag">
                        ⚑
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply banner */}
        {replyTo && (
          <div className="px-6 py-2 border-t flex items-center gap-3 flex-shrink-0"
               style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↩ Replying to:</span> {replyTo.content.slice(0, 80)}
            </div>
            <button onClick={() => setReplyTo(null)} className="text-lg" style={{ color: 'var(--text-muted)' }}>×</button>
          </div>
        )}

        {/* Input */}
        <form onSubmit={sendMessage} className="px-4 py-3 border-t flex items-end gap-2 flex-shrink-0"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={e => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder={isGeneral ? 'Message #general… (Enter to send, Shift+Enter for new line)' : 'Send a message…'}
            rows={1}
            className="flex-1 rounded-xl px-4 py-3 outline-none border text-sm resize-none"
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)', lineHeight: 1.4, maxHeight: 120 }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')} />
          <button type="submit" className="px-5 py-3 rounded-xl font-semibold text-sm flex-shrink-0"
                  style={{ background: 'var(--accent)', color: 'white' }}>Send</button>
        </form>
      </div>
    </div>
  )
}

function DMRoomButton({ room, userId, profiles, onlineIds, isActive, onClick, onDelete }) {
  const [partnerName, setPartnerName] = useState('...')
  const [isOnline, setIsOnline] = useState(false)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('room_members').select('user_id').eq('room_id', room.id)
      const other = data?.find(m => m.user_id !== userId)
      if (other) { const p = profiles[other.user_id]; setPartnerName(p?.full_name || p?.email || 'Unknown'); setIsOnline(onlineIds.has(other.user_id)) }
    }
    if (Object.keys(profiles).length > 0) load()
  }, [room.id, profiles, onlineIds, userId])
  return (
    <div className="flex items-center gap-1 mb-1 group">
      <button onClick={onClick} className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-left"
        style={{ background: isActive ? 'var(--accent-light)' : 'transparent', color: isActive ? 'var(--accent)' : 'var(--text-muted)' }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)' }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }} />
        <span className="truncate">{partnerName}</span>
      </button>
      <button onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded flex items-center justify-center text-sm flex-shrink-0"
        style={{ color: '#EF4444' }}>×</button>
    </div>
  )
}

function DMHeader({ roomId, userId, profiles, onlineIds }) {
  const [partnerName, setPartnerName] = useState('')
  const [isOnline, setIsOnline] = useState(false)
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('room_members').select('user_id').eq('room_id', roomId)
      const other = data?.find(m => m.user_id !== userId)
      if (other) { const p = profiles[other.user_id]; setPartnerName(p?.full_name || p?.email || 'Unknown'); setIsOnline(onlineIds.has(other.user_id)) }
    }
    if (roomId && Object.keys(profiles).length > 0) load()
  }, [roomId, profiles, onlineIds, userId])
  return (
    <div>
      <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
        <div className="w-2 h-2 rounded-full" style={{ background: isOnline ? '#22C55E' : '#D1D5DB' }} />
        {partnerName}
      </h2>
      <p className="text-xs" style={{ color: isOnline ? '#22C55E' : 'var(--text-muted)' }}>{isOnline ? 'online' : 'offline'}</p>
    </div>
  )
}
