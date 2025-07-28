"use client";

import { useState, useEffect } from "react";

export default function Terms() {
  const [pageContent, setPageContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load page content from database
  useEffect(() => {
    const fetchPageContent = async () => {
      try {
        const res = await fetch("/api/admin/default-editor/terms?pageSource=default");
        if (res.ok) {
          const data = await res.json();
          setPageContent(data);
        }
      } catch (error) {
        console.error("Error loading terms page content:", error);
        // Use fallback content if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchPageContent();
  }, []);

  // Default content as fallback
  const defaultContent = `
    <h1>Terms of Service</h1>
    <p><strong>Last updated:</strong> May 20, 2023</p>
    
    <h2>1. Acceptance of Terms</h2>
    <p>By accessing or using our cryptocurrency trading platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Services.</p>
    <p>These Terms constitute a legally binding agreement between you and our company regarding your use of the Services.</p>
    
    <h2>2. Eligibility</h2>
    <p>To be eligible to use our Services, you must be at least 18 years old and comply with all applicable laws in your jurisdiction.</p>
    <p>By using the Services, you represent and warrant that you meet all eligibility requirements.</p>
    
    <h2>3. Account Registration</h2>
    <p>To access certain features of our Services, you must register for an account. When registering, you agree to provide accurate, current, and complete information.</p>
    <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
    
    <h2>4. Trading and Transactions</h2>
    <p>Our platform facilitates cryptocurrency trading. All trades are final and cannot be reversed unless required by law or our policies.</p>
    <p>You acknowledge that cryptocurrency trading involves substantial risk and that prices can be extremely volatile.</p>
    
    <h2>5. Fees and Charges</h2>
    <p>We may charge fees for certain services. All applicable fees will be clearly disclosed before you complete any transaction.</p>
    <p>Fees may change at our discretion with appropriate notice.</p>
    
    <h2>6. Security and Compliance</h2>
    <p>We implement industry-standard security measures, but you acknowledge that no system is completely secure.</p>
    <p>You must comply with all applicable anti-money laundering (AML) and know-your-customer (KYC) requirements.</p>
    
    <h2>7. Prohibited Activities</h2>
    <p>You agree not to engage in any of the following prohibited activities:</p>
    <ul>
      <li>Violate any laws, regulations, or third-party rights</li>
      <li>Use the Services for illegal activities or fraud</li>
      <li>Attempt to manipulate markets, prices, or other users' transactions</li>
      <li>Use any robot, spider, or other automated device to access the Services</li>
      <li>Attempt to circumvent security measures of the Services</li>
      <li>Interfere with or disrupt the Services</li>
      <li>Impersonate another person or entity</li>
      <li>Engage in wash trading or other manipulative practices</li>
    </ul>
    
    <h2>8. Intellectual Property</h2>
    <p>The Services and all content are protected by intellectual property laws. You may not use our intellectual property without written consent.</p>
    <p>You may not copy, modify, distribute, or reverse engineer any part of our Services without permission.</p>
    
    <h2>9. Limitation of Liability</h2>
    <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Services.</p>
    <p>In no event shall our total liability exceed the amount of fees paid by you to us in the 12 months preceding the claim.</p>
    
    <h2>10. Disclaimer of Warranties</h2>
    <p>The Services are provided "as is" without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
    <p>We do not warrant that the Services will be uninterrupted, secure, or error-free, or that any defects will be corrected.</p>
    
    <h2>11. Indemnification</h2>
    <p>You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your violation of these Terms or your use of the Services.</p>
    
    <h2>12. Modifications to the Terms</h2>
    <p>We may modify these Terms at any time by posting the updated Terms on our website. Your continued use of the Services after such modifications constitutes acceptance of the changes.</p>
    <p>We will notify users of material changes by posting a notice on our website or sending an email notification.</p>
    
    <h2>13. Termination</h2>
    <p>We may terminate or suspend your access to the Services at any time, with or without cause, and with or without notice.</p>
    <p>Upon termination, your right to use the Services will immediately cease. All provisions of these Terms that by their nature should survive termination shall survive.</p>
    
    <h2>14. Governing Law</h2>
    <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law provisions.</p>
    <p>Any dispute arising from these Terms shall be subject to the exclusive jurisdiction of the appropriate courts.</p>
    
    <h2>15. Contact Information</h2>
    <p>If you have any questions about these Terms, please contact us at:</p>
    <p>
      <strong>Email:</strong> legal@site.com<br />
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
