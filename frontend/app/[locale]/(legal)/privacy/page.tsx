"use client";

import { useState, useEffect } from "react";

export default function Privacy() {
  const [pageContent, setPageContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load page content from database
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        const timestamp = Date.now();
        const res = await fetch(`/api/admin/default-editor/privacy?pageSource=default&t=${timestamp}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPageContent(data);
        }
      } catch (error) {
        console.error("Error loading privacy page content:", error);
        // Use fallback content if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  // Default content as fallback
  const defaultContent = `
    <h1>Privacy Policy</h1>
    <p><strong>Last updated:</strong> May 20, 2023</p>
    
    <h2>Introduction</h2>
    <p>CryptoX ("we," "our," or "us") values your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our platform.</p>
    <p>Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</p>
    
    <h2>Collection of Your Information</h2>
    <p>We may collect information about you in a variety of ways. The information we may collect may include:</p>
    
    <h3>Personal Data</h3>
    <p>When you register as a user, we may collect personally identifiable information, such as your:</p>
    <ul>
      <li>Name</li>
      <li>Email address</li>
      <li>Phone number</li>
      <li>Date of birth</li>
      <li>Home address</li>
      <li>Government-issued ID information</li>
      <li>Financial information (e.g., bank account details)</li>
    </ul>
    
    <h3>Derivative Data</h3>
    <p>Information our servers automatically collect when you access the site.</p>
    
    <h3>Financial Data</h3>
    <p>Information related to your cryptocurrency transactions, balances, and trading activity. This is necessary for providing our core services.</p>
    
    <h2>Use of Your Information</h2>
    <p>We may use information collected about you via our platform for various purposes including:</p>
    <ul>
      <li>Providing, operating, and maintaining our platform</li>
      <li>Creating and managing your account</li>
      <li>Processing transactions and trades</li>
      <li>Verifying your identity for KYC/AML regulations</li>
      <li>Communicating with you about services or promotions</li>
      <li>Responding to customer service requests</li>
      <li>Analyzing usage trends to improve our platform</li>
      <li>Protecting against fraud and unauthorized transactions</li>
      <li>Complying with legal obligations</li>
    </ul>
    
    <h2>Disclosure of Your Information</h2>
    <p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
    
    <h3>By Law or to Protect Rights</h3>
    <p>We may disclose your information if required to do so by law or in response to valid requests by public authorities.</p>
    
    <h3>Third-Party Service Providers</h3>
    <p>We may share your information with third parties that perform services for us, such as payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</p>
    
    <h3>Business Transactions</h3>
    <p>If we are involved in a merger, acquisition, or asset sale, your personal information may be transferred. In such cases, this privacy policy will continue to govern your personal information.</p>
    
    <h2>Security of Your Information</h2>
    <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no security measures are perfect or impenetrable.</p>
    
    <h2>Cookies and Web Beacons</h2>
    <p>We may use cookies, web beacons, tracking pixels, and other tracking technologies to enhance your experience. Most browsers are set to accept cookies by default. You can remove or reject cookies, but this may affect the availability and functionality of the site.</p>
    
    <h2>Your Rights</h2>
    <p>Depending on your location, you may have certain rights regarding your personal information, such as:</p>
    <ul>
      <li>The right to access personal information we hold about you</li>
      <li>The right to correct inaccurate personal information</li>
      <li>The right to request deletion of your personal information</li>
      <li>The right to restrict processing of your personal information</li>
      <li>The right to data portability</li>
      <li>The right to withdraw consent</li>
    </ul>
    <p>To exercise these rights, please contact us using the information in the "Contact Us" section.</p>
    
    <h2>Changes to This Privacy Policy</h2>
    <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page with an updated date. You are advised to review this Privacy Policy periodically for any changes.</p>
    
    <h2>Contact Us</h2>
    <p>If you have any questions about this Privacy Policy, please contact us at:</p>
    <p>
      <strong>Email:</strong> privacy@site.com<br />
      <strong>Address:</strong> 123 Blockchain Avenue, NY 10001<br />
      <strong>Phone:</strong> +1 (555) 123-4567
    </p>
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
