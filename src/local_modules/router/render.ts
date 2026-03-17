import type { Component, ComponentConstructor } from '../component/component';

export function render<T extends Node>(
  parent: Component,
  componentConstructor: ComponentConstructor | Promise<ComponentConstructor>,
  layoutNode?: Node,
  replaceNode?: boolean,
): Promise<Node> {
  if (componentConstructor instanceof Promise) {
    return componentConstructor.then((c) =>
      render(parent, c, layoutNode, replaceNode),
    );
  } else {
    const contentElement = parent.setContentComponent(
      componentConstructor,
      replaceNode ? layoutNode : undefined,
    );
    if (parent) {
      if (layoutNode && replaceNode) {
        layoutNode.parentElement?.replaceChild(contentElement, layoutNode);
      } else {
        parent.ensureView().appendChild(contentElement);
      }
    }

    return Promise.resolve(contentElement as T);
  }
}
