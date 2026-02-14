// Add/edit activity dialog (bottom sheet)
const ActivityModal = {
  props: {
    mode: { type: String, default: 'add' }, // 'add' | 'edit' | 'pick-day'
    item: Object,     // existing item for edit mode
    dayIndex: Number   // target day for add mode
  },
  emits: ['close', 'save'],
  template: `
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-sheet">
        <h2>{{ mode === 'edit' ? 'Edit Activity' : mode === 'pick-day' ? 'Add to Itinerary' : 'Add Activity' }}</h2>

        <!-- Search existing places -->
        <div v-if="mode !== 'edit'" class="form-group">
          <label>Search places</label>
          <input v-model="search" placeholder="Type to search..." @input="filterPlaces">
          <div v-if="filteredPlaces.length" style="max-height:200px;overflow-y:auto;border:1px solid var(--gray-light);border-radius:8px;margin-top:6px">
            <div v-for="p in filteredPlaces" :key="p.id"
              style="padding:10px 12px;cursor:pointer;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--gray-lighter)"
              :style="{ background: selectedPlaceId === p.id ? '#FEE2E2' : '' }"
              @click="selectPlace(p)">
              <span>{{ p.imageEmoji }}</span>
              <span style="font-size:14px">{{ p.name }}</span>
              <span style="font-size:11px;color:var(--gray);margin-left:auto">{{ p.neighborhood }}</span>
            </div>
          </div>
        </div>

        <!-- Custom name (if no place selected) -->
        <div class="form-group" v-if="!selectedPlaceId">
          <label>Custom activity name</label>
          <input v-model="form.customName" placeholder="e.g. Check into hotel">
        </div>

        <!-- Day picker (for pick-day mode or add mode) -->
        <div class="form-group" v-if="mode !== 'edit' || true">
          <label>Day</label>
          <select v-model.number="form.dayIndex">
            <option v-for="d in 9" :key="d-1" :value="d-1">{{ dayLabel(d-1) }}</option>
          </select>
        </div>

        <!-- Time slot -->
        <div class="form-group">
          <label>Time of day</label>
          <div style="display:flex;gap:8px">
            <button v-for="slot in ['morning','afternoon','evening']" :key="slot"
              class="filter-chip" :class="{ active: form.timeSlot === slot }"
              @click="form.timeSlot = slot">
              {{ slotEmoji(slot) }} {{ slot }}
            </button>
          </div>
        </div>

        <!-- Start time -->
        <div class="form-group">
          <label>Start time (optional)</label>
          <input type="time" v-model="form.startTime">
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="form.notes" placeholder="Any notes..." rows="2"></textarea>
        </div>

        <!-- Buttons -->
        <div class="btn-row">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="!canSave">
            {{ mode === 'edit' ? 'Update' : 'Add' }}
          </button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      search: '',
      allPlaces: [],
      filteredPlaces: [],
      selectedPlaceId: null,
      form: {
        dayIndex: this.dayIndex ?? 0,
        timeSlot: 'morning',
        startTime: '',
        customName: '',
        notes: '',
        status: 'planned'
      }
    };
  },
  computed: {
    canSave() {
      return this.selectedPlaceId || this.form.customName.trim();
    }
  },
  async created() {
    // Load all places for search
    this.allPlaces = await db.places.toArray();

    // Pre-fill form for edit mode
    if (this.mode === 'edit' && this.item) {
      this.form.dayIndex = this.item.dayIndex;
      this.form.timeSlot = this.item.timeSlot || 'morning';
      this.form.startTime = this.item.startTime || '';
      this.form.customName = this.item.customName || '';
      this.form.notes = this.item.notes || '';
      this.form.status = this.item.status || 'planned';
      this.selectedPlaceId = this.item.placeId || null;
    }

    // Pre-fill for pick-day mode
    if (this.mode === 'pick-day' && this.item) {
      this.selectedPlaceId = this.item.placeId || null;
      this.form.customName = this.item.customName || '';
    }
  },
  methods: {
    filterPlaces() {
      const q = this.search.toLowerCase().trim();
      if (!q) { this.filteredPlaces = []; return; }
      this.filteredPlaces = this.allPlaces
        .filter(p => p.name.toLowerCase().includes(q) || (p.nameJa && p.nameJa.includes(q)) || p.neighborhood.toLowerCase().includes(q))
        .slice(0, 10);
    },
    selectPlace(p) {
      this.selectedPlaceId = p.id;
      this.form.customName = '';
      this.search = p.name;
      this.filteredPlaces = [];
    },
    dayLabel(i) {
      return TripDates.fullLabel(i);
    },
    slotEmoji(s) {
      return { morning: '🌅', afternoon: '☀️', evening: '🌙' }[s] || '';
    },
    save() {
      if (!this.canSave) return;
      this.$emit('save', {
        id: this.item?.id,
        placeId: this.selectedPlaceId || null,
        customName: this.selectedPlaceId ? '' : this.form.customName.trim(),
        dayIndex: this.form.dayIndex,
        timeSlot: this.form.timeSlot,
        startTime: this.form.startTime,
        notes: this.form.notes,
        status: this.form.status,
        sortOrder: this.item?.sortOrder ?? 999
      });
    }
  }
};
