import React, { useEffect } from "react";
import { ThemeType, useTheme, IconButton } from "@itwin/itwinui-react";
import { SvgMoon, SvgSun } from "@itwin/itwinui-icons-react";

export const ThemeButton = () => {
  
  const [theme, setTheme] = React.useState<ThemeType>("light");
  useTheme(theme);

  const changeTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
    localStorage.setItem("THEME", theme === "light" ? "dark" : "light");
  };

  useEffect(()=>{
    if (localStorage.getItem("THEME") === "dark"){
      setTheme("dark");
    }
  },[])

  return (
    <IconButton styleType="borderless" onClick={changeTheme}>
      {theme === "light" ? <SvgSun /> : <SvgMoon />}
    </IconButton>
  );
};