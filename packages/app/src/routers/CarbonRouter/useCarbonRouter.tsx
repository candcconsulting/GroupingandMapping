/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { IModelFull } from "@itwin/create-imodel-react";
import { SvgCloudUpload } from "@itwin/itwinui-icons-react";
import { useNavigate } from "@reach/router";
import React from "react";

export const useCarbonIModelAction = () => {
  const navigate = useNavigate();
  return {
    carbonAction: React.useMemo(
      () => ({
        key: "esg",
        icon: <SvgCloudUpload />,
        onClick: (iModel: IModelFull) =>
          void navigate(
            `/esg/project/${iModel.projectId}/imodel/${iModel.id}`
          ),
        children: "ESG",
      }),
      [navigate]
    ),
  };
};