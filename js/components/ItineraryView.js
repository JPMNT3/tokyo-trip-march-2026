// Day-by-day itinerary planner with drag-drop reordering
const ItineraryView = {
  template: `
    <div class="itinerary-view">
      <!-- Day selector strip -->
      <div class="day-strip">
        <button v-for="d in 9" :key="d-1"
          class="day-chip" :class="{ active: selectedDay === d-1, transit: isTransitDay(d-1) }"
          @click="selectDay(d-1)">
          <span>{{ dayName(d-1) }}</span>
          <span class="day-date">{{ dayDateLabel(d-1) }}</span>
        </button>
      </div>

      <!-- Day summary -->
      <div class="day-summary">
        <span class="day-title">{{ dayFullLabel(selectedDay) }}</span>
        <span>{{ dayActivities.length }} {{ dayActivities.length === 1 ? 'activity' : 'activities' }}{{ doneCount ? ' · ' + doneCount + ' done' : '' }}</span>
      </div>

      <!-- Activity list grouped by time slot -->
      <div v-for="slot in ['morning','afternoon','evening']" :key="slot">
        <div class="time-slot-header" v-if="slotActivities(slot).length">
          {{ slotEmoji(slot) }} {{ slot }}
        </div>
        <div :ref="'sortable-' + slot" :data-slot="slot">
          <activity-card
            v-for="act in slotActivities(slot)" :key="act.id"
            :item="act"
            :place="placesMap[act.placeId]"
            :show-status="true"
            :draggable="true"
            @edit="editActivity(act)"
            @toggle-done="toggleDone(act)"
            @delete="deleteActivity(act)"
          ></activity-card>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="dayActivities.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <p>Nothing planned for this day yet.<br>Tap + to add an activity.</p>
      </div>

      <!-- FAB -->
      <button class="fab" @click="addActivity" title="Add activity">+</button>
    </div>
  `,
  data() {
    return {
      selectedDay: 1, // Default to Day 1 (Sun Mar 15 = arrival in Tokyo)
      dayActivities: [],
      placesMap: {},
      sortables: []
    };
  },
  computed: {
    doneCount() {
      return this.dayActivities.filter(a => a.status === 'done').length;
    }
  },
  async created() {
    // Default to current trip day if during trip, otherwise day 1 (first Tokyo day)
    const tripDay = TripDates.currentDayIndex();
    if (tripDay >= 0) {
      this.selectedDay = tripDay;
    }
    await this.loadPlaces();
    await this.loadDay();
  },
  mounted() {
    this.$nextTick(() => this.initSortable());
  },
  methods: {
    dayName(i) { return TripDates.dayNames[i]; },
    dayDateLabel(i) { return 'Mar ' + TripDates.monthDay[i]; },
    dayFullLabel(i) {
      const labels = {
        0: 'Departure from Singapore',
        1: 'Arrive Tokyo — Day 1',
        2: 'Day 2 — teamLab & Shibuya',
        3: 'Day 3 — Akihabara & Karting',
        4: 'Day 4 — Shuzenji Onsen',
        5: 'Day 5 — Shuzenji → Tokyo',
        6: 'Day 6 — Tokyo',
        7: 'Day 7 — Last Day & Flight Home',
        8: 'Arrive Singapore'
      };
      return labels[i] || TripDates.fullLabel(i);
    },
    isTransitDay(i) { return i === 0 || i === 8; },
    slotEmoji(s) { return { morning: '🌅', afternoon: '☀️', evening: '🌙' }[s]; },

    async loadPlaces() {
      const places = await db.places.toArray();
      this.placesMap = {};
      places.forEach(p => { this.placesMap[p.id] = p; });
    },

    async selectDay(d) {
      this.selectedDay = d;
      await this.loadDay();
      this.$nextTick(() => this.initSortable());
    },

    async loadDay() {
      this.dayActivities = await db.itinerary
        .where('dayIndex').equals(this.selectedDay)
        .sortBy('sortOrder');
    },

    slotActivities(slot) {
      return this.dayActivities.filter(a => a.timeSlot === slot);
    },

    initSortable() {
      this.sortables.forEach(s => s.destroy());
      this.sortables = [];

      for (const slot of ['morning', 'afternoon', 'evening']) {
        const refKey = 'sortable-' + slot;
        const el = this.$refs[refKey];
        const container = Array.isArray(el) ? el[0] : el;
        if (!container) continue;

        const s = new Sortable(container, {
          group: 'itinerary',
          animation: 150,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
          handle: '.card-emoji',
          onEnd: async (evt) => {
            const newSlot = evt.to.dataset.slot;
            const itemId = parseInt(evt.item.querySelector('.activity-card')?.dataset?.id);
            if (!itemId) return;
            await this.reorderAll();
            if (newSlot) {
              await db.itinerary.update(itemId, { timeSlot: newSlot });
            }
            await this.loadDay();
          }
        });
        this.sortables.push(s);
      }
    },

    async reorderAll() {
      for (const slot of ['morning', 'afternoon', 'evening']) {
        const refKey = 'sortable-' + slot;
        const el = this.$refs[refKey];
        const container = Array.isArray(el) ? el[0] : el;
        if (!container) continue;
        const cards = container.querySelectorAll('.activity-card');
        for (let i = 0; i < cards.length; i++) {
          const id = parseInt(cards[i].dataset.id);
          if (id) await db.itinerary.update(id, { sortOrder: i });
        }
      }
    },

    addActivity() {
      this.$root.openModal('add', null, this.selectedDay);
    },

    editActivity(act) {
      this.$root.openModal('edit', act, this.selectedDay);
    },

    async toggleDone(act) {
      const newStatus = act.status === 'done' ? 'planned' : 'done';
      await db.itinerary.update(act.id, { status: newStatus });
      await this.loadDay();
    },

    async deleteActivity(act) {
      await db.itinerary.delete(act.id);
      await this.loadDay();
    },

    async refresh() {
      await this.loadDay();
      this.$nextTick(() => this.initSortable());
    }
  }
};
