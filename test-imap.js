// Test IMAP direct
const { ImapFlow } = require('imapflow');

async function testIMAP() {
  try {
    console.log('🔌 Testing IMAP connection...');
    
    const client = new ImapFlow({
      host: 'mail.infomaniak.com',
      port: 993,
      secure: true,
      auth: {
        user: 'terachtshitenge@allinonerdc.com',
        pass: 'AllinOne25'
      },
      logger: false
    });

    console.log('⏳ Connecting...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const mailboxes = await client.list();
    console.log('📁 Mailboxes:', mailboxes.map(m => m.name));
    
    await client.logout();
    console.log('👋 Disconnected');
    
  } catch (error) {
    console.error('❌ IMAP Error:', error.message);
    console.error('📋 Full error:', error);
  }
}

testIMAP();
