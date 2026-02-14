// Priority reminders — shows all "don't miss" items grouped by scheduled vs not
const DontMissView = {
  template: `
    <div class="dontmiss-view">
      <div style="padding:16px 20px;font-size:13px;color:var(--text-tertiary);letter-spacing:0.2px">
        Priority places grouped by scheduling status.
      </div>

      <!-- Scheduled -->
      <div class="section-label scheduled">Scheduled ({{ scheduledItems.length }})</div>
      <div v-if="scheduledItems.length === 0" style="padding:8px 20px;font-size:13px;color:var(--text-tertiary)">
        None of your must-do items are scheduled yet.
      </div>
      <div v-for="item in scheduledItems" :key="'s-'+item.place.id">
        <activity-card
          :item="{ placeId: item.place.id }"
          :place="item.place"
          :show-actions="false"
          :compact="true"
        ></activity-card>
        <div class="card-action-row" style="font-size:12px;color:var(--green);font-weight:500">
          {{ item.dayLabel }} · {{ item.timeSlot }}
          <span v-if="item.status === 'done'" style="margin-left:4px">Done</span>
        </div>
      </div>

      <!-- Not yet scheduled -->
      <div class="section-label not-scheduled">⏳ Not Yet Scheduled ({{ unscheduledItems.length }})</div>
      <div v-if="unscheduledItems.length === 0" style="padding:8px 20px;font-size:13px;color:var(--text-tertiary)">
        All must-do items are scheduled!
      </div>
      <div v-for="place in unscheduledItems" :key="'u-'+place.id">
        <activity-card
          :item="{ placeId: place.id }"
          :place="place"
          :show-actions="false"
          :compact="true"
        ></activity-card>
        <div class="card-action-row">
          <button class="card-action-btn primary" @click="scheduleItem(place)">Schedule</button>
          <button class="card-action-btn" @click="addToWishlist(place)">Wishlist</button>
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      priorityPlaces: [],
      itineraryItems: [],
      scheduledItems: [],
      unscheduledItems: []
    };
  },
  async created() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      // Get all priority places
      this.priorityPlaces = (await db.places.toArray()).filter(p => p.priority === true);

      // Get all itinerary items
      this.itineraryItems = await db.itinerary.toArray();

      // Build scheduled/unscheduled lists
      const scheduledPlaceIds = new Set();
      this.scheduledItems = [];

      for (const itin of this.itineraryItems) {
        const place = this.priorityPlaces.find(p => p.id === itin.placeId);
        if (place) {
          scheduledPlaceIds.add(place.id);
          this.scheduledItems.push({
            place,
            dayLabel: TripDates.fullLabel(itin.dayIndex),
            timeSlot: itin.timeSlot,
            status: itin.status
          });
        }
      }

      this.unscheduledItems = this.priorityPlaces.filter(p => !scheduledPlaceIds.has(p.id));
    },

    scheduleItem(place) {
      this.$root.openModal('pick-day', { placeId: place.id }, 0);
    },

    async addToWishlist(place) {
      const existing = await db.wishlist.where('placeId').equals(place.id).first();
      if (!existing) {
        await db.wishlist.add({
          placeId: place.id,
          customName: '',
          done: false,
          priority: true,
          tags: place.tags || [],
          addedBy: 'all'
        });
      }
    },

    async refresh() {
      await this.loadData();
    }
  }
};
