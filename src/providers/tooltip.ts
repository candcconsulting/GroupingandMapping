/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { HitDetail, ToolAdmin } from "@itwin/core-frontend";
import logo from "./cercula.svg";
import {getToolTipData} from "../api/cercula"


export interface TooltipCustomizeSettings {
  showImage: boolean;
  showCercula: boolean;
  showDefaultToolTip: boolean;
}

/** To create the tooltip, a class needs to override ToolAdmin and getToolTip() */
class CerculaToolAdmin extends ToolAdmin {
  public settings: TooltipCustomizeSettings = {
    showImage: true,
    showCercula: false,
    showDefaultToolTip: true,
  };

  public constructor() {
    super();
  }


  public async getToolTip(hit: HitDetail): Promise<HTMLElement | string> {
    if (!this.settings.showImage && !this.settings.showCercula && !this.settings.showDefaultToolTip)
      return "";

    const tip = document.createElement("div");
    let needHR = false;
    if (hit.isElementHit) {

      if (this.settings.showCercula) {
        if (this.settings.showImage) {
          const image = new Image();
          image.src = logo;
          image.width = 150;
          tip.appendChild(image);
          needHR = true;
        }
          const tooltipData = await getToolTipData(hit.sourceId)
        if (tooltipData) {
          if (needHR) {
            tip.appendChild(document.createElement("hr"));
          }
          const div = document.createElement("div")
          //const userLabel = document.createElement("span");
          //userLabel.innerHTML = tooltipData.userLabel;
          //tip.appendChild(userLabel);
          //const category = document.createElement("span");
          //category.innerHTML = tooltipData.category;
          //tip.appendChild(category);
          tip.appendChild(div);
          const material = document.createElement("span");
          material.innerHTML = "Match : " + tooltipData.material;
          tip.appendChild(material);
          tip.appendChild(div);
          const gwp = document.createElement("span");
          gwp.innerHTML = "GWP : " + tooltipData.gwp;
          tip.appendChild(gwp);
          this.settings.showDefaultToolTip = true;
        }
      }
    }

    if (this.settings.showDefaultToolTip) {
      let defaultTip = await super.getToolTip(hit);
      if (typeof defaultTip === "string") {
        const htmlTip = document.createElement("span");
        htmlTip.innerHTML = defaultTip;
        defaultTip = htmlTip;
      }
      tip.appendChild(defaultTip);
    }
    return tip;
  }
}

export const toolAdmin = new CerculaToolAdmin();
