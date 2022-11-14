/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import {
  AbstractWidgetProps,
  StagePanelLocation,
  UiItemsProvider,
} from "@itwin/appui-abstract";
import React from "react";

import CarbonWidget from "./Widgets/CarbonWidget";
import EC3 from "./Widgets/EC3";
import EC3Widget from "./Widgets/EC3Widget";
import Uniclass from "./Widgets/Uniclass";

// Provides custom widgets to support validation workflow.
export class CarbonUIProvider implements UiItemsProvider {
  public readonly id = "CarbonUiProvider";

  public provideWidgets(
    stageId: string,
    _stageUsage: string,
    location: StagePanelLocation
    // _section?: StagePanelSection | undefined
  ): readonly AbstractWidgetProps[] {
    const widgets: AbstractWidgetProps[] = [];

    // Widget to view carbon results: Table and element colorization (on bottom panel).
    if (
      stageId === "DefaultFrontstage" &&
      location === StagePanelLocation.Bottom
    ) {
      let widget: AbstractWidgetProps = {
        id: "viewCarbonResults",
        label: "Carbon Results",
        getWidgetContent: () => {
          return <CarbonWidget />;
        },
      };

      widgets.push(widget);
      widget = {
        id: "viewEC3",
        label: "EC3 Results",
        getWidgetContent: () => {
          return <EC3Widget />;
        },
      };

      widgets.push(widget);
    }

    if (
      stageId === "DefaultFrontstage" &&
      location === StagePanelLocation.Right
    ) {
      const widget: AbstractWidgetProps = {
        id: "Uniclass",
        label: "Uniclass",
        getWidgetContent: () => {
          return <Uniclass />;
        },
      };
      widgets.push(widget);
    }
    if (
      stageId === "DefaultFrontstage" &&
      location === StagePanelLocation.Left
    ) {
      const widget: AbstractWidgetProps = {
        id: "EC3_View",
        label: "EC3_View",
        getWidgetContent: () => {
          return <EC3 />;
        },
      };
      widgets.push(widget);
    }

    return widgets;
  }
}

export default {};
