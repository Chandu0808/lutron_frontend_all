#!/usr/bin/env node
/**
 * Phase 5.2 — Users & Schedule consolidation (binding pattern)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VARIANTS = ["basic", "advanced", "customized"];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}
function write(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, (content.endsWith("\n") ? content : content + "\n"), "utf8");
}
function relImport(fromRel, toRel) {
  let rel = path.relative(path.dirname(fromRel), toRel).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel.replace(/\.(jsx?)$/, "");
}
function copyFile(fromRel, toRel) {
  write(toRel, read(fromRel));
}

const stats = {
  consolidated: [],
  wrappers: [],
  variantOnly: [],
};

// --- Bind modules ---
write(
  "src/shared/settings/users/bindUsersSettingsModule.js",
  `let bindings = null;
export function bindUsersSettingsModule(next) {
  bindings = next;
}
export function getUsersSettingsBindings() {
  if (!bindings) throw new Error("bindUsersSettingsModule must be called before using shared users settings screens");
  return bindings;
}
export function resetUsersSettingsBindingsForTests() {
  bindings = null;
}
`
);

write(
  "src/shared/settings/schedule/bindScheduleSettingsModule.js",
  `let bindings = null;
export function bindScheduleSettingsModule(next) {
  bindings = next;
}
export function getScheduleSettingsBindings() {
  if (!bindings) throw new Error("bindScheduleSettingsModule must be called before using shared schedule settings screens");
  return bindings;
}
export function resetScheduleSettingsBindingsForTests() {
  bindings = null;
}
`
);

// --- userUpdatePayload (all variants) ---
if (!fs.existsSync(path.join(ROOT, "src/shared/settings/_source/users/userUpdatePayload.js"))) {
  copyFile(
    "src/variants/basic/screens/settings/Users/userUpdatePayload.js",
    "src/shared/settings/_source/users/userUpdatePayload.js"
  );
}
write(
  "src/shared/settings/users/userUpdatePayload.js",
  read("src/shared/settings/_source/users/userUpdatePayload.js")
);
stats.consolidated.push("src/shared/settings/users/userUpdatePayload.js");

for (const v of VARIANTS) {
  const wp = `src/variants/${v}/screens/settings/Users/userUpdatePayload.js`;
  write(wp, `/** Phase 5.2 */\nexport * from "${relImport(wp, "src/shared/settings/users/userUpdatePayload.js")}";\n`);
  stats.wrappers.push(wp);
}

function stripImports(src, patterns) {
  let out = src;
  for (const p of patterns) out = out.replace(p, "");
  return out;
}

function injectBindingBlock(src, getterName, bindImportPath, destructureLines, fnNames) {
  let out = src;
  if (!out.includes(getterName)) {
    out = `import { ${getterName} } from '${bindImportPath}';\n${out}`;
  }
  const block = `\n  const {\n${destructureLines.map((l) => `    ${l},`).join("\n")}\n  } = ${getterName}();\n`;
  for (const fnName of fnNames) {
    const patterns = [
      new RegExp(`(export default function ${fnName}\\([^)]*\\)\\s*\\{)`),
      new RegExp(`(function ${fnName}\\([^)]*\\)\\s*\\{)`),
      new RegExp(`(const ${fnName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{)`),
      new RegExp(`(const ${fnName}\\s*=\\s*\\(\\)\\s*=>\\s*\\{)`),
    ];
    for (const p of patterns) {
      if (p.test(out)) {
        return out.replace(p, `$1${block}`);
      }
    }
  }
  throw new Error(`Could not inject binding for: ${fnNames.join(", ")}`);
}

const THEME_ON_SURFACE_SHARED = "../../theme/utils/themeOnSurface";

// --- Users screens (basic canonical) ---
function usersSource(fileName) {
  const sourcePath = `src/shared/settings/_source/users/${fileName}`;
  if (!fs.existsSync(path.join(ROOT, sourcePath))) {
    copyFile(`src/variants/basic/screens/settings/Users/${fileName}`, sourcePath);
  }
  return read(sourcePath);
}

function buildSharedUsersComponent() {
  let src = usersSource("UsersComponent.jsx");
  src = src.replace(/from ['"]\.\.\/Users\/CreateUser['"]/, "from './CreateUser'");
  src = stripImports(src, [
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/settingsslice\/user\/usersSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/FeedbackUI['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/sidebarItems['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*customhooks\/UseAuth['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/auth\/userlogin['"];?\s*\n?/g,
    /import\s+SettingsSidebarNav\s+from\s+['"][^'"]*components\/SettingsSidebarNav['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/settingsUsersBreadcrumbParams['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/theme\/themeSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/themeOnSurface['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/settingsSidebarTabStyles['"];?\s*\n?/g,
  ]);
  src = src.replace(
    /import \{ useTheme \} from "@mui\/material\/styles";/,
    `import { useTheme } from "@mui/material/styles";\nimport { isLightSurface } from "${THEME_ON_SURFACE_SHARED}";`
  );
  src = injectBindingBlock(
    src,
    "getUsersSettingsBindings",
    "./bindUsersSettingsModule",
    [
      "usersSlice: { fetchUsers, deleteUser, selectUsers, selectUsersLoading, selectUsersError, selectDeleteLoading, selectDeleteError, clearDeleteError }",
      "ConfirmDialog",
      "SidebarItems",
      "getVisibleSidebarItems",
      "getVisibleSidebarItemsWithPaths",
      "UseAuth",
      "userlogin: { selectProfile }",
      "themeSlice: { selectApplicationTheme }",
      "settingsSidebarTabStyles: { settingsSidebarColumnDividerSx }",
      "SettingsSidebarNav",
      "settingsUsersBreadcrumbParams: { SETTINGS_USERS_ACTION_QUERY }",
    ],
    ["UsersComponent"]
  );
  write("src/shared/settings/users/UsersComponent.jsx", src);
  stats.consolidated.push("src/shared/settings/users/UsersComponent.jsx");
}

function buildSharedCreateUser() {
  let src = usersSource("CreateUser.jsx");
  src = stripImports(src, [
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/settingsslice\/createUserSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/floor\/floorSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/theme\/themeSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/themeOnSurface['"];?\s*\n?/g,
  ]);
  src = src.replace(
    /import \{ useTheme \} from "@mui\/material\/styles";/,
    `import { useTheme } from "@mui/material/styles";\nimport { isWhiteAreaPickerChrome, DEFAULT_APP_CONTENT } from "${THEME_ON_SURFACE_SHARED}";`
  );
  src = injectBindingBlock(
    src,
    "getUsersSettingsBindings",
    "./bindUsersSettingsModule",
    [
      "createUserSlice: { createUser, resetCreateState, selectFloorsLoading, selectFloorsError, selectCreateLoading, selectCreateError, selectCreateSuccess }",
      "floorSlice: { fetchFloors, selectFloors }",
      "themeSlice: { selectApplicationTheme }",
    ],
    ["CreateUser"]
  );
  write("src/shared/settings/users/CreateUser.jsx", src);
  stats.consolidated.push("src/shared/settings/users/CreateUser.jsx");
}

function buildSharedUpdateUser() {
  let src = usersSource("UpdateUser.jsx");
  src = src.replace(
    /from ['"]\.\/userUpdatePayload['"]/,
    `from '${relImport("src/shared/settings/users/UpdateUser.jsx", "src/shared/settings/users/userUpdatePayload.js")}'`
  );
  src = stripImports(src, [
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/settingsslice\/user\/usersSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/floor\/floorSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/theme\/themeSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/themeOnSurface['"];?\s*\n?/g,
  ]);
  src = src.replace(
    /import \{ useTheme \} from "@mui\/material\/styles";/,
    `import { useTheme } from "@mui/material/styles";\nimport { isLightSurface } from "${THEME_ON_SURFACE_SHARED}";`
  );
  src = injectBindingBlock(
    src,
    "getUsersSettingsBindings",
    "./bindUsersSettingsModule",
    [
      "usersSlice: { updateUser, selectUpdateLoading, selectUpdateError }",
      "floorSlice: { fetchFloors, selectFloors }",
      "themeSlice: { selectApplicationTheme }",
    ],
    ["UpdateUser"]
  );
  write("src/shared/settings/users/UpdateUser.jsx", src);
  stats.consolidated.push("src/shared/settings/users/UpdateUser.jsx");
}

buildSharedUsersComponent();
buildSharedCreateUser();
buildSharedUpdateUser();

function usersBindBlock(variant, fromFile) {
  const bindPath = relImport(fromFile, "src/shared/settings/users/bindUsersSettingsModule.js");
  return `import * as usersSlice from '../../../redux/slice/settingsslice/user/usersSlice';
import * as createUserSlice from '../../../redux/slice/settingsslice/createUserSlice';
import * as floorSlice from '../../../redux/slice/floor/floorSlice';
import { ConfirmDialog } from '../../../utils/FeedbackUI';
import { SidebarItems, getVisibleSidebarItems } from '../../../utils/sidebarItems';
import { getVisibleSidebarItemsWithPaths, UseAuth } from '../../../customhooks/UseAuth';
import * as userlogin from '../../../redux/slice/auth/userlogin';
import * as themeSlice from '../../../redux/slice/theme/themeSlice';
import SettingsSidebarNav from '../../../components/SettingsSidebarNav';
import * as settingsUsersBreadcrumbParams from '../../../utils/settingsUsersBreadcrumbParams';
import * as settingsSidebarTabStyles from '../../../utils/settingsSidebarTabStyles';
import { bindUsersSettingsModule } from '${bindPath}';

bindUsersSettingsModule({
  usersSlice,
  createUserSlice,
  floorSlice,
  ConfirmDialog,
  SidebarItems,
  getVisibleSidebarItems,
  getVisibleSidebarItemsWithPaths,
  UseAuth,
  userlogin,
  themeSlice,
  settingsSidebarTabStyles,
  SettingsSidebarNav,
  settingsUsersBreadcrumbParams,
});`;
}

const SHARED_USER_SCREENS = ["UsersComponent.jsx", "CreateUser.jsx", "UpdateUser.jsx"];
const ADVANCED_ONLY_USER_SCREENS = ["UsersComponent.jsx", "CreateUser.jsx", "UpdateUser.jsx"];

for (const v of VARIANTS) {
  for (const f of SHARED_USER_SCREENS) {
    const wp = `src/variants/${v}/screens/settings/Users/${f}`;
    if (v === "advanced" && ADVANCED_ONLY_USER_SCREENS.includes(f)) {
      stats.variantOnly.push(wp);
      const advSource = `src/shared/settings/_source/users/advanced/${f}`;
      if (!fs.existsSync(path.join(ROOT, advSource))) {
        fs.mkdirSync(path.dirname(path.join(ROOT, advSource)), { recursive: true });
        if (fs.existsSync(path.join(ROOT, wp)) && !read(wp).startsWith("/** Phase 5.2 */")) {
          copyFile(wp, advSource);
        }
      }
      if (fs.existsSync(path.join(ROOT, advSource))) {
        let src = read(advSource);
        if (f === "UpdateUser.jsx" || f === "CreateUser.jsx") {
          src = src.replace(
            /from ['"]\.\/userUpdatePayload['"]/,
            `from "${relImport(wp, "src/shared/settings/users/userUpdatePayload.js")}"`
          );
        }
        write(wp, src);
        stats.wrappers.push(`${wp} (advanced variant-only)`);
      }
      continue;
    }
    const sharedRel = relImport(wp, `src/shared/settings/users/${f}`);
    write(wp, `/** Phase 5.2 */\n${usersBindBlock(v, wp)}\n\nexport { default } from "${sharedRel}";\n`);
    stats.wrappers.push(wp);
  }
}

// --- Schedule screens ---
const SCHED_FILES = [
  "ScheduleComponent.jsx",
  "ScheduleFormPanel.jsx",
  "ScheduleDetails.jsx",
  "AddEvent.jsx",
  "UpdatePreconfigurdEvent.jsx",
];

const SCHEDULE_STRIP_PATTERNS = [
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*schedule\/scheduleSlice['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*customhooks\/UseAuth['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*auth\/userlogin['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*floor\/floorSlice['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/FeedbackUI['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*BaseUrl['"];?\s*\n?/g,
  /import\s+AreaTreeDialog\s+from\s+['"][^'"]*AreaTreeDialog['"];?\s*\n?/g,
  /import\s+Action\s+from\s+['"][^'"]*\/Action['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*redux\/slice\/theme\/themeSlice['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/themeOnSurface['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/fixedActionBarStyles['"];?\s*\n?/g,
  /import\s+\{[^}]+\}\s+from\s+['"][^'"]*utils\/scheduleActionPriority['"];?\s*\n?/g,
];

const SCHEDULE_BIND_LINES = [
  "scheduleSlice",
  "UseAuth",
  "userlogin",
  "floorSlice",
  "FeedbackUI",
  "quickcontrols: { AreaTreeDialog, Action }",
  "BaseUrl",
  "themeSlice: { selectApplicationTheme }",
  "fixedActionBarStyles: { scheduleFixedActionBarStyle, schedulePageWithFixedActionBarStyle }",
  "scheduleActionPriority: { applyCommonActionToActions, stripActionSource, tagLoadedActions, withIndividualSource }",
];

const SCHEDULE_SLICE_EXPORTS = {
  "ScheduleComponent.jsx":
    "fetchSchedules, fetchScheduleGroups, fetchScheduleDetails",
  "ScheduleDetails.jsx":
    "fetchScheduleDetails, updateSchedule, deleteSchedule, triggerSchedule, createSchedule, fetchScheduleGroups, enableSchedule, disableSchedule, fetchSchedules",
  "AddEvent.jsx": "createSchedule, fetchSchedules, fetchScheduleGroups",
  "UpdatePreconfigurdEvent.jsx":
    "enableSchedule, disableSchedule, triggerSchedule, fetchPreconfiguredScheduleDetails, fetchSchedules",
  "ScheduleFormPanel.jsx": "",
};

function buildSharedScheduleFile(fileName) {
  let src = read(`src/variants/basic/screens/schedule/${fileName}`);
  if (src.startsWith("/** Phase 5.2 */")) {
    const sharedRel = relImport(
      `src/variants/basic/screens/schedule/${fileName}`,
      `src/shared/settings/schedule/${fileName}`
    );
    const m = src.match(new RegExp(`export \\{ default \\} from ["']${sharedRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'];?`));
    if (m) {
      src = read(`src/shared/settings/_source/schedule/${fileName}`);
    }
  }
  if (!fs.existsSync(path.join(ROOT, `src/shared/settings/_source/schedule/${fileName}`))) {
    copyFile(`src/variants/basic/screens/schedule/${fileName}`, `src/shared/settings/_source/schedule/${fileName}`);
    src = read(`src/shared/settings/_source/schedule/${fileName}`);
  } else {
    src = read(`src/shared/settings/_source/schedule/${fileName}`);
  }

  src = stripImports(src, SCHEDULE_STRIP_PATTERNS);
  src = src.replace(/from ['"]\.\/ScheduleDetails['"]/g, "from './ScheduleDetails'");
  src = src.replace(/from ['"]\.\/ScheduleFormPanel['"]/g, "from './ScheduleFormPanel'");

  const themeImport = `import { DEFAULT_APP_CONTENT, isWhiteAreaPickerChrome, onContentColors } from "${THEME_ON_SURFACE_SHARED}";\n`;
  if (fileName !== "ScheduleFormPanel.jsx" && !src.includes(THEME_ON_SURFACE_SHARED)) {
    src = src.replace(/^(import React[^\n]*\n)/, `$1${themeImport}`);
  }

  if (fileName === "ScheduleFormPanel.jsx") {
    write(`src/shared/settings/schedule/${fileName}`, src);
    stats.consolidated.push(`src/shared/settings/schedule/${fileName}`);
    return;
  }

  const fnMap = {
    "ScheduleComponent.jsx": ["ScheduleComponent"],
    "ScheduleDetails.jsx": ["ScheduleDetails"],
    "AddEvent.jsx": ["AddEvent"],
    "UpdatePreconfigurdEvent.jsx": ["UpdatePreconfigurdEvent"],
  };
  const sliceExports = SCHEDULE_SLICE_EXPORTS[fileName];
  const extraLines = [
    ...SCHEDULE_BIND_LINES,
    ...(sliceExports
      ? [`\n  const { ${sliceExports} } = scheduleSlice;`, "const { fetchFloors, selectFloors } = floorSlice;"]
      : []),
  ];
  src = injectBindingBlock(
    src,
    "getScheduleSettingsBindings",
    "./bindScheduleSettingsModule",
    SCHEDULE_BIND_LINES,
    fnMap[fileName]
  );
  if (sliceExports) {
    src = src.replace(
      /} = getScheduleSettingsBindings\(\);\n/,
      `} = getScheduleSettingsBindings();\n  const { ConfirmDialog, Toast } = FeedbackUI;\n  const { selectProfile } = userlogin;\n  const { ${sliceExports} } = scheduleSlice;\n  const { fetchFloors, selectFloors } = floorSlice;\n`
    );
  } else {
    src = src.replace(
      /} = getScheduleSettingsBindings\(\);\n/,
      `} = getScheduleSettingsBindings();\n  const { ConfirmDialog, Toast } = FeedbackUI;\n  const { selectProfile } = userlogin;\n`
    );
  }
  write(`src/shared/settings/schedule/${fileName}`, src);
  stats.consolidated.push(`src/shared/settings/schedule/${fileName}`);
}

for (const f of SCHED_FILES) {
  buildSharedScheduleFile(f);
}

function scheduleBindBlock(fromFile) {
  const bindPath = relImport(fromFile, "src/shared/settings/schedule/bindScheduleSettingsModule.js");
  return `import * as scheduleSlice from '../../redux/slice/schedule/scheduleSlice';
import { UseAuth } from '../../customhooks/UseAuth';
import * as userlogin from '../../redux/slice/auth/userlogin';
import * as floorSlice from '../../redux/slice/floor/floorSlice';
import * as FeedbackUI from '../../utils/FeedbackUI';
import AreaTreeDialog from '../../screens/quickcontrols/AreaTreeDialog';
import Action from '../../screens/quickcontrols/Action';
import { BaseUrl } from '../../BaseUrl';
import * as themeSlice from '../../redux/slice/theme/themeSlice';
import * as fixedActionBarStyles from '../../utils/fixedActionBarStyles';
import * as scheduleActionPriority from '../../utils/scheduleActionPriority';
import { bindScheduleSettingsModule } from '${bindPath}';

bindScheduleSettingsModule({
  scheduleSlice,
  UseAuth,
  userlogin,
  floorSlice,
  FeedbackUI,
  quickcontrols: { AreaTreeDialog, Action },
  BaseUrl,
  themeSlice,
  fixedActionBarStyles,
  scheduleActionPriority,
});`;
}

for (const v of VARIANTS) {
  for (const f of SCHED_FILES) {
    const wp = `src/variants/${v}/screens/schedule/${f}`;
    const sharedRel = relImport(wp, `src/shared/settings/schedule/${f}`);
    write(wp, `/** Phase 5.2 */\n${scheduleBindBlock(wp)}\n\nexport { default } from "${sharedRel}";\n`);
    stats.wrappers.push(wp);
  }
}

write(
  "src/shared/settings/users/index.js",
  `export * from "./userUpdatePayload";
export { bindUsersSettingsModule, getUsersSettingsBindings, resetUsersSettingsBindingsForTests } from "./bindUsersSettingsModule";
`
);
write(
  "src/shared/settings/schedule/index.js",
  `export { bindScheduleSettingsModule, getScheduleSettingsBindings, resetScheduleSettingsBindingsForTests } from "./bindScheduleSettingsModule";
`
);

write("scripts/phase52-stats.json", JSON.stringify(stats, null, 2));
console.log("Phase 5.2 users/schedule complete");
console.log("  shared:", stats.consolidated.length);
console.log("  wrappers:", stats.wrappers.length);
console.log("  variant-only:", stats.variantOnly.length);
