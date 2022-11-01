import { SvgClock } from "@itwin/itwinui-icons-react";
import React from "react";
import { Tooltip } from "recharts";

export const PackageDashboard = () => {
  return (
    <div>
      <div>Grouping & Mapping Widget <SvgClock width="2rem" height="2rem" fill = "green"/> </div>
      <div>Reporting Widget <SvgClock width="2rem" height="2rem" fill = "orange"/></div>
      <div>OneClick LCA <SvgClock width="2rem" height="2rem" fill="red"/></div>
    </div>
  )
}

export default PackageDashboard;