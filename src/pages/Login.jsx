import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } }
      })
      if (error) setError(error.message)
      else setError('✓ Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else navigate('/feed')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg)',
      fontFamily: 'DM Sans, sans-serif',
    }}>

      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 80px',
        background: 'var(--sidebar-bg)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,94,167,0.35) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(155,127,204,0.2) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13,
            background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(123,94,167,0.5)',
          }}>
            <span style={{ color: 'white', fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif' }}>U</span>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: 'white', letterSpacing: '-0.5px' }}>univio</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 42, color: 'white', lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-1px' }}>
          Study smarter.<br />
          <span style={{ color: '#9B7FCC' }}>Connect better.</span>
        </h1>
        <p style={{ color: 'var(--sidebar-text)', fontSize: 16, lineHeight: 1.6, maxWidth: 340, margin: '0 0 48px' }}>
          Find study partners, rate the best spots in Budapest, and build your academic network.
        </p>

        {/* Feature pills */}
        {[
          { icon: '🗺️', text: 'Real-time study spot ratings' },
          { icon: '🤝', text: 'Course-based peer matching' },
          { icon: '💬', text: 'Direct & group messaging' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'rgba(123,94,167,0.2)', border: '1px solid rgba(123,94,167,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>{icon}</div>
            <span style={{ color: 'var(--sidebar-text)', fontSize: 14 }}>{text}</span>
          </div>
        ))}
      </div>

      {/* Right panel — form */}
      <div style={{
        width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 48px',
        background: 'var(--bg)',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text)', margin: '0 0 6px' }}>
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 32px' }}>
            {isSignUp ? 'Join thousands of students on Univio' : 'Sign in to your account'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isSignUp && (
              <Field label="Full name" type="text" value={fullName} onChange={setFullName} placeholder="Your name" required />
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu" required />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" required />

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, fontSize: 13,
                background: error.includes('✓') ? '#F0FDF4' : '#FEF2F2',
                color:      error.includes('✓') ? '#166534' : '#991B1B',
                border:     `1px solid ${error.includes('✓') ? '#BBF7D0' : '#FECACA'}`,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #7B5EA7, #9B7FCC)',
                color: 'white', fontWeight: 700, fontSize: 15,
                fontFamily: 'DM Sans, sans-serif',
                boxShadow: '0 4px 16px rgba(123,94,167,0.35)',
                opacity: loading ? 0.7 : 1,
                marginTop: 4,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(123,94,167,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(123,94,167,0.35)' }}
            >
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 24 }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: 13 }}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, required }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6, letterSpacing: '0.3px' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '11px 14px', borderRadius: 10,
          border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border)'}`,
          background: focused ? 'white' : 'var(--bg)',
          outline: 'none', fontSize: 14, color: 'var(--text)',
          boxShadow: focused ? '0 0 0 3px var(--accent-glow)' : 'none',
          transition: 'all 0.15s ease',
        }}
      />
    </div>
  )
}
