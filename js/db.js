// Dexie database schema + seed logic
const db = new Dexie('TokyoTripDB');
const SEED_VERSION = 6; // Bump this to force re-seed

db.version(1).stores({
  places: 'id, category, neighborhood, *tags, *memberFit, priority, source',
  itinerary: '++id, dayIndex, placeId, sortOrder, timeSlot, status',
  wishlist: '++id, placeId, done, priority, addedBy',
  members: 'id',
  settings: 'key'
});

// Seed the database on first load or when seed version changes
async function seedDatabase() {
  const seedSetting = await db.settings.get('seedVersion');
  if (seedSetting && seedSetting.value >= SEED_VERSION) return;

  console.log('Seeding database (v' + SEED_VERSION + ')...');

  // Clear existing preset data for clean re-seed
  await db.places.where('source').equals('preset').delete();
  await db.itinerary.clear();

  // Load JSON data files
  const [attractions, restaurants, mtFuji, neighborhoods] = await Promise.all([
    fetch('data/attractions.json').then(r => r.json()),
    fetch('data/restaurants.json').then(r => r.json()),
    fetch('data/mt-fuji.json').then(r => r.json()),
    fetch('data/neighborhoods.json').then(r => r.json())
  ]);

  // Combine all places and insert
  const allPlaces = [...attractions, ...restaurants, ...mtFuji];
  await db.places.bulkPut(allPlaces);

  // Insert default family members (won't overwrite if exist)
  await db.members.bulkPut([
    { id: 'dad', name: 'Dad', emoji: '👨', active: true },
    { id: 'mom', name: 'Mom', emoji: '👩', active: true },
    { id: 'kid', name: 'Kid', emoji: '👦', active: true }
  ]);

  // Store neighborhoods + settings
  await db.settings.put({ key: 'neighborhoods', value: neighborhoods });
  await db.settings.put({ key: 'seedVersion', value: SEED_VERSION });
  await db.settings.put({ key: 'dbSeeded', value: true });
  await db.settings.put({ key: 'gpsEnabled', value: true });

  // === SEED ITINERARY ===
  // Trip: Sat Mar 14 (depart SIN) → Sun Mar 22 (arrive SIN)
  // Day 0 = Mar 14 Sat, Day 1 = Mar 15 Sun, ... Day 8 = Mar 22 Sun

  const itineraryItems = [
    // Day 0 — Sat Mar 14: Depart Singapore late night
    { dayIndex: 0, placeId: null, sortOrder: 0, customName: '🧳 Final packing & head to Changi', timeSlot: 'evening', startTime: '20:00', notes: 'Aim to reach Changi T1 by 20:30. Check in, last Singapore meal at airport.', status: 'planned' },
    { dayIndex: 0, placeId: 't1', sortOrder: 1, customName: '', timeSlot: 'evening', startTime: '23:20', notes: '✈️ Scoot TR808 departs SIN 23:20. Red-eye to Tokyo! Try to sleep on the plane. Arrives NRT 07:10 Sun.', status: 'planned' },

    // Day 1 — Sun Mar 15: Arrive NRT 7:10am, ease into Tokyo
    { dayIndex: 1, placeId: 't1', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '07:10', notes: '✈️ Land at Narita 7:10am. Immigration + bags. Buy Suica cards + Narita Express to central Tokyo (~1h).', status: 'planned' },
    { dayIndex: 1, placeId: 'r13', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '09:30', notes: 'Grab onigiri & coffee at first konbini! Recover from red-eye.', status: 'planned' },
    { dayIndex: 1, placeId: null, sortOrder: 2, customName: '🏨 Check in / drop bags at hotel', timeSlot: 'morning', startTime: '10:30', notes: 'Most hotels allow early bag storage even if room not ready yet.', status: 'planned' },
    { dayIndex: 1, placeId: 'a1', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '14:00', notes: 'Walk through Kaminarimon gate & Nakamise-dori. Gentle first outing!', status: 'planned' },
    { dayIndex: 1, placeId: 'r14', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '15:30', notes: 'Matcha ice cream and melon pan break on Nakamise', status: 'planned' },
    { dayIndex: 1, placeId: 'a12', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '18:00', notes: 'Watch the famous scramble crossing at sunset!', status: 'planned' },
    { dayIndex: 1, placeId: 'r1', sortOrder: 6, customName: '', timeSlot: 'evening', startTime: '19:00', notes: 'First ramen in Japan!', status: 'planned' },

    // Day 2 — Mon Mar 16: teamLab Borderless + Shibuya (MUST DO)
    { dayIndex: 2, placeId: 'a4', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '10:00', notes: 'MUST DO! Book tickets in advance. Allow 2h+. Mind-blowing digital art. Don\'t miss the En Tea House!', status: 'planned' },
    { dayIndex: 2, placeId: 'r8', sortOrder: 1, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Gyukatsu beef cutlet lunch — cook it yourself on hot stone!', status: 'planned' },
    { dayIndex: 2, placeId: 'a23', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: 'Nintendo Tokyo in Shibuya Parco. Exclusive Mario/Zelda/Splatoon merch!', status: 'planned' },
    { dayIndex: 2, placeId: 'a11', sortOrder: 3, customName: '', timeSlot: 'evening', startTime: '17:30', notes: 'Shibuya Sky for sunset views over Tokyo. Book tickets online.', status: 'planned' },

    // Day 3 — Tue Mar 17: Akihabara + Karting (MUST DO)
    { dayIndex: 3, placeId: 'a6', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '10:00', notes: 'MUST DO! Geek paradise — multi-story arcades (GIGO!), retro game shops, Yodobashi Camera. Allow 2-3h.', status: 'planned' },
    { dayIndex: 3, placeId: 'r18', sortOrder: 1, customName: '', timeSlot: 'afternoon', startTime: '12:30', notes: 'Quick gyoza lunch in Akihabara', status: 'planned' },
    { dayIndex: 3, placeId: 'a37', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '14:00', notes: 'Street karting from Akihabara! Dress up in costumes. Kid rides as passenger. IDP needed to drive!', status: 'planned' },
    { dayIndex: 3, placeId: 'a7', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '16:30', notes: 'Pokemon Center Mega Tokyo in Ikebukuro — biggest in Tokyo!', status: 'planned' },
    { dayIndex: 3, placeId: 'r12', sortOrder: 4, customName: '', timeSlot: 'evening', startTime: '18:30', notes: 'Tiny yakitori bars in atmospheric alley near Shinjuku Station', status: 'planned' },

    // Day 4 — Wed Mar 18: Travel to Shuzenji, check in ryokan 2pm
    { dayIndex: 4, placeId: null, sortOrder: 0, customName: '🚅 Train to Shuzenji', timeSlot: 'morning', startTime: '09:00', notes: 'Tokyo Station → Mishima (Shinkansen ~55min) → Shuzenji (Izuhakone Railway ~35min). Total ~2h.', status: 'planned' },
    { dayIndex: 4, placeId: 'f12', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '11:30', notes: 'Explore the ancient temple that gave the town its name', status: 'planned' },
    { dayIndex: 4, placeId: 'f15', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '12:00', notes: 'Stroll through the bamboo-lined path. Mini Arashiyama without crowds!', status: 'planned' },
    { dayIndex: 4, placeId: 'f14', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '12:30', notes: 'See Izu\'s oldest hot spring in the middle of Katsura River', status: 'planned' },
    { dayIndex: 4, placeId: 'f11', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '14:00', notes: 'CHECK IN Yagyu-no-Sho. Private onsen baths, kaiseki dinner included. Pure relaxation!', status: 'planned' },

    // Day 5 — Thu Mar 19: Check out Shuzenji 11am, travel back to Tokyo
    { dayIndex: 5, placeId: 'f11', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '07:00', notes: 'Morning onsen bath & ryokan breakfast. Savour it! CHECK OUT by 11am.', status: 'planned' },
    { dayIndex: 5, placeId: null, sortOrder: 1, customName: '🚅 Train back to Tokyo', timeSlot: 'morning', startTime: '11:30', notes: 'Shuzenji → Mishima → Tokyo Station. ~2h. Arrive Tokyo ~1:30pm.', status: 'planned' },

    // Day 7 — Sat Mar 21: Last day in Tokyo, flight departs NRT 21:05
    { dayIndex: 7, placeId: null, sortOrder: 0, customName: '🧳 Pack & check out of hotel', timeSlot: 'morning', startTime: '10:00', notes: 'Pack everything. Store luggage at Tokyo Station coin lockers if needed.', status: 'planned' },
    { dayIndex: 7, placeId: null, sortOrder: 1, customName: '🛒 Last-minute souvenir shopping', timeSlot: 'afternoon', startTime: '13:00', notes: 'Tokyo Station underground mall (Character Street, Ramen Street) or Don Quijote.', status: 'planned' },
    { dayIndex: 7, placeId: null, sortOrder: 2, customName: '🚃 Narita Express to NRT', timeSlot: 'evening', startTime: '17:30', notes: 'NEX from Tokyo Station ~1h. Aim to arrive NRT by 18:30 (2.5h before flight).', status: 'planned' },
    { dayIndex: 7, placeId: 't2', sortOrder: 3, customName: '', timeSlot: 'evening', startTime: '21:05', notes: 'NQ113 departs Narita 21:05. Arrives Singapore Changi 03:45 Mar 22. Sayonara Tokyo!', status: 'planned' }
  ];

  // Insert all itinerary items one-by-one to avoid batch errors
  for (const item of itineraryItems) {
    try {
      await db.itinerary.add(item);
    } catch (e) {
      console.warn('Failed to seed itinerary item:', item.customName || item.placeId, e);
    }
  }

  console.log('Database seeded:', allPlaces.length, 'places,', itineraryItems.length, 'itinerary items');
}
