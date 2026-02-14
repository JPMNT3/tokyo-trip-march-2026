// Vue app root — view switching, global state, modal management
const app = Vue.createApp({
  data() {
    return {
      currentView: 'itinerary',
      modalOpen: false,
      modalMode: 'add',
      modalItem: null,
      modalDayIndex: 0,
      ready: false
    };
  },
  async created() {
    // Initialize database and seed on first load
    await seedDatabase();
    this.ready = true;
  },
  methods: {
    openModal(mode, item, dayIndex) {
      this.modalMode = mode;
      this.modalItem = item;
      this.modalDayIndex = dayIndex ?? 0;
      this.modalOpen = true;
    },

    closeModal() {
      this.modalOpen = false;
      this.modalItem = null;
    },

    async handleModalSave(data) {
      if (this.modalMode === 'edit' && data.id) {
        // Update existing itinerary item
        await db.itinerary.update(data.id, {
          placeId: data.placeId,
          customName: data.customName,
          dayIndex: data.dayIndex,
          timeSlot: data.timeSlot,
          startTime: data.startTime,
          notes: data.notes,
          status: data.status
        });
      } else {
        // Add new itinerary item
        const count = await db.itinerary.where('dayIndex').equals(data.dayIndex).count();
        await db.itinerary.add({
          placeId: data.placeId,
          customName: data.customName,
          dayIndex: data.dayIndex,
          timeSlot: data.timeSlot,
          startTime: data.startTime,
          notes: data.notes,
          status: 'planned',
          sortOrder: count
        });
      }

      this.closeModal();

      // Refresh the active view
      this.$nextTick(() => {
        const viewRef = this.$refs[this.currentView];
        if (viewRef?.refresh) viewRef.refresh();
      });
    }
  }
});

// Register components
app.component('nav-bar', NavBar);
app.component('activity-card', ActivityCard);
app.component('activity-modal', ActivityModal);
app.component('itinerary-view', ItineraryView);
app.component('wishlist-view', WishlistView);
app.component('nearby-view', NearbyView);
app.component('dont-miss-view', DontMissView);
app.component('profile-view', ProfileView);

// Mount
app.mount('#app');
