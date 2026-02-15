// Reusable activity/place card component
const ActivityCard = {
  props: {
    place: Object,
    item: Object,
    showActions: { type: Boolean, default: true },
    showStatus: { type: Boolean, default: false },
    showDistance: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    collapsible: { type: Boolean, default: false },
    draggable: { type: Boolean, default: false }
  },
  emits: ['edit', 'toggle-done', 'delete', 'add-to-today', 'add-to-wishlist', 'move-to-itinerary'],
  template: `
    <div class="activity-card"
      :class="[statusClass, { compact, collapsible }]"
      :data-id="item?.id"
      @click="collapsible ? expanded = !expanded : null">
      <div class="card-emoji" :class="'cat-' + (place?.category || 'default')">{{ displayEmoji }}</div>
      <div class="card-body">
        <div class="card-header-row">
          <div class="card-name">{{ displayName }}</div>
          <span v-if="collapsible && item?.startTime" class="card-time-inline">{{ item.startTime }}</span>
        </div>
        <template v-if="!collapsible || expanded">
          <div class="card-name-ja" v-if="place?.nameJa">{{ place.nameJa }}</div>
          <div v-if="place?.notes" class="card-desc">{{ place.notes }}</div>
          <div v-if="item?.startTime && !collapsible" class="card-time">
            {{ item.startTime }}
            <span v-if="place?.duration"> · {{ place.duration }}min</span>
          </div>
          <div v-if="item?.notes" class="card-notes">{{ item.notes }}</div>
          <div class="card-meta">
            <span v-if="place?.category" class="card-tag" :class="'cat-tag-' + place.category">{{ categoryLabel }}</span>
            <span v-if="place?.neighborhood && place.neighborhood !== 'Transit'" class="card-tag">{{ place.neighborhood }}</span>
            <span v-if="place?.priceRange && place.priceRange !== 'Booked ✓'" class="card-tag">{{ place.priceRange }}</span>
            <span v-if="place?.priceRange === 'Booked ✓'" class="card-tag card-tag--booked">Booked</span>
            <span v-if="showDistance && place?._dist != null" class="card-tag">{{ formatDist(place._dist) }}</span>
            <span v-if="place?.priority" class="card-tag card-tag--priority">Must do</span>
          </div>
        </template>
        <div v-else class="card-meta">
          <span v-if="place?.category" class="card-tag" :class="'cat-tag-' + place.category">{{ categoryLabel }}</span>
          <span v-if="place?.neighborhood && place.neighborhood !== 'Transit'" class="card-tag">{{ place.neighborhood }}</span>
        </div>
      </div>
      <div class="card-actions" v-if="showActions && (!collapsible || expanded)">
        <button v-if="showStatus" class="card-btn" :class="{ 'card-btn--done': item?.status === 'done' }"
          @click.stop="$emit('toggle-done', item)" :title="item?.status === 'done' ? 'Undo' : 'Done'">
          {{ item?.status === 'done' ? '✓' : '○' }}
        </button>
        <button class="card-btn" @click.stop="$emit('edit', item)" title="Edit">✎</button>
        <button class="card-btn" @click.stop="$emit('delete', item)" title="Remove">×</button>
      </div>
      <div v-if="collapsible" class="card-expand-icon">{{ expanded ? '▾' : '›' }}</div>
    </div>
  `,
  data() {
    return { expanded: false };
  },
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
    }
  },
  methods: {
    formatDist(km) {
      return Geo.formatDistance(km);
    }
  }
};
