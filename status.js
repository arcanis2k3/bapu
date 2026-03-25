document.addEventListener('DOMContentLoaded', () => {
  const fetchWithTimeout = async (url, timeoutMs = 5000, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const footerContent = document.querySelector('.footer-content');
  if (!footerContent) return;

  const statusContainer = document.createElement('div');
  statusContainer.className = 'service-status-list';
  statusContainer.setAttribute('role', 'status');
  statusContainer.setAttribute('aria-live', 'polite');
  statusContainer.setAttribute('aria-atomic', 'true');
  footerContent.appendChild(statusContainer);

  const announcementContainer = document.createElement('div');
  announcementContainer.className = 'announcement-banner';
  announcementContainer.setAttribute('role', 'status');
  announcementContainer.setAttribute('aria-live', 'polite');
  announcementContainer.setAttribute('aria-atomic', 'true');
  footerContent.appendChild(announcementContainer);

  const services = [
    {
      name: 'Backend',
      check: async () => {
        try {
          const res = await fetchWithTimeout('https://api.bapu.app/health');
          if (res.ok) {
            const data = await res.json();
            const status = data.ok ? 'green' : 'red';
            const version = data.version ? ` (v${data.version})` : '';
            return { status, version };
          }
          return { status: 'red', version: '' };
        } catch (e) {
          return { status: 'red', version: '' };
        }
      }
    },
    {
      name: 'PDS',
      check: async () => {
        try {
          // The PDS _health endpoint usually returns a version as well
          const res = await fetchWithTimeout('https://pds.bapu.app/xrpc/_health');
          if (res.ok) {
            try {
              const data = await res.json();
              const version = data.version ? ` (v${data.version})` : '';
              return { status: 'green', version };
            } catch (jsonError) {
              return { status: 'green', version: '' };
            }
          }
          return { status: 'red', version: '' };
        } catch (e) {
          return { status: 'red', version: '' };
        }
      }
    },
    {
      name: 'zchat.bapu.app',
      check: async () => {
        // Frontends signup is not working
        return { status: 'yellow', version: '' };
      }
    },
    {
      name: 'web.bapu.app',
      check: async () => {
        // Frontends signup is not working
        return { status: 'yellow', version: '' };
      }
    },
    {
      name: 'encryption.bapu.app',
      check: async () => {
        // Frontends signup is not working
        return { status: 'yellow', version: '' };
      }
    }
  ];

  const statusIcons = {
    'green': '🟢 Operational',
    'yellow': '🟡 Problems',
    'red': '🔴 Offline'
  };

  const statusElements = {};

  services.forEach(service => {
    const item = document.createElement('span');
    item.className = 'status-item';
    item.innerHTML = `<strong>${service.name}:</strong> ⚪ Checking...`;
    statusContainer.appendChild(item);
    statusElements[service.name] = item;
  });

  services.forEach(async (service) => {
    const result = await service.check();
    statusElements[service.name].innerHTML = `<strong>${service.name}:</strong> ${statusIcons[result.status]}${result.version}`;
  });

  // Fetch Latest Announcement
  async function fetchAnnouncement() {
    try {
      const res = await fetchWithTimeout('https://api.bapu.app/announcement');
      if (res.ok) {
        const data = await res.json();
        if (data && data.message) {
          announcementContainer.innerHTML = `📢 <strong>Latest Announcement:</strong> ${data.message}`;
        }
      }
    } catch (e) {
      // Silently fail if announcement endpoint is not available yet
    }
  }

  fetchAnnouncement();
});
