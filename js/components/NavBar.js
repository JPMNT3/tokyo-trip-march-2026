// Bottom 4-tab navigation with SVG outline icons
const NavBar = {
  props: ['current'],
  emits: ['switch'],
  template: `
    <nav class="bottom-nav">
      <button v-for="tab in tabs" :key="tab.id"
        class="nav-item" :class="{ active: current === tab.id }"
        @click="$emit('switch', tab.id)">
        <span class="nav-icon" v-html="tab.icon"></span>
        <span>{{ tab.label }}</span>
      </button>
    </nav>
  `,
  data() {
    return {
      tabs: [
        {
          id: 'itinerary',
          icon: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>',
          label: 'Plan'
        },
        {
          id: 'wishlist',
          icon: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
          label: 'Saved'
        },
        {
          id: 'nearby',
          icon: '<svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
          label: 'Map'
        },
        {
          id: 'profile',
          icon: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
          label: 'Trip'
        }
      ]
    };
  }
};
