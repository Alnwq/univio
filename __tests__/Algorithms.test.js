// Unit tests for the core compatibility matching algorithm
// These test the algorithm logic directly without rendering components

// ── Compatibility engine (copied from People.jsx for isolated testing) ────
function computeCompatibility(myProfile, otherProfile) {
  const myCourses      = myProfile?.courses    || []
  const myInterests    = myProfile?.interests  || []
  const theirCourses   = otherProfile?.courses   || []
  const theirInterests = otherProfile?.interests || []
  const sharedCourses   = myCourses.filter(c => theirCourses.includes(c))
  const sharedInterests = myInterests.filter(i => theirInterests.includes(i))
  const coursesUnion    = [...new Set([...myCourses, ...theirCourses])]
  const interestsUnion  = [...new Set([...myInterests, ...theirInterests])]
  const courseScore     = coursesUnion.length > 0 ? sharedCourses.length / Math.min(coursesUnion.length, 5) : 0
  const interestScore   = interestsUnion.length > 0 ? sharedInterests.length / Math.min(interestsUnion.length, 6) : 0
  const yearScore       = myProfile?.year && otherProfile?.year && myProfile.year === otherProfile.year ? 1 : 0
  const score = Math.round(Math.min((courseScore * 0.50) + (interestScore * 0.30) + (yearScore * 0.20), 1) * 100)
  return { score, sharedCourses, sharedInterests }
}

// ── Study spot recommendation engine (copied from StudyMap.jsx) ──────────
function computeRecommendations(spots, ratings, checkins, prefs) {
  if (!spots.length) return []
  const scored = spots.map(spot => {
    const r = ratings[spot.id]
    const occupancy = (checkins[spot.id] || []).length
    const amenities = spot.amenities || {}
    let prefScore = 0; let prefChecks = 0
    if (prefs.needsWifi)    { prefChecks++; if (amenities.wifi)    prefScore++ }
    if (prefs.needsOutlets) { prefChecks++; if (amenities.outlets) prefScore++ }
    if (prefs.wantsQuiet)   { prefChecks++; if (amenities.quiet)   prefScore++ }
    if (prefs.wantsFood)    { prefChecks++; if (amenities.food)    prefScore++ }
    const prefNorm    = prefChecks > 0 ? prefScore / prefChecks : 0.5
    const ratingNorm  = r ? parseFloat(r.overall) / 5 : 0.3
    let occupancyScore
    if (occupancy === 0)     occupancyScore = prefs.prefersEmpty ? 0.9 : 0.4
    else if (occupancy <= 4) occupancyScore = prefs.prefersEmpty ? 0.5 : 0.9
    else if (occupancy <= 8) occupancyScore = 0.5
    else                     occupancyScore = 0.2
    const total = (prefNorm * 0.40) + (ratingNorm * 0.35) + (occupancyScore * 0.25)
    return { spot, score: total }
  })
  return scored.sort((a, b) => b.score - a.score).slice(0, 3)
}

