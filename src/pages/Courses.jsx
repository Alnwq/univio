import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Courses() {
  const [user,          setUser]          = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [myCourses,     setMyCourses]     = useState([])
  const [allCourses,    setAllCourses]    = useState([])
  const [courseStats,   setCourseStats]   = useState({})
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [showMembers,   setShowMembers]   = useState(null) // course_code
  const navigate = useNavigate()

  const isAdmin = profile?.role === 'supervisor'

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      loadCourses(user.id)
    }
    init()
  }, [])

  const loadCourses = async (userId) => {
    const { data: enrollments } = await supabase.from('user_courses').select('course_code').eq('user_id', userId)
    const courseCodes = enrollments?.map(e => e.course_code) || []
    const { data: courses } = await supabase.from('course_groups').select('*').in('course_code', courseCodes)
    setMyCourses(courses || [])
    const { data: allCoursesData } = await supabase.from('course_groups').select('*')
    setAllCourses(allCoursesData || [])

    const stats = {}
    for (const course of (allCoursesData || [])) {
      const { data: enr } = await supabase.from('user_courses').select('id').eq('course_code', course.course_code)
      const { data: msgs } = await supabase.from('course_messages').select('id').eq('course_code', course.course_code)
      stats[course.course_code] = { students: enr?.length || 0, messages: msgs?.length || 0 }
    }
    setCourseStats(stats)
  }

  const enrollInCourse = async (courseCode) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_courses').insert({ user_id: user.id, course_code: courseCode })
    const course = allCourses.find(c => c.course_code === courseCode)
    await supabase.from('activities').insert({
      user_id: user.id, activity_type: 'joined_course',
      content: `joined ${course?.course_name || courseCode}`,
      metadata: { course_code: courseCode }
    })
    loadCourses(user.id)
  }

  const unenrollFromCourse = async (courseCode) => {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('user_courses').delete().eq('user_id', user.id).eq('course_code', courseCode)
    loadCourses(user.id)
  }

  // Admin only: delete course entirely
  const deleteCourse = async (courseCode) => {
    if (!window.confirm(`Delete course ${courseCode} and remove all enrollments?`)) return
    await supabase.from('user_courses').delete().eq('course_code', courseCode)
    await supabase.from('course_messages').delete().eq('course_code', courseCode)
    await supabase.from('course_groups').delete().eq('course_code', courseCode)
    loadCourses(user.id)
  }

  // Admin only: remove a specific user from a course
  const removeUserFromCourse = async (userId, courseCode) => {
    await supabase.from('user_courses').delete().eq('user_id', userId).eq('course_code', courseCode)
    loadCourses(user.id)
  }

  const availableCourses = allCourses.filter(c => !myCourses.find(mc => mc.course_code === c.course_code))

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>My Courses</h1>
            <p style={{ color: 'var(--text-muted)' }}>Your enrolled courses — the centre of your university network</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: '#FEF3C7', color: '#92400E' }}>
                👑 Admin Mode
              </span>
            )}
            <button onClick={() => setShowAddCourse(true)}
              className="px-4 py-2 rounded-lg font-bold text-white text-sm"
              style={{ background: 'var(--accent)' }}>
              + Add Course
            </button>
          </div>
        </div>

        {/* My Courses */}
        {myCourses.length === 0 ? (
          <div className="rounded-2xl p-12 text-center mb-8" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>No courses yet</h3>
            <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Add your courses to connect with classmates and join study groups</p>
            <button onClick={() => setShowAddCourse(true)} className="px-6 py-3 rounded-lg font-bold text-white" style={{ background: 'var(--accent)' }}>
              + Add Your First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {myCourses.map(course => {
              const stats = courseStats[course.course_code] || { students: 0, messages: 0 }
              return (
                <div key={course.id} className="rounded-2xl p-6 cursor-pointer transition hover:scale-[1.02] relative group"
                     style={{ background: 'linear-gradient(135deg, #7B5EA7 0%, #9B7FCC 100%)', boxShadow: '0 4px 16px rgba(124,106,240,0.3)' }}
                     onClick={() => navigate(`/course/${course.course_code}`)}>
                  
                  {/* Admin controls */}
                  {isAdmin && (
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setShowMembers(course.course_code)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }} title="Manage members">
                        👥
                      </button>
                      <button onClick={() => deleteCourse(course.course_code)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ background: 'rgba(239,68,68,0.3)', color: 'white' }} title="Delete course">
                        🗑
                      </button>
                    </div>
                  )}

                  {/* Leave button (non-admin) */}
                  {!isAdmin && (
                    <button onClick={e => { e.stopPropagation(); unenrollFromCourse(course.course_code) }}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 16 }}>
                      ×
                    </button>
                  )}

                  <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>{course.course_code}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{course.course_name}</h3>
                  <div className="flex items-center gap-4 text-white">
                    <div className="text-sm"><span className="text-2xl font-bold">{stats.students}</span> students</div>
                    <div className="text-sm"><span className="text-2xl font-bold">{stats.messages}</span> messages</div>
                  </div>
                  <div className="mt-4 pt-4 border-t text-sm text-white opacity-80" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
                    Click to see classmates & study group →
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Available Courses */}
        {availableCourses.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Available Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCourses.map(course => {
                const stats = courseStats[course.course_code] || { students: 0, messages: 0 }
                return (
                  <div key={course.id} className="rounded-2xl p-6 relative group"
                       style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                    {isAdmin && (
                      <button onClick={() => deleteCourse(course.course_code)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                        style={{ background: '#FEE2E2', color: '#EF4444' }} title="Delete course">
                        🗑
                      </button>
                    )}
                    <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--accent)' }}>{course.course_code}</div>
                    <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text)' }}>{course.course_name}</h3>
                    <div className="flex gap-4 mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                      <span><strong>{stats.students}</strong> students</span>
                      <span><strong>{stats.messages}</strong> messages</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => enrollInCourse(course.course_code)}
                        className="flex-1 py-2 rounded-lg font-bold transition"
                        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                        Enroll
                      </button>
                      <button onClick={() => navigate(`/course/${course.course_code}`)}
                        className="py-2 px-3 rounded-lg font-bold transition"
                        style={{ background: 'var(--bg2)', color: 'var(--text-muted)' }}>
                        View
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Course Modal */}
      {showAddCourse && (
        <AddCourseModal onClose={() => setShowAddCourse(false)} onAdd={() => { setShowAddCourse(false); loadCourses(user.id) }} />
      )}

      {/* Members Modal (admin only) */}
      {showMembers && (
        <MembersModal
          courseCode={showMembers}
          onClose={() => setShowMembers(null)}
          onRemove={removeUserFromCourse}
        />
      )}
    </div>
  )
}

