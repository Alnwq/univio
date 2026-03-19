import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_JS  = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

function loadLeaflet() {
  return new Promise((resolve) => {
    if (window.L) return resolve(window.L)
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'; link.href = LEAFLET_CSS
      document.head.appendChild(link)
    }
    const script = document.createElement('script')
    script.src = LEAFLET_JS
    script.onload = () => resolve(window.L)
    document.head.appendChild(script)
  })
}

function scoreSpots(spots, spotRatings, spotCheckins, userPrefs) {
  if (!userPrefs) return spots.map(s => ({ spot: s, score: 0, reasons: [] }))
  return spots.map(spot => {
    const amenities = spot.amenities || {}
    const rating    = spotRatings[spot.id]
    const checkins  = (spotCheckins[spot.id] || []).length
    let score = 0
    const reasons = []
    const prefMap = [
      { key: 'wifi',    label: 'WiFi available',       pts: 10 },
      { key: 'outlets', label: 'power outlets',         pts: 10 },
      { key: 'quiet',   label: 'quiet environment',     pts: 10 },
      { key: 'food',    label: 'food & drinks nearby',  pts: 10 },
    ]
    prefMap.forEach(({ key, label, pts }) => {
      if (userPrefs[key] && amenities[key]) { score += pts; reasons.push(label) }
    })
    if (rating) {
      score += ((parseFloat(rating.overall) - 1) / 4) * 35
      if (parseFloat(rating.overall) >= 4.5) reasons.push('S-tier rated (' + rating.overall + '★)')
      else if (parseFloat(rating.overall) >= 4.0) reasons.push('highly rated (' + rating.overall + '★)')
    }
    if (checkins === 0)       { score += 10 }
    else if (checkins <= 4)   { score += 25; reasons.push(checkins + ' student' + (checkins > 1 ? 's' : '') + ' here now') }
    else if (checkins <= 8)   { score += 15; reasons.push(checkins + ' students here') }
    else                      { score += 5;  reasons.push(checkins + ' students — crowded') }
    return { spot, score: Math.round(score), reasons }
  }).sort((a, b) => b.score - a.score)
}

const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null

function getTier(rating) {
  const r = parseFloat(rating)
  if (r >= 4.5) return { tier: 'S', color: '#F59E0B', bg: '#FEF3C7', label: 'S-Tier' }
  if (r >= 4.0) return { tier: 'A', color: '#10B981', bg: '#D1FAE5', label: 'A-Tier' }
  if (r >= 3.0) return { tier: 'B', color: '#3B82F6', bg: '#DBEAFE', label: 'B-Tier' }
  return           { tier: 'C', color: '#94A3B8', bg: '#F1F5F9', label: 'C-Tier' }
}

function catIcon(cat) {
  return { library: '📚', cafe: '☕', campus: '🏛️', coworking: '💼' }[cat] || '📍'
}

