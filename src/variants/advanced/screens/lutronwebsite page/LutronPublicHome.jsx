import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Link,
  Typography,
} from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  getLutronData,
  getLutronDataClient,
  getLutronDataProject,
  homeDataClient,
  homeDataList,
  homeDataProject,
} from "../../redux/slice/home/homeSlice";

const API_URL = process.env.REACT_APP_API_URL || "";
const MODES = ["Lutron", "Client", "Project"];

const resolveMediaUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${API_URL}${path}`;
};

const stripHtmlToText = (html) => {
  if (!html) return "";
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const parseInstalledSolutions = (raw) => {
  if (!raw) return [];
  try {
    const solutions = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(solutions)) {
      return solutions
        .map((item, index) => ({
          id: index,
          name:
            typeof item === "string"
              ? item
              : item.solution || item.name || "",
        }))
        .filter((s) => s.name);
    }
  } catch {
    // fall through
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((s, index) => ({ id: index, name: s.trim() }))
      .filter((s) => s.name);
  }
  return [];
};

const HERO_HEIGHT = { xs: "42vh", sm: "48vh", md: "52vh", lg: "56vh" };

const contentShellSx = {
  position: "relative",
  width: "100%",
  minHeight: HERO_HEIGHT,
  maxHeight: { xs: "52vh", sm: "56vh", md: "58vh" },
  borderRadius: { xs: "8px", md: "12px" },
  overflow: "hidden",
  display: "flex",
  alignItems: { xs: "stretch", md: "flex-start" },
};

const contentPanelSx = {
  backgroundColor: "#fff",
  borderRadius: { xs: "8px", md: "12px" },
  border: "2px solid rgba(0,0,0,0.85)",
  width: { xs: "100%", md: "48%" },
  maxWidth: { md: 560 },
  maxHeight: { xs: "52vh", sm: "56vh", md: "58vh" },
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const descriptionCardSx = {
  backgroundColor: "#fff",
  borderRadius: { xs: "8px", md: "12px" },
  border: "2px solid rgba(0,0,0,0.85)",
  width: "100%",
  maxHeight: { xs: "52vh", sm: "56vh", md: "58vh" },
  overflow: "hidden",
  position: "relative",
};

const descriptionCardInnerSx = {
  position: "relative",
  zIndex: 2,
  p: { xs: 1.5, sm: 2, md: 2.5 },
  maxHeight: { xs: "52vh", sm: "56vh", md: "58vh" },
  overflowY: "auto",
  overflowX: "hidden",
  flex: 1,
  minHeight: 0,
};

const DescriptionCard = ({
  html,
  logoUrl = null,
  emptyLabel = "No description available.",
  fullWidth = false,
}) => {
  const hasContent = stripHtmlToText(html).length > 0;

  const cardBody = (
    <Box sx={descriptionCardInnerSx}>
      {logoUrl && (
        <Box
          component="img"
          src={logoUrl}
          alt=""
          sx={{
            display: "block",
            maxHeight: 48,
            maxWidth: 160,
            objectFit: "contain",
            mb: 1.5,
          }}
        />
      )}
      {hasContent ? (
        <Box
          className="lutron-public-description"
          sx={{
            color: "#111",
            fontSize: { xs: 12, sm: 13, md: 14 },
            lineHeight: 1.55,
            "& p": { margin: "0 0 0.75em" },
            "& ul, & ol": { margin: "0 0 0.75em", paddingLeft: "1.25em" },
            "& strong": { fontWeight: 700 },
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <Typography sx={{ color: "#666", fontSize: { xs: 13, md: 15 } }}>
          {emptyLabel}
        </Typography>
      )}
    </Box>
  );

  if (fullWidth) {
    return (
      <Box className="lutron-content-scrollable" sx={descriptionCardSx}>
        {cardBody}
      </Box>
    );
  }

  return (
    <Box className="lutron-content-shell" sx={contentShellSx}>
      <Box className="lutron-content-scrollable" sx={contentPanelSx}>
        {cardBody}
      </Box>
    </Box>
  );
};

const infoTileSx = {
  backgroundColor: "#fff",
  borderRadius: { xs: "8px", md: "10px" },
  border: "2px solid rgba(0,0,0,0.85)",
  p: { xs: 1.2, md: 1.5 },
  minHeight: { xs: 88, md: 100 },
  display: "flex",
  flexDirection: "column",
  gap: 0.5,
};

const LutronPublicHome = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const homeData = useSelector(homeDataList);
  const homeClientData = useSelector(homeDataClient);
  const homeProjectData = useSelector(homeDataProject);
  const { loading } = useSelector((state) => state.home);

  const [displayMode, setDisplayMode] = useState("Lutron");
  const tabsContainerRef = useRef(null);
  const tabRefs = useRef({});
  const [tabIndicator, setTabIndicator] = useState({
    left: 0,
    width: 0,
    ready: false,
  });

  const clientTabLabel = useMemo(() => {
    const name = (homeClientData?.name || "").trim();
    return name || "Client";
  }, [homeClientData?.name]);

  const tabLabels = useMemo(
    () => ({
      Lutron: "Lutron",
      Client: clientTabLabel,
      Project: "Project",
    }),
    [clientTabLabel]
  );

  useEffect(() => {
    document.body.classList.add("lutron-page");
    const root = document.getElementById("root");
    if (root) root.classList.add("lutron-page");
    dispatch(getLutronData());
    dispatch(getLutronDataClient());
    dispatch(getLutronDataProject());
    return () => {
      document.body.classList.remove("lutron-page");
      if (root) root.classList.remove("lutron-page");
    };
  }, [dispatch]);

  useLayoutEffect(() => {
    const measure = () => {
      const activeEl = tabRefs.current[displayMode];
      if (!activeEl) return false;
      const width = activeEl.offsetWidth;
      if (width <= 0) return false;
      setTabIndicator({ left: activeEl.offsetLeft, width, ready: true });
      return true;
    };
    if (measure()) return;
    const rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [displayMode, clientTabLabel]);

  const projectSolutions = useMemo(
    () => parseInstalledSolutions(homeProjectData?.installed_solutions),
    [homeProjectData?.installed_solutions]
  );

  const renderTabs = () => (
    <Box
      ref={tabsContainerRef}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0,
        mb: { xs: 1.5, md: 2 },
        background: "var(--heatmap-tab-pill-bg, #3d4a5c)",
        borderRadius: "999px",
        padding: "4px",
        position: "relative",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
        maxWidth: "100%",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: `${tabIndicator.left}px`,
          width: `${tabIndicator.width}px`,
          backgroundColor: "#ffffff",
          borderRadius: "999px",
          transition: tabIndicator.ready
            ? "left 0.6s cubic-bezier(0.4, 0, 0.2, 1), width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
          opacity: tabIndicator.ready ? 1 : 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {MODES.map((mode) => (
        <Button
          key={mode}
          ref={(el) => {
            tabRefs.current[mode] = el;
          }}
          onClick={() => setDisplayMode(mode)}
          sx={{
            minWidth: { xs: 56, sm: 70, md: 85 },
            height: { xs: 24, sm: 28, md: 32 },
            backgroundColor: "transparent",
            color:
              displayMode === mode
                ? "var(--home-tab-active-color, #3d4a5c)"
                : "#fff",
            borderRadius: "999px",
            fontWeight: "bold",
            border: "none",
            textTransform: "none",
            fontSize: { xs: 10, sm: 11, md: 13 },
            position: "relative",
            zIndex: 1,
            px: { xs: 1, md: 1.5 },
            "&:hover": {
              backgroundColor:
                displayMode === mode
                  ? "transparent"
                  : "rgba(255, 255, 255, 0.12)",
            },
          }}
        >
          {tabLabels[mode]}
        </Button>
      ))}
    </Box>
  );

  const renderLutronOrClient = (data, showClientExtras = false) => {
    const logoUrl = showClientExtras
      ? resolveMediaUrl(data?.logo_image)
      : null;

    return (
      <DescriptionCard
        html={data?.description}
        logoUrl={logoUrl}
      />
    );
  };

  const renderProject = () => {
    const locationValue =
      homeProjectData?.location_link || homeProjectData?.location || "";
    const areaValue =
      homeProjectData?.overall_area_size ||
      homeProjectData?.area_size ||
      "";

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, md: 2 },
          width: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 1.5, md: 2 },
            alignItems: "stretch",
          }}
        >
          <Box sx={{ flex: { xs: "1 1 auto", md: "1 1 58%" }, minWidth: 0 }}>
            <DescriptionCard html={homeProjectData?.description} fullWidth />
          </Box>

          <Box
            sx={{
              flex: { xs: "1 1 auto", md: "1 1 38%" },
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1.5, md: 2 },
              minWidth: 0,
            }}
          >
            <Box sx={infoTileSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <PlaceOutlinedIcon sx={{ fontSize: 20, color: "#111" }} />
                <Typography fontWeight={700} fontSize={{ xs: 13, md: 15 }}>
                  Location
                </Typography>
              </Box>
              <Typography
                fontSize={{ xs: 12, md: 14 }}
                sx={{ color: "#333", wordBreak: "break-word" }}
              >
                {locationValue ? (
                  locationValue.startsWith("http") ? (
                    <Link
                      href={locationValue}
                      target="_blank"
                      rel="noopener noreferrer"
                      underline="hover"
                    >
                      {locationValue}
                    </Link>
                  ) : (
                    locationValue
                  )
                ) : (
                  "—"
                )}
              </Typography>
            </Box>

            <Box sx={infoTileSx}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <FormatListBulletedIcon sx={{ fontSize: 20, color: "#111" }} />
                <Typography fontWeight={700} fontSize={{ xs: 13, md: 15 }}>
                  Area
                </Typography>
              </Box>
              <Typography fontSize={{ xs: 12, md: 14 }} sx={{ color: "#333" }}>
                {areaValue || "—"}
              </Typography>
              <Link
                component="button"
                type="button"
                onClick={() => navigate("/heatmap")}
                sx={{
                  mt: 0.5,
                  alignSelf: "flex-start",
                  fontWeight: 600,
                  fontSize: { xs: 12, md: 13 },
                  color: "#111",
                  cursor: "pointer",
                  border: "none",
                  background: "none",
                  textDecoration: "underline",
                }}
              >
                Floor Plan →
              </Link>
            </Box>
          </Box>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Typography
            fontWeight={700}
            fontSize={{ xs: 14, md: 16 }}
            sx={{ color: "var(--heatmap-legends-nav-text, #111)", mb: 1 }}
          >
            Installed Solutions
          </Typography>
          {projectSolutions.length > 0 ? (
            <Box
              component="ul"
              sx={{
                m: 0,
                pl: 2.5,
                color: "var(--heatmap-legends-nav-text, #333)",
                fontSize: { xs: 12, md: 14 },
              }}
            >
              {projectSolutions.map((item) => (
                <li key={item.id}>
                  <Typography component="span" fontSize="inherit">
                    {item.name}
                  </Typography>
                </li>
              ))}
            </Box>
          ) : (
            <Typography
              fontSize={{ xs: 12, md: 14 }}
              sx={{ color: "var(--heatmap-legends-nav-text, #666)" }}
            >
              No installed solutions available. Add solutions in the settings
              page.
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      className="lutron-website-container"
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          mb: { xs: 1, md: 1.5 },
        }}
      >
        {renderTabs()}
      </Box>

      {loading &&
      !homeData?.description &&
      !homeClientData?.name &&
      !homeProjectData?.description ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
        >
          <CircularProgress size={36} />
        </Box>
      ) : (
        <Box sx={{ width: "100%", flex: 1, minHeight: 0 }}>
          {displayMode === "Lutron" && renderLutronOrClient(homeData, false)}
          {displayMode === "Client" &&
            renderLutronOrClient(homeClientData, true)}
          {displayMode === "Project" && renderProject()}
        </Box>
      )}
    </Box>
  );
};

export default LutronPublicHome;
