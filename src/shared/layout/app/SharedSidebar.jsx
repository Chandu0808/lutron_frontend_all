/**
 * Shared mobile navigation drawer — Phase 5.3
 *
 * Consolidates drawer collapse, navigation, and route highlighting
 * previously duplicated in each variant TopbarComponent.
 */

import React from "react";
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Array<{label:string,path:string}>} props.items
 * @param {(item:object)=>boolean} props.isItemActive
 * @param {string} [props.title]
 * @param {object} [props.paperSx]
 */
export function SharedSidebar({
  open,
  onClose,
  items = [],
  isItemActive,
  title = "Menu",
  paperSx = {},
}) {
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      data-testid="shared-sidebar-drawer"
      PaperProps={{
        sx: {
          width: {
            xs: "250px",
            lg: "280px",
            xl: "300px",
            xxl: "320px",
            "2xl": "350px",
            "3xl": "380px",
            "4xl": "400px",
            "5xl": "420px",
            "6xl": "450px",
          },
          backgroundColor: theme.palette.background.paper,
          zIndex: 10003,
          ...paperSx,
        },
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" sx={{ color: theme.palette.text.primary }}>
          {title}
        </Typography>
      </Box>
      <List>
        {items.map((item) => {
          const isActive = isItemActive(item);
          return (
            <ListItem key={`${item.label}-${item.path}`} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                sx={{
                  backgroundColor: isActive
                    ? theme.palette.primary.main
                    : "transparent",
                  "&:hover": {
                    backgroundColor: isActive
                      ? theme.palette.primary.dark
                      : theme.palette.action.hover,
                  },
                }}
              >
                <ListItemText
                  primary={item.label}
                  sx={{
                    color: isActive
                      ? theme.palette.primary.contrastText
                      : theme.palette.text.primary,
                    fontWeight: isActive ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
}

export default SharedSidebar;
