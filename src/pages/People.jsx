import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

// ─── COMPATIBILITY ENGINE ─────────────────────────────────────────────────────
// Computes a match score (0–100) between current user and another profile.
// Signals used:
//   • Shared courses     — 50% weight  (strongest signal: academic context)
//   • Shared interests   — 30% weight  (social fit)
//   • Same year          — 20% weight  (peer relevance)
//
// Returns { score, sharedCourses, sharedInterests, breakdown }
function computeCompatibility(myProfile, otherProfile) {
  const myCourses    = myProfile?.courses    || []
  const myInterests  = myProfile?.interests  || []
  const theirCourses   = otherProfile?.courses   || []
  const theirInterests = otherProfile?.interests  || []

  // Shared courses (Jaccard-style: shared / union)
  const sharedCourses   = myCourses.filter(c => theirCourses.includes(c))
  const coursesUnion    = [...new Set([...myCourses, ...theirCourses])]
  const courseScore     = coursesUnion.length > 0 ? sharedCourses.length / Math.min(coursesUnion.length, 5) : 0

  // Shared interests
  const sharedInterests  = myInterests.filter(i => theirInterests.includes(i))
  const interestsUnion   = [...new Set([...myInterests, ...theirInterests])]
  const interestScore    = interestsUnion.length > 0 ? sharedInterests.length / Math.min(interestsUnion.length, 6) : 0

  // Same year
  const yearScore = myProfile?.year && otherProfile?.year && myProfile.year === otherProfile.year ? 1 : 0

  const raw   = (courseScore * 0.50) + (interestScore * 0.30) + (yearScore * 0.20)
  const score = Math.round(Math.min(raw, 1) * 100)

  return { score, sharedCourses, sharedInterests }
}

function getMatchLabel(score) {
  if (score >= 70) return { label: 'Strong match',  color: '#10B981', bg: '#D1FAE5' }
  if (score >= 40) return { label: 'Good match',    color: '#3B82F6', bg: '#DBEAFE' }
  if (score >= 15) return { label: 'Some overlap',  color: '#F59E0B', bg: '#FEF3C7' }
  return               { label: 'New connection',  color: '#94A3B8', bg: '#F1F5F9' }
}

