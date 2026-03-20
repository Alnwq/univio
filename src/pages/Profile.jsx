import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    major: '',
    year: '',
    about: '',
    courses: [],
    interests: [],
    study_status: 'available'
  })
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
      
      // Initialize edit form
      setEditForm({
        full_name: profile?.full_name || '',
        major: profile?.major || '',
        year: profile?.year || '',
        about: profile?.about || '',
        courses: profile?.courses || [],
        interests: profile?.interests || [],
        study_status: profile?.study_status || 'available'
      })
    }
    init()
  }, [])

  const saveProfile = async () => {
    await supabase
      .from('profiles')
      .update(editForm)
      .eq('id', user.id)

    // Reload profile
    const { data: updated } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(updated)
    setEditing(false)
  }

  const addCourse = (course) => {
    if (course && !editForm.courses.includes(course)) {
      setEditForm({...editForm, courses: [...editForm.courses, course]})
    }
  }

  const removeCourse = (course) => {
    setEditForm({...editForm, courses: editForm.courses.filter(c => c !== course)})
  }

  const addInterest = (interest) => {
    if (interest && !editForm.interests.includes(interest)) {
      setEditForm({...editForm, interests: [...editForm.interests, interest]})
    }
  }

  const removeInterest = (interest) => {
    setEditForm({...editForm, interests: editForm.interests.filter(i => i !== interest)})
  }

  if (editing) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <div 
            className="rounded-2xl p-8"
            style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
          >
            <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--text)'}}>Edit Profile</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                  style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Major</label>
                  <input
                    type="text"
                    value={editForm.major}
                    onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                    style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Year</label>
                  <input
                    type="text"
                    value={editForm.year}
                    onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                    style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                    placeholder="e.g., Year 2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>About Me</label>
                <textarea
                  value={editForm.about}
                  onChange={(e) => setEditForm({...editForm, about: e.target.value})}
                  className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                  style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                  rows="4"
                  placeholder="Tell other students about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Status</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'available', label: '🌱 Open to meet', color: '#22C55E' },
                    { value: 'studying',  label: '📚 Studying',     color: '#F59E0B' },
                    { value: 'busy',      label: '🔴 Busy',         color: '#EF4444' },
                  ].map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => setEditForm({...editForm, study_status: opt.value})}
                      className="py-2 px-3 rounded-lg text-sm font-semibold border-2 transition"
                      style={{
                        borderColor: editForm.study_status === opt.value ? opt.color : 'var(--border)',
                        background: editForm.study_status === opt.value ? opt.color + '20' : 'var(--bg)',
                        color: editForm.study_status === opt.value ? opt.color : 'var(--text-muted)'
                      }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>My Courses</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editForm.courses.map(course => (
                    <div 
                      key={course}
                      className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                      style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
                    >
                      {course}
                      <button onClick={() => removeCourse(course)} className="text-xs">×</button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type course and press Enter"
                  className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                  style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCourse(e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>Hobbies & Interests</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editForm.interests.map(interest => (
                    <div 
                      key={interest}
                      className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                      style={{background: '#FFF0E6', color: '#C4682A'}}
                    >
                      {interest}
                      <button onClick={() => removeInterest(interest)} className="text-xs">×</button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Type interest and press Enter"
                  className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                  style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addInterest(e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3 rounded-lg font-bold transition"
                  style={{background: 'var(--bg2)', color: 'var(--text)'}}
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="flex-1 py-3 rounded-lg font-bold transition text-white"
                  style={{background: 'var(--accent)'}}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Profile Card */}
          <div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
            >
              {/* Hero Banner */}
              <div 
                className="h-24"
                style={{background: 'linear-gradient(130deg, #EDE8F8 0%, #D8D0FF 100%)'}}
              />
              
              {/* Avatar */}
              <div className="px-6 -mt-12 mb-4">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white border-4 border-white"
                  style={{background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)', boxShadow: '0 4px 16px rgba(124,106,240,0.35)'}}
                >
                  {profile?.full_name?.[0] || profile?.email?.[0] || 'U'}
                </div>
              </div>

              {/* Name & Status */}
              <div className="px-6 pb-5">
                <h2 className="text-2xl font-bold mb-1" style={{color: 'var(--text)'}}>
                  {profile?.full_name || 'Your Name'}
                </h2>
                <p className="text-sm mb-3" style={{color: 'var(--text-muted)'}}>
                  {profile?.major || 'No major set'} {profile?.year ? `· ${profile.year}` : ''}
                </p>
                <div 
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
                  style={{background: 'var(--accent-light)'}}
                >
                  <span className="text-sm font-bold" style={{color: 'var(--accent)'}}>
                    {profile?.study_status === 'studying' && '📚 Studying'}
                    {profile?.study_status === 'busy'     && '🔴 Busy'}
                    {(!profile?.study_status || profile?.study_status === 'available') && '🌱 Open to meeting people'}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div 
                className="grid grid-cols-3 border-t border-b"
                style={{borderColor: '#F0F0F6'}}
              >
                <div className="text-center py-4 border-r" style={{borderColor: '#F0F0F6'}}>
                  <div className="text-2xl font-bold" style={{color: 'var(--accent)'}}>
                    {profile?.courses?.length || 0}
                  </div>
                  <div className="text-xs" style={{color: 'var(--text-muted)'}}>Courses</div>
                </div>
                <div className="text-center py-4 border-r" style={{borderColor: '#F0F0F6'}}>
                  <div className="text-2xl font-bold" style={{color: 'var(--accent)'}}>0</div>
                  <div className="text-xs" style={{color: 'var(--text-muted)'}}>Groups</div>
                </div>
                <div className="text-center py-4">
                  <div className="text-2xl font-bold" style={{color: 'var(--accent)'}}>0</div>
                  <div className="text-xs" style={{color: 'var(--text-muted)'}}>Connections</div>
                </div>
              </div>

              {/* Sections */}
              <div className="p-6 space-y-5">
                {profile?.courses && profile.courses.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color: 'var(--text-muted)'}}>
                      My Courses
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.courses.map((course, i) => (
                        <Tag key={i} color="purple" text={course} />
                      ))}
                    </div>
                  </div>
                )}

                {profile?.interests && profile.interests.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color: 'var(--text-muted)'}}>
                      Hobbies & Interests
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest, i) => (
                        <Tag key={i} color="warm" text={interest} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color: 'var(--text-muted)'}}>
                    About Me
                  </p>
                  <div 
                    className="rounded-lg p-4 text-sm leading-relaxed"
                    style={{background: 'var(--bg)', color: 'var(--text)'}}
                  >
                    {profile?.about || 'No bio yet. Click "Edit Profile" to add one!'}
                  </div>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="w-full py-3 rounded-lg font-bold transition text-white"
                  style={{background: 'var(--accent)'}}
                >
                  ✏️ Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Connections */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Recent Activity */}
            <div 
              className="rounded-2xl p-6"
              style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
            >
              <h3 className="font-bold mb-4" style={{color: 'var(--text)'}}>Recent Activity</h3>
              
              <div className="text-center py-8" style={{color: 'var(--text-muted)'}}>
                <p>No recent activity</p>
                <p className="text-sm mt-2">Join groups and events to see your activity here!</p>
              </div>
            </div>

            {/* Connections */}
            <div 
              className="rounded-2xl p-6"
              style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
            >
              <h3 className="font-bold mb-4" style={{color: 'var(--text)'}}>Your Connections</h3>
              
              <div className="text-center py-8" style={{color: 'var(--text-muted)'}}>
                <p>No connections yet</p>
                <p className="text-sm mt-2">
                  <button 
                    onClick={() => navigate('/people')}
                    className="text-sm font-bold"
                    style={{color: 'var(--accent)'}}
                  >
                    Find students to connect with →
                  </button>
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function Tag({ color, text }) {
  const colors = {
    purple: { bg: 'var(--accent-light)', text: 'var(--accent)' },
    blue: { bg: '#E6F0FF', text: '#2A5FC4' },
    green: { bg: '#E8F5E8', text: '#2D7A2D' },
    warm: { bg: '#FFF0E6', text: '#C4682A' },
    gray: { bg: '#F0F0F6', text: 'var(--text-muted)' }
  }
  const style = colors[color] || colors.gray
  
  return (
    <span 
      className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{background: style.bg, color: style.text}}
    >
      {text}
    </span>
  )
}
