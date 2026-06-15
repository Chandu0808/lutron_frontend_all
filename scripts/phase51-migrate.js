#!/usr/bin/env node
/**
 * Phase 5.1 — Low Risk Consolidation migration
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, (content.endsWith("\n") ? content : content + "\n"), "utf8");
}

function copy(relSrc, relDest) {
  write(relDest, read(relSrc));
}

function relImport(fromRel, toRel) {
  let rel = path.relative(path.dirname(fromRel), toRel).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel.replace(/\.(jsx?)$/, "");
}

const VARIANTS = ["basic", "advanced", "customized"];
const stats = { moved: [], wrappers: [], imports: 0 };

function extractImportsAndBody(sourceRel, stripPatterns = []) {
  let src = read(sourceRel);
  for (const pat of stripPatterns) {
    src = src.replace(pat, "");
  }
  const importLines = [];
  src = src.replace(/^import .+;\s*$/gm, (line) => {
    importLines.push(line);
    return "";
  });
  return { importLines, src };
}

function prepareSliceBody(src) {
  const exportNames = [];
  for (const m of src.matchAll(/^export\s+(?:const|function|async function)\s+(\w+)/gm)) {
    exportNames.push(m[1]);
  }
  const actionMatch = src.match(/export\s+const\s+\{([^}]+)\}\s*=\s*(\w+)\.actions;/);
  if (actionMatch) {
    src = src.replace(/export\s+const\s+\{([^}]+)\}\s*=\s*(\w+)\.actions;/, "const { $1 } = $2.actions;");
    actionMatch[1].split(",").forEach((p) => {
      const n = p.trim().split(":")[0].trim();
      if (n) exportNames.push(n);
    });
  }
  src = src.replace(/^export\s+(const|function|async function)/gm, "$1");
  src = src.replace(/export\s+default\s+(\w+\.reducer);?\s*$/m, "const reducer = $1;");
  return { src, exportNames: [...new Set(exportNames.filter(Boolean))] };
}

function buildBaseUrlFactory(sourceRel, factoryName, headerImports = "") {
  const { importLines, src: raw } = extractImportsAndBody(sourceRel, [
    /import\s+\{\s*BaseUrl\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
  ]);
  const { src } = prepareSliceBody(raw);
  const exportNames = collectExportsFromSlice(sourceRel);
  const imports = [...importLines, headerImports].filter(Boolean).join("\n");
  return `/** Shared slice — Phase 5.1 */
${imports}

export function ${factoryName}({ BaseUrl }) {
${src
  .split("\n")
  .map((l) => (l ? "  " + l : l))
  .join("\n")}
  return {
    reducer,
${exportNames.map((n) => `    ${n},`).join("\n")}
  };
}
`;
}

function baseUrlImportDepth(slicePath) {
  return "../".repeat(1 + slicePath.split("/").length) + "BaseUrl";
}

function collectExportsFromSlice(sourceFile) {
  const src = read(sourceFile);
  const exportNames = [];
  for (const m of src.matchAll(/^export\s+(?:const|function|async function)\s+(\w+)/gm)) {
    exportNames.push(m[1]);
  }
  const actionMatch = src.match(/export\s+const\s+\{([^}]+)\}\s*=\s*\w+\.actions;/);
  if (actionMatch) {
    actionMatch[1].split(",").forEach((p) => {
      const n = p.trim().split(":")[0].trim();
      if (n) exportNames.push(n);
    });
  }
  return [...new Set(exportNames)];
}

function writeSliceWrapper(variant, slicePath, factoryRel, factoryName, extraArgs) {
  const wrapperRel = `src/variants/${variant}/redux/slice/${slicePath}`;
  const baseUrlRel = baseUrlImportDepth(slicePath);
  const sharedRel = relImport(wrapperRel, factoryRel);
  const args = extraArgs ? `{ BaseUrl, ${extraArgs} }` : `{ BaseUrl }`;
  const unique = collectExportsFromSlice(`src/shared/redux/slices/_source/${slicePath.split("/").pop()}`);
  write(
    wrapperRel,
    `import { BaseUrl } from "${baseUrlRel}";
