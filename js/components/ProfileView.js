// Family member toggles and trip info
const ProfileView = {
  template: `
    <div class="profile-view">
      <!-- Trip countdown / status -->
      <div class="trip-status-card">
        <div class="status-emoji">{{ tripStatusEmoji }}</div>
        <div class="status-text">{{ tripStatusText }}</div>
        <div class="status-sub">Singapore → Tokyo · 9 days</div>
      </div>

      <!-- Weather -->
      <div class="section-label">Expected Weather</div>
      <div class="weather-grid">
        <div v-for="w in weatherDays" :key="w.day" class="weather-day-card" :class="{ 'weather-today': w.isToday }">
          <div class="weather-day-label">{{ w.label }}</div>
          <div class="weather-icon">{{ w.icon }}</div>
          <div class="weather-temps">
            <span class="weather-high">{{ w.high }}°</span>
            <span class="weather-low">{{ w.low }}°</span>
          </div>
          <div class="weather-desc">{{ w.desc }}</div>
        </div>
      </div>
      <div class="weather-note">
        {{ weatherNote }}
      </div>

      <!-- Booked items -->
      <div class="section-label">Confirmed Bookings</div>
      <div class="member-card booking-card">
        <div class="member-emoji">✈️</div>
        <div class="member-info">
          <h3>SIN → NRT · Scoot TR808</h3>
          <p>Sat 14 Mar, 23:20 → Sun 15 Mar, 07:10</p>
        </div>
      </div>
      <div class="member-card booking-card">
        <div class="member-emoji">🏨</div>
        <div class="member-info">
          <h3>Hilton Tokyo · Shinjuku</h3>
          <p>Sat 15 Mar → Wed 18 Mar (3 nights)</p>
        </div>
      </div>
      <div class="member-card booking-card">
        <div class="member-emoji">♨️</div>
        <div class="member-info">
          <h3>Yagyu-no-Sho · Shuzenji Onsen</h3>
          <p>Wed 18 Mar 14:00 → Thu 19 Mar 11:00</p>
        </div>
      </div>
      <div class="member-card booking-card">
        <div class="member-emoji">🏨</div>
        <div class="member-info">
          <h3>Fairmont Hotel · Tokyo</h3>
          <p>Thu 19 Mar → Sat 21 Mar (2 nights)</p>
        </div>
      </div>
      <div class="member-card booking-card">
        <div class="member-emoji">🍣</div>
        <div class="member-info">
          <h3>Manten Sushi · Hibiya</h3>
          <p>Fri 20 Mar, 19:00 · Omakase dinner</p>
        </div>
      </div>
      <div class="member-card booking-card">
        <div class="member-emoji">✈️</div>
        <div class="member-info">
          <h3>NRT → SIN · NQ113</h3>
          <p>Sat 21 Mar, 21:05 → Sun 22 Mar, 03:45</p>
        </div>
      </div>

      <!-- Family members -->
      <div class="section-label">Family</div>
      <div class="profile-family-desc">Toggle members to filter activities across all views.</div>

      <div v-for="m in members" :key="m.id" class="member-card">
        <div class="member-emoji">{{ m.emoji }}</div>
        <div class="member-info">
          <h3>{{ m.name }}</h3>
          <p>{{ memberSummary(m.id) }}</p>
        </div>
        <button class="toggle-switch" :class="{ on: m.active }" @click="toggleMember(m)"></button>
      </div>

      <!-- Trip stats -->
      <div class="section-label">Statistics</div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalPlanned }}</div>
          <div class="stat-label">Planned</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalDone }}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.wishlistCount }}</div>
          <div class="stat-label">Wishlist</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ stats.totalPlaces }}</div>
          <div class="stat-label">Places in DB</div>
        </div>
      </div>

      <!-- Data management -->
      <div class="section-label">Data</div>
      <div class="profile-data-row">
        <button class="btn btn-secondary" @click="exportData">Export Backup</button>
        <button class="btn btn-secondary btn-danger" @click="resetData">Reset All Data</button>
      </div>

      <div class="profile-footer">
        Tokyo Family Trip Planner v1.0<br>
        All data stored locally on your device.
      </div>
    </div>
  `,
  data() {
    return {
      members: [],
      stats: { totalPlanned: 0, totalDone: 0, wishlistCount: 0, totalPlaces: 0 },
      liveWeather: null // populated when real forecast becomes available
    };
  },
  computed: {
    weatherNote() {
      if (this.liveWeather) return 'Live forecast data.';
      const daysLeft = TripDates.daysUntilTrip();
      if (daysLeft > 14) return 'Showing typical mid-March Tokyo averages. Live forecast available ~7 days before the trip.';
      if (daysLeft > 0) return 'Forecast based on seasonal averages. Check back closer to departure for live data.';
      return 'Showing recorded/actual weather for your trip dates.';
    },
    weatherDays() {
      // Typical mid-March Tokyo weather (historical averages)
      const typical = [
        { high: 14, low: 5, icon: '✈️', desc: 'Depart SIN' },    // Day 0 Mar 14
        { high: 13, low: 5, icon: '🌤️', desc: 'Partly cloudy' }, // Day 1 Mar 15
        { high: 14, low: 6, icon: '☀️', desc: 'Sunny' },          // Day 2 Mar 16
        { high: 13, low: 5, icon: '🌥️', desc: 'Cloudy spells' }, // Day 3 Mar 17
        { high: 12, low: 5, icon: '🌧️', desc: 'Light rain' },    // Day 4 Mar 18 Shuzenji
        { high: 14, low: 6, icon: '🌤️', desc: 'Clearing up' },   // Day 5 Mar 19
        { high: 15, low: 7, icon: '☀️', desc: 'Sunny' },          // Day 6 Mar 20
        { high: 14, low: 6, icon: '🌤️', desc: 'Partly cloudy' }, // Day 7 Mar 21
        { high: 14, low: 6, icon: '✈️', desc: 'Arrive SIN' }     // Day 8 Mar 22
      ];
      const data = this.liveWeather || typical;
      const currentDay = TripDates.currentDayIndex();
      return data.map((w, i) => ({
        day: i,
        label: TripDates.fullLabel(i).replace(/,\s*\d{4}$/, ''),
        high: w.high,
        low: w.low,
        icon: w.icon,
        desc: w.desc,
        isToday: i === currentDay
      }));
    },
    tripStatusEmoji() {
      if (TripDates.isDuringTrip()) return '✈️';
      const days = TripDates.daysUntilTrip();
      if (days <= 0) return '🏠';
      if (days <= 7) return '🎒';
      return '🗓️';
    },
    tripStatusText() {
      if (TripDates.isDuringTrip()) {
        const day = TripDates.currentDayIndex();
        return `Day ${day + 1} of 9 — ${TripDates.fullLabel(day)}`;
      }
      const days = TripDates.daysUntilTrip();
      if (days <= 0) return 'Trip complete!';
      return `${days} days until Tokyo`;
    }
  },
  async created() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      this.members = await db.members.toArray();
      const itinerary = await db.itinerary.toArray();
      const wishlist = await db.wishlist.toArray();
      const places = await db.places.count();
      this.stats = {
        totalPlanned: itinerary.length,
        totalDone: itinerary.filter(i => i.status === 'done').length,
        wishlistCount: wishlist.length,
        totalPlaces: places
      };
    },
    memberSummary(id) {
      const summaries = {
        dad: 'Tech, photography, ramen, retro games',
        mom: 'Culture, shopping, gardens, good food',
        kid: 'Pokemon, arcades, theme parks, karting'
      };
      return summaries[id] || '';
    },
    async toggleMember(m) {
      const newActive = !m.active;
      await db.members.update(m.id, { active: newActive });
      m.active = newActive;
    },
    async exportData() {
      const data = {
        places: await db.places.where('source').equals('user').toArray(),
        itinerary: await db.itinerary.toArray(),
        wishlist: await db.wishlist.toArray(),
        members: await db.members.toArray(),
        exportDate: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tokyo-trip-backup.json';
      a.click();
      URL.revokeObjectURL(url);
    },
    async resetData() {
      if (!confirm('This will delete ALL your itinerary, wishlist, and custom places. Seed data will be re-loaded. Continue?')) return;
      await db.delete();
      location.reload();
    },
    refresh() { this.loadData(); }
  }
};
