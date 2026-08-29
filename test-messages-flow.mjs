import { saveUser, getUser, saveMessage, listMessages } from './lib/db.ts';

async function testChatFlow() {
  console.log('--- TESTING 2-WAY MESSAGE FLOW ---');

  const userA = 'USERA_15CHAR_ID';
  const userB = 'USERB_15CHAR_ID';

  // 1. User A sends message to User B
  console.log('1. User A sends message to User B...');
  const msg1 = {
    id: 'msg_001',
    fromId: userA,
    toId: userB,
    content: 'Hi User B, I am User A!',
    createdAt: Date.now(),
  };
  await saveMessage(msg1);

  // 2. User B checks inbox
  console.log('2. User B checks inbox for peers...');
  const msgsForB = await listMessages(userB);
  const peersForB = new Set();
  for (const m of msgsForB) {
    if (m.fromId === userB) peersForB.add(m.toId);
    if (m.toId === userB) peersForB.add(m.fromId);
  }
  console.log('User B peers found:', Array.from(peersForB));

  // 3. User B replies to User A
  console.log('3. User B replies to User A...');
  const msg2 = {
    id: 'msg_002',
    fromId: userB,
    toId: userA,
    content: 'Hello User A, got your message loud and clear!',
    createdAt: Date.now() + 1000,
  };
  await saveMessage(msg2);

  // 4. User A opens chat with User B
  console.log('4. User A loads conversation with User B...');
  const msgsForA = await listMessages(userA);
  const conversation = msgsForA.filter(
    (m) =>
      (m.fromId === userA && m.toId === userB) ||
      (m.fromId === userB && m.toId === userA)
  );

  console.log('Full conversation visible to User A:');
  conversation.forEach((m) => {
    console.log(`[${m.fromId} -> ${m.toId}]: "${m.content}"`);
  });

  if (conversation.length === 2) {
    console.log('\n SUCCESS: 2-way messaging is 100% verified and synchronized!');
  } else {
    console.error('\n FAILURE: Missing messages in conversation!');
  }
}

testChatFlow();
