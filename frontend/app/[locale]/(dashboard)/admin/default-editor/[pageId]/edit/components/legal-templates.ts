import type {
  BusinessInfo,
  AboutPageOptions,
  PrivacyOptions,
  TermsOptions,
  ContactOptions,
} from "./legal-template-wizard";

// Helper function to get company type text
function getCompanyTypeText(type: string): string {
  const types: Record<string, string> = {
    corporation: "corporation",
    llc: "limited liability company",
    sole_proprietor: "sole proprietorship",
    partnership: "partnership",
    other: "business entity",
  };
  return types[type] || "company";
}

// ============================================
// ABOUT PAGE GENERATOR
// ============================================
export function generateAboutPage(
  business: BusinessInfo,
  options: AboutPageOptions
): string {
  const sections: string[] = [];

  // Hero Section
  sections.push(`
<div class="text-center mb-12">
  <h1 class="text-4xl font-bold mb-4">About ${business.websiteName}</h1>
  <p class="text-xl text-muted-foreground max-w-3xl mx-auto">
    ${options.companyDescription || `${business.websiteName} is a leading platform in the ${business.industry} industry, dedicated to delivering exceptional value to our customers.`}
  </p>
</div>
  `);

  // Company Overview
  sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-4">Who We Are</h2>
  <p class="text-muted-foreground mb-4">
    ${business.companyName} is a ${getCompanyTypeText(business.companyType)} ${business.foundedYear ? `founded in ${business.foundedYear}` : ""} ${business.country ? `and headquartered in ${business.state ? `${business.state}, ` : ""}${business.country}` : ""}. We operate ${business.websiteName}, a trusted platform serving customers in the ${business.industry} sector.
  </p>
  <p class="text-muted-foreground">
    ${options.companyDescription || `Our platform combines cutting-edge technology with user-centric design to provide an unparalleled experience. We're committed to innovation, security, and customer satisfaction in everything we do.`}
  </p>
</section>
  `);

  // Mission Statement
  if (options.includeMission) {
    sections.push(`
<section class="mb-12 p-8 bg-primary/5 rounded-2xl">
  <h2 class="text-2xl font-bold mb-4">Our Mission</h2>
  <p class="text-lg text-muted-foreground italic">
    "${options.missionStatement || `To empower our customers with innovative solutions that simplify their lives and help them achieve their goals. We strive to be the most trusted and reliable partner in the ${business.industry} industry.`}"
  </p>
</section>
    `);
  }

  // Vision Statement
  if (options.includeVision) {
    sections.push(`
<section class="mb-12 p-8 bg-secondary/50 rounded-2xl">
  <h2 class="text-2xl font-bold mb-4">Our Vision</h2>
  <p class="text-lg text-muted-foreground italic">
    "${options.visionStatement || `To be the global leader in ${business.industry}, setting the standard for excellence, innovation, and customer satisfaction. We envision a future where our solutions positively impact millions of lives worldwide.`}"
  </p>
</section>
    `);
  }

  // Core Values
  if (options.includeValues && options.values.length > 0) {
    const valuesHtml = options.values
      .map(
        (value, index) => `
      <div class="p-6 bg-card rounded-xl border shadow-sm">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span class="text-primary font-bold">${index + 1}</span>
        </div>
        <h3 class="font-semibold mb-2">${value}</h3>
        <p class="text-sm text-muted-foreground">
          ${getValueDescription(value)}
        </p>
      </div>
    `
      )
      .join("");

    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6 text-center">Our Core Values</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    ${valuesHtml}
  </div>
</section>
    `);
  }

  // Company History
  if (options.includeHistory && business.foundedYear) {
    const currentYear = new Date().getFullYear();
    const yearsInBusiness = currentYear - parseInt(business.foundedYear);

    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-4">Our Journey</h2>
  <div class="relative pl-8 border-l-2 border-primary/30">
    <div class="mb-8">
      <div class="absolute -left-2 w-4 h-4 rounded-full bg-primary"></div>
      <div class="font-semibold text-primary mb-1">${business.foundedYear} - Founded</div>
      <p class="text-muted-foreground">
        ${business.companyName} was established with a vision to transform the ${business.industry} industry.
      </p>
    </div>
    ${yearsInBusiness > 0 ? `
    <div class="mb-8">
      <div class="absolute -left-2 w-4 h-4 rounded-full bg-primary/60"></div>
      <div class="font-semibold text-primary mb-1">Growth & Expansion</div>
      <p class="text-muted-foreground">
        Over the past ${yearsInBusiness} year${yearsInBusiness > 1 ? "s" : ""}, we've continuously evolved, expanded our services, and strengthened our commitment to excellence.
      </p>
    </div>
    ` : ""}
    <div>
      <div class="absolute -left-2 w-4 h-4 rounded-full bg-primary/30"></div>
      <div class="font-semibold text-primary mb-1">Today</div>
      <p class="text-muted-foreground">
        Today, ${business.websiteName} serves thousands of satisfied customers, continuing our mission to deliver exceptional value and service.
      </p>
    </div>
  </div>
</section>
    `);
  }

  // Stats Section
  if (options.includeStats) {
    sections.push(`
<section class="mb-12 p-8 bg-linear-to-r from-primary/10 to-secondary/10 rounded-2xl">
  <h2 class="text-2xl font-bold mb-6 text-center">By the Numbers</h2>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
    <div>
      <div class="text-3xl font-bold text-primary mb-1">${business.foundedYear || new Date().getFullYear()}</div>
      <div class="text-sm text-muted-foreground">Year Founded</div>
    </div>
    <div>
      <div class="text-3xl font-bold text-primary mb-1">24/7</div>
      <div class="text-sm text-muted-foreground">Support Available</div>
    </div>
    <div>
      <div class="text-3xl font-bold text-primary mb-1">100%</div>
      <div class="text-sm text-muted-foreground">Commitment</div>
    </div>
    <div>
      <div class="text-3xl font-bold text-primary mb-1">Global</div>
      <div class="text-sm text-muted-foreground">Reach</div>
    </div>
  </div>
</section>
    `);
  }

  // Achievements
  if (options.achievements.length > 0) {
    const achievementsHtml = options.achievements
      .filter((a) => a.trim())
      .map(
        (achievement) => `
      <li class="flex items-start gap-3">
        <svg class="w-5 h-5 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span class="text-muted-foreground">${achievement}</span>
      </li>
    `
      )
      .join("");

    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6">Key Achievements</h2>
  <ul class="space-y-3">
    ${achievementsHtml}
  </ul>
</section>
    `);
  }

  // Team Section Placeholder
  if (options.includeTeam) {
    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6 text-center">Meet Our Team</h2>
  <p class="text-center text-muted-foreground mb-8">
    Our success is driven by a talented team of professionals dedicated to excellence.
  </p>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <div class="text-center p-6 bg-card rounded-xl border">
      <div class="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
        <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
      </div>
      <h3 class="font-semibold mb-1">Leadership Team</h3>
      <p class="text-sm text-muted-foreground">Experienced executives guiding our vision</p>
    </div>
    <div class="text-center p-6 bg-card rounded-xl border">
      <div class="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
        <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
        </svg>
      </div>
      <h3 class="font-semibold mb-1">Technical Team</h3>
      <p class="text-sm text-muted-foreground">Skilled engineers building our platform</p>
    </div>
    <div class="text-center p-6 bg-card rounded-xl border">
      <div class="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
        <svg class="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
      </div>
      <h3 class="font-semibold mb-1">Support Team</h3>
      <p class="text-sm text-muted-foreground">Dedicated professionals helping you succeed</p>
    </div>
  </div>
</section>
    `);
  }

  // Contact CTA
  sections.push(`
<section class="text-center p-8 bg-primary/5 rounded-2xl">
  <h2 class="text-2xl font-bold mb-4">Get in Touch</h2>
  <p class="text-muted-foreground mb-6">
    Have questions or want to learn more about ${business.websiteName}? We'd love to hear from you.
  </p>
  <div class="flex flex-wrap justify-center gap-4">
    ${business.email ? `<a href="mailto:${business.email}" class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">Contact Us</a>` : ""}
    ${business.phone ? `<a href="tel:${business.phone}" class="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">${business.phone}</a>` : ""}
  </div>
</section>
  `);

  return sections.join("\n");
}

// Helper function to get value descriptions
function getValueDescription(value: string): string {
  const descriptions: Record<string, string> = {
    Innovation: "We continuously push boundaries and embrace new ideas to stay ahead of the curve.",
    Integrity: "We uphold the highest ethical standards in all our interactions and decisions.",
    "Customer Focus": "Our customers are at the heart of everything we do. Their success is our success.",
    Excellence: "We strive for excellence in every aspect of our work, never settling for mediocrity.",
    Transparency: "We believe in open communication and honest dealings with all stakeholders.",
    Security: "Protecting our customers' data and assets is our top priority.",
    Trust: "We build lasting relationships based on mutual trust and respect.",
    Quality: "We deliver high-quality products and services that exceed expectations.",
    Teamwork: "We collaborate effectively, leveraging diverse perspectives to achieve common goals.",
    Accountability: "We take ownership of our actions and their outcomes.",
  };
  return descriptions[value] || "We hold this value at the core of our operations.";
}

// ============================================
// PRIVACY POLICY GENERATOR
// ============================================
export function generatePrivacyPolicy(
  business: BusinessInfo,
  options: PrivacyOptions,
  effectiveDate: string
): string {
  const sections: string[] = [];

  // Header
  sections.push(`
<div class="mb-8">
  <h1 class="text-3xl font-bold mb-4">Privacy Policy</h1>
  <p class="text-muted-foreground">
    <strong>Effective Date:</strong> ${effectiveDate}<br>
    <strong>Last Updated:</strong> ${effectiveDate}
  </p>
</div>

<div class="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-900 mb-8">
  <p class="text-sm">
    This Privacy Policy describes how ${business.companyName} ("we," "us," or "our") collects, uses, and shares information about you when you use our website ${business.websiteUrl} and our services (collectively, the "Services").
  </p>
</div>
  `);

  // Table of Contents
  sections.push(`
<section class="mb-8 p-6 bg-muted/50 rounded-xl">
  <h2 class="text-xl font-bold mb-4">Table of Contents</h2>
  <ol class="list-decimal list-inside space-y-2 text-sm">
    <li><a href="#information-collection" class="text-primary hover:underline">Information We Collect</a></li>
    <li><a href="#information-use" class="text-primary hover:underline">How We Use Your Information</a></li>
    <li><a href="#information-sharing" class="text-primary hover:underline">Information Sharing</a></li>
    ${options.usesCookies ? '<li><a href="#cookies" class="text-primary hover:underline">Cookies and Tracking</a></li>' : ""}
    <li><a href="#data-security" class="text-primary hover:underline">Data Security</a></li>
    <li><a href="#data-retention" class="text-primary hover:underline">Data Retention</a></li>
    <li><a href="#your-rights" class="text-primary hover:underline">Your Rights</a></li>
    ${options.gdprCompliant ? '<li><a href="#gdpr" class="text-primary hover:underline">GDPR Rights (EU Users)</a></li>' : ""}
    ${options.ccpaCompliant ? '<li><a href="#ccpa" class="text-primary hover:underline">CCPA Rights (California Users)</a></li>' : ""}
    ${options.targetAudience === "children" ? '<li><a href="#children" class="text-primary hover:underline">Children\'s Privacy</a></li>' : ""}
    <li><a href="#changes" class="text-primary hover:underline">Changes to This Policy</a></li>
    <li><a href="#contact" class="text-primary hover:underline">Contact Us</a></li>
  </ol>
</section>
  `);

  // 1. Information Collection
  sections.push(`
<section id="information-collection" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">1. Information We Collect</h2>

  ${options.collectsPersonalInfo ? `
  <h3 class="text-lg font-semibold mb-3">Personal Information</h3>
  <p class="text-muted-foreground mb-4">We may collect the following types of personal information:</p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-6">
    <li><strong>Contact Information:</strong> Name, email address, phone number, and mailing address</li>
    ${options.hasUserAccounts ? "<li><strong>Account Information:</strong> Username, password, and profile details</li>" : ""}
    ${options.collectsPaymentInfo ? "<li><strong>Payment Information:</strong> Credit card numbers, billing address, and transaction history</li>" : ""}
    <li><strong>Communication Data:</strong> Messages you send to us, support tickets, and feedback</li>
  </ul>
  ` : ""}

  <h3 class="text-lg font-semibold mb-3">Automatically Collected Information</h3>
  <p class="text-muted-foreground mb-4">When you use our Services, we automatically collect:</p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-6">
    <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
    <li><strong>Usage Data:</strong> Pages visited, time spent, click patterns, and navigation paths</li>
    <li><strong>Location Data:</strong> General location based on IP address</li>
    ${options.usesCookies ? "<li><strong>Cookie Data:</strong> Information stored in cookies and similar technologies</li>" : ""}
  </ul>

  ${options.allowsUserContent ? `
  <h3 class="text-lg font-semibold mb-3">User-Generated Content</h3>
  <p class="text-muted-foreground mb-4">
    If you post content on our platform, we collect the content you provide along with any metadata associated with it.
  </p>
  ` : ""}
</section>
  `);

  // 2. How We Use Information
  sections.push(`
<section id="information-use" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">2. How We Use Your Information</h2>
  <p class="text-muted-foreground mb-4">We use the information we collect to:</p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Provide, maintain, and improve our Services</li>
    ${options.hasUserAccounts ? "<li>Create and manage your account</li>" : ""}
    ${options.collectsPaymentInfo ? "<li>Process payments and transactions</li>" : ""}
    <li>Respond to your inquiries and provide customer support</li>
    ${options.hasNewsletters ? "<li>Send you marketing communications (with your consent)</li>" : ""}
    <li>Analyze usage patterns to improve user experience</li>
    <li>Detect, prevent, and address technical issues and security threats</li>
    <li>Comply with legal obligations and enforce our terms</li>
  </ul>
</section>
  `);

  // 3. Information Sharing
  sections.push(`
<section id="information-sharing" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">3. Information Sharing</h2>
  <p class="text-muted-foreground mb-4">We may share your information in the following circumstances:</p>

  <h3 class="text-lg font-semibold mb-3">Service Providers</h3>
  <p class="text-muted-foreground mb-4">
    We share information with third-party service providers who perform services on our behalf, such as:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-6">
    ${options.collectsPaymentInfo ? "<li>Payment processors for transaction processing</li>" : ""}
    ${options.usesAnalytics ? `<li>Analytics providers (e.g., ${options.analyticsProvider})</li>` : ""}
    <li>Cloud hosting and infrastructure providers</li>
    <li>Customer support and communication tools</li>
  </ul>

  <h3 class="text-lg font-semibold mb-3">Legal Requirements</h3>
  <p class="text-muted-foreground mb-4">
    We may disclose your information if required by law, court order, or government request, or when we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
  </p>

  <h3 class="text-lg font-semibold mb-3">Business Transfers</h3>
  <p class="text-muted-foreground mb-4">
    In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
  </p>

  ${!options.sharesDataWithThirdParties ? `
  <div class="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
    <p class="text-sm text-green-800 dark:text-green-200">
      <strong>We do not sell your personal information</strong> to third parties for their marketing purposes.
    </p>
  </div>
  ` : ""}
</section>
  `);

  // 4. Cookies
  if (options.usesCookies) {
    sections.push(`
<section id="cookies" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">4. Cookies and Tracking Technologies</h2>
  <p class="text-muted-foreground mb-4">
    We use cookies and similar tracking technologies to collect information about your browsing activities. These technologies help us:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-6">
    <li>Remember your preferences and settings</li>
    <li>Understand how you use our Services</li>
    <li>Provide personalized content and features</li>
    ${options.usesAnalytics ? "<li>Analyze traffic and usage patterns</li>" : ""}
  </ul>

  <h3 class="text-lg font-semibold mb-3">Types of Cookies We Use</h3>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-6">
    <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
    <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
    ${options.usesAnalytics ? "<li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our site</li>" : ""}
    <li><strong>Security Cookies:</strong> Help detect and prevent security threats</li>
  </ul>

  <h3 class="text-lg font-semibold mb-3">Managing Cookies</h3>
  <p class="text-muted-foreground">
    You can control cookies through your browser settings. Note that disabling certain cookies may affect the functionality of our Services.
  </p>
</section>
    `);
  }

  // 5. Data Security
  sections.push(`
<section id="data-security" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${options.usesCookies ? "5" : "4"}. Data Security</h2>
  <p class="text-muted-foreground mb-4">
    We implement appropriate technical and organizational measures to protect your personal information, including:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Encryption of data in transit and at rest</li>
    <li>Regular security assessments and audits</li>
    <li>Access controls and authentication measures</li>
    <li>Employee training on data protection</li>
    <li>Incident response procedures</li>
  </ul>
  <p class="text-muted-foreground mt-4">
    However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
  </p>
</section>
  `);

  // 6. Data Retention
  sections.push(`
<section id="data-retention" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${options.usesCookies ? "6" : "5"}. Data Retention</h2>
  <p class="text-muted-foreground">
    We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, typically for ${options.dataRetentionPeriod}. We may retain certain information longer when required by law, for legitimate business purposes, or to resolve disputes.
  </p>
</section>
  `);

  // 7. Your Rights
  sections.push(`
<section id="your-rights" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${options.usesCookies ? "7" : "6"}. Your Rights</h2>
  <p class="text-muted-foreground mb-4">Depending on your location, you may have the following rights:</p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li><strong>Access:</strong> Request a copy of your personal information</li>
    <li><strong>Correction:</strong> Request correction of inaccurate information</li>
    ${options.hasDataDeletion ? "<li><strong>Deletion:</strong> Request deletion of your personal information</li>" : ""}
    ${options.hasDataExport ? "<li><strong>Portability:</strong> Request a copy of your data in a portable format</li>" : ""}
    <li><strong>Objection:</strong> Object to certain processing of your information</li>
    <li><strong>Restriction:</strong> Request restriction of processing in certain circumstances</li>
    ${options.hasNewsletters ? "<li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>" : ""}
  </ul>
  <p class="text-muted-foreground mt-4">
    To exercise these rights, please contact us at <a href="mailto:${business.email}" class="text-primary hover:underline">${business.email}</a>.
  </p>
</section>
  `);

  // GDPR Section
  if (options.gdprCompliant) {
    sections.push(`
<section id="gdpr" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">GDPR Rights (European Union Users)</h2>
  <p class="text-muted-foreground mb-4">
    If you are located in the European Economic Area (EEA), you have additional rights under the General Data Protection Regulation (GDPR):
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-4">
    <li>Right to be informed about how your data is processed</li>
    <li>Right to withdraw consent at any time</li>
    <li>Right to lodge a complaint with a supervisory authority</li>
    <li>Right not to be subject to automated decision-making</li>
  </ul>
  <p class="text-muted-foreground">
    <strong>Legal Basis for Processing:</strong> We process your data based on consent, contract performance, legitimate interests, or legal obligations.
  </p>
</section>
    `);
  }

  // CCPA Section
  if (options.ccpaCompliant) {
    sections.push(`
<section id="ccpa" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">CCPA Rights (California Residents)</h2>
  <p class="text-muted-foreground mb-4">
    If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-4">
    <li>Right to know what personal information is collected and how it's used</li>
    <li>Right to delete personal information (with certain exceptions)</li>
    <li>Right to opt-out of the sale of personal information</li>
    <li>Right to non-discrimination for exercising your privacy rights</li>
  </ul>
  <p class="text-muted-foreground">
    To exercise your CCPA rights, please contact us at <a href="mailto:${business.email}" class="text-primary hover:underline">${business.email}</a> or call ${business.phone || "our support line"}.
  </p>
</section>
    `);
  }

  // Children's Privacy
  if (options.targetAudience === "children") {
    sections.push(`
<section id="children" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">Children's Privacy (COPPA)</h2>
  <p class="text-muted-foreground mb-4">
    We comply with the Children's Online Privacy Protection Act (COPPA). We do not knowingly collect personal information from children under 13 without verifiable parental consent.
  </p>
  <p class="text-muted-foreground">
    If you believe we have collected information from a child under 13 without proper consent, please contact us immediately at <a href="mailto:${business.email}" class="text-primary hover:underline">${business.email}</a>.
  </p>
</section>
    `);
  } else {
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">Children's Privacy</h2>
  <p class="text-muted-foreground">
    Our Services are not intended for children under 13 (or 16 in the EEA). We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
  </p>
</section>
    `);
  }

  // Changes to Policy
  sections.push(`
<section id="changes" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">Changes to This Privacy Policy</h2>
  <p class="text-muted-foreground">
    We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. We encourage you to review this Privacy Policy periodically for any changes.
  </p>
</section>
  `);

  // Contact Section
  sections.push(`
<section id="contact" class="mb-8">
  <h2 class="text-2xl font-bold mb-4">Contact Us</h2>
  <p class="text-muted-foreground mb-4">
    If you have any questions about this Privacy Policy or our privacy practices, please contact us:
  </p>
  <div class="p-6 bg-muted/50 rounded-xl">
    <p class="font-semibold mb-2">${business.companyName}</p>
    ${business.address ? `<p class="text-muted-foreground mb-1">${business.address}</p>` : ""}
    <p class="text-muted-foreground mb-1">Email: <a href="mailto:${business.email}" class="text-primary hover:underline">${business.email}</a></p>
    ${business.phone ? `<p class="text-muted-foreground">Phone: ${business.phone}</p>` : ""}
  </div>
</section>
  `);

  return sections.join("\n");
}

