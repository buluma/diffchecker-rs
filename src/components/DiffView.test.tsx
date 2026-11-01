import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiffView } from './DiffView';
import { computeDiff } from '../utils/diff';
import { DEFAULT_DIFF_OPTIONS } from '../types/diff';

// Inline diff spans swap spaces for non-breaking spaces so they survive white-space collapsing
const paneText = (container: HTMLElement, side: 'left' | 'right') =>
  container.querySelector(`.diff-side-${side} .diff-line-content`)?.textContent?.replace(/ /g, ' ');

describe('DiffView modified lines', () => {
  const { lines } = computeDiff('let a = 1;', 'let a = 2;', DEFAULT_DIFF_OPTIONS);

  it('shows only the original text on the left and only the changed text on the right', () => {
    const { container } = render(
      <DiffView lines={lines} options={DEFAULT_DIFF_OPTIONS} originalLanguage="plaintext" changedLanguage="plaintext" />,
    );

    expect(paneText(container, 'left')).toBe('let a = 1;');
    expect(paneText(container, 'right')).toBe('let a = 2;');
  });

  it('marks removed characters on the left and added characters on the right', () => {
    const { container } = render(
      <DiffView lines={lines} options={DEFAULT_DIFF_OPTIONS} originalLanguage="plaintext" changedLanguage="plaintext" />,
    );

    expect(container.querySelector('.diff-side-left .char-diff-removed')?.textContent).toBe('1');
    expect(container.querySelector('.diff-side-right .char-diff-added')?.textContent).toBe('2');
    expect(container.querySelector('.diff-side-left .char-diff-added')).toBeNull();
    expect(container.querySelector('.diff-side-right .char-diff-removed')).toBeNull();
  });
});

// jsdom has no layout, so give elements a scrollTop we can read back and fake row positions
function trackScrollTop(element: Element) {
  let value = 0;
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    get: () => value,
    set: (next: number) => { value = next; },
  });
}

const setup = (text: { original: string; changed: string }, options = DEFAULT_DIFF_OPTIONS) => {
  const { lines } = computeDiff(text.original, text.changed, options);
  const view = render(
    <DiffView lines={lines} options={options} originalLanguage="plaintext" changedLanguage="plaintext" />,
  );
  const scroller = view.container.querySelector('.diff-side-by-side') as HTMLElement;
  trackScrollTop(scroller);
  return { ...view, scroller };
};

describe('DiffView shared rows', () => {
  it('puts both sides of every line in one row, so wrapped lines stay aligned', () => {
    const { container } = setup({ original: 'a\nb\nc', changed: 'a\nc' });
    const rows = container.querySelectorAll('.diff-side-by-side .diff-row');

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.querySelector('.diff-side-left')).not.toBeNull();
      expect(row.querySelector('.diff-side-right')).not.toBeNull();
    }
    // The removed line sits on the left with an empty cell opposite it
    expect(rows[1].querySelector('.diff-side-left .diff-line-content')?.textContent).toBe('b');
    expect(rows[1].querySelector('.diff-side-right .diff-line-content')?.textContent).toBe('');
  });

  it('scrolls both sides together by using a single scroll container', () => {
    const { container } = setup({ original: 'a\nb', changed: 'a\nc' });

    expect(container.querySelectorAll('.diff-side-by-side')).toHaveLength(1);
    expect(container.querySelector('.diff-side-by-side')?.textContent).toContain('Original');
    expect(container.querySelector('.diff-side-by-side')?.textContent).toContain('Changed');
  });
});

describe('DiffView change navigation', () => {
  // Two separate change groups: line 2 and line 6
  const text = {
    original: 'keep\nfirst old value\nkeep\nkeep\nkeep\nsecond old value\nkeep',
    changed: 'keep\nfirst new value\nkeep\nkeep\nkeep\nsecond new value\nkeep',
  };

  const fakeRowPositions = () => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      const group = this.getAttribute?.('data-change-group');
      const top = group === null || group === undefined ? 0 : (Number(group) + 1) * 1000;
      return { top, bottom: top, left: 0, right: 0, width: 0, height: 0, x: 0, y: top, toJSON: () => ({}) };
    };
    return () => { Element.prototype.getBoundingClientRect = original; };
  };

  it('jumps to the next change, wrapping to the first after the last', async () => {
    const restore = fakeRowPositions();
    try {
      const user = userEvent.setup();
      const { scroller } = setup(text);

      expect(screen.getByText('2 changes')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /next change/i }));
      expect(scroller.scrollTop).toBe(1000);
      expect(screen.getByText('1 of 2')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /next change/i }));
      expect(scroller.scrollTop).toBe(2000 + 1000);

      await user.click(screen.getByRole('button', { name: /next change/i }));
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('goes to the last change when going back from the start', async () => {
    const user = userEvent.setup();
    setup(text);

    await user.click(screen.getByRole('button', { name: /previous change/i }));

    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });

  it('says so when there is nothing to navigate', () => {
    setup({ original: 'same', changed: 'same' });

    expect(screen.getByText('No differences')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next change/i })).not.toBeInTheDocument();
  });
});

