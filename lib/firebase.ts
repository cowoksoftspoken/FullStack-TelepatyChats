import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAOkE27nXxkipOczHekDsaoS3tXpqWOIEo",
  authDomain: "chat.telepaty.my.id",
  databaseURL: "https://react-chat-98ca7-default-rtdb.firebaseio.com",
  projectId: "react-chat-98ca7",
  storageBucket: "react-chat-98ca7.appspot.com",
  messagingSenderId: "236660772088",
  appId: "1:236660772088:web:204c4cba8203870caabf0d",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