// ============================================
// TERMS OF SERVICE GENERATOR
// ============================================
export function generateTermsOfService(
  business: BusinessInfo,
  options: TermsOptions,
  effectiveDate: string
): string {
  const sections: string[] = [];

  // Header
  sections.push(`
<div class="mb-8">
  <h1 class="text-3xl font-bold mb-4">Terms of Service</h1>
  <p class="text-muted-foreground">
    <strong>Effective Date:</strong> ${effectiveDate}<br>
    <strong>Last Updated:</strong> ${effectiveDate}
  </p>
</div>

<div class="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900 mb-8">
  <p class="text-sm">
    <strong>PLEASE READ THESE TERMS CAREFULLY.</strong> By accessing or using ${business.websiteName} ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
  </p>
</div>
  `);

  // 1. Acceptance of Terms
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
  <p class="text-muted-foreground mb-4">
    These Terms of Service constitute a legally binding agreement between you and ${business.companyName} ("Company," "we," "us," or "our") governing your access to and use of ${business.websiteUrl} and all related services.
  </p>
  <p class="text-muted-foreground">
    By using our Service, you represent that you have read, understood, and agree to be bound by these Terms. We reserve the right to modify these Terms at any time. Your continued use of the Service after any changes constitutes acceptance of the modified Terms.
  </p>
</section>
  `);

  // 2. Eligibility
  if (options.hasAgeRestriction) {
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">2. Eligibility</h2>
  <p class="text-muted-foreground mb-4">
    To use our Service, you must:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Be at least ${options.minimumAge} years of age</li>
    <li>Have the legal capacity to enter into a binding agreement</li>
    <li>Not be prohibited from using the Service under applicable laws</li>
    ${options.hasUserAccounts ? "<li>Provide accurate and complete registration information</li>" : ""}
  </ul>
  <p class="text-muted-foreground mt-4">
    If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms.
  </p>
</section>
    `);
  }

  // 3. Account Registration
  if (options.hasUserAccounts) {
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${options.hasAgeRestriction ? "3" : "2"}. Account Registration</h2>
  <p class="text-muted-foreground mb-4">
    To access certain features of our Service, you may need to create an account. When you create an account, you agree to:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Provide accurate, current, and complete information</li>
    <li>Maintain and update your information as needed</li>
    <li>Keep your password secure and confidential</li>
    <li>Be responsible for all activities under your account</li>
    <li>Notify us immediately of any unauthorized access</li>
  </ul>
  <p class="text-muted-foreground mt-4">
    We reserve the right to suspend or terminate accounts that violate these Terms or engage in fraudulent activity.
  </p>
</section>
    `);
  }

  // 4. Use of Service
  let sectionNum = options.hasAgeRestriction && options.hasUserAccounts ? 4 : options.hasAgeRestriction || options.hasUserAccounts ? 3 : 2;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Use of Service</h2>
  <p class="text-muted-foreground mb-4">
    You may use our Service only for lawful purposes and in accordance with these Terms. You agree not to:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    ${options.prohibitedActivities.map((activity) => `<li>${activity}</li>`).join("\n    ")}
  </ul>
</section>
  `);

  // 5. User Content
  if (options.hasUserContent) {
    sectionNum++;
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. User Content</h2>
  <p class="text-muted-foreground mb-4">
    Our Service may allow you to post, submit, or share content ("User Content"). By posting User Content, you:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-4">
    <li>Retain ownership of your User Content</li>
    <li>Grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your User Content in connection with the Service</li>
    <li>Represent that you have the rights to grant this license</li>
    <li>Agree that your User Content does not violate any third-party rights</li>
  </ul>
  <p class="text-muted-foreground">
    We reserve the right to remove any User Content that violates these Terms or is otherwise objectionable, without prior notice.
  </p>
</section>
    `);
  }

  // 6. Payments and Subscriptions
  if (options.hasPayments || options.hasSubscriptions) {
    sectionNum++;
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. ${options.hasSubscriptions ? "Payments and Subscriptions" : "Payments"}</h2>

  ${options.hasPayments ? `
  <h3 class="text-lg font-semibold mb-3">Payment Terms</h3>
  <p class="text-muted-foreground mb-4">
    Certain features of our Service may require payment. You agree to:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground mb-6">
    <li>Provide accurate payment information</li>
    <li>Pay all fees and applicable taxes</li>
    <li>Authorize us to charge your payment method</li>
  </ul>
  ` : ""}

  ${options.hasSubscriptions ? `
  <h3 class="text-lg font-semibold mb-3">Subscription Terms</h3>
  <p class="text-muted-foreground mb-4">
    Subscription services automatically renew unless cancelled before the renewal date. ${options.subscriptionTerms || "You may cancel your subscription at any time through your account settings."}
  </p>
  ` : ""}

  ${options.hasRefunds ? `
  <h3 class="text-lg font-semibold mb-3">Refund Policy</h3>
  <p class="text-muted-foreground">
    ${options.refundPeriod === "no refunds"
      ? "All sales are final. We do not offer refunds except as required by law."
      : `Refund requests must be submitted within ${options.refundPeriod} of purchase. Approved refunds will be processed to the original payment method. Some fees may be non-refundable.`}
  </p>
  ` : ""}
</section>
    `);
  }

  // Intellectual Property
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Intellectual Property</h2>
  <p class="text-muted-foreground mb-4">
    The Service and its original content, features, and functionality are owned by ${business.companyName} and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
  </p>
  <p class="text-muted-foreground">
    ${options.intellectualPropertyNotice || `You may not copy, modify, distribute, sell, or lease any part of our Service without our prior written consent. Our trademarks and trade dress may not be used without our prior written permission.`}
  </p>
