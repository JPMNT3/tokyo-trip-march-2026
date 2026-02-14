// Bottom 5-tab navigation component
const NavBar = {
  props: ['current'],
  emits: ['switch'],
  template: `
    <nav class="bottom-nav">
      <button v-for="tab in tabs" :key="tab.id"
        class="nav-item" :class="{ active: current === tab.id }"
        @click="$emit('switch', tab.id)">
        <span class="nav-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  `,
  data() {
    return {
      tabs: [
        { id: 'itinerary', icon: '📅', label: 'Plan' },
        { id: 'wishlist', icon: '⭐', label: 'Wishlist' },
        { id: 'nearby', icon: '📍', label: 'Nearby' },
        { id: 'dontmiss', icon: '🔥', label: 'Must Do' },
        { id: 'profile', icon: '👨‍👩‍👦', label: 'Family' }
      ]
    };
  }
};