import { ${factoryName} } from "${sharedRel}";

const _module = ${factoryName}(${args});

export default _module.reducer;
${unique.map((n) => `export const ${n} = _module.${n};`).join("\n")}
`
  );
  stats.wrappers.push(wrapperRel);
}

function buildUserLoginFactory() {
  const { importLines, src: raw } = extractImportsAndBody(
    "src/shared/redux/slices/_source/userlogin.js",
    [
      /import\s+\{\s*BaseUrl\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
      /import\s+\{\s*clearDashboardData\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
      /import\s+\{\s*clearUserData\s+as\s+clearHeatmapUserData\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
      /import\s+\{\s*clearAlertsState\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
    ]
  );
  const { src } = prepareSliceBody(raw);
  const exportNames = collectExportsFromSlice("src/shared/redux/slices/_source/userlogin.js");
  return `/** Shared user login slice — Phase 5.1 */
${importLines.join("\n")}

export function createUserLoginModule({ BaseUrl, clearDashboardData, clearHeatmapUserData, clearAlertsState }) {
${src
  .split("\n")
  .map((l) => (l ? "  " + l : l))
  .join("\n")}
  return {
    reducer,
${exportNames.map((n) => `    ${n},`).join("\n")}
  };
}
`;
}

function writeUserLoginWrappers() {
  for (const v of VARIANTS) {
    const wrapperRel = `src/variants/${v}/redux/slice/auth/userlogin.js`;
    const sharedRel = relImport(wrapperRel, "src/shared/redux/slices/createUserLoginModule.js");
    write(
      wrapperRel,
      `import { BaseUrl } from "../../../BaseUrl";
import { clearDashboardData } from "../dashboard/dashboardSlice";
import { clearUserData as clearHeatmapUserData } from "../settingsslice/heatmap/HeatmapSlice";
import { clearAlertsState } from "../dashboard/alertsSlice";
import { createUserLoginModule } from "${sharedRel}";

const _module = createUserLoginModule({
  BaseUrl,
  clearDashboardData,
  clearHeatmapUserData,
  clearAlertsState,
});

export default _module.reducer;
${collectExportsFromSlice("src/shared/redux/slices/_source/userlogin.js")
  .map((n) => `export const ${n} = _module.${n};`)
  .join("\n")}
`
    );
    stats.wrappers.push(wrapperRel);
  }
}

function buildFofpFactory() {
  const { importLines, src: raw } = extractImportsAndBody(
    "src/shared/redux/slices/_source/fofpSlice.js",
    [
      /import\s+\{\s*BaseUrl\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
      /import\s+\{\s*DEFAULT_FOFP_MARKER_COLOR,\s*normalizeFofpHex,\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
    ]
  );
  const { src } = prepareSliceBody(raw);
  const exportNames = collectExportsFromSlice("src/shared/redux/slices/_source/fofpSlice.js");
  return `/** Shared FOFP slice — Phase 5.1 */
${importLines.join("\n")}
import { DEFAULT_FOFP_MARKER_COLOR, normalizeFofpHex } from "../../fofp/fofpColorUtils.js";

