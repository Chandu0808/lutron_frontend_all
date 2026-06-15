#!/usr/bin/env node
/**
 * Phase 5.2 — Shared Settings & Layout Shell migration
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
  fs.writeFileSync(full, content.endsWith("\n") ? content : content + "\n", "utf8");
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
const stats = { consolidated: [], wrappers: [] };

// ─── Users: pure payload ───────────────────────────────────────────────────────
copy(
  "src/shared/settings/_source/users/userUpdatePayload.js",
  "src/shared/settings/users/userUpdatePayload.js"
);
stats.consolidated.push("src/shared/settings/users/userUpdatePayload.js");

for (const v of VARIANTS) {
  const wp = `src/variants/${v}/screens/settings/Users/userUpdatePayload.js`;
  const sharedRel = relImport(wp, "src/shared/settings/users/userUpdatePayload.js");
  write(wp, `/** Phase 5.2 re-export */\nexport * from "${sharedRel}";\n`);
  stats.wrappers.push(wp);
}

// ─── Users binding module ──────────────────────────────────────────────────────
write(
  "src/shared/settings/users/bindUsersSettingsModule.js",
  `/** Phase 5.2 — variant must call bindUsersSettingsModule before importing screens. */
let bindings = null;

export function bindUsersSettingsModule(next) {
  bindings = next;
}

export function getUsersSettingsBindings() {
  if (!bindings) {
    throw new Error(
      "Users settings bindings missing. Import bindUsersSettingsModule from variant Users entry first."
    );
  }
  return bindings;
}

export function resetUsersSettingsBindingsForTests() {
  bindings = null;
}
`
);

// ─── Schedule binding module ───────────────────────────────────────────────────
write(
  "src/shared/settings/schedule/bindScheduleSettingsModule.js",
  `/** Phase 5.2 — variant must call bindScheduleSettingsModule before importing screens. */
let bindings = null;

export function bindScheduleSettingsModule(next) {
  bindings = next;
}

export function getScheduleSettingsBindings() {
  if (!bindings) {
    throw new Error(
      "Schedule settings bindings missing. Import bindScheduleSettingsModule from variant schedule entry first."
    );
  }
  return bindings;
}

