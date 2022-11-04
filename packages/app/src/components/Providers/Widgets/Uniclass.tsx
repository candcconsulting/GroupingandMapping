import { asInstanceOf } from "@bentley/bentleyjs-core";
import { ThemeManager } from "@itwin/appui-react";
import { BentleyCloudRpcManager, BentleyCloudRpcParams, IModelReadRpcInterface } from "@itwin/core-common";
import { IModelApp } from "@itwin/core-frontend";
import { SvgPlaceholder } from "@itwin/itwinui-icons-react";
import { Button, NodeData, ProgressRadial, ProgressRadialProps, Tree, TreeNode } from "@itwin/itwinui-react"
import { consoleDiagnosticsHandler } from "@itwin/presentation-frontend";
import { RouteComponentProps } from "@reach/router";
import React from "react"
import { sqlAPI } from "../../../api/queryAPI";
import {uniclassProductLookup, uniclassSystemLookup} from "../../../data/uniclass"

interface UniclassProps extends RouteComponentProps {
  projectId: string;
  iModelId : string;
}

type TreeData = {
  id: string;
  parentId : string,
  label: string;
  sublabel: string;
  subItems: TreeData[];
};
const Uniclass =() => {

  const [loadedNodes, setLoadedNodes] = React.useState<TreeData[]>([]);
  const [selectedNodes, setSelectedNodes] = React.useState<any>({});
  const [progressStatus, setProgressStatus] = React.useState<ProgressRadialProps>({status: 'negative'})
  const [progressValue, setProgressValue] = React.useState(0)
  
  const treeNodes = React.useRef<TreeData[]>([{
    id: "0",
    parentId : "",
    label: "empty",
    sublabel: "<null>",
    subItems: []}]);
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({})

  const onSelectedNodeChange = React.useCallback(
    (nodeId: string, isSelected: boolean) => 
    {
      // console.log(findNode(nodeId))

      console.log(searchTree(treeNodes.current[1], nodeId))
      if (isSelected) {
          setSelectedNodes((oldSelected : any) => ({ ...oldSelected, [nodeId]: true }));    
      } else {
        setSelectedNodes((oldSelected : any) => ({
          ...oldSelected,
          [nodeId]: false,
        }));
      }
    },[],);

  
  const onNodeExpanded = React.useCallback(
    (nodeId: string, isExpanded: boolean) => {
      console.log(`expanding ${nodeId}`)
      if (isExpanded) {
        setExpandedNodes((oldExpanded) => ({ ...oldExpanded, [nodeId]: true }));        
      } else {
        setExpandedNodes((oldExpanded) => ({
          ...oldExpanded,
          [nodeId]: false,
        }));
      }
    },[],
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
    [expandedNodes],
  );
  const vp = IModelApp.viewManager.selectedView;
  if (!vp) {
    return <div/>;
  }
  const iModelConnection = vp.iModel;
  
  const registerNode = (node : string, childNode : string, parentId : string) => {
    let subLabel = "Invalid Uniclass Code"
    if (node.substring(0,2).toLowerCase() === "ss") {
      const tempLookup = uniclassSystemLookup

      const subId = uniclassSystemLookup.findIndex((o) => o.id === node)
      if (subId >= 0) 
        subLabel = uniclassSystemLookup[subId].title;
      else
        subLabel = "Invalid Uniclass System Code";
    }
    if (node.substring(0,2).toLowerCase() === "pr") {
      const subId = uniclassProductLookup.findIndex((o) => o.id === node)
      if (subId >= 0) 
        subLabel = uniclassProductLookup[subId].title;
      else
        subLabel = "Invalid Uniclass Property Code";
    }
    const aNode : TreeData= {
      id : node,
      parentId ,
      label : node,
      sublabel : subLabel,
      subItems : []
    }
    treeNodes.current = [...treeNodes.current, aNode] 
    return node;
  }

  const searchTree : any = (element : any, matchingId : string) => {
    if(element.id === matchingId){
         return element;
    }else if (element.subItems != null){
         let i;
         let result = null;
         for(i=0; result == null && i < element.subItems.length; i++){
              result = searchTree(element.subItems[i], matchingId);
         }
         return result;
    }
    return null;
}
  const buildTree = (instance : any) => {
    // const subSections = instance.split('_');
    // console.log(instance)
    const sections = instance.uniclassSystem.split('_');
    let prefix = sections[0]
    let parentId = ""
    let currentId = ""
    for (let i = 0; i < sections.length; i = i + 1 ) {      
      const id = treeNodes.current.findIndex((o) => o.id === prefix)
      if (id < 0) {
        let suffix = "_" + sections[i+1]
        if (!sections[i+1])
          suffix = " <Elements>"
        currentId = registerNode(prefix, prefix + suffix, parentId)
        if (parentId !== "") {
          const pid = treeNodes.current.findIndex((o) => o.id === parentId)
          const cid = treeNodes.current.findIndex((o) => o.id === currentId)
          treeNodes.current[pid].subItems.push(treeNodes.current[cid]);          
        }  
      } else
        currentId = treeNodes.current[id].id;
      prefix = prefix + '_' + sections[i+1]
      parentId = currentId
    }
    // now we have the parent id
    const aNode : TreeData= {
      id : instance.id,
      parentId ,
      label : instance.userLabel,
      sublabel : "",
      subItems : []
    }
    const checkId = treeNodes.current.findIndex((o) => o.id === instance.id);
    if (checkId < 0) {
      const id = treeNodes.current.findIndex((o) => o.id === instance.uniclassSystem);
      treeNodes.current[id].subItems.push(aNode);
//      treeNodes.current = [...treeNodes.current, aNode];
    } else {
      // not sure how this could happen
      console.log(`InstanceId ${instance.id} already exists in ${instance.uniclassSystem}`)
    }

  }
  const findNode = (nodeId : string) => {
    const parents = nodeId.split('_');
    let parentId = treeNodes.current.findIndex((o) => o.id === parents[0]);
    let nextLevel = parents[0];
    for (let i= 1; i < parents.length; i++) {
      nextLevel = nextLevel + "_" + parents[i];
      const nextId = treeNodes.current[parentId].subItems.findIndex((o) => o.id === nextLevel);
      if (nextId)
        parentId = nextId
    }
    console.log(treeNodes.current[parentId]);
    return treeNodes.current[parentId]
  }



  const updateProgress = (value : number) => {
    setProgressValue(value)
  }

  const exportUniclass = async (e : any) => {    
    // find all classes that uniclass_System
    // export uniclass system and ecinstances
    // find all classes that have uniclass Product
    // export uniclass product and ecinstances
    const uniclassProducts = "'Uniclass_Product','Classification__x002E__Uniclass__x002E__Pr__x002E__Number', 'Identity_Classification_Uniclass_2015_Pr', 'Identity_Classification_Uniclass_2015_Pr_Code' "
    const uniclassSystems = "'Uniclass_System','Classification__x002E__Uniclass__x002E__Ss__x002E__Number', 'Identity_Classification_Uniclass_2015_Ss', 'Identity_Classification_Uniclass_2015_Ss_Code' "
    
    const tempSystemInstances = await sqlAPI.getUniclass(iModelConnection, uniclassSystems, updateProgress, 0,50)
    // we need to tidy up uniclass System
    console.log(`Systems : ${tempSystemInstances.length}`)
    // first of all drop everything after a space

    const tempProductInstances = await sqlAPI.getUniclass(iModelConnection, uniclassProducts, updateProgress, 50, 100)
    console.log(`Systems : ${tempProductInstances.length}`)

    const treeInstances: any[] = [];
    const productInstances:any[] = [];
    for (const aInstance of tempSystemInstances) {
      // get rid of the spaces
      let nodeString = aInstance.uniclassSystem
      if (aInstance.uniclassSystem.indexOf(' ') > 1) {
        const i = aInstance.uniclassSystem.indexOf(' ');
        nodeString = aInstance.uniclassSystem.substring(0,i);
      }
      if (aInstance.uniclassSystem.indexOf('ST') === 0) {
        nodeString = aInstance.uniclassSystem.substring(2,99);        
      }    
      treeInstances.push({...aInstance, uniclassSystem: nodeString})
    }
    for (const aInstance of tempProductInstances) {
      // get rid of the spaces
      let nodeString = aInstance.uniclassSystem
      if (aInstance.uniclassSystem.indexOf(' ') > 1) {
        const i = aInstance.uniclassSystem.indexOf(' ');
        nodeString = aInstance.uniclassSystem.substring(0,i);
      }
      treeInstances.push({...aInstance, uniclassSystem: nodeString})
    }
    
    for (const instance of treeInstances){ 
      buildTree(instance)
    }
    // now we have an overloaded tree
    try {
      for (let i=0; treeNodes.current.length > 1; i++) {
        if ((treeNodes.current[i].id.toLowerCase() !== "ss") && (treeNodes.current[i].id.toLowerCase() !== "pr"))
          delete treeNodes.current[i];            
      }
    }
    catch (e) {}
    treeNodes.current = treeNodes.current.filter((o) => (o.id));
    setLoadedNodes(treeNodes.current)
    setProgressStatus({status : 'positive'})
  }
  return (
    <div>
      <div style={{display: 'flex', alignItems:"center"}}>
        <Button onClick={exportUniclass}>Build Uniclass</Button>
        <ProgressRadial status={progressStatus.status} value={progressValue} />
      </div>
      <Tree<TreeData>
        
        data={loadedNodes}
        
        getNode={getNode}
        // eslint-disable-next-line react-hooks/rules-of-hooks
        nodeRenderer={React.useCallback(
        ({ node, ...rest }) => 
          (
            <TreeNode
              label={node.label}
              sublabel={node.sublabel}
              onExpanded={onNodeExpanded}
              onSelected={onSelectedNodeChange}
              //icon={<SvgPlaceholder />}
              {...rest}
            />
          ),[onNodeExpanded])}
        />
    </div>
  )
}

export default Uniclass;