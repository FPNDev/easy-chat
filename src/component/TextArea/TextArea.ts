import { Component } from '../../local_modules/component/component';
import { element, html } from '../../local_modules/util/html';
import classes from './style.module.scss';

export class TextArea extends Component<HTMLDivElement> {
  private placeholderText?: string;
  private className?: string;
  private _value = '';

  private placeholderElement!: HTMLDivElement;
  protected editableElement!: HTMLDivElement;

  get value() {
    return this._value;
  }

  set value(value: string) {
    if (this._value === value) {
      return;
    }

    this._value = value;
    this.editableElement.innerText = value;
    this.showOrHidePlaceholder();
    this.node.dispatchEvent(new Event('input'));
  }

  constructor(
    parent: Component,
    value = '',
    placeholder?: string,
    className?: string,
  ) {
    super(parent);

    this._value = value;
    this.placeholderText = placeholder;
    this.className = className;
  }

  showOrHidePlaceholder = () => {
    if (this._value.length) {
      this.placeholderElement.classList.add('no-display');
    } else {
      this.placeholderElement.classList.remove('no-display');
    }
  };

  view(): HTMLDivElement {
    this.placeholderElement = html`
      <div class=${classes.textfieldPlaceholder}>${this.placeholderText}</div>
    ` as HTMLDivElement;

    // prettier-ignore
    const textField = this.editableElement = html`<div contenteditable>${this._value}</div>` as HTMLDivElement;

    textField.addEventListener('input', () => {
      this._value = textField.innerText.trim();
      this.showOrHidePlaceholder();

      this.node.dispatchEvent(new Event('input'));
    });
    textField.addEventListener('paste', (e) => {
      e.preventDefault();

      // replace windows style new lines with unix style ones
      // to keep caret visibility after paste
      const plainText =
        e.clipboardData?.getData('Text').replace(/\r\n/g, '\n') ?? '';

      const currentSelection = document.getSelection()!;
      const firstRange = currentSelection.getRangeAt(0)!;
      // remove all selected content
      firstRange.deleteContents();
      while (currentSelection.rangeCount > 1) {
        const range = currentSelection.getRangeAt(1);
        range.deleteContents();
        currentSelection.removeRange(range);
      }

      const insertedNode = element('span');
      insertedNode.textContent = plainText;
      firstRange.insertNode(insertedNode);
      firstRange.collapse(false);

      const rightDiff =
        insertedNode.offsetLeft +
        insertedNode.offsetWidth -
        textField.scrollLeft -
        textField.offsetWidth;

      const bottomDiff =
        insertedNode.offsetTop +
        insertedNode.offsetHeight -
        scrollableFieldWrapper.scrollTop -
        scrollableFieldWrapper.clientHeight;

      if (rightDiff > 0) {
        textField.scrollLeft += rightDiff;
      }
      if (bottomDiff > 0) {
        scrollableFieldWrapper.scrollTop += bottomDiff;
      }

      textField.dispatchEvent(
        new InputEvent('input', { inputType: 'insertFromPaste' }),
      );
    });

    textField.addEventListener('keydown', (ev) => {
      if (
        ev.code === 'Enter' &&
        !ev.shiftKey &&
        !ev.ctrlKey &&
        !ev.metaKey &&
        !ev.altKey &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        !(navigator as any).userAgentData?.mobile
      ) {
        ev.preventDefault();
        this.node.dispatchEvent(new SubmitEvent('submit'));
      }
    });

    const scrollableFieldWrapper = html`
      <div class="${classes.textfieldContent} textfield-content">
        ${textField}
      </div>
    ` as HTMLDivElement;

    return html`
      <div class="${classes.textfield} ${this.className}">
        ${this.placeholderElement} ${scrollableFieldWrapper}
      </div>
    ` as HTMLDivElement;
  }
}