describe('DiffView line wrapping', () => {
  it('only wraps lines when the option is on', () => {
    const off = setup({ original: 'a', changed: 'b' });
    expect(off.container.querySelector('.diff-view')).not.toHaveClass('diff-view-wrap');
    off.unmount();

    const on = setup({ original: 'a', changed: 'b' }, { ...DEFAULT_DIFF_OPTIONS, wrapLines: true });
    expect(on.container.querySelector('.diff-view')).toHaveClass('diff-view-wrap');
  });
});

describe('DiffView collapsed context accessibility', () => {
  it('exposes unchanged-line expansion as a keyboard-operable button', async () => {
    const user = userEvent.setup();
    const options = { ...DEFAULT_DIFF_OPTIONS, hideUnchangedLines: true };
    const { lines } = computeDiff('before\nold\nafter', 'before\nnew\nafter', options);
    render(<DiffView lines={lines} options={options} originalLanguage="plaintext" changedLanguage="plaintext" />);
    const expand = screen.getAllByRole('button', { name: /show .*unchanged line/i })[0];

    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand.tagName).toBe('BUTTON');
    expand.focus();
    expect(document.activeElement).toBe(expand);
    await user.click(expand);

    expect(expand).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('DiffView change markers', () => {
  // jsdom has no layout: fake a 1000px tall scroll area where change group N starts at (N + 1) * 100 and is 50 tall
  const fakeLayout = () => {
    const rect = Element.prototype.getBoundingClientRect;
    const scrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight');
    Element.prototype.getBoundingClientRect = function () {
      const group = this.getAttribute?.('data-change-group');
      const top = group === null || group === undefined ? 0 : (Number(group) + 1) * 100;
      const height = group === null || group === undefined ? 0 : 50;
      return { top, bottom: top + height, left: 0, right: 0, width: 0, height, x: 0, y: top, toJSON: () => ({}) };
    };
    Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => 1000 });
    return () => {
      Element.prototype.getBoundingClientRect = rect;
      Object.defineProperty(Element.prototype, 'scrollHeight', scrollHeight!);
    };
  };

  const text = {
    original: 'keep\nold value\nkeep\nkeep\nkeep\nremoved line\nkeep\nkeep',
    changed: 'keep\nnew value\nkeep\nkeep\nkeep\nkeep\nkeep\nadded line',
  };

  it('puts one marker per change where it sits in the scrollable area', () => {
    const restore = fakeLayout();
    try {
      const { container } = setup(text);
      const markers = container.querySelectorAll<HTMLElement>('.diff-marker');

      expect(markers).toHaveLength(3);
      expect(markers[0].style.top).toBe('10%');
      expect(markers[0].style.height).toBe('5%');
      expect(markers[1].style.top).toBe('20%');
      expect(markers[2].style.top).toBe('30%');
    } finally {
      restore();
    }
  });

  it('colours each marker by the kind of change', () => {
    const restore = fakeLayout();
    try {
      const { container } = setup(text);
      const markers = container.querySelectorAll('.diff-marker');

      expect(markers[0]).toHaveClass('diff-marker-modified');
      expect(markers[1]).toHaveClass('diff-marker-removed');
      expect(markers[2]).toHaveClass('diff-marker-added');
    } finally {
      restore();
    }
  });

  it('scrolls to the change when its marker is clicked', async () => {
    const restore = fakeLayout();
    try {
      const user = userEvent.setup();
      const { scroller } = setup(text);

      await user.click(screen.getByRole('button', { name: /go to change 2 of 3/i }));

      expect(scroller.scrollTop).toBe(200);
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('highlights the marker of the change being viewed', async () => {
    const restore = fakeLayout();
    try {
      const user = userEvent.setup();
      const { container } = setup(text);
      expect(container.querySelector('.diff-marker-active')).toBeNull();

      await user.click(screen.getByRole('button', { name: /next change/i }));

      expect(container.querySelectorAll('.diff-marker')[0]).toHaveClass('diff-marker-active');
    } finally {
      restore();
    }
  });

  it('shows markers in the unified view too', () => {
    const restore = fakeLayout();
    try {
      const options = { ...DEFAULT_DIFF_OPTIONS, viewMode: 'unified' as const };
      const { container } = render(
        <DiffView
          lines={computeDiff(text.original, text.changed, options).lines}
          options={options}
          originalLanguage="plaintext"
          changedLanguage="plaintext"
        />,
      );

      expect(container.querySelectorAll('.diff-marker')).toHaveLength(3);
    } finally {
      restore();
    }
  });

  it('has no markers when nothing differs', () => {
    const { container } = setup({ original: 'same', changed: 'same' });

    expect(container.querySelector('.diff-ruler')).toBeNull();
  });
});
