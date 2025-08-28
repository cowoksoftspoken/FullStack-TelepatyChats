import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// const firebaseConfig = {
//   apiKey: "AIzaSyD2NwS9elb_IiQF0YR7YMBvqYund42JD0g",
//   authDomain: "web-kelas-46eea.firebaseapp.com",
//   projectId: "web-kelas-46eea",
//   storageBucket: "web-kelas-46eea.appspot.com",
//   messagingSenderId: "365156854136",
//   appId: "1:365156854136:web:bae5126c68fb30d1c4c08d",
//   measurementId: "G-7VR3K8BSDG",
// }

const firebaseConfig = {
  apiKey: "AIzaSyAOkE27nXxkipOczHekDsaoS3tXpqWOIEo",
  authDomain: "react-chat-98ca7.firebaseapp.com",
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
