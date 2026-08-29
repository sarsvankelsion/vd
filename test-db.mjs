import { saveUser, getUser, savePost, listPosts, saveMessage, listMessages } from './lib/db.ts';

async function test() {
  console.log('Testing Firestore operations...');
  try {
    const testUser = {
      userId: 'TESTUSER1234567',
      passwordHash: 'hash123',
      createdAt: Date.now(),
    };
    console.log('1. Testing saveUser...');
    await saveUser(testUser);
    console.log('2. Testing getUser...');
    const u = await getUser('TESTUSER1234567');
    console.log('Got user:', u);

    console.log('3. Testing listPosts...');
    const posts = await listPosts(1, 10);
    console.log('Got posts:', posts);

    console.log('4. Testing saveMessage...');
    const msg = {
      id: 'test_msg_1',
      fromId: 'USERA1234567890',
      toId: 'USERB1234567890',
      content: 'hello test',
      createdAt: Date.now(),
    };
    await saveMessage(msg);

    console.log('5. Testing listMessages...');
    const msgs = await listMessages('USERA1234567890');
    console.log('Got messages:', msgs);
    console.log('ALL TESTS PASSED!');
  } catch (err) {
    console.error('TEST ERROR:', err);
  }
}

test();
