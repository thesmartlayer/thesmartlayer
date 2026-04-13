# Twilio Toll-Free Verification Evidence Pack

Use this file as a copy/paste and screenshot checklist for a single customer-facing transactional SMS submission.

## Declared use case (recommended wording)

The Smart Layer sends transactional SMS for audit follow-up and appointment coordination. Messages are sent only when a customer explicitly opts in through website form consent, chatbot consent, or Retell voice consent. Customers can decline SMS and still receive email follow-up.

## Message types

- Audit follow-up coordination text (optional, consent-based)
- Appointment coordination text (optional, consent-based)
- Appointment confirmation/update text (optional, consent-based)

## Opt-in channels and proof

1. Website forms (unchecked by default):
   - `index.html` audit form checkbox
   - `index.html` contact form checkbox
   - `demo.html` QR audit form checkbox
2. Chatbot:
   - asks for SMS consent only when booking/audit text follow-up is relevant
   - stores consent outcome in booking/audit notes
3. Retell voice:
   - asks for verbal SMS consent in the booking/audit path only
   - consent result should be stored in appointment/lead notes

## Customer-facing checkbox copy

I agree to receive text messages from The Smart Layer about my audit request and appointment coordination. Message frequency varies. Message and data rates may apply. Reply STOP to opt out.

Helper line:

Optional: leave this unchecked if you prefer email-only follow-up.

## Example chatbot consent snippet

Would you like text updates for this booking? If yes, we can send appointment coordination by SMS. Message and data rates may apply, and you can reply STOP to opt out anytime.

## Example Retell verbal consent script

Before I finalize this, may we send text messages about your audit request and appointment coordination? Message frequency varies. Message and data rates may apply. You can reply STOP to opt out anytime.

## Example transactional templates

- The Smart Layer: Hi {{name}}, your {{type}} is booked for {{date_time}}. Reply STOP to opt out.
- The Smart Layer: We received your AI Visibility Audit request and may text follow-up questions about your report. Reply STOP to opt out.
- The Smart Layer: Your appointment time changed to {{date_time}}. Reply STOP to opt out.

## Code references for audit trail

- Form wording and optional consent:
  - `index.html`
  - `demo.html`
- Website submission wiring:
  - `script.js`
- Audit intake + consent in notes:
  - `netlify/functions/submit-audit.js`
- Contact intake + consent in notes:
  - `netlify/functions/submit-contact.js`
- Chatbot consent capture:
  - `netlify/functions/chat.js`
- Consent-gated customer SMS:
  - `netlify/functions/update-appointments.js`
  - `netlify/functions/send-customer-appointment-sms.js`

## Screenshot checklist before submission

- Public URL with each checkbox visible and unchecked
- Checkbox text visible in each screenshot
- Chatbot transcript showing explicit consent ask + yes/no response
- Retell transcript showing explicit verbal consent ask + yes/no response
- One sample outbound SMS template screenshot
