/**
 * Recursive Node
 */
export interface Node {
    children?: Node[];
    item: string;
    type: number;
    sequenceId?: number;
    isActive?: boolean
}

/**
 * Flat Node for each element
 */
export interface FlatNode {
    item: string;
    type: number;
    level: number;
    expandable: boolean;
    sequenceId?: number;
    isActive?: boolean;
}

/**
 * Filter
 */
export interface Filter {
    key: number,
    value: string
}