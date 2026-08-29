import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyB4-JrPO6DzJgiSeePFEcyPCJfbQ57e3mE',
  authDomain: 'zm44-a3407.firebaseapp.com',
  projectId: 'zm44-a3407',
  storageBucket: 'zm44-a3407.firebasestorage.app',
  messagingSenderId: '24267145764',
  appId: '1:24267145764:web:0134520b0346daac74ceb1',
};

async function test() {
  console.log('Testing Firestore with Anonymous Auth...');
  try {
    const app = initializeApp(firebaseConfig, 'test-app-' + Date.now());
    const auth = getAuth(app);
    console.log('Signing in anonymously...');
    const userCred = await signInAnonymously(auth);
    console.log('Signed in UID:', userCred.user.uid);

    const db = getFirestore(app);

    console.log('Writing test document to users/' + userCred.user.uid + '/data/test...');
    await setDoc(doc(db, `users/${userCred.user.uid}/data/test`), {
      test: true,
      time: Date.now(),
    });
    console.log('Write to user path SUCCESS!');

    console.log('Trying root void_messages...');
    await setDoc(doc(db, 'void_messages', 'test_123'), {
      content: 'hello',
      createdAt: Date.now(),
    });
    console.log('Write to void_messages SUCCESS!');
  } catch (err) {
    console.error('FIRESTORE ERROR:', err.code, err.message);
  }
}

test();
