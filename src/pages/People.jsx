import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

function computeCompatibility(myProfile, otherProfile) {
  const myCourses      = myProfile?.courses    || []
  const myInterests    = myProfile?.interests  || []
  const theirCourses   = otherProfile?.courses   || []
  const theirInterests = otherProfile?.interests || []
  const sharedCourses   = myCourses.filter(c => theirCourses.includes(c))
  const sharedInterests = myInterests.filter(i => theirInterests.includes(i))
  const coursesUnion    = [...new Set([...myCourses, ...theirCourses])]
  const interestsUnion  = [...new Set([...myInterests, ...theirInterests])]
  const courseScore     = coursesUnion.length > 0 ? sharedCourses.length / Math.min(coursesUnion.length, 5) : 0
  const interestScore   = interestsUnion.length > 0 ? sharedInterests.length / Math.min(interestsUnion.length, 6) : 0
  const yearScore       = myProfile?.year && otherProfile?.year && myProfile.year === otherProfile.year ? 1 : 0
  const score = Math.round(Math.min((courseScore * 0.50) + (interestScore * 0.30) + (yearScore * 0.20), 1) * 100)
  return { score, sharedCourses, sharedInterests }
}

function getMatchLabel(score) {
  if (score >= 70) return { label: 'Strong match', color: '#10B981', bg: '#D1FAE5' }
  if (score >= 40) return { label: 'Good match',   color: '#3B82F6', bg: '#DBEAFE' }
  if (score >= 15) return { label: 'Some overlap', color: '#F59E0B', bg: '#FEF3C7' }
  return               { label: 'New connection', color: '#94A3B8', bg: '#F1F5F9' }
}

