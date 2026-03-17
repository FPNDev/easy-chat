const children = Symbol();
const privateNode = Symbol();
const contentChild = Symbol();
const parent = Symbol();

type ComponentConstructor<T extends Node = Node> = {
  new (parent: Component<T>): Component<T>;
};

abstract class Component<T extends Node = Node> {
  private [children] = new Set<Component>();
  private [parent]?: Component;

  // MUST RENDER BEFORE ACCESSING NODE. RENDER IN CONSTRUCTOR WHEN POSSIBLE
  private [privateNode]!: T;
  protected get node() {
    return this[privateNode];
  }

  get parent() {
    return this[parent];
  }

  private [contentChild]?: Component;

  constructor(parentComponent?: Component) {
    if (parentComponent) {
      parentComponent.attach([this]);
    }
  }

  private setParent(parentComponent: Component) {
    this[parent] = parentComponent;
  }

  protected abstract view(): T;
  protected onDisconnect?(): void;

  ensureView() {
    return (this[privateNode] ??= this.view());
  }

  setContentComponent(
    contentComponent: ComponentConstructor,
    replaceWith?: Node,
  ) {
    if (this[contentChild]?.constructor !== contentComponent) {
      if (this[contentChild]) {
        if (replaceWith) {
          const contentView = this[contentChild].ensureView();
          contentView.parentElement?.replaceChild(replaceWith, contentView);
        }
        this[contentChild].destroy();
      }

      this[contentChild] = new contentComponent(this);
    }

    return this[contentChild].ensureView();
  }

  attach(childComponents: Component[]) {
    for (let i = 0, len = childComponents.length; i < len; i++) {
      this[children].add(childComponents[i]);
      childComponents[i].setParent(this);
    }
  }

  disconnect(childComponents: Component[]) {
    for (let i = 0, len = childComponents.length; i < len; i++) {
      this[children].delete(childComponents[i]);
    }
  }

  destroy() {
    for (const child of this[children].values()) {
      child.destroy();
    }
    if (this[privateNode].isConnected) {
      this[privateNode]?.parentNode?.removeChild(this[privateNode]);
    }
    this.onDisconnect?.();

    if (this[parent]) {
      this[parent].disconnect([this]);
    }
  }
}

export { Component };
export type { ComponentConstructor };
