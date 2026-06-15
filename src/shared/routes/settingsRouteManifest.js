/**
 * Settings route registry — Phase 5.2
 * Derived from ROUTE_MANIFEST + sidebar RBAC metadata.
 */

import { ROUTE_MANIFEST } from "../routes/routeManifest";

/** Canonical settings paths (all variants). */
export const SETTINGS_ROUTE_IDS = {
  HOME: "home",
  THEME: "theme",
  WIDGETS: "widgets",
  AREA_GROUPS: "area_groups",
  AREA_SIZE_LOAD: "area_size_load",
  EMAIL_SERVER: "email_server",
  USERS: "users",
  FLOOR: "floor",
  SENSORS: "sensors",
  MODULES: "modules",
  ALERTS: "alerts",
  PROCESSORS: "processors",
  FOFP: "fofp",
  HELP: "help",
  SCHEDULE: "schedule",
};

const SETTINGS_ROUTE_DEFS = [
  {
    id: SETTINGS_ROUTE_IDS.HOME,
    label: "Home",
    paths: { basic: "/main", advanced: "/main", customized: "/main" },
    roles: ["Superadmin", "Admin", "Operator"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.THEME,
    label: "Theme",
    paths: { basic: "/theme-change", advanced: "/theme-change", customized: "/theme-change" },
    roles: ["Superadmin", "Admin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.WIDGETS,
    label: "Rename Widget",
    paths: {
      basic: "/rename-widget/",
      advanced: "/rename-widget/",
      customized: "/widgets/",
    },
    labels: { customized: "Widgets" },
    roles: ["Superadmin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.AREA_GROUPS,
    label: "Manage Area Groups",
    paths: {
      basic: "/manage-area-groups",
      advanced: "/manage-area-groups",
      customized: "/manage-area-groups",
    },
    roles: ["Superadmin", "Admin", "Operator"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.AREA_SIZE_LOAD,
    label: "Area Size & Load",
    paths: {
      basic: "/area-size-load/",
      advanced: "/area-size-load/",
      customized: "/area-size-load/",
    },
    roles: ["Superadmin", "Admin", "Operator"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.EMAIL_SERVER,
    label: "Email Server",
    paths: {
      basic: "/email-server/",
      advanced: "/email-server/",
      customized: "/email-server/",
    },
    roles: ["Superadmin", "Admin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.USERS,
    label: "Users",
    paths: { basic: "/users", advanced: "/users", customized: "/users" },
    relatedPaths: ["/createusers"],
    roles: ["Superadmin", "Admin", "Operator"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.FLOOR,
    label: "Floor",
    paths: { basic: "/floor", advanced: "/floor", customized: "/floor" },
    relatedPaths: ["/createfloor", "/editfloor/:floorId"],
    roles: ["Superadmin", "Admin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.SENSORS,
    label: "Manage Sensors",
    paths: {
      basic: "/manage-sensors",
      advanced: "/manage-sensors",
      customized: "/manage-sensors",
    },
    roles: ["Superadmin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.MODULES,
    label: "Manage Modules",
    paths: {
      basic: "/manage-modules",
      advanced: "/manage-modules",
      customized: "/manage-modules",
    },
    roles: ["Superadmin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.ALERTS,
    label: "Alerts",
    paths: { basic: "/alerts", advanced: "/alerts", customized: "/alerts" },
    roles: ["Superadmin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.PROCESSORS,
    label: "Processors",
    paths: { basic: "/processors", advanced: "/processors", customized: "/processors" },
    roles: ["Superadmin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.FOFP,
    label: "FOFP",
    paths: { basic: "/fofp", advanced: "/fofp", customized: "/fofp" },
    roles: ["Superadmin"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.HELP,
    label: "Help",
    paths: {
      basic: "/create-help/",
      advanced: "/create-help/",
      customized: "/create-help/",
    },
    relatedPaths: ["/get-help/"],
    roles: ["Superadmin", "Admin", "Operator"],
    section: "settings",
  },
  {
    id: SETTINGS_ROUTE_IDS.SCHEDULE,
    label: "Schedule",
    paths: { basic: "/schedule", advanced: "/schedule", customized: "/schedule" },
    relatedPaths: [
      "/schedule/details/:id",
      "/schedule/add-event",
      "/schedule/update-preconfigured-event",
    ],
    roles: ["Superadmin", "Admin", "Operator"],
    section: "app",
  },
];

function manifestHasPath(path) {
  return ROUTE_MANIFEST.some((r) => r.path === path);
}

export const SETTINGS_ROUTE_MANIFEST = SETTINGS_ROUTE_DEFS.map((def) => ({
  ...def,
  pathBasic: def.paths.basic,
  pathAdvanced: def.paths.advanced,
  pathCustomized: def.paths.customized,
  inManifest: {
    basic: manifestHasPath(def.paths.basic),
    advanced: manifestHasPath(def.paths.advanced),
    customized: manifestHasPath(def.paths.customized),
  },
}));

export function getSettingsPathForVariant(routeId, variant = "basic") {
  const row = SETTINGS_ROUTE_MANIFEST.find((r) => r.id === routeId);
  if (!row) return null;
  return row.paths[variant] ?? row.paths.basic;
}

export function getSettingsNavItemsForVariant(variant = "basic") {
  return SETTINGS_ROUTE_MANIFEST.map((row) => ({
    id: row.id,
    label: row.labels?.[variant] ?? row.label,
    path: row.paths[variant],
    roles: row.roles,
  })).filter((item) => item.path);
}

export function isSettingsRoutePath(pathname, variant = "basic") {
  const normalized = (pathname || "").replace(/\/$/, "") || "/";
  return SETTINGS_ROUTE_MANIFEST.some((row) => {
    const primary = (row.paths[variant] || "").replace(/\/$/, "") || "/";
    if (normalized === primary || normalized.startsWith(`${primary}/`)) return true;
    return (row.relatedPaths || []).some((p) => {
      const base = p.split(":")[0].replace(/\/$/, "");
      return normalized === base || normalized.startsWith(`${base}/`);
    });
  });
}

export function canAccessSettingsRoute(routeId, role) {
  const row = SETTINGS_ROUTE_MANIFEST.find((r) => r.id === routeId);
  if (!row || !role) return false;
  if (row.roles.includes(role)) return true;
  if (
    role === "Operator" &&
    ["area_groups", "area_size_load", "users"].includes(routeId)
  ) {
    return true;
  }
  return false;
}

export function getActiveSettingsRouteId(pathname, variant = "basic") {
  const normalized = (pathname || "").replace(/\/$/, "") || "/";
  for (const row of SETTINGS_ROUTE_MANIFEST) {
    const primary = (row.paths[variant] || "").replace(/\/$/, "") || "/";
    if (normalized === primary || normalized.startsWith(`${primary}/`)) return row.id;
    for (const rel of row.relatedPaths || []) {
      const base = rel.split(":")[0].replace(/\/$/, "");
      if (normalized === base || normalized.startsWith(`${base}/`)) return row.id;
    }
  }
  return null;
}
