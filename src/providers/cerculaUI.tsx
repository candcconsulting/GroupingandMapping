/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import {
  AbstractWidgetProps,
  StagePanelLocation,
  StagePanelSection,
  UiItemsProvider,
  WidgetState,
} from '@itwin/appui-abstract';
import * as React from 'react';
import { clearCarbonElements, emphasizeCarbonElements, getLabelColor, getCarbonData, setEmphasisMode, visualizeElementsByLabel } from '../api/cercula';
import { useEffect, useState } from 'react';
import { BodyText, Spinner, SpinnerSize, } from '@itwin/core-react';
import { ColorPickerButton } from '@itwin/imodel-components-react';
import { ToggleSwitch } from '@itwin/itwinui-react';
import { Item } from '@itwin/presentation-common';
import { toolAdmin, TooltipCustomizeSettings } from "./tooltip";

const CarbonMaterialsWidget: React.FunctionComponent = () => {
  const [carbonElements, setCarbonElements] = useState<any>();
  const [elementLabels, setElementLabels] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [applyEmphasis, setApplyEmphasis] = useState(true);
  const [iModelIds, setIModelIds] = useState<string[]>([]);

  console.count("Cercula Widget")
  console.time("Cercula Widget")
  useEffect(() => {
    getCarbonData()
      .then(data => {
        if (data) {
          setCarbonElements(data);
        }
      });
    return () => undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    toolAdmin.settings.showCercula = true;
  }, []);

  useEffect(() => {
    if (carbonElements) {
      const tempElementLabels = carbonElements.map(function(item : any) { return item.label + "<GWP : " + item.gwp + ">"});
      setElementLabels(tempElementLabels);
      let tempElementIds: string[] = [];
      const elementIds = carbonElements.map(function(item : any) {
        tempElementIds = tempElementIds.concat(item.elements)
        return item.elements})
      setIModelIds(tempElementIds)
      setLoading(false);
      }
  }, [carbonElements])

  /*useEffect(() => {
    if (!loading && carbonElements) {
      let elementsIds = carbonElements.elements
        .map((x: []) => x[carbonElements.elementIds]) as string[]
      setIModelIds(elementsIds);
    }
    console.timeEnd("Labels Widget")
    return () => undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, carbonElements]); */

  // emphasize all misclassified elements when iModel loaded
  useEffect(() => {
    if (loading === false && iModelIds) {
      emphasizeCarbonElements(iModelIds);
    }
    return () => undefined;
  }, [loading, iModelIds]);

  // enable or disable elements emphasis
  useEffect(() => {
    setEmphasisMode(applyEmphasis);
    return () => undefined;
  }, [applyEmphasis]);

  const _handleToggleChange = () => {
    if (!applyEmphasis && iModelIds)
      emphasizeCarbonElements(iModelIds);
    else
      clearCarbonElements();

    setApplyEmphasis(!applyEmphasis);
  };

  // highlight all elements by selected label
  const _highlightElementsByLabel = (label: string) => {
    // the label has the  GWP{ appended}
    const search = label.substring(0, label.search("<GWP"))
    let highlight = carbonElements.filter((item : any) => item.label === search)
    const elementIds = highlight[0].elements

    visualizeElementsByLabel(elementIds, search);
  };
  return (
    <>
      {loading || !carbonElements || !elementLabels ? <div><Spinner size={SpinnerSize.Small} /> Loading ...</div> :
        <div className="sample-options">
          <div className="sample-options-4col">
            <span>Highlight Carbon elements</span>
            <ToggleSwitch checked={applyEmphasis} onChange={_handleToggleChange} />
          </div>
          <div className="header">
            <span>Materials:</span>
          </div>
          {
            elementLabels?.map((label: string, index: number) => {
              return (
                <div key={index} onClick={() => _highlightElementsByLabel(label)}>
                  <ColorPickerButton
                    className="sstc-color-picker-button"
                    initialColor={getLabelColor(label)}
                    disabled={true}
                  />
                  <BodyText>{label}</BodyText>
                </div>
              );
            })
          }
        </div>
      }
    </>
  );
};

export class CerculaProvider implements UiItemsProvider {
  public readonly id = 'DesignElementClassificationLabelsProvider';

  public provideWidgets(_stageId: string, _stageUsage: string, location: StagePanelLocation, section?: StagePanelSection): ReadonlyArray<AbstractWidgetProps> {
    const widgets: AbstractWidgetProps[] = [];
    if (location === StagePanelLocation.Right && section === StagePanelSection.Start) {
      widgets.push(
        {
          id: "CerculaWidget",
          label: "Cercula Materials",
          defaultState: WidgetState.Open,
          // eslint-disable-next-line react/display-name
          getWidgetContent: () => <CarbonMaterialsWidget />,
        }
      );
    }
    return widgets;
  }
}
export {}