</section>
  `);

  // API Terms
  if (options.hasAPI) {
    sectionNum++;
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. API Terms</h2>
  <p class="text-muted-foreground mb-4">
    If you use our API, you agree to:
  </p>
  <ul class="list-disc list-inside space-y-2 text-muted-foreground">
    <li>Comply with all API documentation and guidelines</li>
    <li>Not exceed rate limits or abuse the API</li>
    <li>Keep your API credentials secure</li>
    <li>Not use the API to create competing services</li>
    ${options.allowsCommercialUse ? "<li>Commercial use is permitted subject to our API terms</li>" : "<li>API access is for personal, non-commercial use only unless otherwise agreed</li>"}
  </ul>
</section>
    `);
  }

  // Disclaimers
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Disclaimers</h2>
  <div class="p-4 bg-muted/50 rounded-lg">
    <p class="text-muted-foreground mb-4 uppercase text-sm font-medium">
      THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
    </p>
    <p class="text-muted-foreground text-sm">
      WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE. YOU USE THE SERVICE AT YOUR OWN RISK.
    </p>
  </div>
</section>
  `);

  // Limitation of Liability
  if (options.limitLiability) {
    sectionNum++;
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Limitation of Liability</h2>
  <div class="p-4 bg-muted/50 rounded-lg">
    <p class="text-muted-foreground text-sm">
      TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${business.companyName.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE.
    </p>
  </div>
</section>
    `);
  }

  // Indemnification
  if (options.hasIndemnification) {
    sectionNum++;
    sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Indemnification</h2>
  <p class="text-muted-foreground">
    You agree to defend, indemnify, and hold harmless ${business.companyName}, its officers, directors, employees, and agents, from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Service, your violation of these Terms, or your violation of any third-party rights.
  </p>
</section>
    `);
  }

  // Governing Law
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Governing Law</h2>
  <p class="text-muted-foreground">
    These Terms shall be governed by and construed in accordance with the laws of ${options.governingLaw || `${business.state ? business.state + ", " : ""}${business.country}`}, without regard to its conflict of law provisions.
  </p>
</section>
  `);

  // Dispute Resolution
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Dispute Resolution</h2>
  ${options.disputeResolution === "arbitration" ? `
  <p class="text-muted-foreground mb-4">
    Any dispute arising from these Terms or your use of the Service shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. The arbitration shall be conducted in ${business.state || business.country}.
  </p>
  <p class="text-muted-foreground">
    <strong>Class Action Waiver:</strong> You agree to resolve disputes only on an individual basis and waive your right to participate in a class action lawsuit or class-wide arbitration.
  </p>
  ` : options.disputeResolution === "mediation" ? `
  <p class="text-muted-foreground">
    Before initiating any legal action, you agree to first attempt to resolve any dispute through good-faith mediation. If mediation is unsuccessful after 30 days, either party may pursue legal remedies in courts of ${business.state || business.country}.
  </p>
  ` : `
  <p class="text-muted-foreground">
    Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of ${business.state || business.country}. You consent to the personal jurisdiction of such courts.
  </p>
  `}