export function resetScheduleSettingsBindingsForTests() {
  bindings = null;
}
`
);

function transformUsersSource(src, fileName) {
  let out = src;
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/redux\/slice\/settingsslice\/user\/usersSlice['"];?\s*\n?/g,
    ""
  );
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/redux\/slice\/settingsslice\/createUserSlice['"];?\s*\n?/g,
    ""
  );
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/redux\/slice\/floor\/floorSlice['"];?\s*\n?/g,
    ""
  );
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/utils\/FeedbackUI['"];?\s*\n?/g,
    ""
  );
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/utils\/sidebarItems['"];?\s*\n?/g,
    ""
  );
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/customhooks\/UseAuth['"];?\s*\n?/g,
    ""
  );
  out = out.replace(
    /import CreateUser from ['"]\.\.\/Users\/CreateUser['"];?\s*\n?/,
    "import CreateUser from './CreateUser';\n"
  );
  out = out.replace(
    /import\s+\{[^}]+\}\s+from\s+['"]\.\/userUpdatePayload['"];?\s*\n?/g,
    ""
  );

  if (!out.includes("getUsersSettingsBindings")) {
    out = `import { getUsersSettingsBindings } from './bindUsersSettingsModule';\n${out}`;
  }

  if (fileName === "UsersComponent.jsx") {
    out = out.replace(
      /function UsersComponent\(\)\s*\{/,
      `function UsersComponent() {
  const {
    usersSlice: {
      fetchUsers,
      deleteUser,
      selectUsers,
      selectUsersLoading,
      selectUsersError,
      selectDeleteLoading,
      selectDeleteError,
      clearDeleteError,
    },
    ConfirmDialog,
    SidebarItems,
    getVisibleSidebarItems,
    getVisibleSidebarItemsWithPaths,
    UseAuth,
  } = getUsersSettingsBindings();`
    );
  }

  if (fileName === "CreateUser.jsx") {
    out = out.replace(
      /function CreateUser\(/,
      `function CreateUser(`
    );
    out = out.replace(
      /const CreateUser = \(/,
      `const CreateUser = (`
    );
    out = out.replace(
      /(function CreateUser\([^)]*\)\s*\{)/,
      `$1
  const {
    createUserSlice: {
      createUser,
      resetCreateState,
      selectCreateLoading,
      selectCreateError,
      selectCreateSuccess,
    },
    floorSlice: { fetchFloors, selectFloors },
  } = getUsersSettingsBindings();`
    );
  }

  if (fileName === "UpdateUser.jsx") {
    out = out.replace(
      /(function UpdateUser\([^)]*\)\s*\{)/,
      `$1
  const {
    usersSlice: {
      updateUser,
      clearUpdateError,
      selectUpdateLoading,
    },
    floorSlice: { fetchFloors, selectFloors },
  } = getUsersSettingsBindings();
  const {
    apiToPermissionLabel,
    buildUserPatchBody,
    hasUserUpdateChanges,
    serializeFloorsSelection,
  } = require('./userUpdatePayload');`
    );
    out = out.replace(
      /const \{\s*apiToPermissionLabel[\s\S]*?\} = require\('\.\/userUpdatePayload'\);\s*\n\s*const \{\s*apiToPermissionLabel[\s\S]*?from "\.\/userUpdatePayload";/,
      ""
    );
  }

  return out;
}

function transformScheduleSource(src, fileName) {
  let out = src;
  const stripPatterns = [
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/redux\/slice\/schedule\/scheduleSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/customhooks\/UseAuth['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/redux\/slice\/auth\/userlogin['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/redux\/slice\/floor\/floorSlice['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/utils\/FeedbackUI['"];?\s*\n?/g,
    /import\s+\{[^}]+\}\s+from\s+['"]\.\.\/\.\.\/BaseUrl['"];?\s*\n?/g,
    /import AreaTreeDialog from ['"]\.\.\/quickcontrols\/AreaTreeDialog['"];?\s*\n?/g,
    /import Action from ['"]\.\.\/quickcontrols\/Action['"];?\s*\n?/g,
  ];
  for (const p of stripPatterns) out = out.replace(p, "");

  if (!out.includes("getScheduleSettingsBindings")) {
    out = `import { getScheduleSettingsBindings } from './bindScheduleSettingsModule';\n${out}`;
  }

  const bindingBlock = `
  const {
    scheduleSlice,
    UseAuth,
    userlogin: { selectProfile },
    floorSlice: { fetchFloors, selectFloors },
    FeedbackUI: { ConfirmDialog, Toast },
    quickcontrols: { AreaTreeDialog, Action },
    BaseUrl,
  } = getScheduleSettingsBindings();
  const {
    fetchSchedules,
    fetchScheduleGroups,
    fetchScheduleDetails,
    deleteSchedule,
    updateSchedule,
    createSchedule,
    selectSchedules,
    selectScheduleGroups,
    selectScheduleDetails,
    selectScheduleLoading,
    selectScheduleError,
  } = scheduleSlice;
`;

  if (fileName === "ScheduleComponent.jsx") {
    out = out.replace(/const ScheduleComponent = \(\) => \{/, `const ScheduleComponent = () => {${bindingBlock}`);
    out = out.replace(/function ScheduleComponent\(\)\s*\{/, `function ScheduleComponent() {${bindingBlock}`);
  }

  if (fileName === "ScheduleDetails.jsx") {
    out = out.replace(/const ScheduleDetails = \(\) => \{/, `const ScheduleDetails = () => {${bindingBlock}`);
    out = out.replace(/function ScheduleDetails\(\)\s*\{/, `function ScheduleDetails() {${bindingBlock}`);
  }

  if (fileName === "AddEvent.jsx" || fileName === "UpdatePreconfigurdEvent.jsx") {
    out = out.replace(/const \w+ = \(\) => \{/, (m) => `${m}${bindingBlock}`);
  }

  if (fileName === "ScheduleFormPanel.jsx") {
    out = out.replace(/const ScheduleFormPanel = /, `const ScheduleFormPanel = `);
    out = out.replace(/function ScheduleFormPanel\(/, `function ScheduleFormPanel(`);
    out = out.replace(
      /(function ScheduleFormPanel\([^)]*\)\s*\{)/,
      `$1${bindingBlock}`
    );
    out = out.replace(
      /(const ScheduleFormPanel = \([^)]*\) => \{)/,
      `$1${bindingBlock}`
    );
  }

  return out;
}

const userScreens = ["UsersComponent.jsx", "CreateUser.jsx", "UpdateUser.jsx"];
for (const f of userScreens) {
  const src = read(`src/shared/settings/_source/users/${f}`);
  write(`src/shared/settings/users/${f}`, transformUsersSource(src, f));
  stats.consolidated.push(`src/shared/settings/users/${f}`);
}

const scheduleScreens = [
  "ScheduleComponent.jsx",
  "ScheduleFormPanel.jsx",
  "ScheduleDetails.jsx",
  "AddEvent.jsx",
  "UpdatePreconfigurdEvent.jsx",
];
for (const f of scheduleScreens) {
  const src = read(`src/shared/settings/_source/schedule/${f}`);
  write(`src/shared/settings/schedule/${f}`, transformScheduleSource(src, f));
  stats.consolidated.push(`src/shared/settings/schedule/${f}`);
}

// Fix UpdateUser payload import to ES module
let updateUserSrc = read("src/shared/settings/users/UpdateUser.jsx");
updateUserSrc = updateUserSrc.replace(
  /const \{\s*apiToPermissionLabel[\s\S]*?\} = require\('\.\/userUpdatePayload'\);/,
  `import {
  apiToPermissionLabel,
  buildUserPatchBody,
  hasUserUpdateChanges,
  serializeFloorsSelection,
} from './userUpdatePayload';`
);
updateUserSrc = updateUserSrc.replace(
  /import \{\s*apiToPermissionLabel[\s\S]*?\} from '\.\/userUpdatePayload';\s*\nimport \{\s*apiToPermissionLabel[\s\S]*?\} from '\.\/userUpdatePayload';/,
  `import {
  apiToPermissionLabel,
  buildUserPatchBody,
  hasUserUpdateChanges,
  serializeFloorsSelection,
} from './userUpdatePayload';`
);
write("src/shared/settings/users/UpdateUser.jsx", updateUserSrc);

// Fix CreateUser - inject binding at function start
let createUserSrc = read("src/shared/settings/users/CreateUser.jsx");
if (!createUserSrc.includes("getUsersSettingsBindings()")) {
  createUserSrc = createUserSrc.replace(
    /function CreateUser\(\{([^}]*)\}\)\s*\{/,
    `function CreateUser({$1}) {
  const {
    createUserSlice: {
      createUser,
      resetCreateState,
      selectCreateLoading,
      selectCreateError,
      selectCreateSuccess,
    },
    floorSlice: { fetchFloors, selectFloors },
  } = getUsersSettingsBindings();`
  );
}
write("src/shared/settings/users/CreateUser.jsx", createUserSrc);

function writeUsersBindAndReexport(variant) {
  const usersDir = `src/variants/${variant}/screens/settings/Users`;
  const scheduleDir = `src/variants/${variant}/screens/schedule`;
  const bindUsersPath = relImport(`${usersDir}/UsersComponent.jsx`, "src/shared/settings/users/bindUsersSettingsModule.js");
  const bindSchedPath = relImport(`${scheduleDir}/ScheduleComponent.jsx`, "src/shared/settings/schedule/bindScheduleSettingsModule.js");

  const usersBindBody =
    variant === "advanced"
      ? `import * as usersSlice from '../../../redux/slice/settingsslice/user/usersSlice';
import * as createUserSlice from '../../../redux/slice/settingsslice/createUserSlice';
import * as floorSlice from '../../../redux/slice/floor/floorSlice';
import { ConfirmDialog } from '../../../utils/FeedbackUI';
import { SidebarItems, getVisibleSidebarItems } from '../../../utils/sidebarItems';
import { getVisibleSidebarItemsWithPaths, UseAuth } from '../../../customhooks/UseAuth';
import { bindUsersSettingsModule } from '${bindUsersPath}';

bindUsersSettingsModule({
  usersSlice,
  createUserSlice,
  floorSlice,
  ConfirmDialog,
  SidebarItems,
  getVisibleSidebarItems,
  getVisibleSidebarItemsWithPaths,
  UseAuth,
});`
      : `import * as usersSlice from '../../../redux/slice/settingsslice/user/usersSlice';
import * as createUserSlice from '../../../redux/slice/settingsslice/createUserSlice';
import * as floorSlice from '../../../redux/slice/floor/floorSlice';
import { ConfirmDialog } from '../../../utils/FeedbackUI';
import { SidebarItems, getVisibleSidebarItems } from '../../../utils/sidebarItems';
import { getVisibleSidebarItemsWithPaths, UseAuth } from '../../../customhooks/UseAuth';
import { bindUsersSettingsModule } from '${bindUsersPath}';

bindUsersSettingsModule({
  usersSlice,
  createUserSlice,
  floorSlice,
  ConfirmDialog,
  SidebarItems,
  getVisibleSidebarItems,
  getVisibleSidebarItems,
  getVisibleSidebarItemsWithPaths,
  UseAuth,
});`;

  for (const f of userScreens) {
    const wp = `${usersDir}/${f}`;
    const sharedRel = relImport(wp, `src/shared/settings/users/${f}`);
    write(
      wp,
      `/** Phase 5.2 — bind variant deps then re-export shared screen */
${usersBindBody}

export { default } from "${sharedRel}";
`
    );
    stats.wrappers.push(wp);
  }

  const schedBind = `import * as scheduleSlice from '../../redux/slice/schedule/scheduleSlice';
import { UseAuth } from '../../customhooks/UseAuth';
import * as userlogin from '../../redux/slice/auth/userlogin';
import * as floorSlice from '../../redux/slice/floor/floorSlice';
import * as FeedbackUI from '../../utils/FeedbackUI';
import * as quickcontrols from '../../screens/quickcontrols/AreaTreeDialog';
import Action from '../../screens/quickcontrols/Action';
import { BaseUrl } from '../../BaseUrl';
import { bindScheduleSettingsModule } from '${bindSchedPath}';

bindScheduleSettingsModule({
  scheduleSlice,
  UseAuth,
  userlogin,
  floorSlice,
  FeedbackUI,
  quickcontrols: { AreaTreeDialog: quickcontrols.default, Action },
  BaseUrl,
});`;

  for (const f of scheduleScreens) {
    const wp = `${scheduleDir}/${f}`;
    const sharedRel = relImport(wp, `src/shared/settings/schedule/${f}`);
    write(
      wp,
      `/** Phase 5.2 — bind variant deps then re-export shared screen */
${schedBind}

export { default } from "${sharedRel}";
`
    );
    stats.wrappers.push(wp);
  }
}

for (const v of VARIANTS) writeUsersBindAndReexport(v);

write(
  "src/shared/settings/users/index.js",
  `export * from "./userUpdatePayload";
export { bindUsersSettingsModule, getUsersSettingsBindings } from "./bindUsersSettingsModule";
export { default as UsersComponent } from "./UsersComponent";
export { default as CreateUser } from "./CreateUser";
export { default as UpdateUser } from "./UpdateUser";
`
);

write(
  "src/shared/settings/schedule/index.js",
  `export { bindScheduleSettingsModule, getScheduleSettingsBindings } from "./bindScheduleSettingsModule";
export { default as ScheduleComponent } from "./ScheduleComponent";
export { default as ScheduleFormPanel } from "./ScheduleFormPanel";
export { default as ScheduleDetails } from "./ScheduleDetails";
export { default as AddEvent } from "./AddEvent";
export { default as UpdatePreconfigurdEvent } from "./UpdatePreconfigurdEvent";
`
);

write(
  "src/shared/settings/index.js",
  `export * from "./users";
export * from "./schedule";
`
);

write(
  "scripts/phase52-stats.json",
  JSON.stringify({ consolidated: stats.consolidated, wrappers: stats.wrappers, wrapperCount: stats.wrappers.length }, null, 2)
);

console.log("Phase 5.2 users/schedule migration:", stats.consolidated.length, "shared,", stats.wrappers.length, "wrappers");