export function createFofpModule({ BaseUrl }) {
${src
  .split("\n")
  .map((l) => (l ? "  " + l : l))
  .join("\n")}
  return {
    reducer,
${exportNames.map((n) => `    ${n},`).join("\n")}
  };
}
`;
}

function buildFloorFactory() {
  const { importLines, src: raw } = extractImportsAndBody(
    "src/shared/redux/slices/_source/floorSlice.js",
    [
      /import\s+\{\s*BaseUrl\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
      /import\s+\{\s*fetchAreaOccupancyStatus,\s*fetchAreaEnergyConsumption\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g,
    ]
  );
  let { src } = prepareSliceBody(raw);
  const exportNames = collectExportsFromSlice("src/shared/redux/slices/_source/floorSlice.js");

  src = src.replace(
    /const fetchFloorDetails = createAsyncThunk\(\s*'floors\/fetchFloorDetails',[\s\S]*?\n\);/,
    `const fetchFloorDetailsBasic = createAsyncThunk(
    'floors/fetchFloorDetails',
    async (floorId, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.get(\`/floor/\${floorId}\`);
        return response.data;
      } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to fetch floor details.");
      }
    }
  );

  const fetchFloorDetailsWithFloorId = createAsyncThunk(
    'floors/fetchFloorDetails',
    async (floorId, { rejectWithValue }) => {
      try {
        const response = await BaseUrl.get(\`/floor/\${floorId}\`);
        return { ...response.data, floor_id: floorId };
      } catch (err) {
        return rejectWithValue(err.response?.data?.detail || "Failed to fetch floor details.");
      }
    }
  );

  const fetchFloorDetails = includeFloorIdInFetchDetails
    ? fetchFloorDetailsWithFloorId
    : fetchFloorDetailsBasic;`
  );

  return `/** Shared floor slice — Phase 5.1 */
${importLines.join("\n")}

export function createFloorModule({
  BaseUrl,
  fetchAreaOccupancyStatus,
  fetchAreaEnergyConsumption,
  includeFloorIdInFetchDetails = false,
}) {
${src
  .split("\n")
  .map((l) => (l ? "  " + l : l))
  .join("\n")}
  return {
    reducer,
${exportNames.map((n) => `    ${n},`).join("\n")}
  };
}
`;
}

function writeFloorWrappers() {
  for (const v of VARIANTS) {
    const wrapperRel = `src/variants/${v}/redux/slice/floor/floorSlice.js`;
    const sharedRel = relImport(wrapperRel, "src/shared/redux/slices/createFloorModule.js");
    const include = v === "customized" ? "true" : "false";
    const unique = collectExportsFromSlice("src/shared/redux/slices/_source/floorSlice.js");
    write(
      wrapperRel,
      `import { BaseUrl } from "../../../BaseUrl";
import { fetchAreaOccupancyStatus, fetchAreaEnergyConsumption } from "../settingsslice/heatmap/HeatmapSlice";
import { createFloorModule } from "${sharedRel}";

const _module = createFloorModule({
  BaseUrl,
  fetchAreaOccupancyStatus,
  fetchAreaEnergyConsumption,
  includeFloorIdInFetchDetails: ${include},
});

export default _module.reducer;
${unique.map((n) => `export const ${n} = _module.${n};`).join("\n")}
`
    );
    stats.wrappers.push(wrapperRel);
  }
}

function buildAreaSettingsFactory() {
  const { importLines, src: raw } = extractImportsAndBody(
    "src/shared/redux/slices/_source/areaSettingsSlice.js",
    [/import\s+\{\s*BaseUrl\s*\}\s+from\s+['"][^'"]+['"];?\s*\n?/g]
  );
  const { src } = prepareSliceBody(raw);
  const exportNames = collectExportsFromSlice("src/shared/redux/slices/_source/areaSettingsSlice.js");
  return `/** Shared area settings slice — Phase 5.1 */
${importLines.join("\n")}

export function createAreaSettingsModule({ BaseUrl }) {
${src
  .split("\n")
  .map((l) => (l ? "  " + l : l))
  .join("\n")}
  return {
    reducer,
${exportNames.map((n) => `    ${n},`).join("\n")}
  };
}
`;
}

function writeAreaSettingsWrappers() {
  for (const v of VARIANTS) {
    const wrapperRel = `src/variants/${v}/redux/slice/settingsslice/heatmap/areaSettingsSlice.js`;
    const sharedRel = relImport(wrapperRel, "src/shared/redux/slices/createAreaSettingsModule.js");
    const src = read(`src/shared/redux/slices/_source/areaSettingsSlice.js`);
    const exportNames = [];
    for (const m of src.matchAll(/^export\s+(?:const|function|async function)\s+(\w+)/gm)) {
      exportNames.push(m[1]);
    }
    const actionMatch = src.match(/export\s+const\s+\{([^}]+)\}\s*=\s*\w+\.actions;/);
    if (actionMatch) {
      actionMatch[1].split(",").forEach((p) => {
        const n = p.trim().split(":")[0].trim();
        if (n) exportNames.push(n);
      });
    }
    const unique = [...new Set(exportNames)];
    write(
      wrapperRel,
      `import { BaseUrl } from "${baseUrlImportDepth("settingsslice/heatmap/areaSettingsSlice.js")}";
import { createAreaSettingsModule } from "${sharedRel}";

const _module = createAreaSettingsModule({ BaseUrl });

export default _module.reducer;
${unique.map((n) => `export const ${n} = _module.${n};`).join("\n")}
`
    );
    stats.wrappers.push(wrapperRel);
  }
}