</section>
  `);

  // Termination
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Termination</h2>
  <p class="text-muted-foreground">
    We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease. All provisions of these Terms which by their nature should survive termination shall survive.
  </p>
</section>
  `);

  // Changes to Terms
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Changes to Terms</h2>
  <p class="text-muted-foreground">
    We reserve the right to modify these Terms at any time. We will provide notice of material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
  </p>
</section>
  `);

  // Contact
  sectionNum++;
  sections.push(`
<section class="mb-8">
  <h2 class="text-2xl font-bold mb-4">${sectionNum}. Contact Information</h2>
  <p class="text-muted-foreground mb-4">
    If you have any questions about these Terms, please contact us:
  </p>
  <div class="p-6 bg-muted/50 rounded-xl">
    <p class="font-semibold mb-2">${business.companyName}</p>
    ${business.address ? `<p class="text-muted-foreground mb-1">${business.address}</p>` : ""}
    <p class="text-muted-foreground mb-1">Email: <a href="mailto:${business.email}" class="text-primary hover:underline">${business.email}</a></p>
    ${business.phone ? `<p class="text-muted-foreground">Phone: ${business.phone}</p>` : ""}
  </div>
</section>
  `);

  return sections.join("\n");
}

// ============================================
// CONTACT PAGE GENERATOR
// ============================================
export function generateContactPage(
  business: BusinessInfo,
  options: ContactOptions
): string {
  const sections: string[] = [];

  // Header
  sections.push(`
