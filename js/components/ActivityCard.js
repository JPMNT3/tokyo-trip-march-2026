// Reusable activity/place card component
const ActivityCard = {
  props: {
    place: Object,
    item: Object,
    showActions: { type: Boolean, default: true },
    showStatus: { type: Boolean, default: false },
    showDistance: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false }
  },
  emits: ['edit', 'toggle-done', 'delete', 'add-to-today', 'add-to-wishlist', 'move-to-itinerary'],
  template: `
    <div class="activity-card"
      :class="[statusClass, accentClass, { compact }]"
      :data-id="item?.id">
      <div class="card-emoji">{{ displayEmoji }}</div>
      <div class="card-body">
        <div class="card-name">{{ displayName }}</div>
        <div class="card-name-ja" v-if="place?.nameJa && !compact">{{ place.nameJa }}</div>
        <div v-if="item?.startTime && !compact" class="card-time">
          {{ item.startTime }}
          <span v-if="place?.duration"> · {{ place.duration }}min</span>
        </div>
        <div v-if="item?.notes && !compact" class="card-notes">{{ item.notes }}</div>
        <div class="card-meta">
          <span v-if="place?.category" class="card-tag" :class="'cat-' + place.category">{{ categoryLabel }}</span>
          <span v-if="place?.neighborhood && place.neighborhood !== 'Transit'" class="card-tag">{{ place.neighborhood }}</span>
          <span v-if="place?.priceRange && !compact && place.priceRange !== 'Booked ✓'" class="card-tag">{{ place.priceRange }}</span>
          <span v-if="place?.priceRange === 'Booked ✓'" class="card-tag cat-booked">Booked</span>
          <span v-if="showDistance && place?._dist != null" class="card-tag">{{ formatDist(place._dist) }}</span>
          <span v-if="place?.priority && !compact" class="card-tag" style="background:var(--vermillion-glow);color:var(--vermillion);border-color:transparent">Must do</span>
        </div>
      </div>
      <div class="card-actions" v-if="showActions">
        <button v-if="showStatus" class="card-btn" :class="{ done: item?.status === 'done' }"
          @click.stop="$emit('toggle-done', item)" :title="item?.status === 'done' ? 'Undo' : 'Done'">
          {{ item?.status === 'done' ? '✓' : '○' }}
        </button>
        <button class="card-btn" @click.stop="$emit('edit', item)" title="Edit">✎</button>
        <button class="card-btn" @click.stop="$emit('delete', item)" title="Remove">×</button>
      </div>
    </div>
  `,
  computed: {
    displayName() {
      return this.item?.customName || this.place?.name || 'Custom activity';
    },
    displayEmoji() {
      return this.place?.imageEmoji || '📌';
    },
    categoryLabel() {
      const labels = {
        food: 'Food',
        culture: 'Culture',
        futuristic: 'Futuristic',
        'kid-friendly': 'Kid-friendly',
        shopping: 'Shopping',
        nature: 'Nature'
      };
      return labels[this.place?.category] || this.place?.category;
    },
    statusClass() {
      if (!this.item?.status) return '';
      return 'status-' + this.item.status;
    },
    accentClass() {
      if (!this.place?.category) return '';
      return 'cat-accent-' + this.place.category;
    }
  },
  methods: {
    formatDist(km) {
      return Geo.formatDistance(km);
    }
  }
};
