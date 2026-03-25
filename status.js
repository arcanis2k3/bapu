document.addEventListener('DOMContentLoaded', () => {
  const footerContent = document.querySelector('.footer-content');
  if (!footerContent) return;

  const statusContainer = document.createElement('div');
  statusContainer.className = 'service-status-list';
  footerContent.appendChild(statusContainer);

  const services = [
    {
      name: 'Backend',
      check: async () => {
        try {
          const res = await fetch('https://api.bapu.app/health');
          if (res.ok) {
            const data = await res.json();
            return data.ok ? 'green' : 'red';
          }
          return 'red';
        } catch (e) {
          return 'red';
        }
      }
    },
    {
      name: 'PDS',
      check: async () => {
        try {
          const res = await fetch('https://pds.bapu.app/xrpc/_health');
          return res.ok ? 'green' : 'red';
        } catch (e) {
          return 'red';
        }
      }
    },
    {
      name: 'Frontends',
      check: async () => {
        // Frontends signup is not working
        return 'yellow';
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
    const status = await service.check();
    statusElements[service.name].innerHTML = `<strong>${service.name}:</strong> ${statusIcons[status]}`;
  });
});
