import { Node } from "./node";
import { AbstractNode } from "./node/Abstract";

export interface Comment {
  text: string;
  type: "Block" | "Line";
  start: number;
  end: number;
}

export interface AST extends AbstractNode {
  type: "Program";
  comments: Comment[];
  body: Node[];
}

export * from "./node";
