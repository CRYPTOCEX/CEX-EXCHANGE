# Email Templates

This directory contains email templates used by the application for sending various types of emails to users.

## Directory Structure

```
backend/email/
├── templates/
│   ├── generalTemplate.html    # Main wrapper template for all emails
│   ├── welcome.html            # Welcome email for new users
│   └── notification.html       # General notification template
└── README.md                   # This file
```

## Template Usage

### General Template (generalTemplate.html)

This is the main wrapper template that provides the overall structure and styling for all emails. It includes:

- **Responsive design** that works on desktop and mobile devices
- **Professional styling** with gradients and modern UI elements
- **Dark mode support** for better user experience
- **Email client compatibility** including Outlook and Gmail
- **Placeholder variables** for dynamic content

#### Available Placeholders:
- `%SITE_URL%` - The website URL
- `%HEADER%` - Logo or site name for the header
- `%MESSAGE%` - The main email content
- `%SUBJECT%` - Email subject line
- `%FOOTER%` - Footer content (usually site name)

### Welcome Template (welcome.html)

A standalone welcome email template for new user registrations.

#### Available Placeholders:
- `%FIRSTNAME%` - User's first name
- `%SITE_URL%` - Website URL
- `%SITE_NAME%` - Site name

### Notification Template (notification.html)

A general notification template for important account updates.

#### Available Placeholders:
- `%FIRSTNAME%` - User's first name
- `%NOTIFICATION_CONTENT%` - Main notification message
- `%DATE%` - Notification date
- `%TIME%` - Notification time
- `%REFERENCE_ID%` - Reference or transaction ID
- `%ACTION_URL%` - URL for user action
- `%SITE_NAME%` - Site name

## How to Use

### In the Backend Code

The email templates are loaded and processed by the `prepareEmailTemplate` function in `backend/src/utils/mailer.ts`:

```typescript
import { prepareEmailTemplate } from '../utils/mailer';

// Process email content with the general template
const finalEmail = await prepareEmailTemplate(
  processedTemplate,
  processedSubject
);
```

### Adding New Templates

1. Create a new HTML file in the `templates/` directory
2. Use inline CSS for styling (email clients don't support external stylesheets)
3. Include placeholder variables using the `%VARIABLE_NAME%` format
4. Test the template across different email clients

### Template Variables

Variables are replaced using the format `%VARIABLE_NAME%`. The replacement is handled by the `replaceTemplateVariables` function in the mailer utility.

## Best Practices

1. **Use inline CSS** - Email clients have limited CSS support
2. **Test across clients** - Different email clients render HTML differently
3. **Keep it simple** - Complex layouts may break in some clients
4. **Use tables for layout** - More reliable than div-based layouts in emails
5. **Include alt text** - For images and accessibility
6. **Optimize for mobile** - Many users read emails on mobile devices

## Email Client Compatibility

The templates are designed to work with:
- Gmail
- Outlook (desktop and web)
- Apple Mail
- Yahoo Mail
- Thunderbird
- Mobile email clients (iOS Mail, Android Gmail, etc.)

## Troubleshooting

If emails are not displaying correctly:

1. Check that the template file exists in the correct path
2. Verify all placeholder variables are being replaced
3. Test the HTML in an email testing tool
4. Check for any CSS that might not be supported by email clients
5. Ensure images are hosted on a publicly accessible server

## Template Customization

To customize the templates:

1. Modify the HTML structure as needed
2. Update CSS styles (keep them inline)
3. Add or remove placeholder variables
4. Update the corresponding backend code to provide the new variables
5. Test thoroughly across different email clients 