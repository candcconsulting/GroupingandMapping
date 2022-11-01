/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import {
  ComboBox,
} from "@itwin/itwinui-react";
import React from "react";

import {
  SkeletonCell,
  SkeletonCellProps,
} from "../../SynchronizationRouter/components/SkeletonCell";
import "../../MembersRouter/components/EditMemberRoleCell.scss";

export interface EditEPDCellProps extends SkeletonCellProps {
  epds: any;
  mapping : any;
  projectId: string;
  accessToken: string;
  onDataUpdated(): Promise<void>;
  onError(errorString: string): void;
  storeMapping: any;
  children : React.ReactNode;
}

export const EditEPDCell = ({children, ...props} : any) => {
  const {
    row,
    epdOptions,
    mapping,
    storeMapping
  } = props;


  const [optionMaterial, setOptionMaterial] = React.useState(row?.original?.material)

   
  const saveCategoryEPD = (value : string) => {
    console.log(row?.original?.category, value)  
    setOptionMaterial(value) 
    if (mapping.categories[row?.original?.category])
    {
      mapping.categories[row?.original?.category] = value
    } 
    else
    {
      // const cat : string = JSON.stringify(row?.original?.category);   
      mapping.categories[row?.original?.category] = value;
      console.log (mapping)
    }
    storeMapping(mapping);

  }

  // const FilteredComboBox = ({...props}) => <ComboBox value={optionMaterial} options = {epdOptions} onChange ={(value: string) => saveCategoryEPD(value)} {...props} />

  return (
    <ComboBox value={optionMaterial} options = {epdOptions} onChange ={(value: string) => saveCategoryEPD(value)} enableVirtualization />    
  );
};

