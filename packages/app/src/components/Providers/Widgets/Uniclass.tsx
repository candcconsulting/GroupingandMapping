/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *
 * This code is for demonstration purposes and should not be considered production ready.
 *--------------------------------------------------------------------------------------------*/
import { IModelApp } from "@itwin/core-frontend";
import {
  SvgVisibilityHalf,
  SvgVisibilityShow,
} from "@itwin/itwinui-icons-react";
import {
  Button,
  Checkbox,
  NodeData,
  ProgressRadial,
  ProgressRadialProps,
  Tree,
  TreeNode,
} from "@itwin/itwinui-react";
import { RouteComponentProps } from "@reach/router";
import React, { useEffect } from "react";

import {
  colourElements,
  hideElements,
  resetElements,
} from "../../../api/helperfunctions/elements";
import { sqlAPI } from "../../../api/queryAPI";
import {
  uniclassProductLookup,
  uniclassSystemLookup,
} from "../../../data/uniclass";

interface UniclassProps extends RouteComponentProps {
  projectId: string;
  iModelId: string;
}

type TreeData = {
  id: string;
  parentId: string;
  label: string;
  sublabel: string;
  subItems: TreeData[];
  isExpanded: boolean;
  isVisible: boolean;
};
const Uniclass = () => {
  const [loadedNodes, setLoadedNodes] = React.useState<TreeData[]>([]);

  const [progressStatus, setProgressStatus] = React.useState<
    ProgressRadialProps
  >({ status: "negative" });
  const [progressValue, setProgressValue] = React.useState(0);
  const selectedElements = React.useRef<any[]>([]);
  const [invisibleNodes, setInvisibleNodes] = React.useState<any>([]);
  const [uniclassEnabled, setUniclassEnabled] = React.useState(true);

  const treeNodes = React.useRef<TreeData[]>([]);
  const [expandedNodes, setExpandedNodes] = React.useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    return () => {
      setLoadedNodes([]);
      selectedElements.current = [];
      treeNodes.current = [];
      setExpandedNodes({});
      setInvisibleNodes([]);
    };
  }, []);

  const onVisibilityChanged = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, node: TreeData) => {
      node.isVisible = !node.isVisible;
      /*
    setLoadedNodes(nodes => {
      const updatedNodeIndex = nodes.findIndex(n => n.id === node.id)
      const updatedNode = nodes[updatedNodeIndex]
      nodes[updatedNodeIndex] = {...updatedNode, isVisible : !updatedNode.isVisible}
      return [...nodes] 
    }) */
      setInvisibleNodes((oldInvisible: any) => ({
        ...oldInvisible,
        [node.id]: !node.isVisible,
      }));

      event.stopPropagation();
    },
    []
  );

  const onSelectedNodeChange = React.useCallback(
    (nodeId: string, isSelected: boolean) => {
      // console.log(findNode(nodeId))
      selectedElements.current = [];
      let prNode = 1;
      let ssNode = 0;
      if (treeNodes.current[0].id === "Pr") {
        prNode = 0;
        ssNode = 1;
      }

      const searchNode =
        nodeId.substring(0, 2).toLowerCase() === "ss" ? ssNode : prNode;
      const currentNode = searchTree(treeNodes.current[searchNode], nodeId);

      findElements(currentNode);
      if (currentNode.isVisible === true) {
        colourElements(vp, selectedElements.current, false);
      } else {
        hideElements(vp, selectedElements.current);
      }
    },
    []
  );

  const onNodeExpanded = React.useCallback(
    (nodeId: string, isExpanded: boolean) => {
      // console.log(`expanding ${nodeId}`)
      if (isExpanded) {
        setExpandedNodes((oldExpanded) => ({ ...oldExpanded, [nodeId]: true }));
      } else {
        setExpandedNodes((oldExpanded) => ({
          ...oldExpanded,
          [nodeId]: false,
        }));
      }
    },
    []
  );

  const getNode = React.useCallback(
    (node: TreeData): NodeData<TreeData> => {
      return {
        subNodes: node.subItems,
        nodeId: node.id,
        node: node,
        isExpanded: expandedNodes[node.id],
        hasSubNodes: node.subItems.length > 0,
      };
    },
    [expandedNodes]
  );
  const vp = IModelApp.viewManager.selectedView;
  if (!vp) {
    return <div />;
  }
  const iModelConnection = vp.iModel;

  const registerNode = (node: string, suffix: string, parentId: string) => {
    let subLabel = "Invalid Uniclass Code";
    if (node.substring(0, 2).toLowerCase() === "ss") {
      const subId = uniclassSystemLookup.findIndex((o) => o.id === node);
      if (subId >= 0) {
        subLabel = uniclassSystemLookup[subId].title;
      } else {
        subLabel = "Invalid Uniclass System Code";
      }
    }
    if (node.substring(0, 2).toLowerCase() === "pr") {
      const subId = uniclassProductLookup.findIndex((o) => o.id === node);
      if (subId >= 0) {
        subLabel = uniclassProductLookup[subId].title;
      } else {
        subLabel = "Invalid Uniclass Property Code";
      }
    }
    const aNode: TreeData = {
      id: node,
      parentId,
      label: node,
      sublabel: subLabel + (suffix === "<Elements>" ? suffix : ""),
      subItems: [],
      isExpanded: false,
      isVisible: true,
    };
    treeNodes.current = [...treeNodes.current, aNode];
    return node;
  };

  const findElements = (node: any) => {
    try {
      if (node.subItems[node.subItems.length - 1].sublabel === "<Element>") {
        const tempElements = node.subItems;
        const elements = tempElements
          .filter((o: any) => o.sublabel === "<Element>")
          .map((o: any) => o.id);
        selectedElements.current.push(...elements);
        return;
      } else if (node.subItems != null) {
        for (let i = 0; i < node.subItems.length; i++) {
          void findElements(node.subItems[i]);
        }
      }
    } catch (e) {
      return;
    }
  };

  const searchTree: any = (element: any, matchingId: string) => {
    if (element.id === matchingId) {
      return element;
    } else if (element.subItems != null) {
      let i;
      let result = null;
      for (i = 0; result == null && i < element.subItems.length; i++) {
        result = searchTree(element.subItems[i], matchingId);
      }
      return result;
    }
    return null;
  };
  const buildTree = (instance: any) => {
    // const subSections = instance.split('_');
    // console.log(instance)
    const sections = instance.uniclassSystem.split("_");
    let prefix = sections[0];
    let parentId = "";
    let currentId = "";
    for (let i = 0; i < sections.length; i = i + 1) {
      const id = treeNodes.current.findIndex((o) => o.id === prefix);
      if (id < 0) {
        let suffix = "_" + sections[i + 1];
        if (!sections[i + 1]) {
          suffix = "<Elements>";
        }
        currentId = registerNode(prefix, prefix + suffix, parentId);
        if (parentId !== "") {
          const pid = treeNodes.current.findIndex((o) => o.id === parentId);
          const cid = treeNodes.current.findIndex((o) => o.id === currentId);
          treeNodes.current[pid].subItems.push(treeNodes.current[cid]);
        }
      } else {
        currentId = treeNodes.current[id].id;
      }
      prefix = prefix + "_" + sections[i + 1];
      parentId = currentId;
    }
    // now we have the parent id
    const aNode: TreeData = {
      id: instance.id,
      parentId,
      label: instance.userLabel,
      sublabel: "<Element>",
      subItems: [],
      isExpanded: false,
      isVisible: false,
    };
    const checkId = treeNodes.current.findIndex((o) => o.id === instance.id);
    if (checkId < 0) {
      const id = treeNodes.current.findIndex(
        (o) => o.id === instance.uniclassSystem
      );
      treeNodes.current[id].subItems.push(aNode);
      //      treeNodes.current = [...treeNodes.current, aNode];
    } else {
      // not sure how this could happen
      console.log(
        `InstanceId ${instance.id} already exists in ${instance.uniclassSystem}`
      );
    }
  };

  const updateProgress = (value: number) => {
    setProgressValue(value);
  };

  const exportUniclass = async (e: any) => {
    // find all classes that uniclass_System
    // export uniclass system and ecinstances
    // find all classes that have uniclass Product
    // export uniclass product and ecinstances
    setProgressStatus({ status: undefined });
    setUniclassEnabled(false);
    const uniclassProducts =
      "'Uniclass_Product','Classification__x002E__Uniclass__x002E__Pr__x002E__Number', 'Identity_Classification_Uniclass_2015_Pr', 'Identity_Classification_Uniclass_2015_Pr_Code','ObjectClassification_Uniclass2015','Uniclass2015', 'ObjectClassification__x002f____x0040__Uniclass2015_Pr' ";
    const uniclassSystems =
      "'Uniclass_System','Classification__x002E__Uniclass__x002E__Ss__x002E__Number', 'Identity_Classification_Uniclass_2015_Ss', 'Identity_Classification_Uniclass_2015_Ss_Code', 'ObjectClassification__x002F____x0040__Uniclass2015' ";

    const tempSystemInstances = await sqlAPI.getUniclass(
      iModelConnection,
      uniclassSystems,
      updateProgress,
      0,
      50
    );
    // we need to tidy up uniclass System
    //console.log(`Systems : ${tempSystemInstances.length}`)
    // first of all drop everything after a space

    const tempProductInstances = await sqlAPI.getUniclass(
      iModelConnection,
      uniclassProducts,
      updateProgress,
      50,
      100
    );
    //console.log(`Systems : ${tempProductInstances.length}`)

    const treeInstances: any[] = [];
    for (const aInstance of tempSystemInstances) {
      // get rid of the spaces
      let nodeString = aInstance.uniclassSystem;
      if (aInstance.uniclassSystem.indexOf(" ") > 1) {
        const i = aInstance.uniclassSystem.indexOf(" ");
        nodeString = aInstance.uniclassSystem.substring(0, i);
      }
      if (aInstance.uniclassSystem.indexOf("ST") === 0) {
        nodeString = aInstance.uniclassSystem.substring(2, 99);
      }
      treeInstances.push({ ...aInstance, uniclassSystem: nodeString });
    }
    for (const aInstance of tempProductInstances) {
      // get rid of the spaces
      let nodeString = aInstance.uniclassSystem;
      if (aInstance.uniclassSystem.indexOf(" ") > 1) {
        const i = aInstance.uniclassSystem.indexOf(" ");
        nodeString = aInstance.uniclassSystem.substring(0, i);
      }
      treeInstances.push({ ...aInstance, uniclassSystem: nodeString });
    }
    treeInstances.filter(
      (o) =>
        o.id.substring(0, 2).toLowerCase !== "ss" ||
        o.id.substring(0, 2).toLowerCase !== "pr"
    );
    // only handle ss and pr
    for (const instance of treeInstances) {
      buildTree(instance);
    }
    // now we have an overloaded tree
    try {
      for (let i = 0; treeNodes.current.length > 1; i++) {
        if (
          treeNodes.current[i].id.toLowerCase() !== "ss" &&
          treeNodes.current[i].id.toLowerCase() !== "pr"
        ) {
          delete treeNodes.current[i];
        }
      }
    } catch (e) {}
    treeNodes.current = treeNodes.current.filter((o) => o.id);
    setLoadedNodes(treeNodes.current);
    setProgressStatus({ status: "positive" });
  };

  const resetDisplay = (e: any, showHidden: boolean) => {
    resetElements(vp, showHidden);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <Button onClick={exportUniclass} disabled={!uniclassEnabled}>
          Build Uniclass
        </Button>
        <ProgressRadial status={progressStatus.status} value={progressValue} />
        <SvgVisibilityShow
          color="#000000"
          onClick={(e) => resetDisplay(e, true)}
          width="30"
          textDecoration={"Show All"}
        />
        <SvgVisibilityHalf
          color="#8b8f8c"
          onClick={(e) => resetDisplay(e, false)}
          width="30"
          textDecoration={"Show Unhidden"}
        />
      </div>
      <Tree<TreeData>
        data={loadedNodes}
        getNode={getNode}
        // eslint-disable-next-line react-hooks/rules-of-hooks
        nodeRenderer={React.useCallback(
          ({ node, ...rest }) => (
            <TreeNode
              label={node.label}
              sublabel={node.sublabel}
              onExpanded={onNodeExpanded}
              checkbox={
                <Checkbox
                  variant="eyeball"
                  checked={node.isVisible}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onVisibilityChanged(e, node)}
                />
              }
              onSelected={onSelectedNodeChange}
              //icon={<SvgPlaceholder />}
              {...rest}
            />
          ),
          [
            onNodeExpanded,
            onSelectedNodeChange,
            onVisibilityChanged,
            invisibleNodes,
          ]
        )}
      />
    </div>
  );
};

export default Uniclass;
