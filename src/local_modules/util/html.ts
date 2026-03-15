import { browserFeatures } from '../browser-features';
import { Component } from '../component/component';

export function appendChildren(parent: Node, children: (Node | null)[]) {
  for (let i = 0; i < children.length; i++) {
    if (children[i]) {
      parent.appendChild(children[i] as Node);
    }
  }
}
export function element<T extends keyof HTMLElementTagNameMap>(elementType: T) {
  return document.createElement<T>(elementType);
}

export function text(textValue = '') {
  return document.createTextNode(textValue);
}

const htmlSanitizer = element('div');
const HTMLReplacementComment = '__htmlelement';

export function escapeHTML(text: string) {
  htmlSanitizer.textContent = text;
  return htmlSanitizer.innerHTML;
}
export function unescapeHTML(text: string) {
  htmlSanitizer.innerHTML = text;
  return htmlSanitizer.textContent;
}

export function html(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Node {
  const nodes = mhtml(strings, ...values);

  if (nodes.length === 1) {
    return nodes[0];
  }

  throw new Error(
    'html literal used incorrectly, cannot find root or found multiple roots for given string literal',
  );
}

export function mhtml(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Node[] {
  let finalString = '';

  const recursiveReplaceElements = (localValues: unknown[]) => {
    for (let recursedIdx = 0; recursedIdx < localValues.length; recursedIdx++) {
      if (
        localValues[recursedIdx] instanceof Node ||
        localValues[recursedIdx] instanceof Component
      ) {
        finalString += `<!--${HTMLReplacementComment}-->`;
        elements.push(localValues[recursedIdx] as Node | Component);
      } else if (
        localValues[recursedIdx] !== null &&
        localValues[recursedIdx] !== undefined
      ) {
        finalString += localValues[recursedIdx]?.toString();
      } else if (Array.isArray(localValues[recursedIdx])) {
        recursiveReplaceElements(localValues[recursedIdx] as unknown[]);
      }
    }
  };

  const elements: (Node | Component)[] = [];
  for (let idx = 0; idx < strings.length; idx++) {
    finalString += strings[idx];
    if (idx < values.length) {
      const value = values[idx];
      recursiveReplaceElements(
        Array.isArray(value) ? (value as unknown[]) : [value],
      );
    }
  }

  const fragment = createFragment(finalString.trim());
  if (elements.length) {
    const iter = document.createNodeIterator(
      fragment,
      NodeFilter.SHOW_COMMENT,
      (node) =>
        node.nodeValue === HTMLReplacementComment
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP,
    );
    let nextNode: Node | null;
    while ((nextNode = iter.nextNode())) {
      const element = elements.shift() as Node | Component;
      nextNode.parentNode?.replaceChild(
        element instanceof Node ? element : element.ensureView(),
        nextNode,
      );
    }
  }

  return [...fragment.childNodes];
}

function createFragment(htmlString: string) {
  if (!browserFeatures.supportsTemplate) {
    return document.createRange().createContextualFragment(htmlString);
  }

  const template = document.createElement('template');
  template.innerHTML = htmlString;
  return template.content;
}