<div class="text-center mb-12">
  <h1 class="text-4xl font-bold mb-4">Contact Us</h1>
  <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
    We'd love to hear from you. Get in touch with our team and we'll respond as soon as possible.
  </p>
</div>
  `);

  // Contact Info Cards
  sections.push(`
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
  <div class="p-6 bg-card rounded-xl border text-center">
    <div class="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
      </svg>
    </div>
    <h3 class="font-semibold mb-2">Email Us</h3>
    <a href="mailto:${business.email}" class="text-primary hover:underline">${business.email}</a>
    ${business.supportEmail && business.supportEmail !== business.email ? `<br><a href="mailto:${business.supportEmail}" class="text-primary hover:underline text-sm">${business.supportEmail}</a>` : ""}
  </div>

  ${business.phone ? `
  <div class="p-6 bg-card rounded-xl border text-center">
    <div class="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
      </svg>
    </div>
    <h3 class="font-semibold mb-2">Call Us</h3>
    <a href="tel:${business.phone}" class="text-primary hover:underline">${business.phone}</a>
  </div>
  ` : ""}

  ${business.address ? `
  <div class="p-6 bg-card rounded-xl border text-center">
    <div class="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
      <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </div>
    <h3 class="font-semibold mb-2">Visit Us</h3>
    <p class="text-muted-foreground text-sm">${business.address}</p>
  </div>
  ` : ""}
