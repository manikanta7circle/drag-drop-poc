import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Node } from './data.model';
@Injectable({
  providedIn: 'root'
})

export class DragService {
  dataChange = new BehaviorSubject<Node[]>([]);
  data: Node[]
  Data: Node[] = [
    {
      item: "AP Bio 1214 Homework",
      type: 3,
      sequenceId: 1,
      isActive: false
    },
    {
      item: "Cell Communication and the Cell Cycle",
      type: 1,
      sequenceId: 1,
      children: [
        {
          item: "Template 1",
          type: 3,
          sequenceId:1,
          isActive: true
        },
        {
          item: "Template 2",
          type: 3,
          sequenceId: 2,
          isActive: true
        },
        {
          item: "Template 3",
          type: 3,
          sequenceId: 3,
          isActive: true
        },
        {
          item: "3.1 Signal Transduction",
          type: 2,
          sequenceId: 1,
          children: [
            {
              item: "Week 1 Homework",
              type: 3,
              sequenceId: 1,
              isActive: false
            },
            {
              item: "Week 2 Homework",
              type: 3,
              sequenceId: 2,
              isActive: true
            }
          ]
        },
        {
          item: "3.2 Signal Transfer",
          type: 2,
          sequenceId: 2,
          children: [{
            item: "Week 2 Homework",
            type: 3,
            sequenceId:1,
            isActive: true
          }]
        }
      ]
    },
    {
      item: "Cell Structure and Function",
      type: 1,
      sequenceId: 2,
      children: [
        {
          item: "Template 4",
          type: 3,
          sequenceId: 1,
          isActive: false
        },
        {
          item: "Template 5",
          type: 3,
          sequenceId: 2,
          isActive: true
        },
        {
          item: "Template 6",
          type: 3,
          sequenceId: 3,
          isActive: true
        }
      ]
    },
    {
      item: "Template 1",
      type: 3,
      sequenceId: 1,
      isActive: false
    }
  ]

  constructor() {
    this.dataChange.subscribe(d => this.data=d)
    this.dataChange.next(this.Data);
  }


  /**
   * Move Item from one place to another
   * from Node to To node based on operation call
   * the respective method
   * @param from 
   * @param to 
   * @param operation 
   * @returns 
   */
  moveItem(from: Node, to: Node, operation:number): Node{
    let newItem: Node;
    if(operation == 1 || operation == 2){
      newItem = this.insertItemAboveOrBelow(to, from, operation);
    }
    if(operation == 3){
      newItem = this.insertItem(to, from.item, from.type,from.sequenceId, from);
    }
    if (from.children) {
      from.children.forEach(child => {
        this.copyPasteItem(child, newItem);
      });
    }
    return newItem;
  }

  /**
   * Inserting item from node to To Node
   * @param parent 
   * @param name 
   * @param type 
   * @param sequenceId 
   * @param from 
   * @returns 
   */
  insertItem(parent: Node, name: string, type: number, sequenceId: number, from?:Node): Node {
    if (!parent.children) {
      parent.children = [];
    }
    let newItem : Node;
    if(from){
      newItem = {...from, children:undefined};
    }
    else{
      newItem = {item:name, type, sequenceId, children:[]};
    }
    if(parent.type == 1 && from.type ==1 && !from.children.some(child => child.type==2)){
      newItem.type = 2
    }
    if(newItem.type == 2){
      parent.children.push(newItem);
    }
    else{
      parent.children.unshift(newItem);
    }
    
    this.dataChange.next(this.data);
    return newItem;
  }


  /**
   * Insert Drag node above or below of the target node
   */
  insertItemAboveOrBelow(node:Node, from: Node, operation: number): Node{
    const parentNode = this.getParentFromNodes(node);
    const newItem: Node = { ...from, children: undefined }
    if(from.type == 2  && node.type ==1){
      newItem.type = 1;
    }
    if(from.type == 1 && node.type ==2 ){
      newItem.type = 2;
    }
    if (parentNode != null) {
      if(operation == 1){
        parentNode.children.splice(parentNode.children.indexOf(node), 0, newItem);
      }
      if(operation == 2){
        parentNode.children.splice(parentNode.children.indexOf(node) + 1, 0, newItem);
      }
    } else {
      if(operation == 1){
        this.data.splice(this.data.indexOf(node), 0, newItem);
      }
      if(operation == 2){
        this.data.splice(this.data.indexOf(node) + 1, 0, newItem);
      }
    }
    this.dataChange.next(this.data);
    return newItem;
  }

  
  /**
   * copy the same children from node
   * @param node 
   * @returns 
   */
  copyPasteItem(from: Node, to: Node): Node {
    const newItem = this.insertItem(to, from.item, from.type,from.sequenceId, from);
    if (from.children) {
      from.children.forEach(child => {
        this.copyPasteItem(child, newItem);
      });
    }
    return newItem;
  }