const SLICE_SOURCES = {
  "dashboard/alertsSlice.js": "src/shared/redux/slices/_source/alertsSlice.js",
  "home/homeSlice.js": "src/shared/redux/slices/_source/homeSlice.js",
  "modules/modulesSlice.js": "src/shared/redux/slices/_source/modulesSlice.js",
  "sensors/sensorsSlice.js": "src/shared/redux/slices/_source/sensorsSlice.js",
  "quickcontrols/quickControlSlice.js": "src/shared/redux/slices/_source/quickControlSlice.js",
  "auth/userlogin.js": "src/shared/redux/slices/_source/userlogin.js",
  "fofp/fofpSlice.js": "src/shared/redux/slices/_source/fofpSlice.js",
  "floor/floorSlice.js": "src/shared/redux/slices/_source/floorSlice.js",
  "settingsslice/heatmap/areaSettingsSlice.js": "src/shared/redux/slices/_source/areaSettingsSlice.js",
};

// ─── STEP 1: Redux slices ────────────────────────────────────────────────────
const simpleSlices = [
  ["src/shared/redux/slices/_source/alertsSlice.js", "src/shared/redux/slices/createAlertsModule.js", "createAlertsModule", "dashboard/alertsSlice.js"],
  ["src/shared/redux/slices/_source/homeSlice.js", "src/shared/redux/slices/createHomeModule.js", "createHomeModule", "home/homeSlice.js"],
  ["src/shared/redux/slices/_source/modulesSlice.js", "src/shared/redux/slices/createModulesModule.js", "createModulesModule", "modules/modulesSlice.js"],
  ["src/shared/redux/slices/_source/sensorsSlice.js", "src/shared/redux/slices/createSensorsModule.js", "createSensorsModule", "sensors/sensorsSlice.js"],
  ["src/shared/redux/slices/_source/quickControlSlice.js", "src/shared/redux/slices/createQuickControlModule.js", "createQuickControlModule", "quickcontrols/quickControlSlice.js"],
];

for (const [src, dest, factory, slicePath] of simpleSlices) {
  write(dest, buildBaseUrlFactory(src, factory));
  stats.moved.push(dest);
  for (const v of VARIANTS) writeSliceWrapper(v, slicePath, dest, factory);
}

write("src/shared/redux/slices/createUserLoginModule.js", buildUserLoginFactory());
stats.moved.push("src/shared/redux/slices/createUserLoginModule.js");
writeUserLoginWrappers();

write("src/shared/redux/slices/createFofpModule.js", buildFofpFactory());
stats.moved.push("src/shared/redux/slices/createFofpModule.js");
for (const v of VARIANTS) writeSliceWrapper(v, "fofp/fofpSlice.js", "src/shared/redux/slices/createFofpModule.js", "createFofpModule");

write("src/shared/redux/slices/createFloorModule.js", buildFloorFactory());
stats.moved.push("src/shared/redux/slices/createFloorModule.js");
writeFloorWrappers();

  write("src/shared/redux/slices/createAreaSettingsModule.js", buildAreaSettingsFactory().replace(/import axios from "axios";\s*\n?/, ""));
stats.moved.push("src/shared/redux/slices/createAreaSettingsModule.js");
writeAreaSettingsWrappers();

