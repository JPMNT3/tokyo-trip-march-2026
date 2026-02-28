// Dexie database schema + seed logic — v19-diag
const DB_NAME = 'TokyoTripCloudDB';
const SEED_VERSION = 14;
const DB_JS_VERSION = 'v19-diag'; // To verify this file is actually loaded

let db;
let dbError = null;
let dbInitInfo = '';

try {
  if (!localStorage.getItem('migratedToCloud')) {
    Dexie.delete('TokyoTripDB');
    localStorage.setItem('migratedToCloud', '1');
  }

  const hasDexie = typeof Dexie !== 'undefined';
  const hasCloud = typeof DexieCloud !== 'undefined';
  const hasAddon = hasCloud && typeof DexieCloud.dexieCloud === 'function';
  dbInitInfo = 'Dexie:' + hasDexie + ' Cloud:' + hasCloud + ' Addon:' + hasAddon;

  if (hasAddon) {
    db = new Dexie(DB_NAME, { addons: [DexieCloud.dexieCloud] });
  } else {
    db = new Dexie(DB_NAME);
  }

  db.version(1).stores({
    places: 'id, category, neighborhood, *tags, *memberFit, priority, source',
    itinerary: '@id, dayIndex, placeId, sortOrder, timeSlot, status',
    wishlist: '@id, placeId, done, priority, addedBy',
    members: 'id',
    settings: 'key'
  });

  if (hasAddon) {
    db.cloud.configure({
      databaseUrl: 'https://zc53qry44.dexie.cloud',
      requireAuth: false
    });
  }

  dbInitInfo += ' | stores OK';
  dbInitInfo += ' | db.settings=' + typeof db.settings;
  dbInitInfo += ' | db.places=' + typeof db.places;
  dbInitInfo += ' | tables=[' + (db.tables || []).map(function(t) { return t.name; }).join(',') + ']';

} catch (err) {
  dbError = err;
  dbInitInfo += ' | INIT_ERR: ' + err.message;
}

