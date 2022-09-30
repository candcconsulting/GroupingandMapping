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
      const widget: AbstractWidgetProps = {
        id: "viewCarbonResults",
        label: "Carbon Results",
        getWidgetContent: () => {
          return <CarbonWidget />;
        },
      };

      widgets.push(widget);
    }

    return widgets;
  }
}

export default {};
