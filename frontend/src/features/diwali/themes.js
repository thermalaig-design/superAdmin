// One look per page: its own firework colours, burst shapes and bulb colours, so every page feels different.
// `lights` are the five bulb colours (also exposed as --dw-1..--dw-5 on <html>); `styles` are burst shapes the engine knows.

export const THEMES = {
  home: {
    label: 'Royal Gold',
    palettes: [['#ffb300', '#ff6d00', '#ffd54f'], ['#ff1744', '#ffab00', '#fff176'], ['#ff9100', '#ffea00', '#ff3d00']],
    styles: ['sphere', 'peony', 'ring', 'willow'],
    lights: ['#ffb300', '#ff3d00', '#ffee58', '#ff6f00', '#ff1744'],
  },
  organization: {
    label: 'Magenta Night',
    palettes: [['#e040fb', '#ff4081', '#ffffff'], ['#7c4dff', '#ea80fc', '#ff80ab'], ['#f50057', '#d500f9', '#ffd180']],
    styles: ['ring', 'saturn', 'sphere', 'heart'],
    lights: ['#e040fb', '#ff4081', '#7c4dff', '#ff80ab', '#d500f9'],
  },
  member: {
    label: 'Emerald Sky',
    palettes: [['#00e5ff', '#1de9b6', '#ffffff'], ['#00e676', '#76ff03', '#18ffff'], ['#00b0ff', '#64ffda', '#eeff41']],
    styles: ['willow', 'spiral', 'sphere', 'crackle'],
    lights: ['#00e5ff', '#1de9b6', '#76ff03', '#00b0ff', '#69f0ae'],
  },
  marketing: {
    label: 'Rose Gold',
    palettes: [['#ff4081', '#ffd740', '#ffffff'], ['#ff5252', '#ffab40', '#ffe0b2'], ['#f48fb1', '#ffd54f', '#ff6e40']],
    styles: ['heart', 'star', 'peony', 'ring'],
    lights: ['#ff4081', '#ffd740', '#ff5252', '#ffab40', '#f48fb1'],
  },
  templates: {
    label: 'Sapphire Spark',
    palettes: [['#2979ff', '#40c4ff', '#ffffff'], ['#536dfe', '#18ffff', '#ffd740'], ['#448aff', '#e1f5fe', '#ff80ab']],
    styles: ['spiral', 'star', 'saturn', 'sphere'],
    lights: ['#2979ff', '#40c4ff', '#ffd740', '#536dfe', '#18ffff'],
  },
  directory: {
    label: 'Lime Glitter',
    palettes: [['#c6ff00', '#ffea00', '#00e676'], ['#76ff03', '#ffff00', '#ff9100'], ['#aeea00', '#64dd17', '#fff9c4']],
    styles: ['crackle', 'willow', 'ring', 'peony'],
    lights: ['#c6ff00', '#ffea00', '#00e676', '#ff9100', '#76ff03'],
  },
  targets: {
    label: 'Crimson Blaze',
    palettes: [['#ff1744', '#ff6d00', '#ffea00'], ['#d50000', '#ff9100', '#ffffff'], ['#ff3d00', '#ffab00', '#ff4081']],
    styles: ['saturn', 'star', 'sphere', 'heart'],
    lights: ['#ff1744', '#ff6d00', '#ffea00', '#d50000', '#ff9100'],
  },
  login: {
    label: 'Festival Mix',
    palettes: [['#ff1744', '#ffb300', '#00e5ff'], ['#e040fb', '#76ff03', '#ffea00'], ['#2979ff', '#ff4081', '#ffd740']],
    styles: ['sphere', 'peony', 'heart', 'star', 'ring', 'spiral', 'saturn', 'willow', 'crackle'],
    lights: ['#ff1744', '#ffb300', '#00e5ff', '#e040fb', '#76ff03'],
  },
};

/** Which look a page gets, decided by its address. */
export function themeKeyFor(pathname) {
  if (pathname === '/login') return 'login';
  if (pathname.startsWith('/organization-insights') || pathname.startsWith('/trust-insights') || pathname.startsWith('/app-logins')) return 'organization';
  if (pathname.startsWith('/member-insights') || pathname.startsWith('/registrations')) return 'member';
  if (pathname.startsWith('/marketing')) return 'marketing';
  if (pathname.startsWith('/app-templates')) return 'templates';
  if (pathname.startsWith('/page-directory')) return 'directory';
  if (pathname.startsWith('/targets')) return 'targets';
  return 'home';
}