export default function StudyMap() {
  const [user,           setUser]           = useState(null)
  const [profile,        setProfile]        = useState(null)
  const [spots,          setSpots]          = useState([])
  const [spotRatings,    setSpotRatings]    = useState({})
  const [spotCheckins,   setSpotCheckins]   = useState({})
  const [profiles,       setProfiles]       = useState({})
  const [selectedSpot,   setSelectedSpot]   = useState(null)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [showPrefForm,   setShowPrefForm]   = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterAmenity,  setFilterAmenity]  = useState('all')
  const [activeView,     setActiveView]     = useState('map')
  const [leafletReady,   setLeafletReady]   = useState(false)
  const navigate = useNavigate()
  const mapRef      = useRef(null)
  const mapInstance = useRef(null)
  const markersRef  = useRef({})

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return navigate('/')
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      const { data: ap } = await supabase.from('profiles').select('*')
      const pm = {}; ap?.forEach(p => (pm[p.id] = p)); setProfiles(pm)
      await loadLeaflet()
      setLeafletReady(true)
      loadSpots()
    }
    init()
    const iv = setInterval(loadSpots, 5000)
    return () => clearInterval(iv)
  }, [])

  const loadSpots = async () => {
    const { data: spotsData } = await supabase.from('study_spots').select('*')
    setSpots(spotsData || [])
    const ratings = {}
    for (const spot of spotsData || []) {
      const { data: rd } = await supabase.from('spot_ratings').select('*').eq('spot_id', spot.id)
      if (rd?.length) {
        ratings[spot.id] = {
          overall: avg(rd.map(r => r.overall_rating)),
          wifi:    avg(rd.map(r => r.wifi_rating)),
          noise:   avg(rd.map(r => r.noise_rating)),
          outlets: avg(rd.map(r => r.outlet_rating)),
          comfort: avg(rd.map(r => r.comfort_rating)),
          count:   rd.length, reviews: rd,
        }
      }
    }
    setSpotRatings(ratings)
    const { data: cd } = await supabase.from('spot_checkins').select('*').is('checked_out_at', null)
    const bySpot = {}
    cd?.forEach(c => { if (!bySpot[c.spot_id]) bySpot[c.spot_id] = []; bySpot[c.spot_id].push(c) })
    setSpotCheckins(bySpot)
  }

  const reloadProfile = async () => {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)
  }

  useEffect(() => {
    if (!leafletReady || !mapRef.current || spots.length === 0 || activeView !== 'map') return
    const L = window.L
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current, { center: [47.4979, 19.0527], zoom: 14 })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapInstance.current)
    } else {
      setTimeout(() => mapInstance.current?.invalidateSize(), 100)
    }
    Object.values(markersRef.current).forEach(m => m.remove())
    markersRef.current = {}
    spots.forEach(spot => {
      if (!spot.latitude || !spot.longitude) return
      const rating   = spotRatings[spot.id]
      const checkins = (spotCheckins[spot.id] || []).length
      const tier     = rating ? getTier(rating.overall) : null
      const icon = L.divIcon({
        className: '',
        html: '<div style="position:relative;width:44px;height:44px"><div style="width:44px;height:44px;border-radius:50%;background:' + (tier ? tier.color : 'var(--accent)') + ';border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:white;cursor:pointer">' + (checkins > 0 ? checkins : catIcon(spot.category)) + '</div>' + (tier ? '<div style="position:absolute;top:-7px;right:-7px;width:20px;height:20px;border-radius:50%;background:' + tier.bg + ';color:' + tier.color + ';font-size:9px;font-weight:800;border:2px solid white;display:flex;align-items:center;justify-content:center">' + tier.tier + '</div>' : '') + '</div>',
        iconSize: [44, 44], iconAnchor: [22, 22],
      })
      markersRef.current[spot.id] = L.marker([spot.latitude, spot.longitude], { icon })
        .addTo(mapInstance.current)
        .on('click', () => setSelectedSpot(spot))
    })
  }, [leafletReady, spots, spotRatings, spotCheckins, activeView])

  useEffect(() => {
    if (!selectedSpot || !mapInstance.current) return
    mapInstance.current.flyTo([selectedSpot.latitude, selectedSpot.longitude], 16, { animate: true, duration: 0.8 })
  }, [selectedSpot])

  const checkIn = async (spotId) => {
    await supabase.from('spot_checkins').update({ checked_out_at: new Date().toISOString() }).eq('user_id', user.id).is('checked_out_at', null)
    await supabase.from('spot_checkins').insert({ spot_id: spotId, user_id: user.id, status: 'available' })
    loadSpots()
  }
  const checkOut = async () => {
    await supabase.from('spot_checkins').update({ checked_out_at: new Date().toISOString() }).eq('user_id', user.id).is('checked_out_at', null)
    loadSpots()
  }

  let filtered = spots
  if (filterCategory !== 'all') filtered = filtered.filter(s => s.category === filterCategory)
  if (filterAmenity  !== 'all') filtered = filtered.filter(s => s.amenities?.[filterAmenity] === true)
  const sorted = [...filtered].sort((a, b) =>
    (parseFloat(spotRatings[b.id]?.overall) || 0) - (parseFloat(spotRatings[a.id]?.overall) || 0)
  )
  const sTier   = sorted.filter(s => parseFloat(spotRatings[s.id]?.overall || 0) >= 4.5)
  const aTier   = sorted.filter(s => { const r = parseFloat(spotRatings[s.id]?.overall || 0); return r >= 4.0 && r < 4.5 })
  const bTier   = sorted.filter(s => { const r = parseFloat(spotRatings[s.id]?.overall || 0); return r >= 3.0 && r < 4.0 })
  const cTier   = sorted.filter(s => parseFloat(spotRatings[s.id]?.overall || 0) < 3.0 && spotRatings[s.id])
  const unrated = sorted.filter(s => !spotRatings[s.id])

  const userPrefs   = profile?.study_preferences || null
  const recommended = scoreSpots(spots, spotRatings, spotCheckins, userPrefs).slice(0, 3)
  const hasPrefs    = userPrefs && Object.values(userPrefs).some(Boolean)

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0, background: 'var(--bg)' }}>
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
             style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {['map', 'tierlist'].map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition"
              style={{ background: activeView === v ? 'var(--accent)' : 'var(--bg2)', color: activeView === v ? 'white' : 'var(--text-muted)' }}>
              {v === 'map' ? '🗺️ Map View' : '🏆 Tier List'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, display: activeView === 'map' ? 'block' : 'none', minHeight: 0, position: 'relative' }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '400px' }} />
          {!leafletReady && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#F0EDF8' }}>
              <div style={{ textAlign: 'center', color: 'var(--accent)' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🗺️</div>
                <p style={{ fontWeight: 600 }}>Loading map…</p>
              </div>
            </div>
          )}
        </div>

        {activeView === 'tierlist' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-muted)' }}>
                Community Rankings · {Object.values(spotRatings).reduce((a, r) => a + r.count, 0)} ratings total
              </p>
              <div className="space-y-3">
                {[
                  { tier: 'S', spots: sTier,   color: '#F59E0B', g1: '#FEF3C7', g2: '#FDE68A', label: 'BEST OF THE BEST' },
                  { tier: 'A', spots: aTier,   color: '#10B981', g1: '#D1FAE5', g2: '#A7F3D0', label: 'GREAT SPOTS' },
                  { tier: 'B', spots: bTier,   color: '#3B82F6', g1: '#DBEAFE', g2: '#BFDBFE', label: 'SOLID CHOICES' },
                  { tier: 'C', spots: cTier,   color: '#94A3B8', g1: '#F1F5F9', g2: '#E2E8F0', label: 'OKAY' },
                  { tier: '?', spots: unrated, color: '#CBD5E1', g1: '#F8FAFC', g2: '#F1F5F9', label: 'UNRATED' },
                ].map(({ tier, spots: ts, color, g1, g2, label }) => (
                  <div key={tier} className="flex rounded-2xl overflow-hidden"
                       style={{ border: '2px solid ' + color + '30', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div className="flex items-center justify-center flex-shrink-0"
                         style={{ width: 70, background: 'linear-gradient(135deg,' + g1 + ',' + g2 + ')', minHeight: 80 }}>
                      <span style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>{tier}</span>
                    </div>
                    <div className="flex-1 p-3" style={{ background: 'var(--card)' }}>
                      {ts.length === 0
                        ? <p className="text-sm py-4 text-center" style={{ color: '#E2E8F0' }}>No spots yet</p>
                        : <div className="flex flex-wrap gap-2 items-center py-1">
                            {ts.map(spot => {
                              const r = spotRatings[spot.id]
                              const c = (spotCheckins[spot.id] || []).length
                              return (
                                <button key={spot.id}
                                  onClick={() => { setSelectedSpot(spot); setActiveView('map') }}
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition hover:shadow-md"
                                  style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--text)' }}>
                                  {catIcon(spot.category)} {spot.name}
                                  {r && <span style={{ color: '#F59E0B', fontSize: 11 }}>★{r.overall}</span>}
                                  {c > 0 && <span style={{ color: 'var(--accent)', fontSize: 11 }}>👥{c}</span>}
                                </button>
                              )
                            })}
                          </div>
                      }
                    </div>
                    <div className="flex items-center justify-center px-3 flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg,' + g1 + ',' + g2 + ')', writingMode: 'vertical-rl', fontSize: 9, fontWeight: 800, color, letterSpacing: 2 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col border-l" style={{ width: 340, background: 'var(--card)', borderColor: 'var(--border)', minHeight: 0, overflow: 'hidden' }}>
        <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>🎯 Best For You Right Now</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {hasPrefs ? 'Live data + your preferences' : 'Set preferences for personalised picks'}
                </p>
              </div>
              <button onClick={() => setShowPrefForm(true)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                      style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                {hasPrefs ? 'Edit' : 'Set up'}
              </button>
            </div>
            {!hasPrefs ? (
              <button onClick={() => setShowPrefForm(true)}
                      className="w-full rounded-xl p-3 text-sm text-left"
                      style={{ background: 'var(--bg)', border: '1.5px dashed #D8D0FF' }}>
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>+ Set your study preferences</span><br />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>WiFi, quiet, outlets, food — we'll rank spots for you</span>
              </button>
            ) : (
              <div className="space-y-2">
                {recommended.map(({ spot, score, reasons }, i) => {
                  const rating   = spotRatings[spot.id]
                  const checkins = (spotCheckins[spot.id] || []).length
                  const tier     = rating ? getTier(rating.overall) : null
                  const medals   = ['🥇', '🥈', '🥉']
                  return (
                    <button key={spot.id}
                      onClick={() => { setSelectedSpot(spot); setActiveView('map') }}
                      className="w-full text-left rounded-xl p-3 transition hover:shadow-md"
                      style={{ background: i === 0 ? '#FFFBEB' : 'var(--bg)', border: '1.5px solid ' + (i === 0 ? '#FDE68A' : 'var(--border)') }}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 16 }}>{medals[i]}</span>
                          <span className="font-bold text-sm" style={{ color: 'var(--text)' }}>{spot.name}</span>
                        </div>
                        <div className="flex gap-1 flex-shrink-0 ml-1">
                          {tier && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: tier.bg, color: tier.color }}>{tier.tier}</span>}
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{score}%</span>
                        </div>
                      </div>
                      {reasons.length > 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{reasons.slice(0, 2).join(' · ')}</p>}
                      {checkins > 0 && <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent)' }}>👥 {checkins} here now</p>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-2">
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    className="flex-1 rounded-lg px-2 py-2 text-xs outline-none"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
              <option value="all">All types</option>
              <option value="library">📚 Library</option>
              <option value="cafe">☕ Café</option>
              <option value="campus">🏛️ Campus</option>
              <option value="coworking">💼 Coworking</option>
            </select>
            <select value={filterAmenity} onChange={e => setFilterAmenity(e.target.value)}
                    className="flex-1 rounded-lg px-2 py-2 text-xs outline-none"
                    style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }}>
              <option value="all">All amenities</option>
              <option value="wifi">📶 WiFi</option>
              <option value="outlets">🔌 Outlets</option>
              <option value="food">☕ Food</option>
              <option value="quiet">🔇 Quiet</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span style={{ fontSize: 36 }}>📍</span>
              <p className="font-bold mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>No spots match</p>
            </div>
          )}
          {sorted.map(spot => {
            const rating     = spotRatings[spot.id]
            const checkins   = spotCheckins[spot.id] || []
            const tier       = rating ? getTier(rating.overall) : null
            const isSelected = selectedSpot?.id === spot.id
            return (
              <button key={spot.id}
                onClick={() => { setSelectedSpot(spot); if (activeView === 'tierlist') setActiveView('map') }}
                className="w-full text-left rounded-xl p-3 transition"
                style={{ background: isSelected ? 'var(--accent-light)' : 'var(--bg)', border: '1.5px solid ' + (isSelected ? 'var(--accent)' : 'var(--border)') }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span style={{ fontSize: 13 }}>{catIcon(spot.category)}</span>
                      <span className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{spot.name}</span>
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{spot.address}</p>
                  </div>
                  {tier
                    ? <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: tier.bg, color: tier.color }}>{tier.tier} {rating.overall}★</span>
                    : <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: '#F1F5F9', color: '#CBD5E1' }}>unrated</span>
                  }
                </div>
                {checkins.length > 0 && <p className="text-xs mt-1.5 font-semibold" style={{ color: 'var(--accent)' }}>👥 {checkins.length} here now</p>}
              </button>
            )
          })}
        </div>
      </div>

      {selectedSpot && (
        <SpotDetailModal
          spot={selectedSpot} rating={spotRatings[selectedSpot.id]}
          checkins={spotCheckins[selectedSpot.id] || []} profiles={profiles}
          user={user} onClose={() => setSelectedSpot(null)}
          onCheckIn={checkIn} onCheckOut={checkOut} onRate={() => setShowRatingForm(true)}
        />
      )}
      {showRatingForm && selectedSpot && (
        <RatingFormModal spot={selectedSpot} user={user}
          onClose={() => setShowRatingForm(false)}
          onSubmit={() => { setShowRatingForm(false); loadSpots() }} />
      )}
      {showPrefForm && (
        <PreferencesModal user={user} currentPrefs={userPrefs}
          onClose={() => setShowPrefForm(false)}
          onSave={() => { setShowPrefForm(false); reloadProfile() }} />
      )}
    </div>
  )
}

