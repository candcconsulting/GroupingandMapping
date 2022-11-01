/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { AbstractWidgetProps, StagePanelLocation, StagePanelSection, UiItemsProvider } from "@itwin/appui-abstract";
import React from "react";
import { MappingOData } from "./MappingOData";

export class ResultsWidgetProvider implements UiItemsProvider {
  public readonly id = "ODataWidgetProvider";

  public provideWidgets(
    _stageId: string,
    _stageUsage: string,
    location: StagePanelLocation,
    section?: StagePanelSection
  ): ReadonlyArray<AbstractWidgetProps> {
    const widgets: AbstractWidgetProps[] = [];

    if (
      location === StagePanelLocation.Bottom &&
      section === StagePanelSection.Start
    ) {
      const odataWidget: AbstractWidgetProps = {
        id: "MappingOData",
        label: "Mapping OData",
        getWidgetContent: () => <MappingOData />,
      };

      widgets.push(odataWidget);
    }

    return widgets;
  }
}
