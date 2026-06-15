/**
 * Widgets: add custom graphs, dashboard visibility, inline edit.
 * Built-in widgets: visibility switch + rename (no delete). Custom widgets: checkbox + delete.
 * Role-based sidebar: getVisibleSidebarItemsWithPaths (UseAuth).
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
    Grid, Box, Typography, FormControl, Select, MenuItem, TextField, Button,
    Snackbar,
    Alert,
    IconButton,
    Tooltip,
    Chip,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SettingsSidebar from "../../../components/SettingsSidebar";
// import { getApiFromKeyword } from "../../../redux/slice/settingsslice/heatmap/groupOccupancySlice";
import { useDispatch, useSelector, useStore } from "react-redux";
import {
    fetchRenameWidgets,
    getWidgetList,
    Widget,
    fetchCustomGraphs,
    fetchAreaGroups,
    createCustomGraph,
    DUPLICATE_CUSTOM_GRAPH_NAME_MSG,
    getBuiltinWidgetDefaultApiPath,
    BUILTIN_WIDGET_DEFAULT_API_PATHS,
    getApiFromKeyword,
    validateKeywordConflictForGraph,
    buildPeerGraphDescriptorsForKeywordValidation,
    selectCustomGraphs,
    selectCustomGraphsLoading,
    selectCustomGraphsError,
    selectRenameWidgetLoading,
    selectRenameWidgetError,
    clearRenameWidgetError,
} from "../../../redux/slice/settingsslice/heatmap/groupOccupancySlice";
import { UseAuth, getVisibleSidebarItemsWithPaths } from "../../../customhooks/UseAuth";
import { selectProfile } from "../../../redux/slice/auth/userlogin";
import { selectCustomWidgetFilters } from "../../../redux/slice/dashboard/dashboardSlice";
import { Checkbox, FormControlLabel, Switch } from "@mui/material";
import {
    readBuiltinWidgetOverrides,
    setBuiltinWidgetOverride,
    clearBuiltinWidgetOverride,
    normalizeBuiltinApiPath,
} from "../../../utils/builtinWidgetOverrides";
import {
    getEffectiveBuiltinDashboardPage,
    setBuiltinWidgetDashboardPage,
    defaultBuiltinDashboardPage,
} from "../../../utils/builtinWidgetDashboardPage";
import CustomGraphScopeSection from "./CustomGraphScopeSection";
import CustomGraphScopedGroupPicker from "./CustomGraphScopedGroupPicker";
import {
    pickCustomGraphScopeForStorage,
    readCustomGraphScopeDraft,
} from "../../../utils/mergeCustomGraphScopeIntoApiParams";
import { isCustomGraphGroupScope } from "../../../utils/filterGroupIdsByAreaGroupScope";

export default function RenameWidget() {
    const dispatch = useDispatch();
    const store = useStore();
    const widgetList = useSelector(getWidgetList);
    const renameLoading = useSelector(selectRenameWidgetLoading);
    const renameError = useSelector(selectRenameWidgetError);
    const customGraphs = useSelector(selectCustomGraphs);
    const customGraphsLoading = useSelector(selectCustomGraphsLoading);
    const customGraphsError = useSelector(selectCustomGraphsError);
    const customWidgetFilters = useSelector(selectCustomWidgetFilters);
    const theme = useTheme();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [errorSnackbarOpen, setErrorSnackbarOpen] = useState(false);
    const [areaSnackbarOpen, setAreaSnackbarOpen] = useState(false);
    const [customGraphSnackbarOpen, setCustomGraphSnackbarOpen] = useState(false);
    const [customGraphErrorOpen, setCustomGraphErrorOpen] = useState(false);
    const [customGraphErrorMessage, setCustomGraphErrorMessage] = useState("");

    const [customGraphOpen, setCustomGraphOpen] = useState(false);
    const [customGraphPage, setCustomGraphPage] = useState("energy");
    const [customGraphType, setCustomGraphType] = useState("bar");
    const [customGraphName, setCustomGraphName] = useState("");
    const [customGraphApiPath, setCustomGraphApiPath] = useState("");
    const [customGraphScopeMode, setCustomGraphScopeMode] = useState("inherit");
    const [customGraphScopeDraft, setCustomGraphScopeDraft] = useState({
        floor_ids: [],
        area_ids: [],
    });
    const [customGraphScopeTarget, setCustomGraphScopeTarget] = useState("location"); // 'location' or 'group'
    /** Optional subset of area group ids when target is 'group' (stored as `custom_area_group_ids`). */
    const [customGraphAreaGroupIds, setCustomGraphAreaGroupIds] = useState([]);
    /** Optional: restrict by-group APIs to special vs user groups (see filterGroupIdsByAreaGroupScope). */
    const [customGraphGroupScope, setCustomGraphGroupScope] = useState("");
    /** Optional subset of group ids when scope is set (stored as `scoped_group_ids`). */
    const [customGraphScopedGroupIds, setCustomGraphScopedGroupIds] = useState([]);

    /** Unified edit dialog (built-in + custom) */
    const [graphEditOpen, setGraphEditOpen] = useState(false);
    const [graphEditIsCustom, setGraphEditIsCustom] = useState(false);
    const [graphEditBuiltinKey, setGraphEditBuiltinKey] = useState("");
    const [graphEditCustomId, setGraphEditCustomId] = useState("");
    const [graphEditName, setGraphEditName] = useState("");
    const [graphEditPage, setGraphEditPage] = useState("energy");
    const [graphEditGraphType, setGraphEditGraphType] = useState("bar");
    const [graphEditApiPath, setGraphEditApiPath] = useState("");
    const [graphEditScopeMode, setGraphEditScopeMode] = useState("inherit");
    const [graphEditScopeDraft, setGraphEditScopeDraft] = useState({
        floor_ids: [],
        area_ids: [],
    });
    const [graphEditScopeTarget, setGraphEditScopeTarget] = useState("location"); // 'location' or 'group'
    /** Optional subset of area group ids when target is 'group' (stored as `custom_area_group_ids`). */
    const [graphEditAreaGroupIds, setGraphEditAreaGroupIds] = useState([]);
    const [graphEditGroupScope, setGraphEditGroupScope] = useState("");
    const [graphEditScopedGroupIds, setGraphEditScopedGroupIds] = useState([]);

    const [deleteGraphOpen, setDeleteGraphOpen] = useState(false);
    const [deleteGraphId, setDeleteGraphId] = useState("");

    // Get current user role for sidebar filtering
    const { role: currentUserRole } = UseAuth();
    const userProfile = useSelector(selectProfile);
    const visibleSidebarItemsWithPaths = getVisibleSidebarItemsWithPaths(currentUserRole, userProfile);

    // Fallback labels if API is missing
    const widgetTitlesFallback = {
        savings_by_strategy: "Savings by Strategy",
        total_consumption_by_group: "Consumption By Area Groups",
        consumption_by_area_groups: "Consumption By Area Groups",
        light_power_density: "Light Power Density",
        consumption: "Consumption",
        savings: "Savings",
        peak_and_minimum_consumption: "Peak And Minimum Consumption",
        utilization: "Utilization",
        instant_occupancy_count: "Instant Occupancy Count",
        utilization_by_area_group: "Utilization By Area Group",
        utilization_by_area: "Utilization By Area",
        peak_and_minimum_utilization: "Peak And Minimum Utilization",
    };

    const humanizeWidgetKey = useCallback((key) => {
        return String(key)
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
    }, []);

    const formatApiPathLabel = useCallback((apiPath) => {
        const s = String(apiPath ?? "")
            .trim()
            .split("?")[0]
            .split("#")[0]
            .replace(/^\/+/, "")
            .replace(/^dashboard\/?/i, "")
            .replace(/\//g, " ")
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        if (!s) return String(apiPath ?? "");
        return s.replace(/\b\w/g, (c) => c.toUpperCase());
    }, []);

    const items = useMemo(() => {
        const arr = Array.isArray(widgetList?.titles)
            ? widgetList.titles
            : Array.isArray(widgetList)
                ? widgetList
                : [];
        const normalizedItems = arr.map((t) => ({
            key: t.key != null ? String(t.key) : "",
            title: t.title,
            dropdown_name: t.title ?? t.dropdown_name,
        }));
        return normalizedItems.filter((x) => x.key);
    }, [widgetList]);

    const normalizeWidgetKey = (key) => String(key);

    const energyKeys = useMemo(
        () =>
            new Set([
                "savings_by_strategy",
                "total_consumption_by_group",
                "consumption_by_area_groups",
                "consumption",
                "savings",
                "light_power_density",
                "peak_and_minimum_consumption",
            ]),
        []
    );

    const spaceKeys = useMemo(
        () =>
            new Set([
                "utilization",
                "instant_occupancy_count",
                "utilization_by_area_group",
                "peak_and_minimum_utilization",
                "utilization_by_area",
            ]),
        []
    );

    const parseWidgetVisibilityFromLocalStorage = () => {
        try {
            const raw = localStorage.getItem("widgetVisibility");
            const obj = raw ? JSON.parse(raw) : null;
            return obj && typeof obj === "object" ? obj : {};
        } catch {
            return {};
        }
    };

    const [widgetVisibility, setWidgetVisibility] = useState(() =>
        parseWidgetVisibilityFromLocalStorage()
    );

    /** Re-run built-in row filters when dashboard page assignment (Energy vs Space) changes */
    const [builtinDashboardPageTick, setBuiltinDashboardPageTick] = useState(0);

    const [energySelected, setEnergySelected] = useState([]);
    const [spaceSelected, setSpaceSelected] = useState([]);
    const energySelectedRef = useRef([]);
    const spaceSelectedRef = useRef([]);

    useEffect(() => {
        energySelectedRef.current = energySelected;
    }, [energySelected]);
    useEffect(() => {
        spaceSelectedRef.current = spaceSelected;
    }, [spaceSelected]);

    useEffect(() => {
        const onPage = () => setBuiltinDashboardPageTick((t) => t + 1);
        window.addEventListener("builtinWidgetDashboardPageUpdated", onPage);
        return () => window.removeEventListener("builtinWidgetDashboardPageUpdated", onPage);
    }, []);

    const defaultTitleForKey = (key) =>
        widgetTitlesFallback[key] || humanizeWidgetKey(key);

    const isNewCustomGraphNameDuplicate = useCallback(
        (rawName) => {
            const nameNorm = String(rawName ?? "").trim().toLowerCase();
            if (!nameNorm) return false;
            const list = Array.isArray(customGraphs) ? customGraphs : [];
            if (list.some((g) => String(g?.name ?? "").trim().toLowerCase() === nameNorm)) {
                return true;
            }
            // Source of truth: custom graphs are stored in localStorage. Redux may be stale/not yet loaded.
            try {
                const raw = localStorage.getItem("customGraphs");
                const parsed = raw ? JSON.parse(raw) : [];
                const localList = Array.isArray(parsed) ? parsed : [];
                if (
                    localList.some(
                        (g) => String(g?.name ?? "").trim().toLowerCase() === nameNorm
                    )
                ) {
                    return true;
                }
            } catch {
                // ignore parse errors
            }
            const unionKeys = [...new Set([...energyKeys, ...spaceKeys])];
            for (const k of unionKeys) {
                const row = items.find((i) => i.key === k);
                const display = row
                    ? String(row.title ?? row.dropdown_name ?? "").trim()
                    : widgetTitlesFallback[k] || humanizeWidgetKey(k);
                if (String(display).trim().toLowerCase() === nameNorm) return true;
            }
            return false;
        },
        [customGraphs, items, energyKeys, spaceKeys, humanizeWidgetKey]
    );

    const getDefaultApiPathForBuiltInWidgetKey = (widgetKey) =>
        getBuiltinWidgetDefaultApiPath(normalizeWidgetKey(widgetKey));

    const apiPathDropdownOptions = useMemo(() => {
        const fromBuiltin = Object.values(BUILTIN_WIDGET_DEFAULT_API_PATHS || {}).filter(Boolean);
        const extras = [
            "/dashboard/unified_energy_consumption_savings_data",
            "/dashboard/peak_min_occupancy",
        ];
        const all = Array.from(new Set([...fromBuiltin, ...extras].map((p) => String(p).trim()).filter(Boolean)));
        all.sort((a, b) => a.localeCompare(b));
        return all;
    }, []);

    const openGraphEdit = (row) => {
        dispatch(clearRenameWidgetError());
        dispatch(fetchAreaGroups());
        if (row?.isCustom && row?.graph) {
            const g = row.graph;
            setGraphEditIsCustom(true);
            setGraphEditBuiltinKey("");
            setGraphEditCustomId(String(g?.id ?? ""));
            setGraphEditName(String(g?.name ?? ""));
            setGraphEditPage(String(g?.page ?? "energy"));
            setGraphEditGraphType(String(g?.graph_type ?? "bar"));
            setGraphEditApiPath(String(g?.api_path ?? "").trim());
            const scopeDraft = readCustomGraphScopeDraft(g);
            const hasScope =
                scopeDraft.floor_ids.length > 0 || scopeDraft.area_ids.length > 0;
            setGraphEditScopeMode(hasScope ? "custom" : "inherit");
            setGraphEditScopeDraft(
                hasScope ? scopeDraft : { floor_ids: [], area_ids: [] }
            );
            setGraphEditGroupScope(
                isCustomGraphGroupScope(g?.group_scope) ? g.group_scope : ""
            );
            setGraphEditScopedGroupIds(
                Array.isArray(g?.scoped_group_ids) ? g.scoped_group_ids.slice() : []
            );
            setGraphEditScopeTarget(g?.is_area_group_widget ? "group" : "location");
            setGraphEditAreaGroupIds(Array.isArray(g?.custom_area_group_ids) ? g.custom_area_group_ids.slice() : []);
            setGraphEditOpen(true);
            return;
        }
        const key = String(row?.key ?? "");
        if (!key) return;
        setGraphEditIsCustom(false);
        setGraphEditCustomId("");
        setGraphEditBuiltinKey(key);
        const full = items.find((x) => normalizeWidgetKey(x.key) === normalizeWidgetKey(key));
        setGraphEditName(
            String(full?.dropdown_name ?? row?.dropdown_name ?? row?.title ?? "").trim() ||
            defaultTitleForKey(key)
        );
        setGraphEditPage(getEffectiveBuiltinDashboardPage(key));
        const ov = readBuiltinWidgetOverrides()[key];
        setGraphEditGraphType(String(ov?.graph_type || "line"));
        const computedApiPath = ov?.api_path?.trim()
            ? String(ov.api_path)
            : getDefaultApiPathForBuiltInWidgetKey(key);

        setGraphEditApiPath(String(computedApiPath || ""));
        const builtinScopeDraft = readCustomGraphScopeDraft(ov);
        const builtinHasScope =
            builtinScopeDraft.floor_ids.length > 0 || builtinScopeDraft.area_ids.length > 0;
        setGraphEditScopeMode(builtinHasScope ? "custom" : "inherit");
        setGraphEditScopeDraft(
            builtinHasScope ? builtinScopeDraft : { floor_ids: [], area_ids: [] }
        );
        setGraphEditGroupScope(isCustomGraphGroupScope(ov?.group_scope) ? ov.group_scope : "");
        setGraphEditScopedGroupIds(
            Array.isArray(ov?.scoped_group_ids) ? ov.scoped_group_ids.slice() : []
        );
        setGraphEditScopeTarget("location");
        setGraphEditAreaGroupIds([]);
        setGraphEditOpen(true);
    };

    const handleSaveGraphEdit = async () => {
        if (!graphEditName.trim()) return;
        if (graphEditIsCustom) {
            if (!graphEditCustomId) return;
            try {
                const trimmedName = graphEditName.trim();
                const durationType = String(graphEditPage).toLowerCase().includes("space")
                    ? "week"
                    : "day";
                const resolvedAp =
                    graphEditApiPath.trim() ||
                    getApiFromKeyword(trimmedName, durationType, graphEditPage);
                const peers = buildPeerGraphDescriptorsForKeywordValidation(store.getState(), {
                    excludeCustomGraphId: graphEditCustomId,
                });
                const kw = validateKeywordConflictForGraph(trimmedName, resolvedAp, peers);
                if (!kw.isValid) {
                    setCustomGraphErrorMessage(kw.message);
                    setCustomGraphErrorOpen(true);
                    return;
                }
                const storageKey = "customGraphs";
                const raw = localStorage.getItem(storageKey);
                const parsed = raw ? JSON.parse(raw) : [];
                const list = Array.isArray(parsed) ? parsed : [];
                const nextList = list.map((g) => {
                    if (String(g?.id ?? "") !== String(graphEditCustomId)) return g;
                    const updated = {
                        ...g,
                        page: graphEditPage,
                        graph_type: graphEditGraphType,
                        name: trimmedName,
                    };
                    const ap = graphEditApiPath.trim();
                    if (ap) {
                        updated.api_path = ap.startsWith("/") ? ap : `/dashboard/${ap.replace(/^\/+/, "")}`;
                    } else {
                        delete updated.api_path;
                    }
                    // Clean up existing scope settings
                    delete updated.floor_ids;
                    delete updated.area_ids;
                    delete updated.is_area_group_widget;
                    delete updated.custom_area_group_ids;

                    if (graphEditScopeTarget === "group") {
                        updated.is_area_group_widget = true;
                        updated.custom_area_group_ids = graphEditAreaGroupIds.slice();
                    } else if (graphEditScopeMode === "custom") {
                        Object.assign(
                            updated,
                            pickCustomGraphScopeForStorage(graphEditScopeDraft)
                        );
                    }

                    delete updated.group_scope;
                    delete updated.scoped_group_ids;
                    if (isCustomGraphGroupScope(graphEditGroupScope)) {
                        updated.group_scope = graphEditGroupScope;
                        if (graphEditScopedGroupIds.length > 0) {
                            updated.scoped_group_ids = graphEditScopedGroupIds.slice();
                        }
                    }
                    return updated;
                });
                localStorage.setItem(storageKey, JSON.stringify(nextList));
                await dispatch(fetchCustomGraphs()).unwrap();
                window.dispatchEvent(new CustomEvent("customGraphsUpdated"));
                setCustomGraphVisibilityEnabled(graphEditPage, graphEditCustomId);
                setGraphEditOpen(false);
                setSnackbarOpen(true);
            } catch (e) {
                const msg =
                    typeof e === "string"
                        ? e
                        : e && typeof e === "object"
                            ? JSON.stringify(e)
                            : "Failed to edit graph";
                setCustomGraphErrorMessage(msg);
                setCustomGraphErrorOpen(true);
            }
            return;
        }
        if (!graphEditBuiltinKey) return;
        const defPage = defaultBuiltinDashboardPage(graphEditBuiltinKey);
        if (graphEditPage !== defPage) {
            const ap = graphEditApiPath.trim();
            const gt = graphEditGraphType.trim();
            if (!ap || !gt) {
                setCustomGraphErrorMessage(
                    "To move a chart between Energy and Space, set both API path and graph type (e.g. line, bar, pie). Defaults are filled when you open Edit again after this update."
                );
                setCustomGraphErrorOpen(true);
                return;
            }
        }
        const trimmedBuiltinName = graphEditName.trim();
        const resolvedBuiltinAp = normalizeBuiltinApiPath(
            graphEditApiPath.trim() ||
            getDefaultApiPathForBuiltInWidgetKey(graphEditBuiltinKey)
        );
        const builtinPeers = buildPeerGraphDescriptorsForKeywordValidation(store.getState(), {
            excludeBuiltinWidgetKey: graphEditBuiltinKey,
        });
        const builtinKw = validateKeywordConflictForGraph(
            trimmedBuiltinName,
            resolvedBuiltinAp,
            builtinPeers
        );
        if (!builtinKw.isValid) {
            setCustomGraphErrorMessage(builtinKw.message);
            setCustomGraphErrorOpen(true);
            return;
        }
        dispatch(clearRenameWidgetError());
        try {
            const prevEffectivePage = getEffectiveBuiltinDashboardPage(graphEditBuiltinKey);
            await dispatch(
                Widget({
                    widget_key: String(graphEditBuiltinKey),
                    new_name: trimmedBuiltinName,
                    resolved_api_path_for_validation: resolvedBuiltinAp,
                })
            ).unwrap();
            await dispatch(fetchRenameWidgets()).unwrap();
            window.dispatchEvent(new CustomEvent("widgetTitlesUpdated"));
            setBuiltinWidgetDashboardPage(graphEditBuiltinKey, graphEditPage);
            const ap = normalizeBuiltinApiPath(graphEditApiPath.trim());
            const gt = graphEditGraphType.trim();
            if (ap && gt) {
                const scopeFields =
                    graphEditScopeMode === "custom"
                        ? pickCustomGraphScopeForStorage(graphEditScopeDraft)
                        : {};
                setBuiltinWidgetOverride(graphEditBuiltinKey, {
                    graph_type: gt,
                    api_path: ap,
                    ...scopeFields,
                    ...(isCustomGraphGroupScope(graphEditGroupScope)
                        ? { group_scope: graphEditGroupScope }
                        : {}),
                    ...(isCustomGraphGroupScope(graphEditGroupScope) && graphEditScopedGroupIds.length > 0
                        ? { scoped_group_ids: graphEditScopedGroupIds.slice() }
                        : {}),
                });
            } else {
                clearBuiltinWidgetOverride(graphEditBuiltinKey);
            }
            const nextEffectivePage = getEffectiveBuiltinDashboardPage(graphEditBuiltinKey);
            if (prevEffectivePage !== nextEffectivePage) {
                const nk = normalizeWidgetKey(graphEditBuiltinKey);
                setEnergySelected((prevE) => {
                    let nextE = [...prevE];
                    let nextS = [...spaceSelectedRef.current];
                    if (nextEffectivePage === "energy") {
                        if (!nextE.includes(nk)) nextE.push(nk);
                        nextS = nextS.filter((x) => x !== nk);
                    } else {
                        if (!nextS.includes(nk)) nextS.push(nk);
                        nextE = nextE.filter((x) => x !== nk);
                    }
                    setSpaceSelected(nextS);
                    persistWidgetVisibility(nextE, nextS);
                    return nextE;
                });
            }
            setBuiltinDashboardPageTick((t) => t + 1);
            setGraphEditOpen(false);
            setSnackbarOpen(true);
        } catch {
            setErrorSnackbarOpen(true);
        }
    };

    const handleCheckboxRowEdit = (row) => {
        openGraphEdit(row);
    };

    const handleCheckboxRowDelete = (row) => {
        if (row?.isCustom && row?.graph) {
            openDeleteGraph(row.graph?.id);
        }
    };

    const handleBuiltinVisibilitySwitch = (row, checked) => {
        const normKey = normalizeWidgetKey(row.key);
        if (row.section === "energy") {
            setEnergySelected((prev) => {
                const next = checked
                    ? prev.includes(normKey)
                        ? prev
                        : [...prev, normKey]
                    : prev.filter((item) => item !== normKey);
                persistWidgetVisibility(next, spaceSelectedRef.current);
                return next;
            });
        } else {
            setSpaceSelected((prev) => {
                const next = checked
                    ? prev.includes(normKey)
                        ? prev
                        : [...prev, normKey]
                    : prev.filter((item) => item !== normKey);
                persistWidgetVisibility(energySelectedRef.current, next);
                return next;
            });
        }
    };

    const energyItems = useMemo(
        () =>
            items.filter((x) => {
                const k = normalizeWidgetKey(x.key);
                if (!energyKeys.has(k) && !spaceKeys.has(k)) return false;
                return getEffectiveBuiltinDashboardPage(k) === "energy";
            }),
        [items, energyKeys, spaceKeys, builtinDashboardPageTick]
    );
    const spaceItems = useMemo(
        () =>
            items.filter((x) => {
                const k = normalizeWidgetKey(x.key);
                if (!energyKeys.has(k) && !spaceKeys.has(k)) return false;
                return getEffectiveBuiltinDashboardPage(k) === "space";
            }),
        [items, energyKeys, spaceKeys, builtinDashboardPageTick]
    );

    const customEnergyWidgetKeys = useMemo(() => {
        const list = Array.isArray(customGraphs) ? customGraphs : [];
        return list
            .filter((g) => String(g?.page || "").toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-") === "energy")
            .map((g) => `custom_graph:${String(g?.id ?? "").trim()}`)
            .filter((k) => k !== "custom_graph:");
    }, [customGraphs]);

    const customSpaceWidgetKeys = useMemo(() => {
        const list = Array.isArray(customGraphs) ? customGraphs : [];
        return list
            .filter((g) => {
                const p = String(g?.page || "").toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
                return p === "space" || p === "space-utilization" || p.startsWith("space-");
            })
            .map((g) => `custom_graph:${String(g?.id ?? "").trim()}`)
            .filter((k) => k !== "custom_graph:");
    }, [customGraphs]);

    // Checkbox rows: built-in + custom; each row carries isCustom + graph for inline actions.
    const energyCheckboxRows = useMemo(() => {
        const base = energyItems.map((x) => ({
            key: normalizeWidgetKey(x.key),
            dropdown_name: x.dropdown_name,
            isCustom: false,
            graph: null,
        }));
        const list = Array.isArray(customGraphs) ? customGraphs : [];
        const extras = list
            .filter(
                (g) =>
                    String(g?.page || "")
                        .toLowerCase()
                        .replace(/_/g, "-")
                        .replace(/\s+/g, "-") === "energy"
            )
            .map((g) => ({
                key: `custom_graph:${String(g?.id ?? "").trim()}`,
                dropdown_name: g?.name || "Custom Graph",
                isCustom: true,
                graph: g,
            }))
            .filter((r) => r.key !== "custom_graph:");
        return [...base, ...extras];
    }, [energyItems, customGraphs]);

    const spaceCheckboxRows = useMemo(() => {
        const base = spaceItems.map((x) => ({
            key: normalizeWidgetKey(x.key),
            dropdown_name: x.dropdown_name,
            isCustom: false,
            graph: null,
        }));
        const list = Array.isArray(customGraphs) ? customGraphs : [];
        const extras = list
            .filter((g) => {
                const p = String(g?.page || "")
                    .toLowerCase()
                    .replace(/_/g, "-")
                    .replace(/\s+/g, "-");
                return p === "space" || p === "space-utilization" || p.startsWith("space-");
            })
            .map((g) => ({
                key: `custom_graph:${String(g?.id ?? "").trim()}`,
                dropdown_name: g?.name || "Custom Graph",
                isCustom: true,
                graph: g,
            }))
            .filter((r) => r.key !== "custom_graph:");
        return [...base, ...extras];
    }, [spaceItems, customGraphs]);

    const unifiedGraphRows = useMemo(
        () => [
            ...energyCheckboxRows.map((r) => ({ ...r, section: "energy" })),
            ...spaceCheckboxRows.map((r) => ({ ...r, section: "space" })),
        ],
        [energyCheckboxRows, spaceCheckboxRows]
    );

    const persistWidgetVisibility = (nextEnergySelected, nextSpaceSelected) => {
        const current = parseWidgetVisibilityFromLocalStorage();

        const energyMap = {};
        // Persist against canonical key lists (not the API list) so Dashboard filtering
        // works even if /widgets/widget_titles omits some keys.
        for (const k of energyKeys) {
            const key = normalizeWidgetKey(k);
            energyMap[key] = nextEnergySelected.includes(key);
        }
        // Custom graphs (Energy page)
        for (const k of customEnergyWidgetKeys) {
            energyMap[k] = nextEnergySelected.includes(k);
        }
        // Preserve any unknown custom-graph flags that aren't in the current list.
        const prevEnergy = current?.energy && typeof current.energy === "object" ? current.energy : {};
        for (const [k, v] of Object.entries(prevEnergy)) {
            if (String(k).startsWith("custom_graph:") && energyMap[k] === undefined) energyMap[k] = v;
        }
        // Keep alias keys in sync for backend + UI consistency.
        if (typeof energyMap.consumption_by_area_groups === "boolean") {
            energyMap.total_consumption_by_group = energyMap.consumption_by_area_groups;
        }
        if (typeof energyMap.total_consumption_by_group === "boolean") {
            energyMap.consumption_by_area_groups = energyMap.total_consumption_by_group;
        }

        const spaceMap = {};
        for (const k of spaceKeys) {
            const key = normalizeWidgetKey(k);
            spaceMap[key] = nextSpaceSelected.includes(key);
        }
        // Custom graphs (Space page)
        for (const k of customSpaceWidgetKeys) {
            spaceMap[k] = nextSpaceSelected.includes(k);
        }
        const prevSpace = current?.space && typeof current.space === "object" ? current.space : {};
        for (const [k, v] of Object.entries(prevSpace)) {
            if (String(k).startsWith("custom_graph:") && spaceMap[k] === undefined) spaceMap[k] = v;
        }

        // If a built-in originally belonging to Energy is moved to Space (or vice-versa),
        // we must persist it under the *destination* map as well.
        // Otherwise the later re-hydration effect reads `spaceMap`/`energyMap` and the checkbox
        // will immediately appear unchecked after saving.
        for (const selKey of nextSpaceSelected) {
            const k = normalizeWidgetKey(selKey);
            if (energyKeys.has(k) && !spaceKeys.has(k)) {
                spaceMap[k] = true;
            }
        }
        for (const selKey of nextEnergySelected) {
            const k = normalizeWidgetKey(selKey);
            if (spaceKeys.has(k) && !energyKeys.has(k)) {
                energyMap[k] = true;
            }
        }

        // Keep alias keys in sync even when alias keys are migrated into the other map.
        if (typeof spaceMap.consumption_by_area_groups === "boolean") {
            spaceMap.total_consumption_by_group = spaceMap.consumption_by_area_groups;
        }
        if (typeof spaceMap.total_consumption_by_group === "boolean") {
            spaceMap.consumption_by_area_groups = spaceMap.total_consumption_by_group;
        }

        const merged = {
            ...current,
            energy: energyMap,
            space: spaceMap,
        };

        localStorage.setItem("widgetVisibility", JSON.stringify(merged));
        setWidgetVisibility(merged);
        window.dispatchEvent(new CustomEvent("widgetVisibilityUpdated"));
    };

    const setCustomGraphVisibilityEnabled = (page, id) => {
        const widgetKey = `custom_graph:${String(id ?? "").trim()}`;
        if (!widgetKey || widgetKey === "custom_graph:") return;

        const current = parseWidgetVisibilityFromLocalStorage();
        const lowerPage = String(page || "").toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
        const isSpace = lowerPage === "space" || lowerPage === "space-utilization" || lowerPage.startsWith("space-");
        const nextEnergy = {
            ...(current?.energy && typeof current.energy === "object" ? current.energy : {}),
        };
        const nextSpace = {
            ...(current?.space && typeof current.space === "object" ? current.space : {}),
        };
        // One graph belongs to one page: remove from the other map when switching energy ↔ space.
        if (isSpace) {
            delete nextEnergy[widgetKey];
            nextSpace[widgetKey] = true;
        } else {
            delete nextSpace[widgetKey];
            nextEnergy[widgetKey] = true;
        }
        const next = { ...current, energy: nextEnergy, space: nextSpace };
        localStorage.setItem("widgetVisibility", JSON.stringify(next));
        setWidgetVisibility(next);
        // Keep checkbox UI in sync immediately (otherwise the graph appears on the dashboard
        // but the new custom graph checkbox can look unchecked until a full re-hydration).
        if (isSpace) {
            setSpaceSelected((prev) => (prev.includes(widgetKey) ? prev : [...prev, widgetKey]));
        } else {
            setEnergySelected((prev) => (prev.includes(widgetKey) ? prev : [...prev, widgetKey]));
        }
        window.dispatchEvent(new CustomEvent("widgetVisibilityUpdated"));
    };

    const deleteCustomGraphVisibility = (id) => {
        const widgetKey = `custom_graph:${String(id ?? "").trim()}`;
        if (!widgetKey || widgetKey === "custom_graph:") return;

        const current = parseWidgetVisibilityFromLocalStorage();
        const nextEnergy = { ...(current?.energy && typeof current.energy === "object" ? current.energy : {}) };
        const nextSpace = { ...(current?.space && typeof current.space === "object" ? current.space : {}) };
        delete nextEnergy[widgetKey];
        delete nextSpace[widgetKey];

        const next = { ...current, energy: nextEnergy, space: nextSpace };
        localStorage.setItem("widgetVisibility", JSON.stringify(next));
        setWidgetVisibility(next);

        // Keep checkbox UI in sync immediately.
        setEnergySelected((prev) => prev.filter((k) => String(k) !== widgetKey));
        setSpaceSelected((prev) => prev.filter((k) => String(k) !== widgetKey));

        window.dispatchEvent(new CustomEvent("widgetVisibilityUpdated"));
    };

    const handleEnergyCheckboxChange = (key) => {
        const normKey = normalizeWidgetKey(key);
        setEnergySelected((prev) => {
            const next = prev.includes(normKey)
                ? prev.filter((item) => item !== normKey)
                : [...prev, normKey];
            persistWidgetVisibility(next, spaceSelectedRef.current);
            return next;
        });
    };

    const handleSpaceCheckboxChange = (key) => {
        const normKey = normalizeWidgetKey(key);
        setSpaceSelected((prev) => {
            const next = prev.includes(normKey)
                ? prev.filter((item) => item !== normKey)
                : [...prev, normKey];
            persistWidgetVisibility(energySelectedRef.current, next);
            return next;
        });
    };

    const allWidgetKeys = useMemo(() => {
        const keys = [
            ...energyCheckboxRows.map(({ key }) => normalizeWidgetKey(key)),
            ...spaceCheckboxRows.map(({ key }) => normalizeWidgetKey(key)),
        ];
        return Array.from(new Set(keys));
    }, [energyCheckboxRows, spaceCheckboxRows]);

    const allSelected =
        allWidgetKeys.length > 0 &&
        allWidgetKeys.every(
            (k) => energySelected.includes(k) || spaceSelected.includes(k)
        );

    // Single "Select All" should behave as a strict toggle:
    // checked => select all, unchecked => unselect all.
    const handleToggleAll = (e) => {
        const checked = !!e?.target?.checked;
        if (!checked) {
            setEnergySelected([]);
            setSpaceSelected([]);
            persistWidgetVisibility([], []);
            return;
        }

        const nextEnergy = Array.from(
            new Set(energyCheckboxRows.map(({ key }) => normalizeWidgetKey(key)))
        );
        const nextSpace = Array.from(
            new Set(spaceCheckboxRows.map(({ key }) => normalizeWidgetKey(key)))
        );
        setEnergySelected(nextEnergy);
        setSpaceSelected(nextSpace);
        persistWidgetVisibility(nextEnergy, nextSpace);
    };

    const handleAreaSave = () => {
        persistWidgetVisibility(energySelectedRef.current, spaceSelectedRef.current);
        // Old key caused cross-tab conflicts; clear it.
        localStorage.removeItem("selectedWidgets");
        setAreaSnackbarOpen(true);
    };

    const handleOpenCustomGraph = () => {
        dispatch(fetchAreaGroups());
        setCustomGraphPage("energy");
        setCustomGraphType("bar");
        setCustomGraphName("");
        setCustomGraphApiPath("");
        setCustomGraphScopeMode("inherit");
        setCustomGraphScopeDraft({ floor_ids: [], area_ids: [] });
        setCustomGraphGroupScope("");
        setCustomGraphScopedGroupIds([]);
        setCustomGraphScopeTarget("location");
        setCustomGraphAreaGroupIds([]);
        setCustomGraphOpen(true);
    };

    const handleSaveCustomGraph = async () => {

        if (!customGraphName.trim()) return;
        if (isNewCustomGraphNameDuplicate(customGraphName.trim())) {
            setCustomGraphErrorMessage("Name already exists. Change the widget name.");
            setCustomGraphErrorOpen(true);
            return;
        }

        try {
            const multiFloorEnergy =
                customGraphPage === "energy" &&
                customGraphScopeMode === "custom" &&
                Array.isArray(customGraphScopeDraft.floor_ids) &&
                customGraphScopeDraft.floor_ids.length >= 2;
            const created = await dispatch(
                createCustomGraph({
                    page: customGraphPage,
                    graph_type: multiFloorEnergy ? "bar" : customGraphType,
                    name: customGraphName.trim(),
                    ...(customGraphApiPath.trim() ? { api_path: customGraphApiPath.trim() } : {}),
                    ...(customGraphScopeMode === "custom" && customGraphScopeTarget === "location"
                        ? pickCustomGraphScopeForStorage(customGraphScopeDraft)
                        : {}),
                    ...(customGraphScopeTarget === "group"
                        ? { is_area_group_widget: true, custom_area_group_ids: customGraphAreaGroupIds }
                        : {}),
                    ...(isCustomGraphGroupScope(customGraphGroupScope)
                        ? { group_scope: customGraphGroupScope }
                        : {}),
                    ...(isCustomGraphGroupScope(customGraphGroupScope) && customGraphScopedGroupIds.length > 0
                        ? { scoped_group_ids: customGraphScopedGroupIds.slice() }
                        : {}),
                })
            ).unwrap();

            await dispatch(fetchCustomGraphs()).unwrap();
            // Ensure newly created custom graph is visible by default in its page.
            setCustomGraphVisibilityEnabled(customGraphPage, created?.id);
            window.dispatchEvent(new CustomEvent("customGraphsUpdated"));
            setCustomGraphOpen(false);
            setCustomGraphSnackbarOpen(true);
        } catch (e) {
            const msg =
                typeof e === "string"
                    ? e
                    : e && typeof e === "object"
                        ? JSON.stringify(e)
                        : "Failed to add new graph";
            setCustomGraphErrorMessage(msg);
            setCustomGraphErrorOpen(true);
        }
    };

    const openDeleteGraph = (id) => {
        setDeleteGraphId(String(id ?? ""));
        setDeleteGraphOpen(true);
    };

    const handleConfirmDeleteGraph = async () => {
        if (!deleteGraphId) return;
        try {
            const storageKey = "customGraphs";
            const raw = localStorage.getItem(storageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            const list = Array.isArray(parsed) ? parsed : [];
            const nextList = list.filter((g) => String(g?.id ?? "") !== String(deleteGraphId));
            localStorage.setItem(storageKey, JSON.stringify(nextList));

            deleteCustomGraphVisibility(deleteGraphId);
            await dispatch(fetchCustomGraphs()).unwrap();
            window.dispatchEvent(new CustomEvent("customGraphsUpdated"));

            setDeleteGraphOpen(false);
        } catch (e) {
            const msg =
                typeof e === "string"
                    ? e
                    : e && typeof e === "object"
                        ? JSON.stringify(e)
                        : "Failed to delete graph";
            setCustomGraphErrorMessage(msg);
            setCustomGraphErrorOpen(true);
        }
    };


    useEffect(() => {
        // Only fetch if not already loaded
        const isEmptyArray = Array.isArray(widgetList) && widgetList.length === 0;
        const isMissingTitlesObj =
            widgetList &&
            !Array.isArray(widgetList) &&
            typeof widgetList === "object" &&
            !Array.isArray(widgetList.titles);

        if (!widgetList || isEmptyArray || isMissingTitlesObj) {
            dispatch(fetchRenameWidgets());
        }
    }, [dispatch, widgetList]);

    useEffect(() => {
        dispatch(fetchCustomGraphs());
    }, [dispatch]);

    // Monitor for rename errors
    useEffect(() => {
        if (renameError) {
            setErrorSnackbarOpen(true);
        }
    }, [renameError]);

    useEffect(() => {
        const vis = parseWidgetVisibilityFromLocalStorage();
        setWidgetVisibility(vis);

        const energyMap = vis?.energy;
        const spaceMap = vis?.space;

        // Missing or empty map => no checkboxes selected (do not default to "all selected" for both
        // sections — that caused Energy-only picks to persist Space as all true and Space showed every chart).
        const nextEnergySelected =
            energyMap && typeof energyMap === "object" && Object.keys(energyMap).length > 0
                ? Object.entries(energyMap)
                    .filter(([, v]) => v !== false)
                    .map(([k]) => normalizeWidgetKey(k))
                : [];

        const nextSpaceSelected =
            spaceMap && typeof spaceMap === "object" && Object.keys(spaceMap).length > 0
                ? Object.entries(spaceMap)
                    .filter(([, v]) => v !== false)
                    .map(([k]) => normalizeWidgetKey(k))
                : [];

        setEnergySelected(Array.from(new Set(nextEnergySelected)));
        setSpaceSelected(Array.from(new Set(nextSpaceSelected)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [energyItems.length, spaceItems.length]);

    // shared UI styles
    const controlSx = {
        "& .MuiOutlinedInput-root": {
            backgroundColor: "#fff",
            borderRadius: "8px",
            "& .MuiSelect-select, & .MuiOutlinedInput-input": {
                padding: "8px 10px",
                lineHeight: 1.4,
                fontSize: 14,
            },
            "& fieldset": { borderColor: "rgba(0,0,0,0.2)" },
            "&:hover fieldset": { borderColor: "rgba(0,0,0,0.35)" },
            "&.Mui-focused fieldset": { borderColor: "#1E1E1E", borderWidth: 1.5 },
        },
        "& input::placeholder": { opacity: 1, color: "rgba(0,0,0,0.5)" },
    };

    /** One card per widget: fixed control + chip columns, flexible title, fixed-width actions so icons line up. */
    const widgetRowCardSx = {
        display: "flex",
        alignItems: "center",
        gap: 1,
        width: "100%",
        minHeight: 52,
        py: 1,
        px: 1.25,
        borderRadius: 1.5,
        border: "1px solid rgba(255,255,255,0.1)",
        backgroundColor: "rgba(0,0,0,0.22)",
        boxSizing: "border-box",
    };

    const widgetRowControlSlotSx = {
        width: 52,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    };

    const widgetRowChipSlotSx = {
        flexShrink: 0,
        width: 80,
        display: "flex",
        justifyContent: "center",
    };

    const widgetRowTitleSx = {
        flex: 1,
        minWidth: 0,
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        lineHeight: 1.35,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
        wordBreak: "break-word",
    };

    const widgetRowActionsSx = {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: 84,
        mr: -0.5,
    };

    /** Inner track: edit + optional delete (or spacer) so the pencil lines up across built-in vs custom rows. */
    const widgetRowActionsInnerSx = {
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        width: 80,
        flexShrink: 0,
    };

    const builtinVisibilitySwitchSx = {
        flexShrink: 0,
        "& .MuiSwitch-switchBase.Mui-checked": {
            color: "#66bb6a",
            "&:hover": { backgroundColor: "rgba(102, 187, 106, 0.12)" },
        },
        "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
            backgroundColor: "#43a047",
            opacity: 1,
        },
        "& .MuiSwitch-switchBase:not(.Mui-checked)": {
            color: "rgba(255,255,255,0.45)",
        },
        "& .MuiSwitch-switchBase:not(.Mui-checked) + .MuiSwitch-track": {
            backgroundColor: "rgba(183, 28, 28, 0.45)",
            opacity: 1,
        },
    };

    return (
        <Grid container sx={{ alignItems: "flex-start", ml: '18px', p: '18px' }}>
            {/* Sidebar */}
            <Grid item xs={12} md={3}>
                <Typography variant="h6" sx={{
                    mb: { xs: 0.8, sm: 1, md: 1.5, lg: 2 },
                    color: theme.palette.text.secondary,
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    paddingTop: "18px",
                    marginBottom: 16
                }}>
                    Settings
                </Typography>
                <SettingsSidebar items={visibleSidebarItemsWithPaths} embedded />
            </Grid>

            {/* Right panel */}
            <Grid item xs={12} md={9} sx={{ p: 3, borderTopRightRadius: 2, borderBottomRightRadius: 2 }}>
                <Box sx={{ maxWidth: 1100 }}>
                    <Box sx={{ mb: 2 }}>
                        <Typography sx={{ color: "#fff", fontWeight: 600, mb: 1, fontSize: 16 }}>
                            Add Widgets
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                            <Button
                                variant="contained"
                                onClick={handleOpenCustomGraph}
                                disabled={customGraphsLoading}
                                sx={{
                                    bgcolor: "#232323",
                                    color: "#fff",
                                    textTransform: "none",
                                    "&:hover": { bgcolor: "#1E1E1E" },
                                }}
                            >
                                Add New Widget
                            </Button>
                            {customGraphsError ? (
                                <Typography sx={{ color: "#ffb3b3", fontSize: 12 }}>
                                    {typeof customGraphsError === "string"
                                        ? customGraphsError
                                        : "Failed to load custom graphs"}
                                </Typography>
                            ) : null}
                        </Box>
                    </Box>

                    <Typography sx={{ color: "#fff", fontWeight: 600, mb: 0.5 }}>
                        Select the Widgets
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.75)", fontSize: 13, mb: 2 }}>
                        Choose which charts appear on each dashboard. Built-in widgets: use the switch to show or hide,
                        and edit to rename. Custom widgets: use the checkbox and delete as before.
                    </Typography>
                    <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 12, mb: 2, lineHeight: 1.45 }}>
                        Floor and area scope for custom charts (separate from built-in widgets) is chosen on the
                        dashboard: open the Space Utilization location control, select floors or areas, then Set.
                        {customWidgetFilters &&
                        (customWidgetFilters.floor_ids?.length > 0 || customWidgetFilters.area_ids?.length > 0) ? (
                            <span>
                                {" "}
                                Current custom scope:{" "}
                                {customWidgetFilters.floor_ids?.length
                                    ? `${customWidgetFilters.floor_ids.length} floor(s)`
                                    : ""}
                                {customWidgetFilters.floor_ids?.length && customWidgetFilters.area_ids?.length
                                    ? ", "
                                    : ""}
                                {customWidgetFilters.area_ids?.length
                                    ? `${customWidgetFilters.area_ids.length} area(s)`
                                    : ""}
                                .
                            </span>
                        ) : (
                            <span> No custom floor/area scope is active.</span>
                        )}
                    </Typography>

                    <FormControlLabel
                        sx={{ mb: 1 }}
                        control={
                            <Checkbox
                                checked={allSelected}
                                onChange={handleToggleAll}
                                sx={{ color: "#fff" }}
                            />
                        }
                        label={"Select All Widgets"}
                    />

                    <Grid container spacing={1.5}>
                        {unifiedGraphRows.map((row) => (
                            <Grid item xs={12} sm={6} md={6} lg={4} key={`${row.section}:${row.key}`}>
                                <Box sx={widgetRowCardSx}>
                                    <Box sx={widgetRowControlSlotSx}>
                                        {row.isCustom ? (
                                            <Checkbox
                                                checked={
                                                    row.section === "energy"
                                                        ? energySelected.includes(normalizeWidgetKey(row.key))
                                                        : spaceSelected.includes(normalizeWidgetKey(row.key))
                                                }
                                                onChange={() =>
                                                    row.section === "energy"
                                                        ? handleEnergyCheckboxChange(row.key)
                                                        : handleSpaceCheckboxChange(row.key)
                                                }
                                                sx={{ color: "#fff", p: 0.5 }}
                                            />
                                        ) : (
                                            <Tooltip title="On: visible on dashboard. Off: hidden.">
                                                <Switch
                                                    size="small"
                                                    checked={
                                                        row.section === "energy"
                                                            ? energySelected.includes(normalizeWidgetKey(row.key))
                                                            : spaceSelected.includes(normalizeWidgetKey(row.key))
                                                    }
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        handleBuiltinVisibilitySwitch(row, e.target.checked);
                                                    }}
                                                    inputProps={{
                                                        "aria-label": `${row.dropdown_name || row.key} dashboard visibility`,
                                                    }}
                                                    sx={builtinVisibilitySwitchSx}
                                                />
                                            </Tooltip>
                                        )}
                                    </Box>
                                    <Box sx={widgetRowChipSlotSx}>
                                        <Chip
                                            label={row.section === "energy" ? "Energy" : "Space"}
                                            size="small"
                                            sx={{
                                                height: 24,
                                                minWidth: 72,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                bgcolor:
                                                    row.section === "energy"
                                                        ? "rgba(59,130,246,0.4)"
                                                        : "rgba(168,85,247,0.4)",
                                                color: "#fff",
                                                border: "1px solid rgba(255,255,255,0.14)",
                                            }}
                                        />
                                    </Box>
                                    <Typography sx={widgetRowTitleSx} title={row.dropdown_name}>
                                        {row.dropdown_name}
                                    </Typography>
                                    <Box sx={widgetRowActionsSx}>
                                        <Box sx={widgetRowActionsInnerSx}>
                                            <Tooltip title="Edit display name or graph">
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCheckboxRowEdit(row);
                                                        }}
                                                        disabled={renameLoading && !row.isCustom}
                                                        sx={{ color: "rgba(255,255,255,0.88)" }}
                                                        aria-label="Edit"
                                                    >
                                                        <EditOutlinedIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                            {row.isCustom ? (
                                                <Tooltip title="Delete this custom graph">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCheckboxRowDelete(row);
                                                            }}
                                                            sx={{ color: "rgba(255,180,180,0.95)" }}
                                                            aria-label="Delete custom graph"
                                                        >
                                                            <DeleteOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            ) : (
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        flexShrink: 0,
                                                        pointerEvents: "none",
                                                    }}
                                                    aria-hidden
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    <Box sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            onClick={handleAreaSave}
                            sx={{
                                bgcolor: "#232323",
                                color: "#fff",
                                textTransform: "none",
                            }}
                        >
                            Save
                        </Button>
                    </Box>
                </Box>

                {/* Snackbar for saving selected areas */}
                <Snackbar
                    open={areaSnackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setAreaSnackbarOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setAreaSnackbarOpen(false)}
                        severity="success"
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        Areas Saved Successfully!
                    </Alert>
                </Snackbar>

                <Snackbar
                    open={snackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setSnackbarOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setSnackbarOpen(false)}
                        severity="success"
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        Changes saved.
                    </Alert>
                </Snackbar>

                {/* Error Snackbar */}
                <Snackbar
                    open={errorSnackbarOpen}
                    autoHideDuration={5000}
                    onClose={() => {
                        setErrorSnackbarOpen(false);
                        dispatch(clearRenameWidgetError());
                    }}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => {
                            setErrorSnackbarOpen(false);
                            dispatch(clearRenameWidgetError());
                        }}
                        severity="error"
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        {typeof renameError === "string"
                            ? renameError
                            : renameError
                                ? JSON.stringify(renameError)
                                : "Failed to rename widget. Please try again."}
                    </Alert>
                </Snackbar>

                <Snackbar
                    open={customGraphSnackbarOpen}
                    autoHideDuration={3000}
                    onClose={() => setCustomGraphSnackbarOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setCustomGraphSnackbarOpen(false)}
                        severity="success"
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        Graph Added Successfully!
                    </Alert>
                </Snackbar>

                <Snackbar
                    open={customGraphErrorOpen}
                    autoHideDuration={6000}
                    onClose={() => setCustomGraphErrorOpen(false)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                >
                    <Alert
                        onClose={() => setCustomGraphErrorOpen(false)}
                        severity="error"
                        variant="filled"
                        sx={{ width: "100%" }}
                    >
                        {customGraphErrorMessage || "Failed to add new graph"}
                    </Alert>
                </Snackbar>

                <Dialog open={customGraphOpen} onClose={() => setCustomGraphOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Add New Graph</DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <FormControl fullWidth size="small">
                                <Typography sx={{ fontSize: 13, mb: 0.5 }}>Page</Typography>
                                <Select
                                    value={customGraphPage}
                                    onChange={(e) => setCustomGraphPage(e.target.value)}
                                >
                                    <MenuItem value="energy">Energy</MenuItem>
                                    <MenuItem value="space">Space Utilization</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <Typography sx={{ fontSize: 13, mb: 0.5 }}>Graph Type</Typography>
                                <Select
                                    value={customGraphType}
                                    onChange={(e) => setCustomGraphType(e.target.value)}
                                >
                                    <MenuItem value="bar">Bar</MenuItem>
                                    <MenuItem value="pie">Pie</MenuItem>
                                    <MenuItem value="line">Line</MenuItem>
                                    <MenuItem value="table">Table</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Graph Name"
                                value={customGraphName}
                                onChange={(e) => setCustomGraphName(e.target.value)}
                                size="small"
                                fullWidth
                                helperText="Display name for the chart. Data uses the default API for the selected page unless you set a custom API path when editing."
                            />

                            <FormControl fullWidth size="small">
                                <Typography sx={{ fontSize: 13, mb: 0.5 }}>API Path (optional)</Typography>
                                <Select
                                    value={customGraphApiPath}
                                    onChange={(e) => setCustomGraphApiPath(e.target.value)}
                                    displayEmpty
                                >
                                    <MenuItem value="">
                                        Auto (choose from name keywords)
                                    </MenuItem>
                                    {apiPathDropdownOptions.map((p) => (
                                        <MenuItem key={p} value={p}>
                                            {formatApiPathLabel(p)}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 0.5 }}>
                                    Selecting an API lets you use any graph name. If left on Auto, the API is inferred from the name.
                                </Typography>
                            </FormControl>

                            <FormControl fullWidth size="small">
                                <Typography sx={{ fontSize: 13, mb: 0.5 }}>Scope Target</Typography>
                                <Select
                                    value={customGraphScopeTarget}
                                    onChange={(e) => setCustomGraphScopeTarget(e.target.value)}
                                >
                                    <MenuItem value="location">Floors / Areas</MenuItem>
                                    <MenuItem value="group">Area Groups</MenuItem>
                                </Select>
                            </FormControl>

                            {customGraphScopeTarget === "location" ? (
                                <CustomGraphScopeSection
                                    mode={customGraphScopeMode}
                                    onModeChange={setCustomGraphScopeMode}
                                    draft={customGraphScopeDraft}
                                    onDraftChange={setCustomGraphScopeDraft}
                                />
                            ) : (
                                <Box sx={{ mt: 1, p: 1.5, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 1, bgcolor: "rgba(0,0,0,0.02)" }}>
                                    <Typography sx={{ fontSize: 13, mb: 1, fontWeight: 600 }}>Select Area Groups</Typography>
                                    <CustomGraphScopedGroupPicker
                                        groupScope="user_only"
                                        value={customGraphAreaGroupIds}
                                        onChange={setCustomGraphAreaGroupIds}
                                        disabled={customGraphsLoading}
                                    />
                                    <Typography sx={{ fontSize: 11, color: "text.secondary", mt: 1 }}>
                                        Graph will aggregate data from the selected User Area Groups.
                                    </Typography>
                                </Box>
                            )}


                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setCustomGraphOpen(false)} sx={{ textTransform: "none" }}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveCustomGraph}
                            disabled={!customGraphName.trim() || customGraphsLoading}
                            sx={{ textTransform: "none", bgcolor: "#232323", "&:hover": { bgcolor: "#1E1E1E" } }}
                        >
                            Save
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={deleteGraphOpen} onClose={() => setDeleteGraphOpen(false)} maxWidth="xs" fullWidth>
                    <DialogTitle>Delete Widget</DialogTitle>
                    <DialogContent dividers>
                        <Typography sx={{ fontSize: 14 }}>
                            Are you sure you want to delete widget?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteGraphOpen(false)} sx={{ textTransform: "none" }}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleConfirmDeleteGraph}
                            sx={{
                                textTransform: "none",
                                bgcolor: "#b91c1c",
                                "&:hover": { bgcolor: "#991b1b" },
                            }}
                        >
                            Delete
                        </Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={graphEditOpen} onClose={() => setGraphEditOpen(false)} maxWidth={graphEditIsCustom ? "md" : "sm"} fullWidth>
                    <DialogTitle>{graphEditIsCustom ? "Edit graph" : "Edit widget"}</DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {graphEditIsCustom ? (
                                <>
                                    <FormControl fullWidth size="small" sx={controlSx}>
                                        <Typography sx={{ fontSize: 13, mb: 0.5, color: "rgba(255,255,255,0.9)" }}>
                                            Page
                                        </Typography>
                                        <Select
                                            value={graphEditPage}
                                            onChange={(e) => setGraphEditPage(e.target.value)}
                                        >
                                            <MenuItem value="energy">Energy</MenuItem>
                                            <MenuItem value="space">Space Utilization</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl fullWidth size="small" sx={controlSx}>
                                        <Typography sx={{ fontSize: 13, mb: 0.5, color: "rgba(255,255,255,0.9)" }}>
                                            Graph type
                                        </Typography>
                                        <Select
                                            value={graphEditGraphType}
                                            onChange={(e) => setGraphEditGraphType(e.target.value)}
                                        >
                                            <MenuItem value="bar">Bar</MenuItem>
                                            <MenuItem value="pie">Pie</MenuItem>
                                            <MenuItem value="line">Line</MenuItem>
                                            <MenuItem value="table">Table</MenuItem>
                                        </Select>
                                    </FormControl>
                                </>
                            ) : null}
                            <TextField
                                label={graphEditIsCustom ? "Graph name" : "Display name"}
                                value={graphEditName}
                                onChange={(e) => setGraphEditName(e.target.value)}
                                size="small"
                                fullWidth
                                sx={controlSx}
                            />
                            {graphEditIsCustom ? (
                                <Box sx={{ color: "rgba(255,255,255,0.9)" }}>
                                    <FormControl fullWidth size="small" sx={controlSx}>
                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                mb: 0.5,
                                                color: "rgba(255,255,255,0.9)",
                                            }}
                                        >
                                            API Path (optional)
                                        </Typography>
                                        <Select
                                            value={graphEditApiPath}
                                            onChange={(e) => setGraphEditApiPath(e.target.value)}
                                            displayEmpty
                                        >
                                            <MenuItem value="">
                                                Auto (choose from name keywords)
                                            </MenuItem>
                                            {apiPathDropdownOptions.map((p) => (
                                                <MenuItem key={p} value={p}>
                                                    {formatApiPathLabel(p)}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        <Typography
                                            sx={{
                                                fontSize: 11,
                                                color: "rgba(255,255,255,0.65)",
                                                mt: 0.5,
                                            }}
                                        >
                                            If left on Auto, the API is inferred from the name.
                                        </Typography>
                                    </FormControl>
                                    <FormControl fullWidth size="small" sx={controlSx}>
                                        <Typography sx={{ fontSize: 13, mb: 0.5, color: "rgba(255,255,255,0.9)" }}>
                                            Scope Target
                                        </Typography>
                                        <Select
                                            value={graphEditScopeTarget}
                                            onChange={(e) => setGraphEditScopeTarget(e.target.value)}
                                        >
                                            <MenuItem value="location">Floors / Areas</MenuItem>
                                            <MenuItem value="group">Area Groups</MenuItem>
                                        </Select>
                                    </FormControl>

                                    {graphEditScopeTarget === "location" ? (
                                        <CustomGraphScopeSection
                                            mode={graphEditScopeMode}
                                            onModeChange={setGraphEditScopeMode}
                                            draft={graphEditScopeDraft}
                                            onDraftChange={setGraphEditScopeDraft}
                                        />
                                    ) : (
                                        <Box sx={{ mt: 1, p: 1.5, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 1, bgcolor: "rgba(255,255,255,0.05)" }}>
                                            <Typography sx={{ fontSize: 13, mb: 1, fontWeight: 600, color: "#fff" }}>Select Area Groups</Typography>
                                            <CustomGraphScopedGroupPicker
                                                dark
                                                groupScope="user_only"
                                                value={graphEditAreaGroupIds}
                                                onChange={setGraphEditAreaGroupIds}
                                                disabled={customGraphsLoading}
                                            />
                                            <Typography sx={{ fontSize: 11, color: "rgba(255,255,255,0.6)", mt: 1 }}>
                                                Graph will aggregate data from the selected User Area Groups.
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            ) : null}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setGraphEditOpen(false)} sx={{ textTransform: "none" }}>
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleSaveGraphEdit}
                            disabled={
                                !graphEditName.trim() ||
                                (graphEditIsCustom ? customGraphsLoading : renameLoading)
                            }
                            sx={{ textTransform: "none", bgcolor: "#232323", "&:hover": { bgcolor: "#1E1E1E" } }}
                        >
                            {graphEditIsCustom
                                ? customGraphsLoading
                                    ? "Saving..."
                                    : "Save"
                                : renameLoading
                                    ? "Saving..."
                                    : "Save"}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Grid>
        </Grid>
    );
}
