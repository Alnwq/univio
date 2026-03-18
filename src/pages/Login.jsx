import { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      })
      if (error) setError(error.message)
      else setError('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
else navigate('/feed')    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: '#FAF8F4'}}>
      <div className="p-8 rounded-2xl w-full max-w-md" style={{background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,0.08)'}}>
        <h1 className="text-2xl font-bold mb-2" style={{color: '#7C6AF0'}}>
          {isSignUp ? 'Join Univio' : 'Welcome to Univio'}
        </h1>
        <p className="text-sm mb-6" style={{color: '#7A788F'}}>
          {isSignUp ? 'Create your student account' : 'Sign in to connect with students'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="rounded-lg px-4 py-3 outline-none border text-sm"
              style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5', color: '#1A1824'}}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="rounded-lg px-4 py-3 outline-none border text-sm"
            style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5', color: '#1A1824'}}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="rounded-lg px-4 py-3 outline-none border text-sm"
            style={{background: '#FAF8F4', border: '1.5px solid #E5E5E5', color: '#1A1824'}}
            required
          />

          {error && (
            <p className={`text-sm ${error.includes('Check') ? 'text-green-600' : 'text-red-600'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-semibold py-3 rounded-lg transition disabled:opacity-50"
            style={{background: '#7C6AF0', color: 'white'}}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="text-sm mt-4 text-center" style={{color: '#7A788F'}}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="ml-1 hover:underline"
            style={{color: '#7C6AF0'}}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}
