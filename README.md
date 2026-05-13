# BAPU Website & Documentation

This repository contains the static website, frontend HTML templates, and CSS stylesheets for the main BAPU web presence.

*Note: This repository was previously a monorepo containing backend services and mobile applications. Those components have been separated and are now managed in their respective dedicated repositories.*

## Components

### 1. Frontend Web App (Root & `/zchat`)
The static HTML files providing information about BAPU
**Key Pages:**
- `index.html`: The landing page outlining core principles.

- `/zchat/terms.html` & `/zchat/privacy.html`: Legal documentation for the ZChat client.
- `/status.js`: A dynamic script injected into the footer to monitor the live operational status of BAPU's Backend, PDS, and Frontend applications.

**Styling & Assets:**
- `style.css`: The central stylesheet enforcing the BAPU dark theme and responsive grid layouts.
- `favicon.png`: Site icon.

## Deployment

The website consists of static HTML, CSS, and vanilla JavaScript. It can be deployed to any static web host, CDN, or reverse proxy.


## Developer Notes

### Backend Integrations

### Modifying the Live Status Indicator
The footer status indicator is driven by `/status.js`. If new frontend domains or backend services are introduced, they must be added to the `services` array within that file.
