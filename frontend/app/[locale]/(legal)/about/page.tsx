"use client";

import { useState, useEffect } from "react";

export default function About() {
  const [pageContent, setPageContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load page content from database
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        // Add cache-busting timestamp to prevent stale content
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/admin/default-editor/about?pageSource=default&_t=${timestamp}`, {
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
        console.error("Error loading about page content:", error);
        // Use fallback content if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  // Default content as fallback
  const defaultContent = `
    <h1>About CryptoX</h1>
    <p><strong>Your trusted partner in cryptocurrency trading</strong></p>
    
    <h2>Our Mission</h2>
    <p>At CryptoX, we're dedicated to creating a secure, accessible, and innovative trading platform that empowers users worldwide to participate in the digital economy with confidence.</p>
    <p>We believe that everyone should have access to professional-grade trading tools and comprehensive market data, regardless of their experience level or background.</p>
    
    <h2>What Sets Us Apart</h2>
    
    <h3>Security First</h3>
    <p>Your safety is our top priority. We implement industry-leading security measures including:</p>
    <ul>
      <li>Multi-layer encryption for all transactions</li>
      <li>Cold storage for the majority of funds</li>
      <li>Two-factor authentication (2FA)</li>
      <li>Regular security audits and penetration testing</li>
      <li>Insurance coverage for digital assets</li>
    </ul>
    
    <h3>Advanced Trading Features</h3>
    <p>Our platform offers sophisticated trading tools designed for both beginners and professionals:</p>
    <ul>
      <li>Real-time market data and advanced charting</li>
      <li>Multiple order types and trading pairs</li>
      <li>API access for algorithmic trading</li>
      <li>Mobile apps for trading on the go</li>
      <li>Educational resources and market analysis</li>
    </ul>
    
    <h3>Global Accessibility</h3>
    <p>We're committed to making cryptocurrency trading accessible worldwide:</p>
    <ul>
      <li>Support for 50+ countries and regions</li>
      <li>Multiple language options</li>
      <li>Local payment methods and currencies</li>
      <li>Compliance with international regulations</li>
      <li>24/7 customer support</li>
    </ul>
    
    <h2>Our Values</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      <div class="p-6 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
        <h3>Transparency</h3>
        <p>We believe in complete transparency in our operations, fees, and security practices. Our users deserve to know exactly how their funds are protected and how our platform operates.</p>
            </div>

      <div class="p-6 bg-green-50 dark:bg-green-950/20 rounded-xl">
        <h3>Innovation</h3>
        <p>We continuously innovate to provide cutting-edge features and improvements. Our development team works tirelessly to enhance user experience and introduce new trading capabilities.</p>
            </div>

      <div class="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-xl">
        <h3>Community</h3>
        <p>Our users are at the heart of everything we do. We actively listen to feedback and build features that serve our community's evolving needs in the cryptocurrency space.</p>
              </div>
            </div>

    <h2>Our Team</h2>
    <p>CryptoX is built by a diverse team of experts in cryptocurrency, financial technology, cybersecurity, and user experience design. Our team combines decades of experience in traditional finance with deep expertise in blockchain technology.</p>
    
    <p>We're headquartered in [Location] with team members distributed globally, allowing us to provide round-the-clock support and stay connected with markets worldwide.</p>
    
    <h2>Regulatory Compliance</h2>
    <p>We take regulatory compliance seriously and work closely with authorities to ensure our platform meets the highest standards:</p>
    <ul>
      <li>Licensed and regulated in multiple jurisdictions</li>
      <li>Full KYC (Know Your Customer) and AML (Anti-Money Laundering) compliance</li>
      <li>Regular reporting to financial authorities</li>
      <li>Adherence to data protection regulations (GDPR, CCPA)</li>
      <li>Ongoing legal and compliance monitoring</li>
    </ul>
    
    <h2>Join Our Community</h2>
    <p>Whether you're new to cryptocurrency or an experienced trader, CryptoX provides the tools, security, and support you need to succeed in the digital asset market.</p>
    
    <p>Ready to get started? <a href="/register">Create your account</a> today and join thousands of traders who trust CryptoX for their cryptocurrency trading needs.</p>
    
    <h2>Contact Us</h2>
    <p>Have questions? We're here to help.</p>
    <p>
      <strong>Email:</strong> support@cryptox.com<br />
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
