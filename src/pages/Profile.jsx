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
    interests: []
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
        interests: profile?.interests || []
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
            style={{background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E5E5'}}
          >
            <h2 className="text-2xl font-bold mb-6" style={{color: '#1A1824'}}>Edit Profile</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2" style={{color: '#1A1824'}}>Full Name</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                  className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                  style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2" style={{color: '#1A1824'}}>Major</label>
                  <input
                    type="text"
                    value={editForm.major}
                    onChange={(e) => setEditForm({...editForm, major: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                    style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2" style={{color: '#1A1824'}}>Year</label>
                  <input
                    type="text"
                    value={editForm.year}
                    onChange={(e) => setEditForm({...editForm, year: e.target.value})}
                    className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                    style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
                    placeholder="e.g., Year 2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: '#1A1824'}}>About Me</label>
                <textarea
                  value={editForm.about}
                  onChange={(e) => setEditForm({...editForm, about: e.target.value})}
                  className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                  style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
                  rows="4"
                  placeholder="Tell other students about yourself..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: '#1A1824'}}>My Courses</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editForm.courses.map(course => (
                    <div 
                      key={course}
                      className="px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2"
                      style={{background: '#EDE9FF', color: '#7C6AF0'}}
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
                  style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCourse(e.target.value)
                      e.target.value = ''
                    }
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2" style={{color: '#1A1824'}}>Hobbies & Interests</label>
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
                  style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
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
                  style={{background: '#F3F0EA', color: '#1A1824'}}
                >
                  Cancel
                </button>
                <button
                  onClick={saveProfile}
                  className="flex-1 py-3 rounded-lg font-bold transition text-white"
                  style={{background: '#7C6AF0'}}
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
              style={{background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E5E5'}}
            >
              {/* Hero Banner */}
              <div 
                className="h-24"
                style={{background: 'linear-gradient(130deg, #EDE9FF 0%, #D8D0FF 100%)'}}
              />
              
              {/* Avatar */}
              <div className="px-6 -mt-12 mb-4">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white border-4 border-white"
                  style={{background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)', boxShadow: '0 4px 16px rgba(124,106,240,0.35)'}}
                >
                  {profile?.full_name?.[0] || profile?.email?.[0] || 'U'}
                </div>
              </div>

              {/* Name & Status */}
              <div className="px-6 pb-5">
                <h2 className="text-2xl font-bold mb-1" style={{color: '#1A1824'}}>
                  {profile?.full_name || 'Your Name'}
                </h2>
                <p className="text-sm mb-3" style={{color: '#7A788F'}}>
                  {profile?.major || 'No major set'} {profile?.year ? `· ${profile.year}` : ''}
                </p>
                <div 
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer"
                  style={{background: '#EDE9FF'}}
                >
                  <span className="text-sm font-bold" style={{color: '#7C6AF0'}}>
                    🌱 Open to meeting people
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div 
                className="grid grid-cols-3 border-t border-b"
                style={{borderColor: '#F0F0F6'}}
              >
                <div className="text-center py-4 border-r" style={{borderColor: '#F0F0F6'}}>
                  <div className="text-2xl font-bold" style={{color: '#7C6AF0'}}>
                    {profile?.courses?.length || 0}
                  </div>
                  <div className="text-xs" style={{color: '#7A788F'}}>Courses</div>
                </div>
                <div className="text-center py-4 border-r" style={{borderColor: '#F0F0F6'}}>
                  <div className="text-2xl font-bold" style={{color: '#7C6AF0'}}>0</div>
                  <div className="text-xs" style={{color: '#7A788F'}}>Groups</div>
                </div>
                <div className="text-center py-4">
                  <div className="text-2xl font-bold" style={{color: '#7C6AF0'}}>0</div>
                  <div className="text-xs" style={{color: '#7A788F'}}>Connections</div>
                </div>
              </div>

              {/* Sections */}
              <div className="p-6 space-y-5">
                {profile?.courses && profile.courses.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color: '#B0AFBF'}}>
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
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color: '#B0AFBF'}}>
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
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{color: '#B0AFBF'}}>
                    About Me
                  </p>
                  <div 
                    className="rounded-lg p-4 text-sm leading-relaxed"
                    style={{background: '#FAF8F4', color: '#1A1824'}}
                  >
                    {profile?.about || 'No bio yet. Click "Edit Profile" to add one!'}
                  </div>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="w-full py-3 rounded-lg font-bold transition text-white"
                  style={{background: '#7C6AF0'}}
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
              style={{background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E5E5'}}
            >
              <h3 className="font-bold mb-4" style={{color: '#1A1824'}}>Recent Activity</h3>
              
              <div className="text-center py-8" style={{color: '#7A788F'}}>
                <p>No recent activity</p>
                <p className="text-sm mt-2">Join groups and events to see your activity here!</p>
              </div>
            </div>

            {/* Connections */}
            <div 
              className="rounded-2xl p-6"
              style={{background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E5E5'}}
            >
              <h3 className="font-bold mb-4" style={{color: '#1A1824'}}>Your Connections</h3>
              
              <div className="text-center py-8" style={{color: '#7A788F'}}>
                <p>No connections yet</p>
                <p className="text-sm mt-2">
                  <button 
                    onClick={() => navigate('/people')}
                    className="text-sm font-bold"
                    style={{color: '#7C6AF0'}}
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
    purple: { bg: '#EDE9FF', text: '#7C6AF0' },
    blue: { bg: '#E6F0FF', text: '#2A5FC4' },
    green: { bg: '#E8F5E8', text: '#2D7A2D' },
    warm: { bg: '#FFF0E6', text: '#C4682A' },
    gray: { bg: '#F0F0F6', text: '#7A788F' }
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
