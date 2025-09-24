import nodemailer from 'nodemailer';

// MashDiv SMTP Configuration
const config = {
  host: 'mail.mashdiv.com',
  port: 587,
  secure: false, // false for TLS on port 587
  auth: {
    user: 'support@mashdiv.com',
    pass: 'aT8ncBmKnvd7xmP5NmTyYiZ3i'
  },
  tls: {
    rejectUnauthorized: false, // Accept self-signed certificates
    ciphers: 'SSLv3'
  },
  debug: true,
  logger: true
};

async function testEmail() {
  console.log('=================================');
  console.log('Testing MashDiv Email Configuration');
  console.log('=================================');
  console.log('Configuration:', JSON.stringify(config, null, 2));
  console.log('');

  try {
    // Create transporter
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport(config);

    // Verify connection
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✓ Connection verified successfully!');
    console.log('');

    // Sending to the requested email
    const recipientEmail = 'johndoe3dmodeller@gmail.com';
    
    // Prepare test email
    const testEmail = {
      from: '"MashDiv Support" <support@mashdiv.com>',
      to: recipientEmail,
      subject: `Test Email - ${new Date().toLocaleString()}`,
      text: 'This is a test email from MashDiv platform.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
            <h2 style="color: #333;">Test Email from MashDiv</h2>
            <p style="color: #666;">This is a test email to verify the SMTP configuration.</p>
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong style="color: #2e7d32;">✓ Configuration Details:</strong>
              <ul style="color: #555;">
                <li>Host: mail.mashdiv.com</li>
                <li>Port: 587</li>
                <li>Encryption: TLS</li>
                <li>From: support@mashdiv.com</li>
                <li>Time: ${new Date().toLocaleString()}</li>
              </ul>
            </div>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              If you received this email, your configuration is working correctly!
            </p>
          </div>
        </div>
      `
    };

    // Send test email
    console.log('Sending test email to:', testEmail.to);
    const info = await transporter.sendMail(testEmail);
    
    console.log('');
    console.log('=================================');
    console.log('✓ EMAIL SENT SUCCESSFULLY!');
    console.log('=================================');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    console.log('');
    console.log('Please check the inbox (and spam folder) of:', testEmail.to);

  } catch (error: any) {
    console.error('');
    console.error('=================================');
    console.error('✗ EMAIL TEST FAILED');
    console.error('=================================');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Please check:');
      console.error('1. Username is correct: support@mashdiv.com');
      console.error('2. Password is correct');
      console.error('3. SMTP access is enabled for this account');
    } else if (error.code === 'ESOCKET') {
      console.error('Connection failed. Please check:');
      console.error('1. Host is correct: mail.mashdiv.com');
      console.error('2. Port 587 is not blocked by firewall');
      console.error('3. The mail server is running');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timeout. Possible causes:');
      console.error('1. Firewall blocking port 587');
      console.error('2. Incorrect host address');
      console.error('3. Mail server is down');
    }
    
    console.error('');
    console.error('Full error details:', error);
  }
}

// Run the test
console.log('Starting email test...\n');
testEmail().catch(console.error);