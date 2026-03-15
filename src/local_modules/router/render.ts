import type { Component, ComponentConstructor } from "../component/component";

export function render<T extends Node>(
  parent: Component,
  componentConstructor: ComponentConstructor | Promise<ComponentConstructor>,
  layoutNode?: Node,
): Promise<Node> {
  if (componentConstructor instanceof Promise) {
    return componentConstructor.then((c) => render(parent, c, layoutNode));
  } else {
    const contentElement = parent.setContentComponent(componentConstructor);
    (layoutNode ?? parent.ensureView()).appendChild(contentElement);
    
    return Promise.resolve(contentElement as T);
  }
}