function PreferencesModal({ user, currentPrefs, onClose, onSave }) {
  const [prefs, setPrefs] = useState({
    wifi: currentPrefs?.wifi || false, outlets: currentPrefs?.outlets || false,
    quiet: currentPrefs?.quiet || false, food: currentPrefs?.food || false,
  })
  const toggle = key => setPrefs(p => ({ ...p, [key]: !p[key] }))
  const save = async () => {
    await supabase.from('profiles').update({ study_preferences: prefs }).eq('id', user.id)
    onSave()
  }
  const options = [
    { key: 'wifi',    icon: '📶', label: 'Good WiFi',         desc: 'Reliable internet is a must' },
    { key: 'outlets', icon: '🔌', label: 'Power Outlets',     desc: 'Need to keep my laptop charged' },
    { key: 'quiet',   icon: '🔇', label: 'Quiet Environment', desc: 'I focus better without noise' },
    { key: 'food',    icon: '☕', label: 'Food & Drinks',     desc: 'Coffee or snacks nearby' },
  ]
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 max-w-md w-full" style={{ background: 'var(--card)' }}
           onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Study Preferences</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          We combine your preferences with live check-in data to rank spots for you right now.
        </p>
        <div className="space-y-3 mb-6">
          {options.map(({ key, icon, label, desc }) => (
            <button key={key} onClick={() => toggle(key)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition"
                    style={{ background: prefs[key] ? 'var(--accent-light)' : 'var(--bg)', border: '2px solid ' + (prefs[key] ? 'var(--accent)' : 'var(--border)') }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: prefs[key] ? 'var(--accent)' : 'var(--border)' }}>
                {prefs[key] && <span style={{ color: 'var(--card)', fontSize: 14 }}>✓</span>}
              </div>
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--bg2)', color: 'var(--text)' }}>Cancel</button>
          <button onClick={save} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: 'var(--accent)' }}>Save Preferences</button>
        </div>
      </div>
    </div>
  )
}