</div>
  `);

  // Business Hours
  if (options.includeHours) {
    sections.push(`
<div class="mb-12 p-6 bg-primary/5 rounded-xl">
  <div class="flex items-center justify-center gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="font-medium">Business Hours:</span>
      <span class="text-muted-foreground">${options.businessHours}</span>
    </div>
    <div class="text-muted-foreground">|</div>
    <div class="flex items-center gap-2">
      <span class="font-medium">Response Time:</span>
      <span class="text-muted-foreground">${options.responseTime}</span>
    </div>
  </div>
</div>
    `);
  }

  // Departments
  if (options.departments.length > 0 && options.departments.some((d) => d.name && d.email)) {
    const deptHtml = options.departments
      .filter((d) => d.name && d.email)
      .map(
        (dept) => `
      <div class="p-4 bg-card rounded-lg border">
        <h4 class="font-semibold mb-1">${dept.name}</h4>
        <a href="mailto:${dept.email}" class="text-primary hover:underline text-sm">${dept.email}</a>
      </div>
    `
      )
      .join("");

    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6 text-center">Contact Departments</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    ${deptHtml}
  </div>
</section>
    `);
  }

  // Contact Form Placeholder
  if (options.includeForm) {
    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6 text-center">Send Us a Message</h2>
  <div class="max-w-2xl mx-auto p-8 bg-card rounded-xl border">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="block text-sm font-medium mb-2">First Name *</label>
        <input type="text" class="w-full px-4 py-2 border rounded-lg bg-background" placeholder="John">
      </div>
      <div>
        <label class="block text-sm font-medium mb-2">Last Name *</label>
        <input type="text" class="w-full px-4 py-2 border rounded-lg bg-background" placeholder="Doe">
      </div>
    </div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">Email Address *</label>
      <input type="email" class="w-full px-4 py-2 border rounded-lg bg-background" placeholder="john@example.com">
    </div>
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">Subject *</label>
      <select class="w-full px-4 py-2 border rounded-lg bg-background">
        <option>General Inquiry</option>
        <option>Technical Support</option>
        <option>Billing Question</option>
        <option>Partnership</option>
        <option>Other</option>
      </select>
    </div>
    <div class="mb-6">
      <label class="block text-sm font-medium mb-2">Message *</label>
      <textarea class="w-full px-4 py-2 border rounded-lg bg-background" rows="5" placeholder="How can we help you?"></textarea>
    </div>
    <button class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
      Send Message
    </button>
    <p class="text-xs text-muted-foreground text-center mt-4">
      By submitting this form, you agree to our Privacy Policy.
    </p>
  </div>
</section>
    `);
  }

  // FAQ Section
  if (options.includeFAQ && options.faqItems.length > 0 && options.faqItems.some((f) => f.question && f.answer)) {
    const faqHtml = options.faqItems
      .filter((f) => f.question && f.answer)
      .map(
        (faq) => `
      <div class="p-6 bg-card rounded-xl border">
        <h3 class="font-semibold mb-2">${faq.question}</h3>
        <p class="text-muted-foreground">${faq.answer}</p>
      </div>
    `
      )
      .join("");

    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
  <div class="space-y-4 max-w-3xl mx-auto">
    ${faqHtml}
  </div>
</section>
    `);
  }

  // Social Links
  if (options.includeSocialLinks) {
    sections.push(`
<section class="text-center mb-12">
  <h2 class="text-2xl font-bold mb-4">Connect With Us</h2>
  <p class="text-muted-foreground mb-6">Follow us on social media for updates and news.</p>
  <div class="flex justify-center gap-4">
    <a href="#" class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
    </a>
    <a href="#" class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
    </a>
    <a href="#" class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
    </a>
  </div>
</section>
    `);
  }

  // Map Placeholder
  if (options.includeMap && business.address) {
    sections.push(`
<section class="mb-12">
  <h2 class="text-2xl font-bold mb-6 text-center">Our Location</h2>
  <div class="aspect-video bg-muted rounded-xl flex items-center justify-center">
    <div class="text-center">
      <svg class="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
      <p class="text-muted-foreground">${business.address}</p>
      <p class="text-sm text-muted-foreground mt-2">[Map integration can be added here]</p>
    </div>
  </div>
</section>
    `);
  }

  return sections.join("\n");
}
