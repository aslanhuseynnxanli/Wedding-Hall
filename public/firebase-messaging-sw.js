importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAm2chAdBY_Pfy0VUww3SLbWMNQEd6KK_U",
  authDomain: "smart-wedding-hall.firebaseapp.com",
  projectId: "smart-wedding-hall",
  storageBucket: "smart-wedding-hall.firebasestorage.app",
  messagingSenderId: "777209674957",
  appId: "1:777209674957:web:48947df2cec8438a003d84",
  measurementId: "G-PY0TKH1XN4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});