function SpotDetailModal({ spot, rating, checkins, profiles, user, onClose, onCheckIn, onCheckOut, onRate }) {
  const amenities   = spot.amenities || {}
  const isCheckedIn = checkins.some(c => c.user_id === user?.id)
  const tier        = rating ? getTier(rating.overall) : null
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
           style={{ background: 'var(--card)' }} onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{spot.name}</h2>
                {tier && <span className="px-2 py-1 rounded-lg text-sm font-bold" style={{ background: tier.bg, color: tier.color }}>{tier.label}</span>}
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{spot.address}</p>
              {spot.description && <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>{spot.description}</p>}
            </div>
            <button onClick={onClose} className="text-2xl ml-4" style={{ color: 'var(--text-muted)' }}>×</button>
          </div>
          {rating ? (
            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <div className="text-4xl font-bold" style={{ color: '#F59E0B' }}>{rating.overall}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{rating.count} reviews</div>
              </div>
              <div className="flex-1 space-y-1.5">
                <RatingBar label="WiFi"    value={rating.wifi} />
                <RatingBar label="Quiet"   value={(5 - parseFloat(rating.noise) + 1).toFixed(1)} />
                <RatingBar label="Outlets" value={rating.outlets} />
                <RatingBar label="Comfort" value={rating.comfort} />
              </div>
            </div>
          ) : (
            <div className="mt-3 px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--bg)', color: 'var(--text-muted)' }}>
              No ratings yet — be the first to review!
            </div>
          )}
        </div>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Amenities</h3>
          <div className="flex flex-wrap gap-2">
            {amenities.wifi    && <Badge icon="📶" label="WiFi" />}
            {amenities.outlets && <Badge icon="🔌" label="Power Outlets" />}
            {amenities.food    && <Badge icon="☕" label="Food & Drinks" />}
            {amenities.quiet   && <Badge icon="🔇" label="Quiet" />}
          </div>
        </div>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Who's Here ({checkins.length})</h3>
          {checkins.length === 0
            ? <p className="text-sm text-center py-3" style={{ color: 'var(--text-muted)' }}>No one yet — be first! 🎉</p>
            : <div className="space-y-2">
                {checkins.map(c => {
                  const p = profiles[c.user_id]
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm"
                           style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))' }}>
                        {p?.full_name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{p?.full_name || p?.email}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {c.status === 'available' && '🟢 Available'}
                          {c.status === 'busy' && '🟡 Busy'}
                          {c.status === 'deep_work' && '🔴 Deep work'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
          }
        </div>
        {rating?.reviews?.filter(r => r.review_text).length > 0 && (
          <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
            <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Reviews</h3>
            <div className="space-y-3">
              {rating.reviews.filter(r => r.review_text).slice(0, 3).map(r => (
                <div key={r.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{profiles[r.user_id]?.full_name || 'Anonymous'}</p>
                    <span className="text-xs" style={{ color: '#F59E0B' }}>★ {r.overall_rating}</span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{r.review_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="p-6 flex gap-3">
          {isCheckedIn
            ? <button onClick={() => { onCheckOut(); onClose() }} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--bg2)', color: 'var(--text)' }}>Check Out</button>
            : <button onClick={() => { onCheckIn(spot.id); onClose() }} className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: 'var(--accent)' }}>📍 Check In Here</button>
          }
          <button onClick={onRate} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>⭐ Rate This Spot</button>
        </div>
      </div>
    </div>
  )
}

function RatingFormModal({ spot, user, onClose, onSubmit }) {
  const [overall, setOverall] = useState(5)
  const [wifi,    setWifi]    = useState(5)
  const [noise,   setNoise]   = useState(3)
  const [outlets, setOutlets] = useState(5)
  const [comfort, setComfort] = useState(5)
  const [review,  setReview]  = useState('')
  const submit = async (e) => {
    e.preventDefault()
    await supabase.from('spot_ratings').upsert({
      spot_id: spot.id, user_id: user.id, overall_rating: overall,
      wifi_rating: wifi, noise_rating: noise, outlet_rating: outlets,
      comfort_rating: comfort, review_text: review,
    }, { onConflict: 'user_id,spot_id' })
    onSubmit()
  }
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="rounded-2xl p-8 max-w-md w-full" style={{ background: 'var(--card)' }}
           onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>Rate {spot.name}</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Help other students find great spots</p>
        <form onSubmit={submit} className="space-y-4">
          <StarRating label="Overall Rating"            value={overall} onChange={setOverall} />
          <StarRating label="WiFi Quality"              value={wifi}    onChange={setWifi} />
          <StarRating label="Noise (1=quiet · 5=loud)"  value={noise}   onChange={setNoise} />
          <StarRating label="Power Outlets"             value={outlets} onChange={setOutlets} />
          <StarRating label="Comfort"                   value={comfort} onChange={setComfort} />
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>Review (optional)</label>
            <textarea value={review} onChange={e => setReview(e.target.value)} rows="3"
                      placeholder="Share your experience…"
                      className="w-full rounded-lg px-4 py-3 outline-none border text-sm"
                      style={{ background: 'var(--bg)', border: '1.5px solid var(--border)' }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--bg2)', color: 'var(--text)' }}>Cancel</button>
            <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white" style={{ background: 'var(--accent)' }}>Submit Rating</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StarRating({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>{label}</label>
      <div className="flex gap-2">
        {[1,2,3,4,5].map(s => (
          <button key={s} type="button" onClick={() => onChange(s)}
                  className="text-2xl transition hover:scale-110"
                  style={{ color: s <= value ? '#F59E0B' : 'var(--border)' }}>★</button>
        ))}
      </div>
    </div>
  )
}

function RatingBar({ label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-14 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: (parseFloat(value)/5*100) + '%' }} />
      </div>
      <span className="text-xs font-bold w-6 text-right flex-shrink-0" style={{ color: 'var(--accent)' }}>{value}</span>
    </div>
  )
}

function Badge({ icon, label }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
      {icon} {label}
    </span>
  )
}
