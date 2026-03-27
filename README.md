# BAPU Website & Documentation

This repository contains the static website, frontend HTML templates, and CSS stylesheets for the main BAPU web presence.

*Note: This repository was previously a monorepo containing backend services and mobile applications. Those components have been separated and are now managed in their respective dedicated repositories.*

## Components

### 1. Frontend Web App (Root & `/zchat`)
The static HTML files providing information about BAPU, sovereign identity, decentralized social infrastructure, and Bapu documentation.

**Key Pages:**
- `index.html`: The landing page outlining core principles.
- `handles.html`: Details on the handle ecosystem and early access.
- `/zchat/terms.html` & `/zchat/privacy.html`: Legal documentation for the Bapu client.
- `/status.js`: A dynamic script injected into the footer to monitor the live operational status of BAPU's Backend, PDS, and Frontend applications.

**Styling & Assets:**
- `style.css`: The central stylesheet enforcing the BAPU dark theme and responsive grid layouts.
- `favicon.png`: Site icon.

## Deployment

The website consists of static HTML, CSS, and vanilla JavaScript. It can be deployed to any static web host, CDN, or reverse proxy.

### Docker Compose
A `docker-compose.yml` file is provided to quickly serve the static website locally using an NGINX container.

```bash
docker-compose up -d
```
The site will be accessible on port `8080`.

### Caddy Integration
If you are deploying this behind Caddy alongside other BAPU services, you can serve the static files directly:

```caddy
bapu.app {
    root * /path/to/this/repo
    file_server
}
```

## Developer Notes

### Backend Integrations
While the backend code is managed elsewhere, the frontend expects specific APIs to be available at `api.bapu.app`. Please see the `BACKEND_API_GUIDE.md` for details on how to implement the required `GET /health`, `GET /announcement`, and `POST /feedback` endpoints.

### Modifying the Live Status Indicator
The footer status indicator is driven by `/status.js`. If new frontend domains or backend services are introduced, they must be added to the `services` array within that file.
