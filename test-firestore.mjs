import { initializeApp } from 'firebase/app';
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
  console.log('Testing Firestore...');
  try {
    const app = initializeApp(firebaseConfig, 'test-app');
    const db = getFirestore(app);

    console.log('Writing test document to void_messages...');
    const testDoc = {
      id: 'msg_test_' + Date.now(),
      fromId: 'FROM123',
      toId: 'TO123',
      content: 'hello test message',
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'void_messages', testDoc.id), testDoc);
    console.log('Write SUCCESS!');

    console.log('Reading void_messages collection...');
    const snap = await getDocs(collection(db, 'void_messages'));
    console.log('Total docs found:', snap.size);
    snap.forEach((d) => console.log('Doc:', d.id, d.data()));
  } catch (err) {
    console.error('FIRESTORE ERROR:', err.code, err.message);
  }
}

test();