async function seedDatabase() {
  // Show diagnostics immediately
  showError(DB_JS_VERSION + ' | ' + dbInitInfo);

  if (dbError) return;

  try {
    await db.open();

    // Re-check after open
    var info2 = 'OPEN OK';
    info2 += ' | db.settings=' + typeof db.settings;
    info2 += ' | tables=[' + db.tables.map(function(t) { return t.name; }).join(',') + ']';

    // Try db.table() fallback
    if (!db.settings) {
      try {
        db.settings = db.table('settings');
        info2 += ' | table() fix=' + typeof db.settings;
      } catch(e) {
        info2 += ' | table() err=' + e.message;
      }
    }

    showError(DB_JS_VERSION + ' | ' + info2);

    if (!db.settings) {
      showError(DB_JS_VERSION + ' | FATAL: db.settings still undefined after all attempts');
      return;
    }

    // Ensure all table accessors exist
    ['places', 'itinerary', 'wishlist', 'members'].forEach(function(name) {
      if (!db[name]) {
        try { db[name] = db.table(name); } catch(e) {}
      }
    });

    const seedSetting = await db.settings.get('seedVersion');
    if (seedSetting && seedSetting.value >= SEED_VERSION) {
      showError(''); // Clear diagnostic — seed not needed
      return;
    }

    console.log('Seeding database (v' + SEED_VERSION + ')...');
    await db.places.where('source').equals('preset').delete();
    await db.itinerary.clear();

    const [attractions, restaurants, mtFuji, neighborhoods] = await Promise.all([
      fetch('data/attractions.json').then(r => r.json()),
      fetch('data/restaurants.json').then(r => r.json()),
      fetch('data/mt-fuji.json').then(r => r.json()),
      fetch('data/neighborhoods.json').then(r => r.json())
    ]);

    const allPlaces = [...attractions, ...restaurants, ...mtFuji];
    await db.places.bulkPut(allPlaces);

    await db.members.bulkPut([
      { id: 'dad', name: 'Dad', emoji: '👨', active: true },
      { id: 'mom', name: 'Mom', emoji: '👩', active: true },
      { id: 'kid', name: 'Kid', emoji: '👦', active: true }
    ]);

    await db.settings.put({ key: 'neighborhoods', value: neighborhoods });
    await db.settings.put({ key: 'dbSeeded', value: true });
    await db.settings.put({ key: 'gpsEnabled', value: true });

    const itineraryItems = [
      { id: 'itin-d0-s0', dayIndex: 0, placeId: null, sortOrder: 0, customName: '🧳 Final packing & head to Changi', timeSlot: 'evening', startTime: '20:00', notes: 'Aim to reach Changi T1 by 20:30. Check in, last Singapore meal at airport.', status: 'planned' },
      { id: 'itin-d0-s1', dayIndex: 0, placeId: 't1', sortOrder: 1, customName: '', timeSlot: 'evening', startTime: '23:20', notes: '✈️ Scoot TR808 departs SIN 23:20. Red-eye to Tokyo! Try to sleep on the plane. Arrives NRT 07:10 Sun.', status: 'planned' },
      { id: 'itin-d1-s0', dayIndex: 1, placeId: 't1', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '07:10', notes: '✈️ Land at Narita 7:10am. Immigration + bags. Buy Suica cards + Narita Express to Shinjuku (~90min).', status: 'planned' },
      { id: 'itin-d1-s1', dayIndex: 1, placeId: 'r13', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '09:30', notes: 'Grab onigiri & coffee at first konbini! Recover from red-eye.', status: 'planned' },
      { id: 'itin-d1-s2', dayIndex: 1, placeId: null, sortOrder: 2, customName: '🏨 Check in Hilton Tokyo, Shinjuku', timeSlot: 'morning', startTime: '10:30', notes: 'Drop bags at Hilton Tokyo (6-6-2 Nishi-Shinjuku). Early bag storage, room likely ready by 15:00.', status: 'planned' },
      { id: 'itin-d1-s3', dayIndex: 1, placeId: 'a13', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Harajuku is 1 stop from Shinjuku! Kawaii culture, crepes, cotton candy. Great first outing.', status: 'planned' },
      { id: 'itin-d1-s4', dayIndex: 1, placeId: 'a12', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '15:30', notes: 'Walk from Harajuku to Shibuya (15min). Watch the famous scramble crossing!', status: 'planned' },
      { id: 'itin-d1-s5', dayIndex: 1, placeId: 'r1', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '18:00', notes: 'Ichiran in Shibuya — first ramen in Japan! 10min train back to Hilton.', status: 'planned' },
      { id: 'itin-d1-s6', dayIndex: 1, placeId: null, sortOrder: 6, customName: '🚶 Walk to Hilton (10min from Shinjuku Stn)', timeSlot: 'evening', startTime: '19:30', notes: 'Early night — recover from red-eye. Explore Hilton area, grab drinks at hotel bar.', status: 'planned' },
      { id: 'itin-d2-s0', dayIndex: 2, placeId: 'a4', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '10:00', notes: 'MUST DO! Book tickets in advance. Azabudai Hills (~25min from Shinjuku). Allow 2h+.', status: 'planned' },
      { id: 'itin-d2-s1', dayIndex: 2, placeId: 'r8', sortOrder: 1, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Gyukatsu beef cutlet lunch in Shibuya — cook it yourself on hot stone!', status: 'planned' },
      { id: 'itin-d2-s2', dayIndex: 2, placeId: 'a23', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: 'Nintendo Tokyo in Shibuya Parco. Exclusive Mario/Zelda/Splatoon merch!', status: 'planned' },
      { id: 'itin-d2-s3', dayIndex: 2, placeId: 'a11', sortOrder: 3, customName: '', timeSlot: 'evening', startTime: '17:30', notes: 'Shibuya Sky for sunset views. Then 1 stop back to Shinjuku/Hilton.', status: 'planned' },
      { id: 'itin-d2-s4', dayIndex: 2, placeId: 'r2', sortOrder: 4, customName: '', timeSlot: 'evening', startTime: '19:30', notes: 'Fuunji tsukemen near Shinjuku Station — walking distance to Hilton!', status: 'planned' },
      { id: 'itin-d3-s0', dayIndex: 3, placeId: 'a6', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '10:00', notes: 'MUST DO! Geek paradise — arcades, retro game shops, Yodobashi Camera. ~20min from Shinjuku.', status: 'planned' },
      { id: 'itin-d3-s1', dayIndex: 3, placeId: 'r18', sortOrder: 1, customName: '', timeSlot: 'afternoon', startTime: '12:30', notes: 'Quick gyoza lunch in Akihabara', status: 'planned' },
      { id: 'itin-d3-s2', dayIndex: 3, placeId: 'a37', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '14:00', notes: 'Street karting from Akihabara! Dress up in costumes. Kid rides as passenger. IDP needed!', status: 'planned' },
      { id: 'itin-d3-s3', dayIndex: 3, placeId: 'a7', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '16:30', notes: 'Pokemon Center Mega Tokyo in Ikebukuro — 15min from Shinjuku on JR.', status: 'planned' },
      { id: 'itin-d3-s4', dayIndex: 3, placeId: 'r12', sortOrder: 4, customName: '', timeSlot: 'evening', startTime: '18:30', notes: 'Omoide Yokocho — tiny yakitori bars literally 5min walk from Hilton!', status: 'planned' },
      { id: 'itin-d4-s0', dayIndex: 4, placeId: null, sortOrder: 0, customName: '🏨 Check out Hilton Shinjuku', timeSlot: 'morning', startTime: '08:30', notes: 'Check out and store big luggage at Shinjuku Station coin lockers, or send via Yamato to next hotel.', status: 'planned' },
      { id: 'itin-d4-s1', dayIndex: 4, placeId: null, sortOrder: 1, customName: '🚅 Train to Shuzenji', timeSlot: 'morning', startTime: '09:30', notes: 'Shinjuku → Tokyo Station (15min) → Mishima (Shinkansen ~55min) → Shuzenji (Izuhakone ~35min). Total ~2h.', status: 'planned' },
      { id: 'itin-d4-s2', dayIndex: 4, placeId: 'f12', sortOrder: 2, customName: '', timeSlot: 'morning', startTime: '11:30', notes: 'Explore the ancient temple that gave the town its name', status: 'planned' },
      { id: 'itin-d4-s3', dayIndex: 4, placeId: 'f15', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '12:00', notes: 'Stroll through the bamboo-lined path. Mini Arashiyama without crowds!', status: 'planned' },
      { id: 'itin-d4-s4', dayIndex: 4, placeId: 'f14', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '12:30', notes: 'See Izu\'s oldest hot spring in the middle of Katsura River', status: 'planned' },
      { id: 'itin-d4-s5', dayIndex: 4, placeId: 'f11', sortOrder: 5, customName: '', timeSlot: 'afternoon', startTime: '14:00', notes: 'CHECK IN Yagyu-no-Sho. Private onsen baths, kaiseki dinner included. Pure relaxation!', status: 'planned' },
      { id: 'itin-d5-s0', dayIndex: 5, placeId: 'f11', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '07:00', notes: 'Morning onsen bath & ryokan breakfast. Savour it! CHECK OUT by 11am.', status: 'planned' },
      { id: 'itin-d5-s1', dayIndex: 5, placeId: null, sortOrder: 1, customName: '🚅 Train back to Tokyo', timeSlot: 'morning', startTime: '11:00', notes: 'Shuzenji → Mishima → Tokyo Station. ~2h. Arrive Tokyo ~13:00.', status: 'planned' },
      { id: 'itin-d5-s2', dayIndex: 5, placeId: 'r5', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: '🍽️ LUNCH at Tsukiji! Go straight from Tokyo Station (5min subway). Grilled scallops, tuna skewers, tamago, fresh uni. Market closes 14:00!', status: 'planned' },
      { id: 'itin-d5-s3', dayIndex: 5, placeId: null, sortOrder: 3, customName: '🏨 Check in Fairmont Hotel', timeSlot: 'afternoon', startTime: '14:30', notes: 'Check in Fairmont Hotel. Drop bags and freshen up.', status: 'planned' },
      { id: 'itin-d5-s4', dayIndex: 5, placeId: 'a1', sortOrder: 4, customName: '', timeSlot: 'evening', startTime: '17:00', notes: 'Senso-ji temple at golden hour. Walk through Kaminarimon gate & Nakamise shopping street.', status: 'planned' },
      { id: 'itin-d5-s5', dayIndex: 5, placeId: 'r14', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '18:30', notes: 'Matcha soft serve and melon pan snacks on Nakamise-dori.', status: 'planned' },
      { id: 'itin-d6-s0', dayIndex: 6, placeId: 'a3', sortOrder: 0, customName: '', timeSlot: 'morning', startTime: '09:30', notes: 'Imperial Palace East Gardens — beautiful in March. Cherry blossoms may be starting!', status: 'planned' },
      { id: 'itin-d6-s1', dayIndex: 6, placeId: 'a17', sortOrder: 1, customName: '', timeSlot: 'morning', startTime: '11:00', notes: 'Shinjuku Gyoen — THE cherry blossom spot. Mid-March = early blooms. Japanese + English + French gardens.', status: 'planned' },
      { id: 'itin-d6-s2', dayIndex: 6, placeId: 'r24', sortOrder: 2, customName: '', timeSlot: 'afternoon', startTime: '13:00', notes: 'Depachika lunch at Mitsukoshi Ginza — amazing bento, pastries, free samples!', status: 'planned' },
      { id: 'itin-d6-s3', dayIndex: 6, placeId: 'a15', sortOrder: 3, customName: '', timeSlot: 'afternoon', startTime: '14:30', notes: 'Uniqlo Ginza — 12 floors! Japan-exclusive items and collabs.', status: 'planned' },
      { id: 'itin-d6-s4', dayIndex: 6, placeId: 'a14', sortOrder: 4, customName: '', timeSlot: 'afternoon', startTime: '16:00', notes: 'Don Quijote for last tax-free souvenir shopping. Snacks, cosmetics, everything!', status: 'planned' },
      { id: 'itin-d6-s5', dayIndex: 6, placeId: 'r27', sortOrder: 5, customName: '', timeSlot: 'evening', startTime: '19:00', notes: 'BOOKED! Manten Sushi Hibiya — omakase dinner. Reservation confirmed for 19:00.', status: 'planned' },
      { id: 'itin-d7-s0', dayIndex: 7, placeId: null, sortOrder: 0, customName: '🏨 Check out Fairmont Hotel', timeSlot: 'morning', startTime: '10:00', notes: 'Pack everything. Check out Fairmont. Store luggage at hotel or Tokyo Station coin lockers.', status: 'planned' },
      { id: 'itin-d7-s1', dayIndex: 7, placeId: null, sortOrder: 1, customName: '🛒 Last-minute shopping at Tokyo Station', timeSlot: 'afternoon', startTime: '13:00', notes: 'Tokyo Station underground: Character Street, Ramen Street, souvenir shops. Easy access from Fairmont.', status: 'planned' },
      { id: 'itin-d7-s2', dayIndex: 7, placeId: null, sortOrder: 2, customName: '🚃 Narita Express to NRT', timeSlot: 'evening', startTime: '17:30', notes: 'NEX from Tokyo Station ~1h. Aim to arrive NRT by 18:30 (2.5h before flight).', status: 'planned' },
      { id: 'itin-d7-s3', dayIndex: 7, placeId: 't2', sortOrder: 3, customName: '', timeSlot: 'evening', startTime: '21:05', notes: 'NQ113 departs Narita 21:05. Arrives Singapore Changi 03:45 Mar 22. Sayonara Tokyo! 🇯🇵', status: 'planned' }
    ];

    await db.itinerary.bulkPut(itineraryItems);
    await db.settings.put({ key: 'seedVersion', value: SEED_VERSION });
    showError(''); // Clear — seed succeeded
    console.log('Database seeded:', allPlaces.length, 'places,', itineraryItems.length, 'itinerary items');
  } catch (err) {
    console.error('Seed failed:', err);
    showError(DB_JS_VERSION + ' | SEED ERR: ' + err.message);
  }
}

function showError(msg) {
  var h = document.querySelector('.header-dates');
  if (h) h.textContent = msg || 'Mar 14 – 22';
  if (msg) document.title = msg;
}
