import { asInstanceOf } from "@bentley/bentleyjs-core";
import { StatusBarItemsManager } from "@itwin/appui-abstract";
import { ThemeManager } from "@itwin/appui-react";
import { BentleyCloudRpcManager, BentleyCloudRpcParams, ColorDef, IModelReadRpcInterface } from "@itwin/core-common";
import { IModelApp } from "@itwin/core-frontend";
import { SvgPlaceholder } from "@itwin/itwinui-icons-react";
import { Button, NodeData, ProgressRadial, ProgressRadialProps, Tree, TreeNode } from "@itwin/itwinui-react"
import { consoleDiagnosticsHandler } from "@itwin/presentation-frontend";
import { RouteComponentProps } from "@reach/router";
import React, { useEffect } from "react"
import { colourElements } from "../../../api/helperfunctions/elements";
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
  const selectedElements = React.useRef<any[]>([]);
  const [uniclassEnabled, setUniclassEnabled] = React.useState(true);
  
  const treeNodes = React.useRef<TreeData[]>([]);
  const [expandedNodes, setExpandedNodes] = React.useState<Record<string, boolean>>({})

  useEffect(() => {
    return () => {
      setLoadedNodes([]);
      setSelectedNodes({});
      selectedElements.current = [];
      treeNodes.current = [];
      setExpandedNodes({});
    };
  }, []);

  const onSelectedNodeChange = React.useCallback(
    (nodeId: string, isSelected: boolean) => 
    {
      // console.log(findNode(nodeId))
      selectedElements.current = [];
      const searchNode = (nodeId.substring(0,2).toLowerCase() === 'ss') ? 0 : 1
      const currentNode = (searchTree(treeNodes.current[searchNode], nodeId))
      findElements(currentNode)       
      colourElements(vp, selectedElements.current, false);

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
      // console.log(`expanding ${nodeId}`)
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
  
  const registerNode = (node : string, suffix : string, parentId : string) => {
    let subLabel = "Invalid Uniclass Code"
    if (node.substring(0,2).toLowerCase() === "ss") {
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
      sublabel : subLabel + (suffix === "<Elements>" ? suffix : ""),
      subItems : []
    }
    treeNodes.current = [...treeNodes.current, aNode] 
    return node;
  }

  const findElements = (node: any ) => {
    try {
      if (node.subItems[node.subItems.length - 1].sublabel === "<Element>") {
        const tempElements = node.subItems;
        const elements = tempElements.filter((o: any) => o.sublabel === "<Element>").map((o: any ) => o.id)
        selectedElements.current.push(...elements)
        return      
      }
      else if (node.subItems != null){
        for (let i= 0; i< node.subItems.length; i++) {
          void findElements(node.subItems[i])
        }
      }
    }
    catch (e) {return}
    
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
          suffix = "<Elements>"
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
      sublabel : "<Element>",
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


  const updateProgress = (value : number) => {
    setProgressValue(value)
  }

  const exportUniclass = async (e : any) => {    
    // find all classes that uniclass_System
    // export uniclass system and ecinstances
    // find all classes that have uniclass Product
    // export uniclass product and ecinstances
    setProgressStatus({status: undefined})
    setUniclassEnabled(false)
    const uniclassProducts = "'Uniclass_Product','Classification__x002E__Uniclass__x002E__Pr__x002E__Number', 'Identity_Classification_Uniclass_2015_Pr', 'Identity_Classification_Uniclass_2015_Pr_Code' "
    const uniclassSystems = "'Uniclass_System','Classification__x002E__Uniclass__x002E__Ss__x002E__Number', 'Identity_Classification_Uniclass_2015_Ss', 'Identity_Classification_Uniclass_2015_Ss_Code' "
    
    const tempSystemInstances = await sqlAPI.getUniclass(iModelConnection, uniclassSystems, updateProgress, 0,50)
    // we need to tidy up uniclass System
    //console.log(`Systems : ${tempSystemInstances.length}`)
    // first of all drop everything after a space

    const tempProductInstances = await sqlAPI.getUniclass(iModelConnection, uniclassProducts, updateProgress, 50, 100)
    //console.log(`Systems : ${tempProductInstances.length}`)

    const treeInstances: any[] = [];    
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
    treeInstances.filter((o) => (o.id.substring(0,2).toLowerCase !== "ss" || o.id.substring(0,2).toLowerCase !== "pr" ))
    // only handle ss and pr
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
        <Button onClick={exportUniclass} disabled = {!uniclassEnabled}>Build Uniclass</Button>
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