write(
  "src/shared/redux/index.js",
  `export { createAlertsModule } from "./slices/createAlertsModule";
export { createHomeModule } from "./slices/createHomeModule";
export { createModulesModule } from "./slices/createModulesModule";
export { createSensorsModule } from "./slices/createSensorsModule";
export { createQuickControlModule } from "./slices/createQuickControlModule";
export { createUserLoginModule } from "./slices/createUserLoginModule";
export { createFofpModule } from "./slices/createFofpModule";
export { createFloorModule } from "./slices/createFloorModule";
export { createAreaSettingsModule } from "./slices/createAreaSettingsModule";
`
);

// ─── STEP 2: Utils ───────────────────────────────────────────────────────────
const utils = [
  ["src/shared/utils/_source/ErrorBoundary.jsx", "src/shared/utils/ErrorBoundary.jsx"],
  ["src/shared/utils/_source/PaginatedList.jsx", "src/shared/utils/PaginatedList.jsx"],
  ["src/shared/utils/_source/ColorPickerCard.jsx", "src/shared/utils/ColorPickerCard.jsx"],
  ["src/shared/utils/_source/floorplanCoordinates.js", "src/shared/utils/floorplanCoordinates.js"],
];

for (const [src, dest] of utils) {
  copy(src, dest);
  stats.moved.push(dest);
}

for (const v of VARIANTS) {
  for (const [, dest] of utils) {
    const baseName = path.basename(dest);
    const isComponent = baseName === "ErrorBoundary.jsx";
    const variantPaths = isComponent
      ? [`src/variants/${v}/components/${baseName}`]
      : [`src/variants/${v}/utils/${baseName}`];
    for (const vp of variantPaths) {
      if (!fs.existsSync(path.join(ROOT, vp))) continue;
      const sharedRel = relImport(vp, dest);
      if (baseName === "ErrorBoundary.jsx") {
        write(
          vp,
          `/** Phase 5.1 re-export wrapper */\nexport { default, redirectToLogin, redirectFlagKey } from "${sharedRel}";\n`
        );
      } else if (baseName === "floorplanCoordinates.js") {
        write(vp, `/** Phase 5.1 re-export wrapper */\nexport * from "${sharedRel}";\n`);
      } else {
        write(vp, `/** Phase 5.1 re-export wrapper */\nexport { default } from "${sharedRel}";\n`);
      }
      stats.wrappers.push(vp);
    }
  }
}

write(
  "src/shared/utils/index.js",
  `export { default as ErrorBoundary, redirectToLogin, redirectFlagKey } from "./ErrorBoundary";
export { default as PaginatedList } from "./PaginatedList";
export { default as ColorPickerCard } from "./ColorPickerCard";
export * from "./floorplanCoordinates";
`
);

// ─── STEP 3: FOFP exact settings bundle ──────────────────────────────────────
const fofpExact = [
  "fofpContextMenuPosition.js",
  "fofpIndividualStyle.js",
  "FofpMarkerContextMenu.jsx",
  "fofpMarkerDrag.js",
  "fofpMarkerResize.js",
  "FofpMarkerResizeHandles.jsx",
  "FofpShapeMenuIcon.jsx",
  "fofpShapeOptions.js",
  "fofpViewAutoFit.js",
  "fofpViewportFit.js",
];

copy("src/shared/fofp/_source/fofpColorUtils.js", "src/shared/fofp/fofpColorUtils.js");
copy("src/shared/fofp/_source/fofpMarkerShapes.jsx", "src/shared/fofp/fofpMarkerShapes.jsx");
copy("src/shared/fofp/_source/fofpMarkerDimensions.js", "src/shared/fofp/fofpMarkerDimensions.js");
copy("src/shared/fofp/_source/markerContainment.js", "src/shared/fofp/geometry/markerContainment.js");
stats.moved.push(
  "src/shared/fofp/fofpColorUtils.js",
  "src/shared/fofp/fofpMarkerShapes.jsx",
  "src/shared/fofp/fofpMarkerDimensions.js",
  "src/shared/fofp/geometry/markerContainment.js"
);

