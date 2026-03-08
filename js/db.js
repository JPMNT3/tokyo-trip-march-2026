// Dexie database schema + seed logic
const db = new Dexie('TokyoTripDB');
const SEED_VERSION = 21; // Bump this to force re-seed

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

    // Day 1 — Sun Mar 15: Arrive NRT → Hilton Shinjuku [BASE: HILTON SHINJUKU]
    { dayIndex: 1, placeId: 't1', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '07:10', notes: '✈️ Land at Narita 7:10am. Immigration + bags. Buy Suica cards + Narita Express to Shinjuku (~90min).', status: 'planned' },
    { dayIndex: 1, placeId: 'r13', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '09:00', notes: 'Grab onigiri & coffee at first konbini! Recover from red-eye.', status: 'planned' },
    { dayIndex: 1, placeId: 'r34', sortOrder: 2, customName: '', timeSlot: 'morning', startTime: '09:30', notes: '🧑‍🍳 Benoit\'s pick! Famous French toast cafe near Shinjuku Sanchome. Great morning stop.', status: 'planned' },
    { dayIndex: 1, placeId: null, sortOrder: 3, customName: '🏨 Check in Hilton Tokyo, Shinjuku', timeSlot: 'morning', startTime: '10:30', notes: 'Drop bags at Hilton Tokyo (6-6-2 Nishi-Shinjuku). Early bag storage, room likely ready by 15:00.', status: 'planned' },
    { dayIndex: 1, placeId: 'r35', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '12:00', notes: '🧑‍🍳 Benoit\'s pick! Kyoto-style beef cutlet lunch in Harajuku. Cook on hot stone!', status: 'planned' },
    { dayIndex: 1, placeId: 'a13', sortOrder: 5, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Harajuku is 1 stop from Shinjuku! Kawaii culture, crepes, cotton candy. Great first outing.', status: 'planned' },
    { dayIndex: 1, placeId: 'a43', sortOrder: 6, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: '🧑‍🍳 Benoit\'s pick! Walk Omotesando Avenue — Tokyo\'s Champs-Elysees. Then head to Shibuya.', status: 'planned' },
    { dayIndex: 1, placeId: 'a12', sortOrder: 7, customName: '', timeSlot: 'afternoon', startTime: '15:30', notes: 'Walk from Omotesando to Shibuya (15min). Watch the famous scramble crossing!', status: 'planned' },
    { dayIndex: 1, placeId: 'r1', sortOrder: 8, customName: '', timeSlot: 'evening', startTime: '18:00', notes: 'Ichiran in Shibuya — first ramen in Japan! 10min train back to Hilton.', status: 'planned' },
    { dayIndex: 1, placeId: null, sortOrder: 9, customName: '🚶 Walk to Hilton (10min from Shinjuku Stn)', timeSlot: 'evening', startTime: '19:30', notes: 'Early night — recover from red-eye. Explore Hilton area, grab drinks at hotel bar.', status: 'planned' },

    // Day 2 — Mon Mar 16: teamLab + Shibuya [BASE: HILTON SHINJUKU]
    { dayIndex: 2, placeId: 'r36', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '08:30', notes: '🧑‍🍳 Benoit\'s pick! Sarabeth\'s brunch — NYC\'s Queen of Breakfast. Fluffy pancakes & eggs Benedict.', status: 'planned' },
    { dayIndex: 2, placeId: 'a4', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '10:00', notes: 'MUST DO! Book tickets in advance. Azabudai Hills (~25min from Shinjuku). Allow 2h+.', status: 'planned' },
    { dayIndex: 2, placeId: 'r8', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Gyukatsu beef cutlet lunch in Shibuya — cook it yourself on hot stone!', status: 'planned' },
    { dayIndex: 2, placeId: 'a23', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: 'Nintendo Tokyo in Shibuya Parco. Exclusive Mario/Zelda/Splatoon merch!', status: 'planned' },
    { dayIndex: 2, placeId: 'a11', sortOrder: 4, customName: '', timeSlot: 'evening', startTime: '17:30', notes: 'Shibuya Sky for sunset views. Then 1 stop back to Shinjuku/Hilton.', status: 'planned' },
    { dayIndex: 2, placeId: 'r2', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '19:30', notes: 'Fuunji tsukemen near Shinjuku Station — walking distance to Hilton!', status: 'planned' },

    // Day 3 — Tue Mar 17: Akihabara + Ikebukuro [BASE: HILTON SHINJUKU]
    { dayIndex: 3, placeId: 'r37', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '08:00', notes: '🧑‍🍳 Benoit\'s pick! Morning coffee & breakfast at Shinjuku CROSSING cafe. Near Shinjuku Station.', status: 'planned' },
    { dayIndex: 3, placeId: 'a6', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '10:00', notes: 'MUST DO! Geek paradise — arcades, retro game shops, Yodobashi Camera. ~20min from Shinjuku.', status: 'planned' },
    { dayIndex: 3, placeId: 'r18', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '12:30', notes: 'Quick gyoza lunch in Akihabara', status: 'planned' },
    { dayIndex: 3, placeId: 'a37', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '14:00', notes: 'Street karting from Akihabara! Dress up in costumes. Kid rides as passenger. IDP needed!', status: 'planned' },
    { dayIndex: 3, placeId: 'a7', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '16:30', notes: 'Pokemon Center Mega Tokyo in Ikebukuro — 15min from Shinjuku on JR.', status: 'planned' },
    { dayIndex: 3, placeId: 'r12', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '18:30', notes: 'Omoide Yokocho — tiny yakitori bars literally 5min walk from Hilton!', status: 'planned' },

    // Day 4 — Wed Mar 18: Check out Hilton → Shuzenji
    { dayIndex: 4, placeId: null, sortOrder: 0, customName: '🏨 Check out Hilton Shinjuku', timeSlot: 'morning', startTime: '08:30', notes: 'Check out and store big luggage at Shinjuku Station coin lockers, or send via Yamato to next hotel.', status: 'planned' },
    { dayIndex: 4, placeId: null, sortOrder: 1, customName: '🚅 Train to Shuzenji', timeSlot: 'morning', startTime: '09:30', notes: 'Shinjuku → Tokyo Station (15min) → Mishima (Shinkansen ~55min) → Shuzenji (Izuhakone ~35min). Total ~2h.', status: 'planned' },
    { dayIndex: 4, placeId: 'r38', sortOrder: 2, customName: '', timeSlot: 'morning', startTime: '11:30', notes: '🧑‍🍳 Benoit\'s pick! Nayuta cafe near bamboo path — Japanese/Western brunch upon arrival in Shuzenji.', status: 'planned' },
    { dayIndex: 4, placeId: 'f12', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '12:15', notes: 'Explore the ancient temple that gave the town its name', status: 'planned' },
    { dayIndex: 4, placeId: 'f15', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '12:45', notes: 'Stroll through the bamboo-lined path. Mini Arashiyama without crowds!', status: 'planned' },
    { dayIndex: 4, placeId: 'f14', sortOrder: 5, customName: '', timeSlot: 'afternoon', startTime: '13:15', notes: 'See Izu\'s oldest hot spring in the middle of Katsura River', status: 'planned' },
    { dayIndex: 4, placeId: 'r39', sortOrder: 6, customName: '', timeSlot: 'afternoon', startTime: '13:45', notes: '🧑‍🍳 Benoit\'s pick! Nakase Shokudo — local home-style cooking near Shuzenji.', status: 'planned' },
    { dayIndex: 4, placeId: 'f11', sortOrder: 7, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: 'CHECK IN Yagyu-no-Sho. Private onsen baths, kaiseki dinner included. Pure relaxation!', status: 'planned' },

    // Day 5 — Thu Mar 19: Check out Shuzenji → Fairmont Hotel [BASE: FAIRMONT]
    { dayIndex: 5, placeId: 'f11', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '07:00', notes: 'Morning onsen bath & ryokan breakfast. Savour it! CHECK OUT by 11am.', status: 'planned' },
    { dayIndex: 5, placeId: 'r40', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '09:30', notes: '🧑‍🍳 Benoit\'s pick! Kominka Cafe Amane — traditional Japanese house cafe in Shuzenji. Coffee before checkout.', status: 'planned' },
    { dayIndex: 5, placeId: null, sortOrder: 2, customName: '🚅 Train back to Tokyo', timeSlot: 'morning', startTime: '11:00', notes: 'Shuzenji → Mishima → Tokyo Station. ~2h. Arrive Tokyo ~13:00.', status: 'planned' },
    { dayIndex: 5, placeId: 'r5', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: '🍽️ LUNCH at Tsukiji! Go straight from Tokyo Station (5min subway). Grilled scallops, tuna skewers, tamago, fresh uni. Market closes 14:00!', status: 'planned' },
    { dayIndex: 5, placeId: null, sortOrder: 4, customName: '🏨 Check in Fairmont Hotel', timeSlot: 'afternoon', startTime: '14:30', notes: 'Check in Fairmont Hotel. Drop bags and freshen up.', status: 'planned' },
    { dayIndex: 5, placeId: 'a1', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '17:00', notes: 'Senso-ji temple at golden hour. Walk through Kaminarimon gate & Nakamise shopping street.', status: 'planned' },
    { dayIndex: 5, placeId: 'r14', sortOrder: 6, customName: '', timeSlot: 'evening', startTime: '18:30', notes: 'Matcha soft serve and melon pan snacks on Nakamise-dori.', status: 'planned' },

    // Day 6 — Fri Mar 20: Full day Tokyo [BASE: FAIRMONT]
    { dayIndex: 6, placeId: 'r41', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '08:30', notes: '🧑‍🍳 Benoit\'s pick! Morning coffee at Tully\'s before sightseeing.', status: 'planned' },
    { dayIndex: 6, placeId: 'a3', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '09:30', notes: 'Imperial Palace East Gardens — beautiful in March. Cherry blossoms may be starting!', status: 'planned' },
    { dayIndex: 6, placeId: 'a17', sortOrder: 2, customName: '', timeSlot: 'morning', startTime: '11:00', notes: 'Shinjuku Gyoen — THE cherry blossom spot. Mid-March = early blooms. Japanese + English + French gardens.', status: 'planned' },
    { dayIndex: 6, placeId: 'r24', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Depachika lunch at Mitsukoshi Ginza — amazing bento, pastries, free samples!', status: 'planned' },
    { dayIndex: 6, placeId: 'a15', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: 'Uniqlo Ginza — 12 floors! Japan-exclusive items and collabs.', status: 'planned' },
    { dayIndex: 6, placeId: 'a14', sortOrder: 5, customName: '', timeSlot: 'afternoon', startTime: '16:00', notes: 'Don Quijote for last tax-free souvenir shopping. Snacks, cosmetics, everything!', status: 'planned' },
    { dayIndex: 6, placeId: 'r27', sortOrder: 6, customName: '', timeSlot: 'evening', startTime: '19:00', notes: 'BOOKED! Manten Sushi Hibiya — omakase dinner. Reservation confirmed for 19:00.', status: 'planned' },

    // Day 7 — Sat Mar 21: Last day, check out Fairmont → NRT
    { dayIndex: 7, placeId: 'r42', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '08:30', notes: '🧑‍🍳 Benoit\'s pick! TORIBA COFFEE — boutique coffee roaster in Ginza. Last morning coffee!', status: 'planned' },
    { dayIndex: 7, placeId: null, sortOrder: 1, customName: '🏨 Check out Fairmont Hotel', timeSlot: 'morning', startTime: '10:00', notes: 'Pack everything. Check out Fairmont. Store luggage at hotel or Tokyo Station coin lockers.', status: 'planned' },
    { dayIndex: 7, placeId: 'r43', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '12:00', notes: '🧑‍🍳 Benoit\'s pick! Yakiniku Maruushi Ginza — Japanese BBQ lunch. Quality beef at great prices!', status: 'planned' },
    { dayIndex: 7, placeId: null, sortOrder: 3, customName: '🛒 Last-minute shopping at Tokyo Station', timeSlot: 'afternoon', startTime: '14:00', notes: 'Tokyo Station underground: Character Street, Ramen Street, souvenir shops. Easy access from Fairmont.', status: 'planned' },
    { dayIndex: 7, placeId: null, sortOrder: 4, customName: '🚃 Narita Express to NRT', timeSlot: 'evening', startTime: '17:30', notes: 'NEX from Tokyo Station ~1h. Aim to arrive NRT by 18:30 (2.5h before flight).', status: 'planned' },
    { dayIndex: 7, placeId: 't2', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '21:05', notes: 'NQ113 departs Narita 21:05. Arrives Singapore Changi 03:45 Mar 22. Sayonara Tokyo! 🇯🇵', status: 'planned' }
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
