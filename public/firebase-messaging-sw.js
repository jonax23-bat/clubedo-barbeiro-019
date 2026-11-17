// Importa scripts do Firebase SDK v9+ (compat)
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Inicializa o Firebase no Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyAAJ1UIZ7qcgSVn2-ZgslXu3Yj5ic79p98",
  authDomain: "clubedabarba019.firebaseapp.com",
  projectId: "clubedabarba019",
  storageBucket: "clubedabarba019.firebasestorage.app",
  messagingSenderId: "833376249340",
  appId: "1:833376249340:web:1aaca87b6e2a4ffd4d7e79"
});

const messaging = firebase.messaging();

// Lógica de recebimento em segundo plano (background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensagem recebida em segundo plano: ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Novo Alerta';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Você tem uma nova notificação.',
    icon: '/logo-alijoy.jpg', // logo da barbearia
    badge: '/logo-alijoy.jpg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