export default function People() {
  const [user,        setUser]        = useState(null)
  const [myProfile,   setMyProfile]   = useState(null)
  const [scored,      setScored]      = useState([])
  const [connections, setConnections] = useState([]) // all connection rows
  const [filter,      setFilter]      = useState('all')
  const [sortBy,      setSortBy]      = useState('match')
  const [search,      setSearch]      = useState('')
  const [pending,     setPending]     = useState(false) // loading state for buttons
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)
      const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMyProfile(me)
      const { data: all } = await supabase.from('profiles').select('*')
      const others = all?.filter(p => p.id !== user.id) || []
      setScored(others.map(p => ({ profile: p, ...computeCompatibility(me, p) })))
      loadConnections(user.id)
    }
    init()
  }, [])

  const loadConnections = async (userId) => {
    const { data } = await supabase.from('connections')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    setConnections(data || [])
  }

  // Get connection status between me and another user
  const getConnectionStatus = (otherId) => {
    const conn = connections.find(c =>
      (c.sender_id === user?.id && c.receiver_id === otherId) ||
      (c.receiver_id === user?.id && c.sender_id === otherId)
    )
    if (!conn) return 'none'
    if (conn.status === 'accepted') return 'connected'
    if (conn.status === 'pending' && conn.sender_id === user?.id) return 'sent'
    if (conn.status === 'pending' && conn.receiver_id === user?.id) return 'received'
    return 'none'
  }

  const getConnectionId = (otherId) => {
    return connections.find(c =>
      (c.sender_id === user?.id && c.receiver_id === otherId) ||
      (c.receiver_id === user?.id && c.sender_id === otherId)
    )?.id
  }

  const sendRequest = async (otherId) => {
    setPending(true)
    await supabase.from('connections').insert({ sender_id: user.id, receiver_id: otherId, status: 'pending' })
    await loadConnections(user.id)
    setPending(false)
  }

  const acceptRequest = async (otherId) => {
    const connId = getConnectionId(otherId)
    await supabase.from('connections').update({ status: 'accepted', updated_at: new Date().toISOString() }).eq('id', connId)
    await loadConnections(user.id)
  }

  const removeConnection = async (otherId) => {
    const connId = getConnectionId(otherId)
    await supabase.from('connections').delete().eq('id', connId)
    await loadConnections(user.id)
  }

  // Filter + sort
  let visible = [...scored]
  if (search.trim()) {
    const q = search.toLowerCase()
    visible = visible.filter(({ profile: p }) =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.major || '').toLowerCase().includes(q) ||
      (p.courses || []).some(c => c.toLowerCase().includes(q))
    )
  }
  if (filter === 'connected')    visible = visible.filter(({ profile: p }) => getConnectionStatus(p.id) === 'connected')
  if (filter === 'shared_course') visible = visible.filter(({ sharedCourses }) => sharedCourses.length > 0)
  if (filter === 'strong')        visible = visible.filter(({ score }) => score >= 40)
  if (sortBy === 'match') visible.sort((a, b) => b.score - a.score)
  if (sortBy === 'name')  visible.sort((a, b) => (a.profile.full_name || '').localeCompare(b.profile.full_name || ''))

  const hasProfile    = (myProfile?.courses?.length || 0) + (myProfile?.interests?.length || 0) > 0
  const pendingCount  = connections.filter(c => c.receiver_id === user?.id && c.status === 'pending').length
  const connectedCount = connections.filter(c => c.status === 'accepted').length

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>Find Students</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {connectedCount} connection{connectedCount !== 1 ? 's' : ''} · {scored.length} students
          </p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A' }}>
            <span style={{ color: '#92400E', fontWeight: 700, fontSize: 14 }}>
              🔔 {pendingCount} pending request{pendingCount > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {!hasProfile && (
        <div className="mb-6 rounded-2xl p-5 flex items-center gap-4" style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A' }}>
          <span style={{ fontSize: 28 }}>💡</span>
          <div className="flex-1">
            <p className="font-bold" style={{ color: '#92400E' }}>Add courses to see match scores</p>
            <p className="text-sm mt-1" style={{ color: '#B45309' }}>Go to My Profile and add your courses to unlock compatibility matching.</p>
          </div>
          <button onClick={() => navigate('/profile')} className="px-4 py-2 rounded-lg font-bold text-sm flex-shrink-0 text-white" style={{ background: '#F59E0B' }}>
            Edit Profile →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Panel */}
        <div className="rounded-2xl p-5 h-fit" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <h3 className="font-bold mb-4" style={{ color: 'var(--text)' }}>🔍 Filter</h3>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, major, course…"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none border mb-4"
            style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Show</p>
          <div className="space-y-1 mb-4">
            <FilterOption label="All students"       active={filter === 'all'}           onClick={() => setFilter('all')} />
            <FilterOption label={`Connected (${connectedCount})`} active={filter === 'connected'} onClick={() => setFilter('connected')} />
            <FilterOption label="Shared courses"     active={filter === 'shared_course'} onClick={() => setFilter('shared_course')} />
            <FilterOption label="Good matches (40+)" active={filter === 'strong'}        onClick={() => setFilter('strong')} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Sort by</p>
          <div className="space-y-1">
            <FilterOption label="Best match first" active={sortBy === 'match'} onClick={() => setSortBy('match')} />
            <FilterOption label="Name A–Z"         active={sortBy === 'name'}  onClick={() => setSortBy('name')} />
          </div>
          {myProfile?.courses?.length > 0 && (
            <div className="pt-4 mt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Your courses</p>
              <div className="flex flex-wrap gap-1">
                {myProfile.courses.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* People Grid */}
        <div className="lg:col-span-3">
          <p className="mb-4" style={{ color: 'var(--text-muted)' }}>
            Showing <strong style={{ color: 'var(--text)' }}>{visible.length} students</strong>
          </p>
          {visible.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
              <p className="text-lg">No students found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(({ profile: p, score, sharedCourses, sharedInterests }) => {
              const match  = getMatchLabel(score)
              const status = getConnectionStatus(p.id)
              return (
                <div key={p.id} className="rounded-2xl p-5 transition"
                     style={{ background: 'var(--card)', border: `1px solid ${status === 'connected' ? 'var(--accent)' : 'var(--border)'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)' }}>
                      {p.full_name?.[0] || p.email?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base truncate" style={{ color: 'var(--text)' }}>{p.full_name || p.email}</h3>
                        {status === 'connected' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: '#D1FAE5', color: '#10B981' }}>✓ Connected</span>
                        )}
                      </div>
                      <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>{p.major || 'Student'}{p.year ? ` · ${p.year}` : ''}</p>
                    </div>
                    {hasProfile && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold" style={{ color: match.color }}>{score}%</div>
                        <div className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: match.bg, color: match.color }}>{match.label}</div>
                      </div>
                    )}
                  </div>

                  {hasProfile && (
                    <div className="mb-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
                      <div className="h-full rounded-full" style={{ background: match.color, width: `${score}%` }} />
                    </div>
                  )}

                  {sharedCourses.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{sharedCourses.length} shared course{sharedCourses.length > 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-1">
                        {sharedCourses.map(c => <span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{c}</span>)}
                      </div>
                    </div>
                  )}

                  {sharedInterests.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {sharedInterests.map(i => <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: '#FFF0E6', color: '#C4682A' }}>{i}</span>)}
                    </div>
                  )}

                  {p.about && <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>{p.about}</p>}

                  {sharedCourses.length === 0 && p.courses?.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {p.courses.slice(0, 3).map(c => <span key={c} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}>{c}</span>)}
                    </div>
                  )}

                  {/* Connection + Message buttons */}
                  <div className="flex gap-2 mt-3">
                    {status === 'none' && (
                      <button onClick={() => sendRequest(p.id)} disabled={pending}
                        className="flex-1 py-2 rounded-lg text-sm font-bold transition"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        + Connect
                      </button>
                    )}
                    {status === 'sent' && (
                      <button onClick={() => removeConnection(p.id)}
                        className="flex-1 py-2 rounded-lg text-sm font-bold transition"
                        style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}>
                        Request Sent ×
                      </button>
                    )}
                    {status === 'received' && (
                      <div className="flex-1 flex gap-2">
                        <button onClick={() => acceptRequest(p.id)}
                          className="flex-1 py-2 rounded-lg text-sm font-bold text-white"
                          style={{ background: '#10B981' }}>
                          ✓ Accept
                        </button>
                        <button onClick={() => removeConnection(p.id)}
                          className="flex-1 py-2 rounded-lg text-sm font-bold"
                          style={{ background: '#FEE2E2', color: '#EF4444' }}>
                          Decline
                        </button>
                      </div>
                    )}
                    {status === 'connected' && (
                      <button onClick={() => removeConnection(p.id)}
                        className="py-2 px-3 rounded-lg text-sm font-bold transition"
                        style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}>
                        Remove
                      </button>
                    )}
                    <button onClick={() => navigate('/groups')}
                      className="flex-1 py-2 rounded-lg text-sm font-bold text-white"
                      style={{ background: 'var(--accent)' }}>
                      Message →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function FilterOption({ label, active, onClick }) {
  return (
    <div onClick={onClick} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
         style={{ background: active ? 'var(--accent-light)' : 'transparent' }}>
      <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
           style={{ borderColor: active ? 'var(--accent)' : '#DDD', background: active ? 'var(--accent)' : 'transparent' }}>
        {active && <span className="text-white text-xs">✓</span>}
      </div>
      <span className="text-sm font-medium" style={{ color: active ? 'var(--accent)' : 'var(--text)' }}>{label}</span>
    </div>
  )
}