export default function People() {
  const [user,        setUser]        = useState(null)
  const [myProfile,   setMyProfile]   = useState(null)
  const [profiles,    setProfiles]    = useState([])
  const [scored,      setScored]      = useState([])
  const [filter,      setFilter]      = useState('all')
  const [sortBy,      setSortBy]      = useState('match')
  const [search,      setSearch]      = useState('')
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
      setProfiles(others)

      // Score everyone
      const withScores = others.map(p => ({
        profile: p,
        ...computeCompatibility(me, p)
      }))
      setScored(withScores)
    }
    init()
  }, [])

  // Filter + sort
  let visible = [...scored]

  if (search.trim()) {
    const q = search.toLowerCase()
    visible = visible.filter(({ profile: p }) =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.major     || '').toLowerCase().includes(q) ||
      (p.courses   || []).some(c => c.toLowerCase().includes(q))
    )
  }

  if (filter === 'shared_course') visible = visible.filter(({ sharedCourses }) => sharedCourses.length > 0)
  if (filter === 'strong')        visible = visible.filter(({ score }) => score >= 40)

  if (sortBy === 'match') visible.sort((a, b) => b.score - a.score)
  if (sortBy === 'name')  visible.sort((a, b) => (a.profile.full_name || '').localeCompare(b.profile.full_name || ''))

  const hasProfile = (myProfile?.courses?.length || 0) + (myProfile?.interests?.length || 0) > 0

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A1824' }}>Find Students</h1>
        <p style={{ color: '#7A788F' }}>
          Matched by shared courses &amp; interests · {scored.length} students
        </p>
      </div>

      {/* No profile warning */}
      {!hasProfile && (
        <div className="mb-6 rounded-2xl p-5 flex items-center gap-4"
             style={{ background: '#FEF3C7', border: '1.5px solid #FDE68A' }}>
          <span style={{ fontSize: 28 }}>💡</span>
          <div className="flex-1">
            <p className="font-bold" style={{ color: '#92400E' }}>Add courses to see match scores</p>
            <p className="text-sm mt-1" style={{ color: '#B45309' }}>
              The compatibility engine uses your courses and interests to find relevant people.
            </p>
          </div>
          <button onClick={() => navigate('/profile')}
            className="px-4 py-2 rounded-lg font-bold text-sm flex-shrink-0"
            style={{ background: '#F59E0B', color: 'white' }}>
            Edit Profile →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Filter Panel */}
        <div className="rounded-2xl p-5 h-fit sticky top-0"
             style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E5E5' }}>
          <h3 className="font-bold mb-4" style={{ color: '#1A1824' }}>🔍 Filter</h3>

          {/* Search */}
          <div className="mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Name, major, course…"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
              style={{ background: '#FAF8F4', border: '1.5px solid #E5E5E5', color: '#1A1824' }}
              onFocus={e  => (e.target.style.borderColor = '#7C6AF0')}
              onBlur={e   => (e.target.style.borderColor = '#E5E5E5')}
            />
          </div>

          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#B0AFBF' }}>Show</p>
            <div className="space-y-1">
              <FilterOption label="All students"       active={filter === 'all'}           onClick={() => setFilter('all')} />
              <FilterOption label="Shared courses"     active={filter === 'shared_course'} onClick={() => setFilter('shared_course')} />
              <FilterOption label="Good matches (40+)" active={filter === 'strong'}        onClick={() => setFilter('strong')} />
            </div>
          </div>

          <div className="pt-4 border-t" style={{ borderColor: '#F0F0F6' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#B0AFBF' }}>Sort by</p>
            <div className="space-y-1">
              <FilterOption label="Best match first" active={sortBy === 'match'} onClick={() => setSortBy('match')} />
              <FilterOption label="Name A–Z"         active={sortBy === 'name'}  onClick={() => setSortBy('name')} />
            </div>
          </div>

          {/* My courses summary */}
          {myProfile?.courses?.length > 0 && (
            <div className="pt-4 mt-4 border-t" style={{ borderColor: '#F0F0F6' }}>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#B0AFBF' }}>Your courses</p>
              <div className="flex flex-wrap gap-1">
                {myProfile.courses.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{ background: '#EDE9FF', color: '#7C6AF0' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* People Grid */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <p style={{ color: '#7A788F' }}>
              Showing <strong style={{ color: '#1A1824' }}>{visible.length} students</strong>
            </p>
          </div>

          {visible.length === 0 && (
            <div className="text-center py-12" style={{ color: '#7A788F' }}>
              <p className="text-lg">No students found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(({ profile: p, score, sharedCourses, sharedInterests }) => {
              const match = getMatchLabel(score)
              return (
                <div key={p.id} className="rounded-2xl p-5 transition hover:scale-[1.01] hover:shadow-md"
                     style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #E5E5E5', cursor: 'default' }}>

                  {/* Top row: avatar + name + match badge */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)' }}>
                      {p.full_name?.[0] || p.email?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base truncate" style={{ color: '#1A1824' }}>
                          {p.full_name || p.email}
                        </h3>
                      </div>
                      <p className="text-sm truncate" style={{ color: '#7A788F' }}>
                        {p.major || 'Student'}{p.year ? ` · ${p.year}` : ''}
                      </p>
                    </div>
                    {/* Match score */}
                    {hasProfile && (
                      <div className="flex-shrink-0 text-right">
                        <div className="text-lg font-bold" style={{ color: match.color }}>{score}%</div>
                        <div className="text-xs px-2 py-0.5 rounded-full font-semibold"
                             style={{ background: match.bg, color: match.color }}>{match.label}</div>
                      </div>
                    )}
                  </div>

                  {/* Match score bar */}
                  {hasProfile && (
                    <div className="mb-3">
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0EDF8' }}>
                        <div className="h-full rounded-full transition-all"
                             style={{ background: match.color, width: `${score}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Shared courses */}
                  {sharedCourses.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: '#B0AFBF' }}>
                        {sharedCourses.length} shared course{sharedCourses.length > 1 ? 's' : ''}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {sharedCourses.map(c => (
                          <span key={c} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: '#EDE9FF', color: '#7C6AF0' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Shared interests */}
                  {sharedInterests.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {sharedInterests.map(i => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{ background: '#FFF0E6', color: '#C4682A' }}>{i}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* About */}
                  {p.about && (
                    <p className="text-sm mb-3 line-clamp-2" style={{ color: '#7A788F' }}>{p.about}</p>
                  )}

                  {/* Their courses (if no shared ones) */}
                  {sharedCourses.length === 0 && p.courses?.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {p.courses.slice(0, 3).map(c => (
                        <span key={c} className="px-2 py-0.5 rounded-full text-xs"
                              style={{ background: '#F3F0EA', color: '#7A788F' }}>{c}</span>
                      ))}
                      {p.courses.length > 3 && <span className="text-xs" style={{ color: '#B0AFBF' }}>+{p.courses.length - 3} more</span>}
                    </div>
                  )}

                  <button
                    onClick={() => navigate('/groups')}
                    className="w-full py-2 rounded-lg text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: '#7C6AF0' }}
                  >
                    Message →
                  </button>
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
    <div onClick={onClick} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition"
         style={{ background: active ? '#EDE9FF' : 'transparent' }}>
      <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0"
           style={{ borderColor: active ? '#7C6AF0' : '#DDD', background: active ? '#7C6AF0' : 'transparent' }}>
        {active && <span className="text-white text-xs">✓</span>}
      </div>
      <span className="text-sm font-medium" style={{ color: active ? '#7C6AF0' : '#1A1824' }}>{label}</span>
    </div>
  )
}