const fofpImportPatches = {
  "FofpShapeMenuIcon.jsx": [
    [/from "\.\.\/\.\.\/heatmap\/fofpMarkerShapes"/g, 'from "../fofpMarkerShapes"'],
  ],
  "fofpMarkerResize.js": [
    [/from "\.\.\/\.\.\/heatmap\/fofpMarkerShapes"/g, 'from "../fofpMarkerShapes"'],
    [/from "\.\.\/\.\.\/heatmap\/fofpMarkerDimensions"/g, 'from "../fofpMarkerDimensions"'],
    [/from "\.\.\/\.\.\/\.\.\/features\/fofp\/geometry\/markerContainment"/g, 'from "../geometry/markerContainment"'],
  ],
  "FofpMarkerContextMenu.jsx": [
    [/from "\.\.\/\.\.\/heatmap\/fofpMarkerShapes"/g, 'from "../fofpMarkerShapes"'],
  ],
};

for (const f of fofpExact) {
  const dest = `src/shared/fofp/settings/${f}`;
  copy(`src/shared/fofp/_source/${f}`, dest);
  if (fofpImportPatches[f]) {
    let content = read(dest);
    for (const [re, rep] of fofpImportPatches[f]) {
      content = content.replace(re, rep);
    }
    write(dest, content);
  }
  stats.moved.push(dest);
  for (const v of VARIANTS) {
    const vp = `src/variants/${v}/screens/settings/fofp/${f}`;
    const sharedRel = relImport(vp, dest);
    write(vp, `/** Phase 5.1 re-export wrapper */\nexport * from "${sharedRel}";\nexport { default } from "${sharedRel}";\n`);
    stats.wrappers.push(vp);
  }
}

// Fix shared FOFP files that import from heatmap - update to shared paths in the copied files
function patchFofpSharedImports() {
  const patches = {
    "FofpShapeMenuIcon.jsx": [
      ['from "../../heatmap/fofpMarkerShapes"', 'from "../../../variants/basic/screens/heatmap/fofpMarkerShapes"'],
    ],
    "fofpMarkerResize.js": [
      ['from "../../heatmap/fofpMarkerShapes"', 'from "../../../variants/basic/screens/heatmap/fofpMarkerShapes"'],
      ['from "../../heatmap/fofpMarkerDimensions"', 'from "../../../variants/basic/screens/heatmap/fofpMarkerDimensions"'],
      ['from "../../../features/fofp/geometry/markerContainment"', 'from "../../../variants/basic/features/fofp/geometry/markerContainment"'],
    ],
    "FofpMarkerContextMenu.jsx": [
      ['from "../../heatmap/fofpMarkerShapes"', 'from "../../../variants/basic/screens/heatmap/fofpMarkerShapes"'],
    ],
  };
  // Keep variant-relative imports in shared by using injectable paths - FOFP shared files stay as re-exports from variant for non-exact
  // For exact pure JS files without heatmap imports, wrappers are enough
}

write(
  "src/shared/fofp/index.js",
  `export * from "./fofpColorUtils";
${fofpExact.map((f) => `export * from "./settings/${f.replace(/\.(jsx?)$/, "")}";`).join("\n")}
`
);

// ─── STEP 4: Auth ────────────────────────────────────────────────────────────
write(
  "src/shared/auth/AuthGuard.jsx",
  `import { Navigate, useLocation } from "react-router-dom";

/**
 * @param {{ children: import('react').ReactNode, allowedRoles?: string[], useAuth: () => object, deniedRedirect?: string }} props
 */
const AuthGuard = ({ children, allowedRoles, useAuth, deniedRedirect = "/dashboard/overview" }) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to={deniedRedirect} state={{ from: location }} replace />;
    }
  }
  return children;
};

export default AuthGuard;
`
);

