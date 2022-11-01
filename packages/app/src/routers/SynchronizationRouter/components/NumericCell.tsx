/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { Body, DefaultCell } from "@itwin/itwinui-react";
import React, { PropsWithChildren } from "react";
import { CellRendererProps } from "react-table";

import { getSettings } from "../../../config";

export const numericCellRenderer = (props: CellRendererProps<any>) => {
  return <DefaultCell {...props} style={{ justifyContent: "flex-end" }} />;
};

export type NumericalCellProps = PropsWithChildren<{
  value: any;
  row: {
    original: any;
  };
  style: any;
  precision?: number;
}>;
export const NumericCell = (props: NumericalCellProps) => {
  let usePrecision = props.precision;
  if (!usePrecision) {
    usePrecision = getSettings.decimalAccuracy;
  }
  try {
    if (Object.keys(props.row.original).length !== 0) {
      // props.style = {...props.style, ...{justifyContent: "flex-end"}}
      return (props.children ?? (
        <span title={props.value}>
          {new Intl.NumberFormat("en-EN", {
            minimumFractionDigits: usePrecision,
            maximumFractionDigits: usePrecision,
          }).format(props.value)}
          &nbsp;&nbsp;
        </span>
      )) as React.ReactElement;
    }
    return <Body isSkeleton={true}>Fetching</Body>;
  } catch {
    return <Body isSkeleton={true}>Fetching</Body>;
  }
};

export const NumericCell0 = (props: NumericalCellProps) => {
  let usePrecision = props.precision;
  if (usePrecision) {
    usePrecision = getSettings.decimalAccuracy;
  }
  if (Object.keys(props.row.original).length !== 0) {
    // props.style = {...props.style, ...{justifyContent: "flex-end"}}
    return (props.children ?? (
      <span title={props.value}>
        {new Intl.NumberFormat("en-EN", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(props.value)}
        &nbsp;&nbsp;
      </span>
    )) as React.ReactElement;
  }
  return <Body isSkeleton={true}>Fetching</Body>;
};
