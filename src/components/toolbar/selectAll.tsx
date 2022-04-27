/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { CommonToolbarItem, StageUsage, ToolbarItemUtilities, ToolbarOrientation, ToolbarUsage, UiItemsProvider } from "@itwin/appui-abstract";
import { EmphasizeElements, IModelApp } from "@itwin/core-frontend";

import { toaster } from "@itwin/itwinui-react";

/*
const displayInfoToast = (message: string) => {
  toaster.setSettings({
    placement: "top-end",
    order: "descending",
  });

  toaster.informational(message, {
    duration: 3000,
  });
};
*/
export class SelectAllButtonProvider implements UiItemsProvider {
  public readonly id = "SelectAllToolBar";
  /** provideToolbarButtonItems() is called for each registered UI provider as the Frontstage is building toolbars. We are adding an action button to the ContentManipulation Horizontal toolbar
   * in General use Frontstages. For more information, refer to the UiItemsProvider and Frontstage documentation on imodeljs.org.
   */
  public provideToolbarButtonItems(_stageId: string, stageUsage: string, toolbarUsage: ToolbarUsage, toolbarOrientation: ToolbarOrientation): CommonToolbarItem[] {
    console.log(stageUsage, ":", toolbarUsage)
    if (stageUsage === StageUsage.General && toolbarUsage === ToolbarUsage.ContentManipulation && toolbarOrientation === ToolbarOrientation.Horizontal) {
      const simpleActionSpec = ToolbarItemUtilities.createActionButton("Select All", 1000, "icon-checkmark", "Select All", () => this.startTool());
      return [simpleActionSpec];
    }
    return [];
  }
  public startTool() {
    console.log( IModelApp.viewManager);
    const vp = IModelApp.viewManager.getFirstOpenView();
    if (!vp) { return};
    const emphElements = EmphasizeElements.get(vp);
    if (!emphElements) {return};
    const elementSets = emphElements.getOverriddenElements();
    if (!elementSets) {return};
    vp.iModel.selectionSet.emptyAll();
    for (const es of elementSets.values()) {
      vp.iModel.selectionSet.add(es);
    }
/*    vp.iModel.selectionSet.add(elementSets.values)
      console.log(vp.alwaysDrawn);
      const vpSelectionSet = new SelectionSet(vp.iModel);
      if (vp.alwaysDrawn)
        vpSelectionSet.add(vp.alwaysDrawn);
        vp.invalidateScene();
    }
    displayInfoToast( "All elements selected.");
    */
  }
}