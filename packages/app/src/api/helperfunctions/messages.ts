/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { toaster } from "@itwin/itwinui-react";

export const displayNegativeToast = (content: string) => {
  toaster.setSettings({
    placement: "top",
    order: "descending",
  });
  toaster.negative(content, {
    duration: 7000,
    hasCloseButton: false,
    type: "temporary",
  });
};

export const displayWarningToast = (content: string) => {
  toaster.setSettings({
    placement: "top",
    order: "descending",
  });
  toaster.warning(content, {
    duration: 7000,
    hasCloseButton: false,
    type: "temporary",
  });
};