// UseAuth core (without sidebar) 
const useAuthCoreContent = `import { jwtDecode } from "jwt-decode";

export const UseAuth = () => {
  const token = localStorage.getItem("lutron");
  const storedRole = localStorage.getItem("role");
  if (!token) {
    return { isAuthenticated: false, userId: null, name: null, email: null, role: null };
  }
  try {
    const decoded = jwtDecode(token);
    const { id, name, role: roleFromToken, permission, sub } = decoded || {};
    const role = storedRole || roleFromToken || null;
    const storedPermission = localStorage.getItem("permission");
    const userPermission = storedPermission || permission || null;
    return {
      isAuthenticated: true,
      userId: id || null,
      name: name || null,
      email: sub || null,
      role,
      permission: userPermission,
    };
  } catch (error) {
    localStorage.removeItem("lutron");
    return { isAuthenticated: false, userId: null, name: null, email: null, role: null };
  }
};

export const isSuperadminRole = (role) => {
  if (!role) return false;
  return role === "Superadmin" || role.toLowerCase() === "superadmin" || role.toLowerCase() === "super admin";
};

export const getOverallPermissionLevel = (userProfile) => {
  if (!userProfile || !userProfile.floors || userProfile.floors.length === 0) return null;
  const hasMonitorControlEdit = userProfile.floors.some((f) => f.floor_permission === "monitor_control_edit");
  if (hasMonitorControlEdit) return "Monitoring, edit and control";
  const hasMonitorControl = userProfile.floors.some((f) => f.floor_permission === "monitor_control");
  if (hasMonitorControl) return "Monitoring and control";
  const hasMonitor = userProfile.floors.some((f) => f.floor_permission === "monitor");
  if (hasMonitor) return "Monitoring Only";
  return null;
};
`;

write("src/shared/auth/useAuthCore.js", useAuthCoreContent);
stats.moved.push("src/shared/auth/useAuthCore.js", "src/shared/auth/AuthGuard.jsx");

// Sidebar helpers stay variant-specific, re-exported from UseAuth wrappers
for (const v of ["basic", "advanced"]) {
  const vp = `src/variants/${v}/customhooks/UseAuth.jsx`;
  const coreRel = relImport(vp, "src/shared/auth/useAuthCore.js");
  const sidebarSrc = read("src/shared/auth/_source/UseAuth.basic.jsx");
  const sidebarFn = sidebarSrc.match(/export const getVisibleSidebarItemsWithPaths = [\s\S]*$/)[0];
  write(
    vp,
    `/** Phase 5.1 — core auth in shared, sidebar RBAC variant-specific */
export { UseAuth, isSuperadminRole, getOverallPermissionLevel } from "${coreRel}";
import {
  SETTINGS_SIDEBAR_ITEM_ORDER,
  sortSettingsSidebarNavItems,
} from "../utils/settingsSidebarTabStyles";

${sidebarFn}
`
  );
  stats.wrappers.push(vp);
}

// customized UseAuth
write(
  "src/variants/customized/customhooks/UseAuth.jsx",
  `/** Phase 5.1 — core auth in shared, sidebar RBAC variant-specific */
export { UseAuth, isSuperadminRole, getOverallPermissionLevel } from "../../../shared/auth/useAuthCore.js";

${read("src/variants/customized/customhooks/UseAuth.jsx").match(/export const getVisibleSidebarItemsWithPaths = [\s\S]*$/)[0]}
`
);
stats.wrappers.push("src/variants/customized/customhooks/UseAuth.jsx");

for (const v of VARIANTS) {
  const vp = `src/variants/${v}/customhooks/AuthGuard.jsx`;
  const authGuardRel = relImport(vp, "src/shared/auth/AuthGuard.jsx");
  const useAuthRel = "./UseAuth";
  const denied =
    v === "customized"
      ? `import { DASHBOARD_DEFAULT_PATH } from "../utils/dashboardLanding";\nconst deniedRedirect = DASHBOARD_DEFAULT_PATH;`
      : "const deniedRedirect = \"/dashboard/overview\";";
  write(
    vp,
    `/** Phase 5.1 re-export wrapper */
import AuthGuardBase from "${authGuardRel}";
import { UseAuth } from "${useAuthRel}";
${v === "customized" ? 'import { DASHBOARD_DEFAULT_PATH } from "../utils/dashboardLanding";\n' : ""}
const AuthGuard = ({ children, allowedRoles }) => (
  <AuthGuardBase
    useAuth={UseAuth}
    allowedRoles={allowedRoles}
    deniedRedirect={${v === "customized" ? "DASHBOARD_DEFAULT_PATH" : '"/dashboard/overview"'}}
  >
    {children}
  </AuthGuardBase>
);

export default AuthGuard;
`
  );
  stats.wrappers.push(vp);
}

