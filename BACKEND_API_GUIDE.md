# Backend API Implementation Guide

This document outlines the required API endpoints that the BAPU frontend expects to interact with at `https://api.bapu.app/`. If you are developing or integrating the backend services, please ensure these endpoints are implemented and accessible with proper CORS configurations.

---

## 1. Health Check Endpoint

Used by the frontend (via `status.js`) to display the live operational status and version of the backend in the site footer.

* **Endpoint:** `GET /health`
* **Authentication:** None (Public)
* **Response Format:** JSON

### Expected Response

```json
{
  "ok": true,
  "version": "0.1.0"
}
```

### Implementation Notes

* The `ok` boolean is strictly required to show a green "Operational" status.
* The `version` string is optional but recommended. If provided, the frontend will append it to the status indicator (e.g., `🟢 Operational (v0.1.0)`).
* Make sure this endpoint responds quickly, as it is queried dynamically by clients visiting any page.

---

## 2. Public Announcement Endpoint

Used by the frontend to fetch and display the latest public announcement or alert at the bottom of the page footer.

* **Endpoint:** `GET /announcement`
* **Authentication:** None (Public)
* **Response Format:** JSON

### Expected Response (When an announcement exists)

```json
{
  "message": "We are currently undergoing scheduled maintenance. Service may be degraded."
}
```

### Expected Response (When no announcement exists)

```json
{}
```
*(Alternatively, you can return an empty message string `{"message": ""}` or return a `404 Not Found` status. The frontend gracefully ignores empty or failed responses and keeps the banner hidden).*

### Implementation Notes

* The frontend looks explicitly for the `message` key.
* HTML tags inside the `message` string are supported and will be rendered by the browser (e.g., `<a href="...">Read more</a>`), so ensure the input is sanitized on the backend before broadcasting.

---

## 3. Feedback Endpoint

Used by the `/feedback.html`, `/zchat/feedback.html`, and `/jobs.html` forms to submit user input.

* **Endpoint:** `POST /feedback`
* **Authentication:** None (Public)
* **Request Format:** Form Data (`application/x-www-form-urlencoded`) or JSON

### Example Payload

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "category": "bug",
  "message": "I found an issue with the handle registration."
}
```

### Expected Response

* **Success:** `200 OK` (Can be empty or return `{ "success": true }`)
* **Failure:** Standard HTTP error codes (e.g., `400 Bad Request`, `500 Internal Server Error`)

### Implementation Notes

* See the existing `FEEDBACK_API_GUIDE.md` for specific instructions on handling CORS, rate-limiting, and sample Express.js code for this specific endpoint.

---

## Important: CORS Configuration

All of the above endpoints **must** have Cross-Origin Resource Sharing (CORS) configured correctly, as they are accessed by browsers directly from multiple frontend domains (e.g., `bapu.app`, `web.bapu.app`, `zchat.bapu.app`, `encryption.bapu.app`).

### Recommended CORS Headers

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
*(If you need to restrict `Access-Control-Allow-Origin`, ensure it includes all of your production subdomains.)*