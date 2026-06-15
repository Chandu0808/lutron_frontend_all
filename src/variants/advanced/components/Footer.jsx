import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import lutronLogo from "../assets/lutron-logo.png";
import { FOOTER_VERSION_FONT_SIZE, getAppDisplayVersion } from "../../../utils/appVersion";

const Footer = () => {
  let [roleName, setRoleName] = useState('')
  useEffect(() => {
    let role = localStorage.getItem("role");
    setRoleName(role)
  }, [])
  return (
    <Box
      component="footer"
      sx={{
        textAlign: "right",
        paddingTop: "5px",
        paddingBottom: "2px",
        paddingLeft: "12px",
        marginTop: "0px",
        height: "auto",
        minHeight: "20px",
        maxHeight: "30px",
        display: "flex",
        alignItems: "center",
        justifyContent: roleName === "Superadmin"?"space-between":"flex-end",
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: "var(--footer-background-color, transparent)",
        backgroundImage: "var(--footer-background)",
        "html.gold-theme &": {
          backgroundImage: "var(--footer-background)",
          backgroundColor: "var(--footer-background-color)",
        },
        backgroundSize: "cover",
        backgroundPosition: "center bottom",
        backgroundRepeat: "no-repeat",
        color: "var(--footer-text-color, #1a1a1a)",
      }}
    >
      <Typography sx={{ fontSize: FOOTER_VERSION_FONT_SIZE, color: "inherit" }}>
        {roleName === "Superadmin" && `Version ${getAppDisplayVersion()}`}
      </Typography>
      <img
        src={lutronLogo}
        alt="Lutron Logo"
        style={{
          height: "100px",
          marginBottom: "0px",
          paddingRight: "20px",
          filter: "var(--footer-logo-filter, none)",
        }}
      />

    </Box>
  );
};

export default Footer;