  getParentFromNodes(node: Node): Node {
    for (let i = 0; i < this.data.length; ++i) {
      const currentRoot = this.data[i];
      const parent = this.getParent(currentRoot, node);
      if (parent != null) {
        return parent;
      }
    }
    return null;
  }


  getParent(currentRoot: Node, node: Node): Node {
    if (currentRoot.children && currentRoot.children.length > 0) {
      for (let i = 0; i < currentRoot.children.length; ++i) {
        const child = currentRoot.children[i];
        if (child === node) {
          return currentRoot;
        } else if (child.children && child.children.length > 0) {
          const parent = this.getParent(child, node);
          if (parent != null) {
            return parent;
          }
        }
      }
    }
    return null;
  }

  /**
   * Update the name of the data when Rename
   * @param node 
   * @param name 
   */
  updateItem(node: Node, name: string) {
    node.item = name;
    this.dataChange.next(this.data);
  }

  /**
   * Delete node From the Data
   * @param node 
   */
  deleteItem(node: Node) {
    this.deleteNode(this.data, node);
    this.dataChange.next(this.data);
  }

  /**
   * Delete Node Data Recursively when node having childrens
   * @param nodes 
   * @param nodeToDelete 
   */

  deleteNode(nodes: Node[], nodeToDelete: Node) {
    const index = nodes.indexOf(nodeToDelete, 0);
    if (index > -1) {
      nodes.splice(index, 1);
    } else {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.deleteNode(node.children, nodeToDelete);
        }
      });
    }
  }

  /**
   * Insert New Group into the list
   * @param name 
   */
  insertGroup(name: string){
    const newItem :Node = {
      item: name,
      type: 1,
      sequenceId: 1,
      children: []
    }
    this.data.unshift(newItem)
    this.dataChange.next(this.data)
  }

  /**
   * Insert Template into the list
   * @param name 
   */
  insertTemplate(name: string){
    const newItem: Node = {
      item: name,
      type: 3,
      sequenceId: 1,
      isActive: false
    }
    this.data.push(newItem)
    this.dataChange.next(this.data)
  }

  renameItem(node:Node){
    this.rename(this.data,node)
  }

  rename(nodes: Node[], nodeToDelete: Node) {
    const index = nodes.indexOf(nodeToDelete, 0);
    if (index > -1) {
      nodes.splice(index, 1);
    } else {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          this.rename(node.children, nodeToDelete);
        }
      });
    }
  }

  updateStatus(node: Node,value: boolean){
    node.isActive = value;
    this.dataChange.next(this.data);
  }

    /**
   * Set the Sequence when dropping the element from node to To Node
   * @param from 
   * @param to 
   */
    setSequence(from: Node, to: Node){
        this.sett(to, from)
        this.sett(from, from)
      
    }
    sett(node: Node, check:Node){
      const parentNode = this.getParentFromNodes(node);
      if(node.type == 3 && parentNode && parentNode.children && parentNode.children.length>0){
        let sequenceId = 1;
        parentNode.children.forEach((item)=>{
          if(item.type ==3 && item !== check){
            item.sequenceId = sequenceId;
            sequenceId++
          }
        })
        this.dataChange.next(this.data)
      }
      if(node.type == 2){
        let sequenceId = 1;
        parentNode.children.forEach((item)=>{
          if(item.type ==2 && item !== check){
            item.sequenceId = sequenceId;
            sequenceId++
          }
        })
        this.dataChange.next(this.data)
      }
      if(node.type==1){
        let sequenceId = 1;
        this.data.forEach((item)=>{
          if(item.type==1 && item !== check){
            item.sequenceId = sequenceId;
            sequenceId++
          }
        })
        this.dataChange.next(this.data)
  
      }
    }
  
}