import { TextArea } from '../../../component/TextArea/TextArea';
import type { Component } from '../../../local_modules/component/component';

export class InstructionInput extends TextArea {
  constructor(
    parent: Component,
    value = '',
    placeholder?: string,
    className?: string,
  ) {
    super(parent, value, placeholder, className);
  }

  view() {
    const view = super.view();
    this.editableElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.altKey)) {
        e.preventDefault();
        this.node.dispatchEvent(
          new CustomEvent('submit', {
            detail: {
              role: e.ctrlKey ? 'system' : 'developer',
            },
          }),
        );
      }
    });
    return view;
  }
}
