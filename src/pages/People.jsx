import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function People() {
  const [user, setUser] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)

      const { data: allProfiles } = await supabase.from('profiles').select('*')
      setProfiles(allProfiles?.filter(p => p.id !== user.id) || [])
    }
    init()
  }, [])

  const filteredProfiles = profiles.filter(p => {
    if (filter === 'all') return true
    // Add more filter logic here based on status, courses, etc.
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text)'}}>Find Students</h1>
        <p style={{color: 'var(--text-muted)'}}>Connect with fellow students in your courses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Filter Panel */}
        <div 
          className="rounded-2xl p-5 h-fit sticky top-0"
          style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
        >
          <h3 className="font-bold mb-4" style={{color: 'var(--text)'}}>🔍 Filters</h3>
          
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{color: 'var(--text-muted)'}}>Status</p>
            <div className="space-y-1">
              <FilterOption 
                label="All students" 
                active={filter === 'all'} 
                onClick={() => setFilter('all')}
              />
              <FilterOption 
                label="🌱 Open to meet" 
                active={filter === 'open'} 
                onClick={() => setFilter('open')}
              />
              <FilterOption 
                label="📚 Just studying" 
                active={filter === 'studying'} 
                onClick={() => setFilter('studying')}
              />
            </div>
          </div>

          <div className="pt-4 border-t" style={{borderColor: '#F0F0F6'}}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{color: 'var(--text-muted)'}}>Looking for</p>
            <div className="space-y-1">
              <FilterOption label="Study partner" />
              <FilterOption label="Group to join" />
              <FilterOption label="Friends / social" />
            </div>
          </div>
        </div>

        {/* People Grid */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <p style={{color: 'var(--text-muted)'}}>
              Showing <strong style={{color: 'var(--text)'}}>{filteredProfiles.length} students</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProfiles.map(p => (
              <div 
                key={p.id}
                className="rounded-2xl p-5 cursor-pointer transition hover:scale-[1.02]"
                style={{background: 'var(--card)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--border)'}}
              >
                <div className="flex items-start gap-3 mb-4">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                    style={{background: 'linear-gradient(135deg, var(--accent), var(--accent2))'}}
                  >
                    {p.full_name?.[0] || p.email?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 truncate" style={{color: 'var(--text)'}}>
                      {p.full_name || p.email}
                    </h3>
                    <p className="text-sm" style={{color: 'var(--text-muted)'}}>
                      🌱 Open to meet · Budapest
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{background: 'var(--accent-light)', color: 'var(--accent)'}}>
                    Computer Science
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{background: '#FFF0E6', color: '#C4682A'}}>
                    Data Structures
                  </span>
                </div>

                <p className="text-sm mb-4 line-clamp-2" style={{color: 'var(--text-muted)'}}>
                  Looking for study partners and happy to help with coding questions!
                </p>

                <div className="flex gap-2">
                  <button 
                    className="flex-1 py-2 rounded-lg text-sm font-bold transition"
                    style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
                  >
                    View Profile
                  </button>
                  <button 
                    onClick={() => navigate('/chat')}
                    className="flex-1 py-2 rounded-lg text-sm font-bold transition text-white"
                    style={{background: 'var(--accent)'}}
                  >
                    Connect →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredProfiles.length === 0 && (
            <div className="text-center py-12" style={{color: 'var(--text-muted)'}}>
              <p className="text-lg">No students found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterOption({ label, active, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition"
      style={{background: active ? 'var(--accent-light)' : 'transparent'}}
    >
      <div 
        className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0"
        style={{borderColor: active ? 'var(--accent)' : '#DDD', background: active ? 'var(--accent)' : 'transparent'}}
      >
        {active && <span className="text-white text-xs">✓</span>}
      </div>
      <span 
        className="text-sm font-medium"
        style={{color: active ? 'var(--accent)' : 'var(--text)'}}
      >
        {label}
      </span>
    </div>
  )
}
