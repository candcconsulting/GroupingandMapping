import {
  AbstractWidgetProps,
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
} from '@itwin/appui-abstract';

import react from 'react';

import { Button } from '@itwin/itwinui-react';
import {displayMappingValues } from '../apps/mapping'

export class documentUIProvider implements UiItemsProvider {
  public readonly id = 'documentUIProviderId';
  


  public provideWidgets(
    stageId: string,
    stageUsage: string,
    location: StagePanelLocation,
    section?: StagePanelSection,
  ): ReadonlyArray<AbstractWidgetProps> {
  
    const widgets: AbstractWidgetProps[] = [];
    function colourHandler(): void {
      // todo        
      const mappings = displayMappingValues();
    }
    if (
      location === StagePanelLocation.Right &&
      section === StagePanelSection.Start
    ) {
      const itwinui_react_1 = require("@itwin/itwinui-react");
      const react_1 = react;
      const mappings = displayMappingValues();

      const widget: AbstractWidgetProps = {
        id: 'DocumentUI',
        label: 'Documents',
        getWidgetContent: () => {
          return (<span></span>)}/*(
          <span>
            <span>Documents</span><br></br>
            <br></br>
            <Button onClick = {() => colourHandler()}>Colour Documents</Button>
            react_1.default.createElement(itwinui_react_1.Table, { data: mappings, density: "extra-condensed", columns: mappingsColumns, emptyTableContent: "No Mappings available.", isSortable: true, isLoading: isLoading })),
            <br></br>              
          </span>
        
          )}*/,
      };

      widgets.push(widget);
    }

    return widgets;
  }
}

export {}