function AddCourseModal({ onClose, onAdd }) {
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [loading, setLoading] = useState(false)

  const createAndEnroll = async () => {
    if (!courseCode.trim() || !courseName.trim()) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('course_groups').upsert({
      course_code: courseCode.toUpperCase().trim(),
      course_name: courseName.trim()
    }, { onConflict: 'course_code' })
    await supabase.from('user_courses').upsert({
      user_id: user.id,
      course_code: courseCode.toUpperCase().trim()
    }, { onConflict: 'user_id,course_code' })
    setLoading(false)
    onAdd()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={onClose}>
      <div className="rounded-2xl p-8 max-w-md w-full" style={{ background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>Add Course</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Course Code</label>
            <input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="e.g. CS301"
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Course Name</label>
            <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="e.g. Data Structures"
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-lg font-bold" style={{ background: 'var(--bg2)', color: 'var(--text)' }}>Cancel</button>
            <button onClick={createAndEnroll} disabled={loading} className="flex-1 py-3 rounded-lg font-bold text-white" style={{ background: 'var(--accent)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Adding…' : 'Add & Enroll'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MembersModal({ courseCode, onClose, onRemove }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: enrollments } = await supabase.from('user_courses').select('user_id').eq('course_code', courseCode)
      const ids = enrollments?.map(e => e.user_id) || []
      if (!ids.length) { setMembers([]); setLoading(false); return }
      const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
      setMembers(profiles || [])
      setLoading(false)
    }
    load()
  }, [courseCode])

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={onClose}>
      <div className="rounded-2xl p-8 max-w-md w-full" style={{ background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}>Members — {courseCode}</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Remove students from this course</p>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : members.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No members yet</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)' }}>
                  {m.full_name?.[0] || m.email?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{m.full_name || m.email}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.major || 'Student'}</p>
                </div>
                <button onClick={async () => { await onRemove(m.id, courseCode); setMembers(prev => prev.filter(x => x.id !== m.id)) }}
                  className="px-3 py-1 rounded-lg text-xs font-bold flex-shrink-0"
                  style={{ background: '#FEE2E2', color: '#EF4444' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-6 py-3 rounded-lg font-bold" style={{ background: 'var(--bg2)', color: 'var(--text)' }}>Close</button>
      </div>
    </div>
  )
}
