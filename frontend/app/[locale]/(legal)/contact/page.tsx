"use client";

import { useState, useEffect } from "react";

export default function Contact() {
  const [pageContent, setPageContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load page content from database
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        const res = await fetch("/api/admin/default-editor/contact?pageSource=default");
        if (res.ok) {
          const data = await res.json();
          setPageContent(data);
        }
      } catch (error) {
        console.error("Error loading contact page content:", error);
        // Use fallback content if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  // Default content as fallback
  const defaultContent = `
    <h1>Contact Us</h1>
    <p><strong>Get in touch with our team</strong></p>
    
    <h2>Need Help?</h2>
    <p>Our support team is here to help you with any questions or issues you may have. We're committed to providing excellent customer service and ensuring your trading experience is smooth and successful.</p>
    
    <h2>Contact Information</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
      <div class="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
        <h3>Customer Support</h3>
        <p><strong>Email:</strong> support@cryptox.com</p>
        <p><strong>Phone:</strong> +1 (555) 123-4567</p>
        <p><strong>Hours:</strong> 24/7 Support Available</p>
        <p>For general questions, account issues, and trading support.</p>
      </div>
      
      <div class="p-6 bg-green-50 dark:bg-green-950/20 rounded-xl">
        <h3>Business Inquiries</h3>
        <p><strong>Email:</strong> business@cryptox.com</p>
        <p><strong>Phone:</strong> +1 (555) 123-4568</p>
        <p><strong>Hours:</strong> Monday-Friday, 9 AM - 6 PM EST</p>
        <p>For partnerships, institutional accounts, and business development.</p>
      </div>
      
      <div class="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
        <h3>Legal & Compliance</h3>
        <p><strong>Email:</strong> legal@cryptox.com</p>
        <p><strong>Phone:</strong> +1 (555) 123-4569</p>
        <p><strong>Hours:</strong> Monday-Friday, 9 AM - 5 PM EST</p>
        <p>For legal inquiries, compliance questions, and regulatory matters.</p>
      </div>
    </div>
    
    <h2>Office Locations</h2>
    
    <h3>Headquarters</h3>
    <p>
      <strong>CryptoX Trading Platform</strong><br/>
      123 Blockchain Avenue<br/>
      New York, NY 10001<br/>
      United States
    </p>
    
    <h3>European Office</h3>
    <p>
      <strong>CryptoX Europe Ltd.</strong><br/>
      456 Crypto Street<br/>
      London, EC1A 1BB<br/>
      United Kingdom
    </p>
    
    <h3>Asia Pacific Office</h3>
    <p>
      <strong>CryptoX Asia Pte Ltd.</strong><br/>
      789 Digital Boulevard<br/>
      Singapore 018989<br/>
      Singapore
    </p>
    
    <h2>Frequently Asked Questions</h2>
    
    <div class="space-y-6 my-8">
      <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <h3>How do I create an account?</h3>
        <p>To create an account, visit our registration page and follow the simple signup process. You'll need to provide your email address and create a secure password. After registration, complete the verification process to start trading.</p>
      </div>
      
      <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <h3>What verification documents do I need?</h3>
        <p>For basic verification, you'll need a government-issued ID (passport, driver's license, or national ID card) and proof of address (utility bill or bank statement from the last 3 months).</p>
      </div>
      
      <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <h3>How long does verification take?</h3>
        <p>Basic verification is usually completed within minutes. Advanced verification may take 1-3 business days depending on document quality and review volume.</p>
      </div>
      
      <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <h3>What are your trading fees?</h3>
        <p>Our trading fees are competitive and transparent. Maker fees start at 0.1% and taker fees at 0.15%. Volume-based discounts are available for high-frequency traders. Check our fee schedule for complete details.</p>
      </div>
      
      <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <h3>Is my money safe?</h3>
        <p>Yes, security is our top priority. We use industry-leading security measures including cold storage for funds, two-factor authentication, and regular security audits. Your funds are also covered by our insurance policy.</p>
      </div>
      
      <div class="p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
        <h3>How do I deposit funds?</h3>
        <p>You can deposit funds via bank transfer, credit/debit card, or cryptocurrency transfer. Login to your account and visit the 'Deposit' section for detailed instructions and supported payment methods in your region.</p>
      </div>
    </div>
    
    <h2>Emergency Contact</h2>
    <p>If you're experiencing urgent security issues or unauthorized account access, please contact our emergency support line immediately:</p>
    <p><strong>Emergency Hotline:</strong> +1 (555) 911-HELP (4357)</p>
    <p>Available 24/7 for critical security matters.</p>
    
    <h2>Social Media</h2>
    <p>Follow us on social media for the latest updates, market insights, and platform announcements:</p>
    <ul>
      <li><strong>Twitter:</strong> @CryptoXOfficial</li>
      <li><strong>Telegram:</strong> @CryptoXSupport</li>
      <li><strong>LinkedIn:</strong> CryptoX Trading Platform</li>
      <li><strong>YouTube:</strong> CryptoX Education</li>
    </ul>
    
    <h2>Press & Media</h2>
    <p>For press inquiries and media requests, please contact our communications team:</p>
    <p><strong>Email:</strong> press@cryptox.com</p>
    <p><strong>Phone:</strong> +1 (555) 123-PRESS</p>
  `;

  return (
    <div className="w-full bg-white dark:bg-slate-900 pt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none prose-lg">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: pageContent?.content || defaultContent 
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
