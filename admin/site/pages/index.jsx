export default {
  documents: {
    'quick-start': require('./quick-start'),
    'schedule-message': require('./schedule-message'),
  },
  reports: {
    'Basic': {
      'upcoming-messages': require('./usage'),
      'recent-messages': require('./usage'),
      'usage': require('./usage'),
    },    
  }
}
