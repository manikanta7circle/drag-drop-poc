import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { Filter, FlatNode, Node } from './data.model';
import { DragService } from './drag.service';
import { ThemePalette } from '@angular/material/core';
import { DialogComponent } from './dialog/dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<FlatNode, Node>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<Node, FlatNode>();

  /**Control the tree to expand and Collapse */
  treeControl: FlatTreeControl<FlatNode>;

  /**we will flat nodes from the nested data */
  treeFlattener: MatTreeFlattener<Node, FlatNode>;

  /**Data Source for Tree */
  dataSource: MatTreeFlatDataSource<Node, FlatNode>;

  /**Selection list */
  checklistSelection = new SelectionModel<FlatNode>(true /* multiple */);

  color: ThemePalette = 'accent';

  /**Restriction toggle value */
  isChecked = false;

  /** Filter List  */
  filters: Filter[] = [
    { key: 0, value: 'All' },
    { key: 1, value: 'Active' },
    { key: 2, value: 'Inactive' }
  ]

  /**Varaible for selected value */
  selectedFilter: number = 0;

  /**Variable search input */
  searchInput: string = '';

  /**Clone Object for undo */
  tempclone: Node[];

  /**Rename variable to get input from modal */
  renameString: string;

  /**boolean for all nodes selected or not */
  allSelected: boolean = false;

  /* Drag and drop */
  dragNode: any;
  dragNodeExpandOverWaitTimeMs = 300;
  dragNodeExpandOverNode: any;
  dragNodeExpandOverTime: number;
  dragNodeExpandOverArea: string;

  @ViewChild('emptyItem') emptyItem: ElementRef;

  constructor(private database: DragService, private _snackBar: MatSnackBar, public dialog: MatDialog) {
    this.treeFlattener = new MatTreeFlattener(this.transformer, this.getLevel, this.isExpandable, this.getChildren);
    this.treeControl = new FlatTreeControl<FlatNode>(this.getLevel, this.isExpandable);

    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    /**Subscribing the data from the Subject which is in Service */
    database.dataChange.subscribe(data => {
      this.dataSource.data = [];
      this.dataSource.data = data;
    });
  }

  ngAfterViewInit() {
    this.treeControl.collapseAll()
    this.updateFilterItems()
  }

  getLevel = (node: FlatNode) => node.level;

  getType = (node: FlatNode) => node.type;

  isExpandable = (node: FlatNode) => node.expandable;

  getChildren = (node: Node): Node[] => node.children;

  hasChild = (_: number, _nodeData: FlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: FlatNode) => _nodeData.item === '';

  /**
   * Transform Function to set properties in flat node
   * @param node 
   * @param level 
   * @returns 
   */
  transformer = (node: Node, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode = existingNode && existingNode.item === node.item
      ? existingNode
      : {} as FlatNode;
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.type = node.type;
    flatNode.sequenceId = node.sequenceId;
    flatNode.isActive = node.isActive
    flatNode.expandable = (node.children && node.children.length >= 0);
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  }

  /**
   * Check the all child nodes are selected or not
   * @param node 
   * @returns 
   */
  descendantsAllSelected(node: FlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    if (descendants.length > 0) {
      return descendants.every(child => this.checklistSelection.isSelected(child));
    }
    return undefined
  }

  /**
   * Check the child nodes partially selected or not
   * @param node 
   * @returns 
   */
  descendantsPartiallySelected(node: FlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.checklistSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /**
   * Toggle slection for node
   * @param node 
   */
  todoItemSelectionToggle(node: FlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);
    console.log(this.checklistSelection.selected.filter(item => item.type))
  }

  /**
   * Adding subGroup under the Group
   * @param node 
   */
  addSubGroup(node: FlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    this.database.insertItem(parentNode, '', 2, null);
    this.treeControl.expand(node);
  }

  /**
   * 
   * @param node 
   * @param itemValue 
   */
  saveNode(node: FlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.updateItem(nestedNode, itemValue);
  }

  /**
   *Updating Status of template
   */
  updateActiveStatus(node: FlatNode, value: boolean) {
    const nestedNode = this.flatNodeMap.get(node);
    this.database.updateStatus(nestedNode, value);
  }

  /**
   * this method triggered when the drag start
   * @param event 
   * @param node 
   */
  handleDragStart(event, node) {
    this.dragNode = node;
    this.treeControl.collapse(node);
  }

  /**
   * this method trigger when drag and hover on a element
   * @param event 
   * @param node 
   */
  handleDragOver(event, node) {
    event.preventDefault();
    event.stopPropagation();

    this.dragNodeExpandOverNode = node;
    this.dragNodeExpandOverTime = new Date().getTime();
    const percentageY = event.offsetY / event.target.clientHeight;
    if (percentageY < 0.25) {
      this.dragNodeExpandOverArea = 'above';
    } else if (percentageY > 0.75) {
      this.dragNodeExpandOverArea = 'below';
    } else {
      this.dragNodeExpandOverArea = 'center';
    }
  }

  /**
   * this Method triggered when we drop an element
   * @param event 
   * @param node 
   */
  handleDrop(event, node) {
    event.preventDefault();
    if (node !== this.dragNode) {
      if (this.isChecked) {
        if (this.dragNode.type == 1 && node.type <= 2) {
          if (this.dragNodeExpandOverArea === 'above') {
            let nodeDetails = this.flatNodeMap.get(this.dragNode)
            if (node.type == 1 || nodeDetails && nodeDetails.children && !nodeDetails.children.some(child => child.type === 2)) {
              this.UpdateDataOnDrop(node, 1)
            }

          }
          if (this.dragNodeExpandOverArea === 'below') {
            let nodeDetails = this.flatNodeMap.get(this.dragNode)
            if (node.type == 1 || nodeDetails && nodeDetails.children && !nodeDetails.children.some(child => child.type === 2)) {
              this.UpdateDataOnDrop(node, 2)
            }
          }
          if (this.dragNodeExpandOverArea === 'center' && node.type == 1) {
            let nodeDetails = this.flatNodeMap.get(this.dragNode)
            if (nodeDetails && nodeDetails.children && !nodeDetails.children.some(child => child.type === 2)) {
              this.UpdateDataOnDrop(node, 3)
            }
          }
        }
        if (this.dragNode.type == 2) {
          if (this.dragNodeExpandOverArea === 'center' && node.type == 1) {
            this.UpdateDataOnDrop(node, 3)
          }
          if (this.dragNodeExpandOverArea === 'above' && node.type == this.dragNode.type) {
            this.UpdateDataOnDrop(node,1)
          }
          if (this.dragNodeExpandOverArea === 'below' && node.type == this.dragNode.type) {
            this.UpdateDataOnDrop(node, 2)
          }
        }
        if (this.dragNode.type == 3) {
          if (this.dragNodeExpandOverArea === 'above' && node.type != 2) {
            this.UpdateDataOnDrop(node,1)
          }
          if (this.dragNodeExpandOverArea === 'below' && node.type != 2) {
            this.UpdateDataOnDrop(node, 2)
          }
          if (this.dragNodeExpandOverArea === 'center' && node.type !== this.dragNode.type) {
            this.UpdateDataOnDrop(node, 3)
          }
        }
      }
      else {
        if (this.dragNodeExpandOverArea === 'above') {
          this.UpdateDataOnDrop(node,1)
        } else if (this.dragNodeExpandOverArea === 'below') {
          this.UpdateDataOnDrop(node, 2)
        } else {
          this.UpdateDataOnDrop(node, 3)
        }

      }
    }

    this.dragNode = null;
    this.dragNodeExpandOverNode = null;
    this.dragNodeExpandOverTime = 0;
  }

  UpdateDataOnDrop(node, operation: number) {
    let newItem: Node;
    this.tempclone = JSON.parse(JSON.stringify(this.database.data));
    newItem = this.database.moveItem(this.flatNodeMap.get(this.dragNode), this.flatNodeMap.get(node), operation);
    this.database.setSequence(this.flatNodeMap.get(this.dragNode), this.flatNodeMap.get(node))
    this.database.deleteItem(this.flatNodeMap.get(this.dragNode));
    this.checklistSelection.deselect(this.dragNode)
    if (operation == 3) {
      this.treeControl.expand(node);
    }
    this.updateFilterItems()
  }

  handleDragEnd(event) {
    this.dragNode = null;
    this.dragNodeExpandOverNode = null;
    this.dragNodeExpandOverTime = 0;
  }

  /**
   * Expand All Nodes
   */
  expandAll() {
    this.treeControl.expandAll();
  }

  /**Collapse all Nodes
   * 
   */
  collapseAll() {
    this.treeControl.collapseAll();
  }

  //Select and deslect All Nodes
  selectOrDeselectAll() {
    this.allSelected = !this.allSelected
    console.log(this.allSelected)
    if (this.allSelected) {
      this.checklistSelection.clear()
    }
    const t = this.treeControl.dataNodes
    t.forEach(node => {
      this.checklistSelection.toggle(node);
    })
  }

  /**
   * Filtering the Data when Filter Change
   */
  onFilterChange() {
    if (this.selectedFilter !== 0) {
      this.database.dataChange.next(this.database.Data)
      let templatesData = []
      this.database.data.map(group => {
        if (group.children) {
          let groupLevelTemplates = group.children.filter(temp => temp.type === 3 && this.selectedFilter == 1 ? temp.isActive == true : temp.isActive == false)
          let SubGroupTemplates = []
          group.children.map((child) => {
            if (child.children) {
              let subGroupLevelTemplates = child.children.filter(temp => temp.type === 3 && this.selectedFilter == 1 ? temp.isActive == true : temp.isActive == false)
              SubGroupTemplates.push({ ...child, children: [...subGroupLevelTemplates] })
            }
          })
          templatesData.push({ ...group, children: [...groupLevelTemplates, ...SubGroupTemplates] })
        }
        else {
          if (this.selectedFilter == 1 ? group.isActive == true : group.isActive == false) {
            templatesData.push(group)
          }
        }
      })
      this.database.dataChange.next(templatesData)
    }
    else {
      this.database.dataChange.next(this.database.Data)
    }
  }

  /**
   * Method to filter item based on Search
   */
  updateFilterItems() {
    if (this.searchInput) {
      const filterItems: Node[] = [];
      const filterText = this.searchInput.toLocaleLowerCase();
      this.database.data.forEach((item) => {
        const newItem = this.filterItems(item, filterText)
        if (newItem) {
          filterItems.push(newItem);
        }
      });
      this.dataSource.data = filterItems
    }
    else {
      this.dataSource.data = this.database.data
      this.onFilterChange()
    }
  }
  
  /**
   * Recursive Function to filter the Items
   * @param item 
   * @param filterText 
   * @returns 
   */
  filterItems(item: Node, filterText: string) {
    const isMatch = item.item.toLocaleLowerCase().includes(filterText)
    if (isMatch) {
      if (this.selectedFilter == 0 || item.isActive == undefined) {
        return item;
      }
      if (this.selectedFilter == 1) {
        if (item.isActive == true) {
          return item;
        }
      }
      else {
        if (item.isActive == false) {
          return item
        }
      }
    }
    else {
      if (item.children) {
        const children: Node[] = []
        item.children.forEach(child => {
          const newChild = this.filterItems(child, filterText)
          if (newChild) {
            children.push(newChild)
          }
        });
        if (children.length > 0) {
          return { ...item, children: [...children] }
        }
      }
    }
    return undefined
  }

  Undo() {
    if (this.tempclone)
      this.database.dataChange.next(this.tempclone)
  }


  delete(node) {
    this.database.deleteItem(this.flatNodeMap.get(node))
  }

  /**
   * Method to create a new group
   */
  addGroup() {
    const dialogRef = this.dialog.open(DialogComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.length > 0) {
        this.renameString = result;
        this.database.insertGroup(this.renameString)
      }
    })
  }

  /*
   *Method to create a Template 
   */
  createTemplate() {
    const dialogRef = this.dialog.open(DialogComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.length > 0) {
        this.renameString = result;
        this.database.insertTemplate(this.renameString)
      }
    })
  }

  /**
   * Method to rename the group/SubGroup/Template
   * @param node 
   */
  rename(node: FlatNode) {
    const dialogRef = this.dialog.open(DialogComponent);
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.length > 0) {
        this.renameString = result;
        this.saveNode(node, this.renameString)
        this.renameString = ''
      }
    })
  }

}
