/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { DefaultCell } from "@itwin/itwinui-react";
import React from "react";
import { CellRendererProps } from "react-table";

export const coloredCellRenderer = (
  props: CellRendererProps<any>,
  min: number,
  max: number
) => {
  return (
    <DefaultCell
      {...props}
      style={{ background: getColor(props.cellProps.value, min, max) }}
    />
  );
};

const getColor = (value: number, min: number, max: number) => {
  const normalizedValue = value - min;
  const normalizedMax = max - min;
  const percentage = normalizedValue / normalizedMax;
  // const hue = ((1 - percentage) * 120).toString(10);
  const  hue = Math.floor((1 - percentage) * 120);  // go from green to red
  const saturation = Math.abs(percentage - .50) * 100;
  return `hsl(${hue},50%,60%)`;
};
