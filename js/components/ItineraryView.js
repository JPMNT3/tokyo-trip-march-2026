// Day-by-day itinerary planner with drag-drop reordering and Overview
const ItineraryView = {
  template: `
    <div class="itinerary-view">
      <!-- Day selector strip with Overview chip -->
      <div class="day-strip">
        <button class="day-chip" :class="{ active: selectedDay === -1 }"
          @click="selectDay(-1)">
          <span>Overview</span>
        </button>
        <button v-for="d in 9" :key="d-1"
          class="day-chip" :class="{ active: selectedDay === d-1, transit: isTransitDay(d-1) }"
          @click="selectDay(d-1)">
          <span>{{ dayName(d-1) }}{{ isTransitDay(d-1) ? ' (transit)' : '' }}</span>
          <span class="day-date">{{ dayDateLabel(d-1) }}</span>
        </button>
      </div>

      <!-- OVERVIEW MODE: Priority items -->
      <div v-if="selectedDay === -1" class="overview-section">
        <div class="day-summary">
          <span class="day-title">Priority Items</span>
          <span>{{ priorityPlaces.length }} must-do</span>
        </div>

        <!-- Scheduled -->
        <div class="section-label section-label--success">Scheduled ({{ scheduledPriority.length }})</div>
        <div v-if="scheduledPriority.length === 0" class="overview-subtitle">
          None of your must-do items are scheduled yet.
        </div>
        <div v-for="item in scheduledPriority" :key="'s-'+item.place.id">
          <activity-card
            :item="{ placeId: item.place.id }"
            :place="item.place"
            :show-actions="false"
            :compact="true"
          ></activity-card>
          <div class="card-action-row overview-scheduled-info">
            {{ item.dayLabel }} · {{ item.timeSlot }}
            <span v-if="item.status === 'done'"> · Done</span>
          </div>
        </div>

        <!-- Not yet scheduled -->
        <div class="section-label section-label--warning">Not Yet Scheduled ({{ unscheduledPriority.length }})</div>
        <div v-if="unscheduledPriority.length === 0" class="overview-subtitle">
          All must-do items are scheduled!
        </div>
        <div v-for="place in unscheduledPriority" :key="'u-'+place.id">
          <activity-card
            :item="{ placeId: place.id }"
            :place="place"
            :show-actions="false"
            :compact="true"
          ></activity-card>
          <div class="card-action-row">
            <button class="card-action-btn primary" @click="schedulePriority(place)">Schedule</button>
          </div>
        </div>
      </div>

      <!-- DAY MODE: Normal itinerary view -->
      <template v-if="selectedDay >= 0">
        <!-- Day summary -->
        <div class="day-summary">
          <span class="day-title">{{ dayFullLabel(selectedDay) }}</span>
          <span>{{ dayActivities.length }} {{ dayActivities.length === 1 ? 'activity' : 'activities' }}{{ doneCount ? ' · ' + doneCount + ' done' : '' }}</span>
        </div>

        <!-- Activity list grouped by time slot -->
        <div v-for="slot in ['morning','afternoon','evening']" :key="slot">
          <div class="time-slot-header" v-if="slotActivities(slot).length">
            {{ slot }}
          </div>
          <div :ref="'sortable-' + slot" :data-slot="slot">
            <activity-card
              v-for="act in slotActivities(slot)" :key="act.id"
              :item="act"
              :place="placesMap[act.placeId]"
              :show-status="true"
              :draggable="true"
              :collapsible="true"
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
      </template>
    </div>
  `,
  data() {
    return {
      selectedDay: 1,
      dayActivities: [],
      placesMap: {},
      sortables: [],
      priorityPlaces: [],
      scheduledPriority: [],
      unscheduledPriority: []
    };
  },
  computed: {
    doneCount() {
      return this.dayActivities.filter(a => a.status === 'done').length;
    }
  },
  async created() {
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
        1: 'Arrive Tokyo → Hilton Shinjuku',
        2: 'teamLab & Shibuya · Hilton',
        3: 'Akihabara & Karting · Hilton',
        4: 'Hilton → Shuzenji Onsen',
        5: 'Shuzenji → Fairmont Tokyo',
        6: 'Tokyo Explore · Fairmont',
        7: 'Last Day · Fairmont → NRT',
        8: 'Arrive Singapore'
      };
      return labels[i] || TripDates.fullLabel(i);
    },
    isTransitDay(i) { return i === 0 || i === 8; },

    async loadPlaces() {
      const places = await db.places.toArray();
      this.placesMap = {};
      places.forEach(p => { this.placesMap[p.id] = p; });
    },

    async selectDay(d) {
      this.selectedDay = d;
      if (d === -1) {
        await this.loadOverview();
      } else {
        await this.loadDay();
        this.$nextTick(() => this.initSortable());
      }
    },

    async loadOverview() {
      const allPlaces = await db.places.toArray();
      this.priorityPlaces = allPlaces.filter(p => p.priority === true);
      const itineraryItems = await db.itinerary.toArray();

      const scheduledPlaceIds = new Set();
      this.scheduledPriority = [];

      for (const itin of itineraryItems) {
        const place = this.priorityPlaces.find(p => p.id === itin.placeId);
        if (place) {
          scheduledPlaceIds.add(place.id);
          this.scheduledPriority.push({
            place,
            dayLabel: TripDates.fullLabel(itin.dayIndex),
            timeSlot: itin.timeSlot,
            status: itin.status
          });
        }
      }

      this.unscheduledPriority = this.priorityPlaces.filter(p => !scheduledPlaceIds.has(p.id));
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
            const itemId = evt.item.querySelector('.activity-card')?.dataset?.id;
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
          const id = cards[i].dataset.id;
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

    schedulePriority(place) {
      this.$root.openModal('pick-day', { placeId: place.id }, 0);
    },

    async refresh() {
      if (this.selectedDay === -1) {
        await this.loadOverview();
      } else {
        await this.loadDay();
        this.$nextTick(() => this.initSortable());
      }
    }
  }
};
