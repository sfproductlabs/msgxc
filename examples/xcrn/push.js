import React from 'react';
import PushNotificationIOS from "@react-native-community/push-notification-ios";
import PushNotification from 'react-native-push-notification';
import env from './env.json'

class Push extends React.Component {

    constructor() {
        super();        
    }

    componentDidMount() {   
        console.log("CONFIGURING PUSH NOTIFICATIONS")   
        PushNotification.configure({
            // (optional) Called when Token is generated (iOS and Android)
            onRegister: function(token) {
              console.log("TOKEN:", token);
            },
          
            // (required) Called when a remote or local notification is opened or received
            onNotification: function(notification) {
              //TODO: AG Call saga?
              console.log("NOTIFICATION:", notification);
          
              // process the notification
          
              // required on iOS only (see fetchCompletionHandler docs: https://github.com/react-native-community/react-native-push-notification-ios)
              if (PushNotificationIOS) {
                notification.finish(PushNotificationIOS.FetchResult.NoData);
              }
            },
          
            // ANDROID ONLY: GCM or FCM Sender ID (product_number) (optional - not required for local notifications, but is need to receive remote push notifications)
            senderID: env.GOOGLE_FCM_SENDER_ID,
          
            // IOS ONLY (optional): default: all - Permissions to register.
            permissions: {
              alert: true,
              badge: true,
              sound: true
            },
          
            // Should the initial notification be popped automatically
            // default: true
            popInitialNotification: true,
          
            /**
             * (optional) default: true
             * - Specified if permissions (ios) and token (android and ios) will requested or not,
             * - if not, you must call PushNotificationsHandler.requestPermissions() later
             */
            requestPermissions: true
          });
    }

    render() {
        return (
            <React.Fragment/>
        );
    }
}


  
  export default Push
  
