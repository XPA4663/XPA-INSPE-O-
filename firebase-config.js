/* XPA Inspeções – configuração do login (Firebase)
   1. Crie um projeto em https://console.firebase.google.com
   2. Authentication > Método de login > ative "E-mail/senha" e cadastre os usuários em "Users".
   3. Firestore Database > Criar banco (modo produção) > Regras: cole as regras do LEIA-ME.txt.
   4. Configurações do projeto > Seus apps > Web (</>) > copie o objeto firebaseConfig e cole abaixo.
   5. Authentication > Settings > Domínios autorizados > adicione SEU-USUARIO.github.io
   Enquanto apiKey estiver com COLE_AQUI, o app funciona sem login (dados só no aparelho). */
window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000"
};