// ════════════════════════════════════════════════════════════════════════════
// COMPATIBILITY ALGORITHM TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('Compatibility Matching Algorithm', () => {

  const baseProfile = {
    courses:   ['CS301', 'MATH202', 'PHYS101'],
    interests: ['gaming', 'hiking'],
    year:      'Year 3',
  }

  // ── Score range ──────────────────────────────────────────────────────────

  test('score is always between 0 and 100', () => {
    const other = { courses: ['CS301'], interests: ['gaming'], year: 'Year 3' }
    const { score } = computeCompatibility(baseProfile, other)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  test('identical profiles produce maximum score of 100', () => {
    const { score } = computeCompatibility(baseProfile, baseProfile)
    expect(score).toBe(100)
  })

  test('profiles with nothing in common produce low score', () => {
    const other = { courses: ['BIO401'], interests: ['cooking'], year: 'Year 1' }
    const { score } = computeCompatibility(baseProfile, other)
    expect(score).toBeLessThan(20)
  })

  // ── Shared courses ───────────────────────────────────────────────────────

  test('correctly identifies shared courses', () => {
    const other = { courses: ['CS301', 'BIO401'], interests: [], year: 'Year 2' }
    const { sharedCourses } = computeCompatibility(baseProfile, other)
    expect(sharedCourses).toContain('CS301')
    expect(sharedCourses).not.toContain('BIO401')
    expect(sharedCourses).toHaveLength(1)
  })

  test('more shared courses produce higher score', () => {
    const fewShared  = { courses: ['CS301'], interests: [], year: 'Year 1' }
    const manyShared = { courses: ['CS301', 'MATH202', 'PHYS101'], interests: [], year: 'Year 1' }
    const { score: s1 } = computeCompatibility(baseProfile, fewShared)
    const { score: s2 } = computeCompatibility(baseProfile, manyShared)
    expect(s2).toBeGreaterThan(s1)
  })

  test('no shared courses returns empty array', () => {
    const other = { courses: ['ART101', 'MUS202'], interests: [], year: 'Year 1' }
    const { sharedCourses } = computeCompatibility(baseProfile, other)
    expect(sharedCourses).toHaveLength(0)
  })

  // ── Shared interests ─────────────────────────────────────────────────────

  test('correctly identifies shared interests', () => {
    const other = { courses: [], interests: ['gaming', 'cooking'], year: 'Year 1' }
    const { sharedInterests } = computeCompatibility(baseProfile, other)
    expect(sharedInterests).toContain('gaming')
    expect(sharedInterests).not.toContain('cooking')
  })

  // ── Year matching ────────────────────────────────────────────────────────

  test('same year increases score compared to different year', () => {
    const sameYear = { courses: ['CS301'], interests: ['gaming'], year: 'Year 3' }
    const diffYear = { courses: ['CS301'], interests: ['gaming'], year: 'Year 1' }
    const { score: s1 } = computeCompatibility(baseProfile, sameYear)
    const { score: s2 } = computeCompatibility(baseProfile, diffYear)
    expect(s1).toBeGreaterThan(s2)
  })

  // ── Edge cases ───────────────────────────────────────────────────────────

  test('handles profiles with empty courses and interests', () => {
    const empty = { courses: [], interests: [], year: '' }
    const { score } = computeCompatibility(baseProfile, empty)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  test('handles null/undefined profile fields gracefully', () => {
    const partial = { courses: null, interests: undefined, year: null }
    expect(() => computeCompatibility(baseProfile, partial)).not.toThrow()
  })

  test('score is symmetric — A vs B equals B vs A', () => {
    const profileA = { courses: ['CS301', 'MATH202'], interests: ['gaming'], year: 'Year 2' }
    const profileB = { courses: ['CS301', 'BIO401'],  interests: ['gaming', 'hiking'], year: 'Year 3' }
    const { score: ab } = computeCompatibility(profileA, profileB)
    const { score: ba } = computeCompatibility(profileB, profileA)
    expect(ab).toBe(ba)
  })

  // ── Weighted scoring validation ──────────────────────────────────────────

  test('courses (50%) contribute more than interests (30%) to total score', () => {
    // Only shared course, no shared interest, same year
    const onlyCourse = { courses: ['CS301'], interests: ['cooking'], year: 'Year 3' }
    // Only shared interest, no shared course, same year
    const onlyInterest = { courses: ['BIO401'], interests: ['gaming'], year: 'Year 3' }

    const { score: courseScore }    = computeCompatibility(baseProfile, onlyCourse)
    const { score: interestScore }  = computeCompatibility(baseProfile, onlyInterest)
    expect(courseScore).toBeGreaterThan(interestScore)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// RECOMMENDATION ENGINE TESTS
// ════════════════════════════════════════════════════════════════════════════

describe('Study Spot Recommendation Engine', () => {

  const spots = [
    { id: 'spot1', name: 'Central Library',  amenities: { wifi: true, outlets: true, quiet: true, food: false } },
    { id: 'spot2', name: 'Starbucks',        amenities: { wifi: true, outlets: true, quiet: false, food: true } },
    { id: 'spot3', name: 'BME Lab',          amenities: { wifi: true, outlets: false, quiet: true, food: false } },
    { id: 'spot4', name: 'Massolit Cafe',    amenities: { wifi: true, outlets: true, quiet: true, food: true } },
  ]

  const ratings = {
    spot1: { overall: '4.8' },
    spot2: { overall: '3.5' },
    spot3: { overall: '4.2' },
    spot4: { overall: '4.6' },
  }

  const noCheckins = {}
  const defaultPrefs = { needsWifi: true, needsOutlets: false, wantsQuiet: false, wantsFood: false, prefersEmpty: false }

  // ── Basic behaviour ──────────────────────────────────────────────────────

  test('returns at most 3 recommendations', () => {
    const results = computeRecommendations(spots, ratings, noCheckins, defaultPrefs)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  test('returns empty array when no spots provided', () => {
    const results = computeRecommendations([], ratings, noCheckins, defaultPrefs)
    expect(results).toHaveLength(0)
  })

  test('results are sorted by score descending', () => {
    const results = computeRecommendations(spots, ratings, noCheckins, defaultPrefs)
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
    }
  })

  test('each result contains a spot and a numeric score', () => {
    const results = computeRecommendations(spots, ratings, noCheckins, defaultPrefs)
    results.forEach(r => {
      expect(r.spot).toBeDefined()
      expect(typeof r.score).toBe('number')
    })
  })

  // ── Preference matching ──────────────────────────────────────────────────

  test('quiet preference boosts spots with quiet amenity', () => {
    const quietPrefs  = { ...defaultPrefs, wantsQuiet: true }
    const results     = computeRecommendations(spots, ratings, noCheckins, quietPrefs)
    const topSpot     = results[0].spot
    expect(topSpot.amenities.quiet).toBe(true)
  })

  test('food preference boosts spots with food amenity', () => {
    const foodPrefs = { needsWifi: false, needsOutlets: false, wantsQuiet: false, wantsFood: true, prefersEmpty: false }
    const results   = computeRecommendations(spots, ratings, noCheckins, foodPrefs)
    const topSpot   = results[0].spot
    expect(topSpot.amenities.food).toBe(true)
  })

  test('highly rated spots rank higher than poorly rated ones', () => {
    const simpleSpots = [
      { id: 'a', name: 'High Rated', amenities: { wifi: true, quiet: false, outlets: false, food: false } },
      { id: 'b', name: 'Low Rated',  amenities: { wifi: true, quiet: false, outlets: false, food: false } },
    ]
    const simpleRatings = { a: { overall: '4.9' }, b: { overall: '2.0' } }
    const results = computeRecommendations(simpleSpots, simpleRatings, noCheckins, defaultPrefs)
    expect(results[0].spot.id).toBe('a')
  })

  // ── Live occupancy signal ────────────────────────────────────────────────

  test('spots with 1-4 people score higher than empty spots (social preference)', () => {
    const twoSpots = [
      { id: 'empty', name: 'Empty Spot', amenities: { wifi: true } },
      { id: 'lively', name: 'Lively Spot', amenities: { wifi: true } },
    ]
    const sameRating = { empty: { overall: '4.0' }, lively: { overall: '4.0' } }
    const checkinsLively = { lively: ['user1', 'user2'] }
    const socialPrefs = { ...defaultPrefs, prefersEmpty: false }
    const results = computeRecommendations(twoSpots, sameRating, checkinsLively, socialPrefs)
    expect(results[0].spot.id).toBe('lively')
  })

  test('empty spots rank higher when prefersEmpty is true', () => {
    const twoSpots = [
      { id: 'empty',  name: 'Empty Spot',  amenities: { wifi: true } },
      { id: 'crowded', name: 'Crowded Spot', amenities: { wifi: true } },
    ]
    const sameRating = { empty: { overall: '4.0' }, crowded: { overall: '4.0' } }
    const checkinsCrowded = { crowded: ['u1','u2','u3','u4','u5','u6','u7','u8','u9'] }
    const introvertPrefs = { ...defaultPrefs, prefersEmpty: true }
    const results = computeRecommendations(twoSpots, sameRating, checkinsCrowded, introvertPrefs)
    expect(results[0].spot.id).toBe('empty')
  })

  test('very crowded spots (9+ people) score lower than moderately busy ones', () => {
    const twoSpots = [
      { id: 'moderate', name: 'Moderate', amenities: { wifi: true } },
      { id: 'packed',   name: 'Packed',   amenities: { wifi: true } },
    ]
    const sameRating   = { moderate: { overall: '4.0' }, packed: { overall: '4.0' } }
    const checkinsMap  = { moderate: ['u1', 'u2'], packed: Array(10).fill('u') }
    const results = computeRecommendations(twoSpots, sameRating, checkinsMap, defaultPrefs)
    expect(results[0].spot.id).toBe('moderate')
  })

  // ── Unrated spots ────────────────────────────────────────────────────────

  test('handles spots with no ratings without crashing', () => {
    const unratedSpots = [{ id: 'new', name: 'New Spot', amenities: { wifi: true } }]
    expect(() => computeRecommendations(unratedSpots, {}, noCheckins, defaultPrefs)).not.toThrow()
  })

  test('unrated spots still appear in results', () => {
    const unratedSpots = [{ id: 'new', name: 'New Spot', amenities: { wifi: true } }]
    const results = computeRecommendations(unratedSpots, {}, noCheckins, defaultPrefs)
    expect(results.length).toBeGreaterThan(0)
  })
})
