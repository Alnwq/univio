import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate, useParams } from 'react-router-dom'

export default function CourseDetail() {
  const [user, setUser] = useState(null)
  const [course, setCourse] = useState(null)
  const [classmates, setClassmates] = useState([])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [events, setEvents] = useState([])
  const bottomRef = useRef(null)
  const { courseCode } = useParams()
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)

      // Load course
      const { data: courseData } = await supabase
        .from('course_groups')
        .select('*')
        .eq('course_code', courseCode)
        .single()
      setCourse(courseData)

      // Load classmates
      const { data: enrollments } = await supabase
        .from('user_courses')
        .select('user_id')
        .eq('course_code', courseCode)

      const userIds = enrollments?.map(e => e.user_id) || []
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)
      setClassmates(profiles || [])

      // Load messages for this course
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('course_code', courseCode)
        .order('created_at', { ascending: true })
      setMessages(msgs || [])

      // Load course events
      const { data: courseEvents } = await supabase
        .from('events')
        .select('*')
        .eq('category', courseCode)
        .order('event_date', { ascending: true })
      setEvents(courseEvents || [])

      // Poll for new messages
      const pollInterval = setInterval(async () => {
        const { data: newMsgs } = await supabase
          .from('messages')
          .select('*')
          .eq('course_code', courseCode)
          .order('created_at', { ascending: true })
        
        if (newMsgs && newMsgs.length > messages.length) {
          setMessages(newMsgs)
        }
      }, 2000)

      return () => clearInterval(pollInterval)
    }

    init()
  }, [courseCode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    await supabase.from('messages').insert({
      room_id: courseCode, // Using course code as room
      user_id: user.id,
      content: newMessage.trim(),
      course_code: courseCode
    })

    setNewMessage('')
  }

  const profilesMap = {}
  classmates.forEach(p => profilesMap[p.id] = p)

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Course Header */}
      <div 
        className="p-6 border-b"
        style={{background: 'linear-gradient(135deg, #7C6AF0 0%, #9B88F8 100%)', borderColor: '#E5E5E5'}}
      >
        <button
          onClick={() => navigate('/courses')}
          className="text-white opacity-80 hover:opacity-100 mb-4 text-sm"
        >
          ← Back to Courses
        </button>
        <div className="text-xs font-bold uppercase tracking-wide mb-2 text-white opacity-80">
          {course?.course_code}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {course?.course_name}
        </h1>
        <p className="text-white opacity-90">
          {classmates.length} students · {messages.length} messages · {events.length} upcoming events
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-0">
        
        {/* Left: Study Group Chat */}
        <div className="lg:col-span-2 flex flex-col border-r" style={{borderColor: '#E5E5E5'}}>
          <div className="p-4 border-b" style={{background: 'white', borderColor: '#E5E5E5'}}>
            <h2 className="font-bold" style={{color: '#1A1824'}}>
              💬 Study Group Chat
            </h2>
            <p className="text-xs" style={{color: '#7A788F'}}>
              Discuss assignments, share resources, plan study sessions
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" style={{background: '#FAF8F4'}}>
            {messages.length === 0 ? (
              <div className="text-center py-12" style={{color: '#7A788F'}}>
                <p className="text-lg font-bold mb-2">No messages yet</p>
                <p className="text-sm">Be the first to start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => {
                  const sender = profilesMap[msg.user_id]
                  const isOwn = msg.user_id === user?.id
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)'}}
                      >
                        {sender?.full_name?.[0] || sender?.email?.[0] || '?'}
                      </div>
                      <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                        <span className="text-xs mb-1" style={{color: '#B0AFBF'}}>
                          {sender?.full_name || sender?.email}
                        </span>
                        <div 
                          className="px-4 py-2 rounded-2xl text-sm"
                          style={{
                            background: isOwn ? '#7C6AF0' : 'white',
                            color: isOwn ? 'white' : '#1A1824'
                          }}
                        >
                          {msg.content}
                        </div>
                        <span className="text-xs mt-1" style={{color: '#B0AFBF'}}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Message Input */}
          <form 
            onSubmit={sendMessage}
            className="p-4 border-t flex gap-3"
            style={{background: 'white', borderColor: '#E5E5E5'}}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Message your classmates..."
              className="flex-1 rounded-xl px-4 py-3 outline-none border text-sm"
              style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5'}}
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-bold text-white"
              style={{background: '#7C6AF0'}}
            >
              Send
            </button>
          </form>
        </div>

        {/* Right: Classmates & Events */}
        <div className="flex flex-col overflow-y-auto" style={{background: 'white'}}>
          
          {/* Classmates */}
          <div className="p-4 border-b" style={{borderColor: '#E5E5E5'}}>
            <h3 className="font-bold mb-3" style={{color: '#1A1824'}}>
              👥 Classmates ({classmates.length})
            </h3>
            <div className="space-y-2">
              {classmates.slice(0, 10).map(classmate => (
                <div key={classmate.id} className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shrink-0"
                    style={{background: 'linear-gradient(135deg, #7C6AF0, #9B88F8)'}}
                  >
                    {classmate.full_name?.[0] || classmate.email?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{color: '#1A1824'}}>
                      {classmate.full_name || classmate.email}
                    </p>
                    <p className="text-xs truncate" style={{color: '#7A788F'}}>
                      {classmate.major || 'Student'}
                    </p>
                  </div>
                </div>
              ))}
              {classmates.length > 10 && (
                <button 
                  onClick={() => navigate('/people')}
                  className="text-sm font-bold w-full text-left"
                  style={{color: '#7C6AF0'}}
                >
                  View all {classmates.length} students →
                </button>
              )}
            </div>
          </div>

          {/* Events */}
          <div className="p-4">
            <h3 className="font-bold mb-3" style={{color: '#1A1824'}}>
              📅 Upcoming Events
            </h3>
            {events.length === 0 ? (
              <p className="text-sm text-center py-4" style={{color: '#7A788F'}}>
                No events yet
              </p>
            ) : (
              <div className="space-y-3">
                {events.map(event => {
                  const date = new Date(event.event_date)
                  return (
                    <div 
                      key={event.id}
                      className="p-3 rounded-lg"
                      style={{background: '#FAF8F4'}}
                    >
                      <p className="font-bold text-sm mb-1" style={{color: '#1A1824'}}>
                        {event.title}
                      </p>
                      <p className="text-xs mb-2" style={{color: '#7A788F'}}>
                        {date.toLocaleDateString()} · {event.location}
                      </p>
                      <button 
                        className="text-xs font-bold"
                        style={{color: '#7C6AF0'}}
                      >
                        RSVP →
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
