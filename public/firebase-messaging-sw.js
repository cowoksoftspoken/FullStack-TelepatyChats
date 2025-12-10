importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js"
);

const firebaseConfig = {
  apiKey: "AIzaSyAOkE27nXxkipOczHekDsaoS3tXpqWOIEo",
  authDomain: "react-chat-98ca7.firebaseapp.com",
  databaseURL: "https://react-chat-98ca7-default-rtdb.firebaseio.com",
  projectId: "react-chat-98ca7",
  storageBucket: "react-chat-98ca7.appspot.com",
  messagingSenderId: "236660772088",
  appId: "1:236660772088:web:204c4cba8203870caabf0d",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log(
    "[tpy-firebase-messaging-sw.js] Received background message ",
    payload
  );

  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon,
    // badge: "/badge-icon.png",

    data: {
      url: payload.data.url,
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {
  console.log(
    "[tpy-firebase-messaging-sw.js] Notification click Received.",
    event
  );

  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
