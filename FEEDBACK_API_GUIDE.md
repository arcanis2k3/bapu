# Bapu Feedback API Guide

This guide describes how to implement the backend API for the Bapu feedback form.

## Endpoint Overview

- **URL:** `https://api.bapu.app/feedback`
- **Method:** `POST`
- **Content-Type:** `application/json`

### Request Body

The API should expect a JSON object with the following fields:

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | `string` | Optional name of the user. |
| `email` | `string` | Optional email address of the user. |
| `category` | `string` | The category of feedback (e.g., "Bug Report", "Feature Request"). |
| `message` | `string` | **Required.** The feedback message itself. |

### Sample Implementation (Node.js/Express)

```javascript
const express = require('express');
const cors = require('cors'); // Ensure CORS is handled
const app = express();

app.use(cors());
app.use(express.json());

app.post('/feedback', (req, res) => {
  const { name, email, category, message } = req.body;

  // 1. Basic Validation
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' });
  }

  // 2. Process Feedback
  // Example: Log to console, save to database, or send an email/webhook
  console.log('Received Feedback:', {
    timestamp: new Date().toISOString(),
    name: name || 'Anonymous',
    email: email || 'N/A',
    category: category || 'General',
    message: message
  });

  // 3. Respond to Client
  res.status(200).json({ status: 'success', message: 'Feedback received' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Feedback API listening on port ${PORT}`);
});
```

## Security Considerations

1.  **Rate Limiting:** To prevent abuse, implement rate limiting on this endpoint.
2.  **Input Sanitization:** Always sanitize user input before storing or displaying it to prevent XSS.
3.  **CORS:** Ensure your CORS policy allows requests from the domain where the frontend is hosted.
4.  **Notification:** Consider integrating with a service like Slack, Discord, or an email provider (like SendGrid or Mailgun) to notify the team when new feedback is received.
