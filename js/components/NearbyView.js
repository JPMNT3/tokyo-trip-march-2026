// GPS + Leaflet map with simplified markers and nearby list
const NearbyView = {
  template: `
    <div class="nearby-view">
      <!-- Map container -->
      <div ref="mapContainer" class="map-container" v-show="!listOnly"></div>

      <!-- Fallback / list-only header -->
      <div v-if="listOnly" class="nearby-fallback">
        <p>📍 Map unavailable offline. Showing list view.</p>
      </div>

      <!-- GPS status -->
      <div class="gps-status-bar">
        <span class="gps-status-text">
          <template v-if="userPos">📍 GPS active · {{ nearbyPlaces.length }} places nearby</template>
          <template v-else-if="gpsError">⚠️ {{ gpsError }}</template>
          <template v-else>📍 Getting location...</template>
        </span>
        <button class="gps-center-btn" @click="centerOnUser" v-if="userPos && !listOnly">
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
          <div @click="centerOnPlace(p)" style="cursor:pointer">
            <activity-card
              :item="{ placeId: p.id }"
              :place="p"
              :show-actions="false"
              :show-distance="true"
              :compact="true"
            ></activity-card>
          </div>
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
      selectedMarker: null,
      followGPS: true,
      listOnly: false,
      catFilter: 'all',
      categories: [
        { id: 'food', emoji: '🍽️' },
        { id: 'culture', emoji: '⛩️' },
        { id: 'futuristic', emoji: '🤖' },
        { id: 'kid-friendly', emoji: '🎮' },
        { id: 'shopping', emoji: '🛍️' },
        { id: 'nature', emoji: '🌿' }
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

        this.updateMarkers();
      } catch (e) {
        console.warn('Map init failed, using list mode:', e);
        this.listOnly = true;
        this.computeNearby(Geo.TOKYO_CENTER.lat, Geo.TOKYO_CENTER.lng);
      }
    },

    updateMarkers() {
      this.markers.forEach(m => m.remove());
      this.markers = [];

      if (!this.map) return;

      let places = this.allPlaces;
      if (this.catFilter !== 'all') {
        places = places.filter(p => p.category === this.catFilter);
      }

      places.forEach(p => {
        const icon = L.divIcon({
          className: '',
          html: `<div class="category-marker"><span class="marker-inner">${p.imageEmoji || '📍'}</span></div>`,
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
            <p class="place-popup-hours">${p.hours || ''}</p>
            <button class="popup-btn popup-btn--primary"
              onclick="document.dispatchEvent(new CustomEvent('map-add-today',{detail:'${p.id}'}))">📅 Today</button>
            <button class="popup-btn"
              onclick="document.dispatchEvent(new CustomEvent('map-add-wishlist',{detail:'${p.id}'}))">⭐ Wishlist</button>
          </div>
        `);

        this.markers.push(marker);
      });
    },

    startGPS() {
      document.addEventListener('map-add-today', (e) => this.addToTodayById(e.detail));
      document.addEventListener('map-add-wishlist', (e) => this.addToWishlistById(e.detail));

      this.watchId = Geo.watchPosition(
        pos => { this.userPos = pos; this.onPositionUpdate(pos); },
        () => {
          this.gpsError = 'Location unavailable. Showing Tokyo center.';
          this.computeNearby(Geo.TOKYO_CENTER.lat, Geo.TOKYO_CENTER.lng);
        }
      );
    },

    onPositionUpdate(pos) {
      if (this.map) {
        // Only re-center if following GPS (not viewing a selected place)
        if (this.followGPS) {
          this.map.setView([pos.lat, pos.lng], 15);
        }

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
        this.followGPS = true;
        this.clearSelectedMarker();
        this.map.setView([this.userPos.lat, this.userPos.lng], 15);
      }
    },

    centerOnPlace(place) {
      if (!this.map || this.listOnly) return;
      this.followGPS = false;
      this.clearSelectedMarker();
      this.map.setView([place.lat, place.lng], 16, { animate: true });

      // Add a flag marker for the selected place
      this.selectedMarker = L.marker([place.lat, place.lng], {
        icon: L.divIcon({
          className: '',
          html: '<div class="selected-place-flag">📍</div>',
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36]
        }),
        zIndexOffset: 1000
      }).addTo(this.map);

      // Open the existing marker popup for this place
      const marker = this.markers.find(m => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - place.lat) < 0.0001 && Math.abs(ll.lng - place.lng) < 0.0001;
      });
      if (marker) marker.openPopup();
    },

    clearSelectedMarker() {
      if (this.selectedMarker) {
        this.selectedMarker.remove();
        this.selectedMarker = null;
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