write(
  "src/shared/auth/index.js",
  `export { default as AuthGuard } from "./AuthGuard";
export { UseAuth, isSuperadminRole, getOverallPermissionLevel } from "./useAuthCore";
`
);

// ─── STEP 5: Route manifest ──────────────────────────────────────────────────
write(
  "src/shared/routes/routeManifest.js",
  read("src/variants/basic/App.js") // placeholder - will replace with manifest
);

// Build route manifest from App.js files
function extractRoutes(appContent) {
  const routes = [];
  const re = /<Route\s+path="([^"]+)"\s+element=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
  let m;
  while ((m = re.exec(appContent)) !== null) {
    routes.push({ path: m[1], element: m[2].trim().slice(0, 80) });
  }
  return routes;
}

const basicRoutes = extractRoutes(read("src/variants/basic/App.js"));
const advancedRoutes = extractRoutes(read("src/variants/advanced/App.js"));
const customizedRoutes = extractRoutes(read("src/variants/customized/App.js"));

const allPaths = [...new Set([...basicRoutes, ...advancedRoutes, ...customizedRoutes].map((r) => r.path))].sort();

const manifest = allPaths.map((path) => ({
  path,
  basic: basicRoutes.some((r) => r.path === path),
  advanced: advancedRoutes.some((r) => r.path === path),
  customized: customizedRoutes.some((r) => r.path === path),
  shared: ["basic", "advanced", "customized"].every((v) => {
    const list = v === "basic" ? basicRoutes : v === "advanced" ? advancedRoutes : customizedRoutes;
    return list.some((r) => r.path === path);
  }),
}));

write(
  "src/shared/routes/routeManifest.js",
  `/**
 * Route metadata manifest — Phase 5.1
 * Generated from variant App.js files. Does not drive routing yet.
 */
export const ROUTE_MANIFEST = ${JSON.stringify(manifest, null, 2)};

export const VARIANT_ROUTE_DIFFS = {
  dashboardLanding: {
    basic: "/dashboard/overview",
    advanced: "/dashboard/overview",
    customized: "conditional (dashboardLanding.js)",
  },
  widgetSettings: {
    basic: "/rename-widget/",
    advanced: "/rename-widget/",
    customized: "/widgets/",
  },
  themeSettings: {
    basic: "ThemeChangeWithFofp",
    advanced: "ThemeChangeWithFofp",
    customized: "ThemeChange",
  },
  lutronHome: {
    basic: "LutronWebsiteComponent",
    advanced: "LutronPublicHome",
    customized: "LutronWebsiteComponent",
  },
  spaceUtilizationPath: {
    basic: "/dashboard/spaceutilization",
    advanced: "/dashboard/spaceutilization",
    customized: "/dashboard/space-utilization",
  },
};

export function getSharedRoutes() {
  return ROUTE_MANIFEST.filter((r) => r.shared);
}

export function getVariantOnlyRoutes(variant) {
  return ROUTE_MANIFEST.filter((r) => r[variant] && !r.shared);
}
`
);

write(
  "src/shared/routes/index.js",
  `export {
  ROUTE_MANIFEST,
  VARIANT_ROUTE_DIFFS,
  getSharedRoutes,
  getVariantOnlyRoutes,
} from "./routeManifest";
`
);

// Write stats
write(
  "scripts/phase51-stats.json",
  JSON.stringify(
    {
      moved: stats.moved,
      wrapperCount: stats.wrappers.length,
      wrappers: stats.wrappers,
    },
    null,
    2
  )
);

console.log("Phase 5.1 migration complete");
console.log("Moved:", stats.moved.length);
console.log("Wrappers:", stats.wrappers.length);
