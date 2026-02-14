// GPS + Leaflet map with colored pins and nearby list
const NearbyView = {
  template: `
    <div class="nearby-view">
      <!-- Map container -->
      <div ref="mapContainer" class="map-container" v-show="!listOnly"></div>

      <!-- Fallback / list-only header -->
      <div v-if="listOnly" style="padding:16px;text-align:center;background:var(--gray-lighter)">
        <p style="font-size:14px;color:var(--gray)">📍 Map unavailable offline. Showing list view.</p>
      </div>

      <!-- GPS status -->
      <div style="padding:8px 16px;display:flex;justify-content:space-between;align-items:center;background:var(--white);border-bottom:1px solid var(--gray-light)">
        <span style="font-size:13px;color:var(--gray)">
          <template v-if="userPos">📍 GPS active · {{ nearbyPlaces.length }} places nearby</template>
          <template v-else-if="gpsError">⚠️ {{ gpsError }}</template>
          <template v-else>📍 Getting location...</template>
        </span>
        <button class="filter-chip active" style="padding:4px 10px;font-size:11px" @click="centerOnUser" v-if="userPos && !listOnly">
          Center
        </button>
      </div>

      <!-- Category filter -->
      <div class="filter-bar">
        <button class="filter-chip" :class="{ active: catFilter === 'all' }" @click="catFilter='all';updateMarkers()">All</button>
        <button v-for="cat in categories" :key="cat.id"
          class="filter-chip" :class="{ active: catFilter === cat.id }"
          @click="catFilter=cat.id;updateMarkers()">
          {{ cat.emoji }}
        </button>
      </div>

      <!-- Nearby list -->
      <div class="nearby-list">
        <div v-for="p in displayPlaces" :key="p.id">
          <activity-card
            :item="{ placeId: p.id }"
            :place="p"
            :show-actions="false"
            :show-distance="true"
            :compact="true"
          ></activity-card>
          <div class="card-action-row">
            <button class="card-action-btn primary" @click="addToToday(p)">Add to Day</button>
            <button class="card-action-btn" @click="addToWishlist(p)">Wishlist</button>
          </div>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      map: null,
      userPos: null,
      gpsError: null,
      watchId: null,
      allPlaces: [],
      nearbyPlaces: [],
      markers: [],
      userMarker: null,
      listOnly: false,
      catFilter: 'all',
      categories: [
        { id: 'food', emoji: '🍽️', color: '#F59E0B' },
        { id: 'culture', emoji: '⛩️', color: '#E63946' },
        { id: 'futuristic', emoji: '🤖', color: '#8B5CF6' },
        { id: 'kid-friendly', emoji: '🎮', color: '#3B82F6' },
        { id: 'shopping', emoji: '🛍️', color: '#EC4899' },
        { id: 'nature', emoji: '🌿', color: '#10B981' }
      ]
    };
  },
  computed: {
    displayPlaces() {
      let list = this.nearbyPlaces;
      if (this.catFilter !== 'all') {
        list = list.filter(p => p.category === this.catFilter);
      }
      return list.slice(0, 20);
    }
  },
  async created() {
    this.allPlaces = await db.places.toArray();
  },
  mounted() {
    this.initMap();
    this.startGPS();
  },
  beforeUnmount() {
    if (this.watchId !== null) Geo.clearWatch(this.watchId);
    if (this.map) { this.map.remove(); this.map = null; }
  },
  methods: {
    initMap() {
      try {
        const container = this.$refs.mapContainer;
        if (!container) return;

        this.map = L.map(container, {
          center: [Geo.TOKYO_CENTER.lat, Geo.TOKYO_CENTER.lng],
          zoom: 14,
          zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19
        }).addTo(this.map);

        // Add all place markers
        this.updateMarkers();
      } catch (e) {
        console.warn('Map init failed, using list mode:', e);
        this.listOnly = true;
        this.computeNearby(Geo.TOKYO_CENTER.lat, Geo.TOKYO_CENTER.lng);
      }
    },

    updateMarkers() {
      // Clear existing
      this.markers.forEach(m => m.remove());
      this.markers = [];

      if (!this.map) return;

      let places = this.allPlaces;
      if (this.catFilter !== 'all') {
        places = places.filter(p => p.category === this.catFilter);
      }

      places.forEach(p => {
        const cat = this.categories.find(c => c.id === p.category);
        const color = cat?.color || '#6B7280';

        const icon = L.divIcon({
          className: '',
          html: `<div class="category-marker" style="background:${color}"><span class="marker-inner">${p.imageEmoji || '📍'}</span></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([p.lat, p.lng], { icon }).addTo(this.map);

        const dist = this.userPos ? Geo.formatDistance(Geo.distance(this.userPos.lat, this.userPos.lng, p.lat, p.lng)) : '';

        marker.bindPopup(`
          <div class="place-popup">
            <h3>${p.imageEmoji} ${p.name}</h3>
            <p>${p.nameJa || ''}</p>
            <p>${p.neighborhood} ${dist ? '· ' + dist : ''}</p>
            <p style="font-size:11px">${p.hours || ''}</p>
            <button class="popup-btn" style="background:var(--red);color:white"
              onclick="document.dispatchEvent(new CustomEvent('map-add-today',{detail:'${p.id}'}))">📅 Today</button>
            <button class="popup-btn" style="background:var(--gray-lighter)"
              onclick="document.dispatchEvent(new CustomEvent('map-add-wishlist',{detail:'${p.id}'}))">⭐ Wishlist</button>
          </div>
        `);

        this.markers.push(marker);
      });
    },

    startGPS() {
      // Listen for map popup button clicks
      document.addEventListener('map-add-today', (e) => this.addToTodayById(e.detail));
      document.addEventListener('map-add-wishlist', (e) => this.addToWishlistById(e.detail));

      Geo.getCurrentPosition()
        .then(pos => {
          this.userPos = pos;
          this.onPositionUpdate(pos);
        })
        .catch(err => {
          this.gpsError = 'Location unavailable. Showing Tokyo center.';
          this.computeNearby(Geo.TOKYO_CENTER.lat, Geo.TOKYO_CENTER.lng);
        });

      this.watchId = Geo.watchPosition(
        pos => { this.userPos = pos; this.onPositionUpdate(pos); },
        () => {}
      );
    },

    onPositionUpdate(pos) {
      if (this.map) {
        this.map.setView([pos.lat, pos.lng], 15);

        if (this.userMarker) this.userMarker.remove();
        this.userMarker = L.marker([pos.lat, pos.lng], {
          icon: L.divIcon({
            className: '',
            html: '<div class="user-location"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        }).addTo(this.map);
      }

      this.computeNearby(pos.lat, pos.lng);
    },

    computeNearby(lat, lng) {
      this.nearbyPlaces = Geo.sortByDistance(this.allPlaces, lat, lng);
    },

    centerOnUser() {
      if (this.userPos && this.map) {
        this.map.setView([this.userPos.lat, this.userPos.lng], 15);
      }
    },

    addToToday(place) {
      const dayIdx = TripDates.currentDayIndex();
      this.$root.openModal('pick-day', { placeId: place.id }, dayIdx >= 0 ? dayIdx : 0);
    },

    addToTodayById(placeId) {
      const place = this.allPlaces.find(p => p.id === placeId);
      if (place) this.addToToday(place);
    },

    async addToWishlist(place) {
      await db.wishlist.add({
        placeId: place.id,
        customName: '',
        done: false,
        priority: place.priority || false,
        tags: place.tags || [],
        addedBy: 'all'
      });
    },

    async addToWishlistById(placeId) {
      const place = this.allPlaces.find(p => p.id === placeId);
      if (place) await this.addToWishlist(place);
    },

    refresh() {}
  }
};
