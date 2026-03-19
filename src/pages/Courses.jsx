import { useState, useEffect } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Courses() {
  const [user, setUser] = useState(null)
  const [myCourses, setMyCourses] = useState([])
  const [allCourses, setAllCourses] = useState([])
  const [showAddCourse, setShowAddCourse] = useState(false)
  const [courseStats, setCourseStats] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)

      loadCourses(user.id)
    }
    init()
  }, [])

  const loadCourses = async (userId) => {
    // Get user's enrolled courses
    const { data: enrollments } = await supabase
      .from('user_courses')
      .select('course_code')
      .eq('user_id', userId)

    const courseCodes = enrollments?.map(e => e.course_code) || []

    // Get course details
    const { data: courses } = await supabase
      .from('course_groups')
      .select('*')
      .in('course_code', courseCodes)

    setMyCourses(courses || [])

    // Get all available courses
    const { data: allCoursesData } = await supabase
      .from('course_groups')
      .select('*')

    setAllCourses(allCoursesData || [])

    // Get stats for each course
    const stats = {}
    for (const course of (allCoursesData || [])) {
      const { data: enrollmentCount } = await supabase
        .from('user_courses')
        .select('id', { count: 'exact' })
        .eq('course_code', course.course_code)

      const { data: messageCount } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('course_code', course.course_code)

      stats[course.course_code] = {
        students: enrollmentCount?.length || 0,
        messages: messageCount?.length || 0
      }
    }
    setCourseStats(stats)
  }

  const enrollInCourse = async (courseCode) => {
    await supabase.from('user_courses').insert({
      user_id: user.id,
      course_code: courseCode
    })

    // Create activity
    const course = allCourses.find(c => c.course_code === courseCode)
    await supabase.from('activities').insert({
      user_id: user.id,
      activity_type: 'joined_course',
      content: `joined ${course?.course_name || courseCode}`,
      metadata: { course_code: courseCode }
    })

    loadCourses(user.id)
  }

  const unenrollFromCourse = async (courseCode) => {
    await supabase
      .from('user_courses')
      .delete()
      .eq('user_id', user.id)
      .eq('course_code', courseCode)
    loadCourses(user.id)
  }

  const goToCourseDetail = (courseCode) => {
    navigate(`/course/${courseCode}`)
  }

  const availableCourses = allCourses.filter(
    c => !myCourses.find(mc => mc.course_code === c.course_code)
  )

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text)'}}>
            My Courses
          </h1>
          <p style={{color: 'var(--text-muted)'}}>
            Your enrolled courses - the center of your university network
          </p>
        </div>

        {/* My Courses Grid */}
        {myCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {myCourses.map(course => {
              const stats = courseStats[course.course_code] || { students: 0, messages: 0 }
              return (
                <div
                  key={course.id}
                  onClick={() => goToCourseDetail(course.course_code)}
                  className="rounded-2xl p-6 cursor-pointer transition hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%)',
                    boxShadow: '0 4px 16px rgba(124,106,240,0.3)'
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{color: 'rgba(255,255,255,0.7)'}}>
                        {course.course_code}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">
                        {course.course_name}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        unenrollFromCourse(course.course_code)
                      }}
                      className="text-white opacity-70 hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stats.students}</span>
                      <span className="text-sm opacity-80">students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{stats.messages}</span>
                      <span className="text-sm opacity-80">messages</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                    <div className="text-sm text-white opacity-90">
                      Click to see classmates & study group →
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div 
            className="rounded-2xl p-12 text-center mb-8"
            style={{background: 'var(--card)', border: '1px solid var(--border)'}}
          >
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-bold mb-2" style={{color: 'var(--text)'}}>
              No courses yet
            </h3>
            <p className="mb-6" style={{color: 'var(--text-muted)'}}>
              Add your courses to connect with classmates and join study groups
            </p>
            <button
              onClick={() => setShowAddCourse(true)}
              className="px-6 py-3 rounded-lg font-bold text-white"
              style={{background: 'var(--accent)'}}
            >
              + Add Your First Course
            </button>
          </div>
        )}

        {/* Available Courses */}
        {myCourses.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{color: 'var(--text)'}}>
                Available Courses
              </h2>
              <button
                onClick={() => setShowAddCourse(true)}
                className="px-4 py-2 rounded-lg font-bold transition"
                style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
              >
                + Add Course
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCourses.map(course => {
                const stats = courseStats[course.course_code] || { students: 0, messages: 0 }
                return (
                  <div
                    key={course.id}
                    className="rounded-2xl p-6"
                    style={{background: 'var(--card)', border: '1px solid var(--border)'}}
                  >
                    <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{color: 'var(--accent)'}}>
                      {course.course_code}
                    </div>
                    <h3 className="text-lg font-bold mb-3" style={{color: 'var(--text)'}}>
                      {course.course_name}
                    </h3>

                    <div className="flex items-center gap-4 mb-4" style={{color: 'var(--text-muted)'}}>
                      <div className="text-sm">
                        <strong>{stats.students}</strong> students
                      </div>
                      <div className="text-sm">
                        <strong>{stats.messages}</strong> messages
                      </div>
                    </div>

                    <button
                      onClick={() => enrollInCourse(course.course_code)}
                      className="w-full py-2 rounded-lg font-bold transition"
                      style={{background: 'var(--accent-light)', color: 'var(--accent)'}}
                    >
                      Enroll
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}

      </div>

      {/* Add Course Modal */}
      {showAddCourse && (
        <AddCourseModal
          onClose={() => setShowAddCourse(false)}
          onAdd={() => {
            setShowAddCourse(false)
            loadCourses(user.id)
          }}
        />
      )}
    </div>
  )
}

function AddCourseModal({ onClose, onAdd }) {
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')

  const createAndEnroll = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Create course if it doesn't exist
    await supabase.from('course_groups').upsert({
      course_code: courseCode.toUpperCase(),
      course_name: courseName
    }, { onConflict: 'course_code' })

    // Enroll user
    await supabase.from('user_courses').insert({
      user_id: user.id,
      course_code: courseCode.toUpperCase()
    })

    onAdd()
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
        <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--text)'}}>
          Add Course
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>
              Course Code
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g., CS301"
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm uppercase"
              style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2" style={{color: 'var(--text)'}}>
              Course Name
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g., Data Structures & Algorithms"
              className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
              style={{background: 'var(--bg)', border: '1.5px solid var(--border)'}}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg font-bold"
              style={{background: 'var(--bg2)', color: 'var(--text)'}}
            >
              Cancel
            </button>
            <button
              onClick={createAndEnroll}
              disabled={!courseCode || !courseName}
              className="flex-1 py-3 rounded-lg font-bold text-white disabled:opacity-50"
              style={{background: 'var(--accent)'}}
            >
              Add Course
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
