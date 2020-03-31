export default {
  documents: {
    'quick-start': require('./quick-start'),
    'message-schedule': require('./message-schedule'),
  },
  reports: {
    'Basic': {
      'messages-upcoming': require('./messages-upcoming'),
      'messages-recent': require('./messages-recent'),
      // 'usage': require('./usage'),
    },    
  }
}
