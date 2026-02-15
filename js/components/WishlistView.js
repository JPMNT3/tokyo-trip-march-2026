// Wishlist view with merged category/member filter bar
const WishlistView = {
  template: `
    <div class="wishlist-view">
      <!-- Search -->
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="search" placeholder="Search places...">
      </div>

      <!-- Merged filter bar: categories + separator + members -->
      <div class="filter-bar">
        <button class="filter-chip" :class="{ active: activeFilter === 'all' }" @click="activeFilter='all'">All</button>
        <button v-for="cat in categories" :key="cat.id"
          class="filter-chip" :class="{ active: activeFilter === cat.id }"
          @click="activeFilter = cat.id">
          {{ cat.emoji }} {{ cat.label }}
        </button>
        <div class="filter-separator"></div>
        <button class="filter-chip" :class="{ active: memberFilter === 'all' }" @click="memberFilter='all'">Everyone</button>
        <button class="filter-chip" :class="{ active: memberFilter === 'dad' }" @click="memberFilter='dad'">Dad</button>
        <button class="filter-chip" :class="{ active: memberFilter === 'mom' }" @click="memberFilter='mom'">Mom</button>
        <button class="filter-chip" :class="{ active: memberFilter === 'kid' }" @click="memberFilter='kid'">Kid</button>
      </div>

      <!-- Tabs -->
      <div class="tab-bar">
        <button class="tab-btn" :class="{ active: tab === 'wishlist' }" @click="tab='wishlist'">
          My Wishlist ({{ wishlistItems.length }})
        </button>
        <button class="tab-btn" :class="{ active: tab === 'browse' }" @click="tab='browse'">
          Browse All ({{ filteredPlaces.length }})
        </button>
      </div>

      <!-- Wishlist items -->
      <div v-if="tab === 'wishlist'">
        <div v-for="wi in filteredWishlist" :key="wi.id">
          <activity-card
            :item="wi"
            :place="placesMap[wi.placeId]"
            :show-status="false"
            @edit="editWishlistItem(wi)"
            @delete="removeFromWishlist(wi)"
          ></activity-card>
          <div class="card-action-row">
            <button class="card-action-btn primary" @click="moveToItinerary(wi)">Add to Day</button>
            <button v-if="!wi.done" class="card-action-btn" @click="markWishlistDone(wi)">Mark Done</button>
          </div>
        </div>
        <div v-if="filteredWishlist.length === 0" class="empty-state">
          <div class="empty-icon">⭐</div>
          <p>Your wishlist is empty.<br>Browse places and add the ones you like.</p>
        </div>
      </div>

      <!-- Browse all places -->
      <div v-if="tab === 'browse'">
        <div v-for="p in filteredPlaces" :key="p.id">
          <activity-card
            :item="{ placeId: p.id }"
            :place="p"
            :show-actions="false"
            :compact="true"
          ></activity-card>
          <div class="card-action-row">
            <button v-if="!isInWishlist(p.id)" class="card-action-btn" @click="addToWishlist(p)">Wishlist</button>
            <button v-else class="card-action-btn" disabled>In Wishlist</button>
            <button class="card-action-btn primary" @click="quickAddToItinerary(p)">Add to Day</button>
          </div>
        </div>
      </div>

      <!-- FAB for custom entry -->
      <button class="fab" @click="addCustom" title="Add custom entry">+</button>
    </div>
  `,
  data() {
    return {
      search: '',
      activeFilter: 'all',
      memberFilter: 'all',
      tab: 'browse',
      allPlaces: [],
      wishlistItems: [],
      placesMap: {},
      wishlistPlaceIds: new Set(),
      categories: [
        { id: 'food', emoji: '🍽️', label: 'Food' },
        { id: 'culture', emoji: '⛩️', label: 'Culture' },
        { id: 'futuristic', emoji: '🤖', label: 'Future' },
        { id: 'kid-friendly', emoji: '🎮', label: 'Kids' },
        { id: 'shopping', emoji: '🛍️', label: 'Shop' },
        { id: 'nature', emoji: '🌿', label: 'Nature' }
      ]
    };
  },
  computed: {
    filteredPlaces() {
      let list = this.allPlaces.filter(p => p.source === 'preset' && p.neighborhood !== 'Transit');
      if (this.activeFilter !== 'all') list = list.filter(p => p.category === this.activeFilter);
      if (this.memberFilter !== 'all') list = list.filter(p => p.memberFit?.includes(this.memberFilter));
      if (this.search.trim()) {
        const q = this.search.toLowerCase();
        list = list.filter(p =>
          p.name.toLowerCase().includes(q) || p.nameJa?.includes(q) ||
          p.neighborhood?.toLowerCase().includes(q) || p.tags?.some(t => t.toLowerCase().includes(q))
        );
      }
      return list;
    },
    filteredWishlist() {
      let list = this.wishlistItems;
      if (this.activeFilter !== 'all') list = list.filter(w => this.placesMap[w.placeId]?.category === this.activeFilter);
      if (this.memberFilter !== 'all') list = list.filter(w => this.placesMap[w.placeId]?.memberFit?.includes(this.memberFilter));
      if (this.search.trim()) {
        const q = this.search.toLowerCase();
        list = list.filter(w => {
          const p = this.placesMap[w.placeId];
          return (w.customName?.toLowerCase().includes(q)) || (p?.name.toLowerCase().includes(q)) || (p?.neighborhood?.toLowerCase().includes(q));
        });
      }
      return list;
    }
  },
  async created() { await this.loadData(); },
  methods: {
    async loadData() {
      this.allPlaces = await db.places.toArray();
      this.placesMap = {};
      this.allPlaces.forEach(p => { this.placesMap[p.id] = p; });
      this.wishlistItems = await db.wishlist.toArray();
      this.wishlistPlaceIds = new Set(this.wishlistItems.map(w => w.placeId));
    },
    isInWishlist(placeId) { return this.wishlistPlaceIds.has(placeId); },
    async addToWishlist(place) {
      await db.wishlist.add({ placeId: place.id, customName: '', done: false, priority: place.priority || false, tags: place.tags || [], addedBy: 'all' });
      await this.loadData();
    },
    async removeFromWishlist(wi) { await db.wishlist.delete(wi.id); await this.loadData(); },
    async markWishlistDone(wi) { await db.wishlist.update(wi.id, { done: true }); await this.loadData(); },
    moveToItinerary(wi) {
      const place = this.placesMap[wi.placeId];
      this.$root.openModal('pick-day', { placeId: wi.placeId, customName: wi.customName || place?.name || '' }, 1);
    },
    quickAddToItinerary(place) {
      this.$root.openModal('pick-day', { placeId: place.id, customName: '' }, 1);
    },
    editWishlistItem(wi) { this.moveToItinerary(wi); },
    addCustom() { this.$root.openModal('add', null, 1); },
    async refresh() { await this.loadData(); }
  }
};
