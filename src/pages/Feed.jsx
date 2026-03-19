import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Feed() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profiles, setProfiles] = useState({})
  const [events, setEvents] = useState([])
  const [activities, setActivities] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
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
      setProfile(profile)

      // Load all profiles
      const { data: allProfiles } = await supabase.from('profiles').select('*')
      const profileMap = {}
      allProfiles?.forEach(p => profileMap[p.id] = p)
      setProfiles(profileMap)

      // Get online users (last seen < 30 seconds)
      const now = new Date()
      const online = allProfiles?.filter(p => {
        if (!p.last_seen) return false
        const lastSeen = new Date(p.last_seen)
        const diffSeconds = (now - lastSeen) / 1000
        return diffSeconds < 30 && p.id !== user.id
      }) || []
      setOnlineUsers(online)

      loadData()
    }
    init()

    // Poll for updates
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      .limit(5)
    setEvents(eventsData || [])

    // Load recent activities
    const { data: activitiesData } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    setActivities(activitiesData || [])
  }

  const createEvent = async (eventData) => {
    const { data: newEvent } = await supabase.from('events').insert({
      ...eventData,
      created_by: user.id
    }).select().single()

    // Create activity
    await supabase.from('activities').insert({
      user_id: user.id,
      activity_type: 'created_event',
      content: `created event "${eventData.title}"`,
      metadata: { event_id: newEvent.id }
    })

    loadData()
    setShowEventForm(false)
  }

  const updateStatus = async (status, location = null) => {
    await supabase
      .from('profiles')
      .update({ 
        study_status: status,
        current_location: location 
      })
      .eq('id', user.id)

    // Create activity if studying
    if (status === 'studying' && location) {
      await supabase.from('activities').insert({
        user_id: user.id,
        activity_type: 'status_update',
        content: `is studying at ${location}`
      })
    }

    const { data: updated } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(updated)
    setShowStatusMenu(false)
    loadData()
  }

  const otherUsers = Object.values(profiles).filter(p => p.id !== user?.id).slice(0, 3)

  const statusIcons = {
    available: '🟢',
    studying: '📚',
    busy: '🔴',
    offline: '⚫'
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Greeting with Status */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text)'}}>
            Hey {profile?.full_name || 'there'} 👋
          </h1>
          <p style={{color: 'var(--text-muted)'}}>Welcome to your Univio feed</p>
        </div>
        
        {/* Study Status Selector */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition"
            style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
          >
            <span>{statusIcons[profile?.study_status || 'available']}</span>
            <span className="font-semibold">
              {profile?.study_status === 'available' && 'Available'}
              {profile?.study_status === 'studying' && 'Studying'}
              {profile?.study_status === 'busy' && 'Busy'}
              {!profile?.study_status && 'Set Status'}
            </span>
          </button>

          {showStatusMenu && (
            <div 
              className="absolute right-0 mt-2 rounded-lg p-2 shadow-lg z-10"
              style={{background: 'var(--card)', border: '1px solid var(--border)', minWidth: '200px'}}
            >
              <button
                onClick={() => updateStatus('available')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <span>🟢</span>
                <span>Available for study</span>
              </button>
              <button
                onClick={() => {
                  const location = prompt('Where are you studying?', 'Library')
                  if (location) updateStatus('studying', location)
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <span>📚</span>
                <span>Studying...</span>
              </button>
              <button
                onClick={() => updateStatus('busy')}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <span>🔴</span>
                <span>Busy - Do not disturb</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Feed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Live Activity Feed */}
          <div 
            className="rounded-2xl p-6"
            style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live Activity
            </h3>
            
            {activities.length === 0 ? (
              <p className="text-center py-4" style={{color: 'var(--text-muted)'}}>No recent activity</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map(activity => {
                  const actor = profiles[activity.user_id]
                  const timeAgo = getTimeAgo(new Date(activity.created_at))
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                        style={{background: 'linear-gradient(135deg, var(--accent), var(--accent2))'}}
                      >
                        {actor?.full_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm" style={{color: 'var(--text)'}}>
                          <strong>{actor?.full_name || actor?.email}</strong> {activity.content}
                        </p>
                        <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>{timeAgo}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Suggested Partner Banner */}
          {otherUsers[0] && (
            <div 
              className="rounded-2xl p-6 flex items-center gap-4"
              style={{
                background: 'linear-gradient(130deg, #6B58E8 0%, #8F7CF4 50%, #A896FF 100%)',
                boxShadow: '0 4px 24px rgba(124,106,240,0.35)'
              }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0"
                style={{background: 'rgba(255,255,255,0.22)', border: '2px solid rgba(255,255,255,0.3)', color: 'var(--card)'}}
              >
                {otherUsers[0].full_name?.[0] || otherUsers[0].email?.[0]}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{color: 'rgba(255,255,255,0.65)'}}>
                  ⚡ Suggested study partner
                </p>
                <h3 className="text-xl font-bold text-white mb-1">{otherUsers[0].full_name || otherUsers[0].email}</h3>
                <p className="text-sm mb-3" style={{color: 'rgba(255,255,255,0.75)'}}>
                  New student on Univio · Open to connect
                </p>
              </div>
              <button 
                onClick={() => navigate('/people')}
                className="px-6 py-2 rounded-lg font-bold transition hover:scale-105"
                style={{background: 'var(--card)', color: 'var(--accent)'}}
              >
                View Profile →
              </button>
            </div>
          )}

          {/* Events */}
          {events.map(event => (
            <div 
              key={event.id}
              className="rounded-2xl p-6"
              style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{background: '#F59E0B'}}></div>
                <span className="text-xs font-bold uppercase tracking-wide" style={{color: 'var(--text-muted)'}}>
                  Event · {event.category || 'General'}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{color: 'var(--text)'}}>
                {event.title}
              </h3>
              <p className="text-sm mb-4" style={{color: 'var(--text-muted)', lineHeight: 1.6}}>
                {event.description}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{background: 'var(--accent-light)', color: 'var(--accent)'}}>
                    {new Date(event.event_date).toLocaleDateString()}
                  </span>
                  <span className="text-sm" style={{color: 'var(--text-muted)'}}>{event.location}</span>
                </div>
                <button 
                  className="px-4 py-2 rounded-lg text-sm font-bold transition"
                  style={{background: 'var(--accent)', color: 'var(--card)'}}
                >
                  RSVP
                </button>
              </div>
            </div>
          ))}

        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-4">
          
          {/* Who's Online Now */}
          <div 
            className="rounded-2xl p-5"
            style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
          >
            <h3 className="font-bold mb-4 flex items-center gap-2" style={{color: 'var(--text)'}}>
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Online Now ({onlineUsers.length})
            </h3>
            
            {onlineUsers.length === 0 ? (
              <p className="text-sm text-center py-4" style={{color: 'var(--text-muted)'}}>No one else online</p>
            ) : (
              <div className="space-y-3">
                {onlineUsers.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                      style={{background: 'linear-gradient(135deg, var(--accent), var(--accent2))'}}
                    >
                      {p.full_name?.[0] || p.email?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{color: 'var(--text)'}}>
                        {p.full_name || p.email}
                      </p>
                      <p className="text-xs flex items-center gap-1" style={{color: 'var(--text-muted)'}}>
                        {statusIcons[p.study_status || 'available']}
                        {p.current_location || 'Online'}
                      </p>
                    </div>
                    <button 
                      onClick={() => navigate('/people')}
                      className="px-3 py-1 rounded-lg text-xs font-bold transition"
                      style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Event Button */}
          <div 
            className="rounded-2xl p-5"
            style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
          >
            <button 
              onClick={() => setShowEventForm(true)}
              className="w-full py-3 rounded-lg font-bold transition text-white"
              style={{background: 'var(--accent)'}}
            >
              + Create Event
            </button>
          </div>

          {/* New Students */}
          <div 
            className="rounded-2xl p-5"
            style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
          >
            <h3 className="font-bold mb-4" style={{color: 'var(--text)'}}>👥 New students</h3>
            
            {otherUsers.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center gap-3 mb-3 last:mb-0">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                  style={{background: 'linear-gradient(135deg, var(--accent), var(--accent2))'}}
                >
                  {p.full_name?.[0] || p.email?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{color: 'var(--text)'}}>
                    {p.full_name || p.email}
                  </p>
                  <p className="text-xs" style={{color: 'var(--text-muted)'}}>New on Univio</p>
                </div>
                <button 
                  onClick={() => navigate('/people')}
                  className="px-3 py-1 rounded-lg text-xs font-bold transition"
                  style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
                >
                  View
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Event Creation Modal */}
      {showEventForm && (
        <EventForm 
          onClose={() => setShowEventForm(false)}
          onCreate={createEvent}
        />
      )}
    </div>
  )
}

function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// EventForm component (same as before)
function EventForm({ onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState('General')

  const handleSubmit = (e) => {
    e.preventDefault()
    const dateTime = new Date(`${eventDate}T${eventTime}`)
    onCreate({
      title,
      description,
      event_date: dateTime.toISOString(),
      location,
      category
    })
  }

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{background: 'rgba(0,0,0,0.5)'}}
      onClick={onClose}
    >
      <div 
        className="rounded-2xl p-8 max-w-md w-full mx-4"
        style={{background: 'var(--card)'}}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--text)'}}>Create Event</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Event Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Time</label>
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
              placeholder="e.g., Library Floor 2"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
            >
              <option>General</option>
              <option>Computer Science</option>
              <option>Mathematics</option>
              <option>Study Session</option>
              <option>Social</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-bold transition"
              style={{background: 'var(--bg2)', color: 'var(--text)'}}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg font-bold transition text-white"
              style={{background: 'var(--accent)'}}
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
