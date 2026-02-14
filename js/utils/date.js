// Trip date helpers — Mar 14, 2026 = day 0; Mar 22, 2026 = day 8
const TripDates = {
  START: new Date(2026, 2, 14), // Month is 0-indexed
  END: new Date(2026, 2, 22),
  TOTAL_DAYS: 9,

  dayNames: ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  monthDay: [14, 15, 16, 17, 18, 19, 20, 21, 22],

  /** Get label for a day index, e.g. "Sat 14" */
  label(dayIndex) {
    return `${this.dayNames[dayIndex]} ${this.monthDay[dayIndex]}`;
  },

  /** Full label like "Sat, Mar 14" */
  fullLabel(dayIndex) {
    return `${this.dayNames[dayIndex]}, Mar ${this.monthDay[dayIndex]}`;
  },

  /** Get the Date object for a day index */
  dateFor(dayIndex) {
    const d = new Date(this.START);
    d.setDate(d.getDate() + dayIndex);
    return d;
  },

  /** Get the current trip day index (0-8), or -1 if outside trip window */
  currentDayIndex() {
    const now = new Date();
    const start = new Date(2026, 2, 14);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((now - start) / 86400000);
    if (diff < 0 || diff > 8) return -1;
    return diff;
  },

  /** Is today within the trip dates? */
  isDuringTrip() {
    return this.currentDayIndex() >= 0;
  },

  /** Days until trip starts */
  daysUntilTrip() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(2026, 2, 14);
    start.setHours(0, 0, 0, 0);
    return Math.ceil((start - now) / 86400000);
  }
};
