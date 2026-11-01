import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';

const originalEditor = () => screen.getByPlaceholderText(/^Original text/);
const changedEditor = () => screen.getByPlaceholderText(/^Changed text/);
const compareButton = () => screen.getByRole('button', { name: /compare/i });

describe('App compare flow', () => {
  it('keeps the editors and produces no diff while text is pasted', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('one\ntwo');

    expect(originalEditor()).toHaveValue('one\ntwo');
    expect(changedEditor()).toBeInTheDocument();
    expect(screen.queryByText(/unchanged/)).not.toBeInTheDocument();
  });

  it('disables Compare until one side has content', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(compareButton()).toBeDisabled();

    await user.click(originalEditor());
    await user.paste('text');

    expect(compareButton()).toBeEnabled();
  });

  it('shows the diff above the editors after Compare and closes it with Close Diff', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('same\nold value');
    await user.click(changedEditor());
    await user.paste('same\nnew value');
    await user.click(compareButton());

    expect(await screen.findByText('1 unchanged')).toBeInTheDocument();
    expect(screen.getByText('~1')).toBeInTheDocument();
    expect(originalEditor()).toHaveValue('same\nold value');
    expect(changedEditor()).toHaveValue('same\nnew value');

    await user.click(screen.getByRole('button', { name: /close diff/i }));

    expect(originalEditor()).toHaveValue('same\nold value');
    expect(changedEditor()).toHaveValue('same\nnew value');
    expect(screen.queryByText('1 unchanged')).not.toBeInTheDocument();
  });

  it('updates the diff while the editors under it are edited', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(originalEditor());
    await user.paste('same\nold value');
    await user.click(changedEditor());
    await user.paste('same\nnew value');
    await user.click(compareButton());
    await screen.findByText('~1');

    await user.clear(changedEditor());
    await user.paste('same\nnew value!!');

    await waitFor(() => {
      expect(container.querySelector('.diff-side-by-side')).toHaveTextContent('new value!!');
    });
  });

  it('keeps an empty merged result in merge mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('delete this line');
    await user.click(compareButton());
    await screen.findByRole('button', { name: /merge mode/i });
    await user.click(screen.getByRole('button', { name: /merge mode/i }));

    expect(await screen.findByText('Merged Result (editable)')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  it('hides and shows the editors under the diff', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('a');
    await user.click(compareButton());
    await screen.findByRole('button', { name: /next change/i });

    await user.click(screen.getByRole('button', { name: /hide input/i }));
    expect(screen.queryByPlaceholderText(/^Original text/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next change/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show input/i }));
    expect(originalEditor()).toHaveValue('a');
  });

  it('compares on Ctrl+Enter', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('a');
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByRole('button', { name: /close diff/i })).toBeInTheDocument();
  });

  it('clears back to empty editors', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(originalEditor());
    await user.paste('a');
    await user.click(compareButton());
    await user.click(await screen.findByTitle(/Clear All/));

    expect(originalEditor()).toHaveValue('');
    expect(compareButton()).toBeDisabled();
  });

  it('lets the syntax be picked by hand and resets it on Clear', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    const statusBar = () => container.querySelector('.status-bar');

    await user.click(originalEditor());
    await user.paste('const a = 1;');
    expect(statusBar()).toHaveTextContent(/Original:.*plaintext.*Changed:.*plaintext/);

    await user.selectOptions(screen.getByLabelText(/^Syntax/), 'javascript');
    expect(statusBar()).toHaveTextContent(/Original:.*javascript.*Changed:.*javascript/);

    await user.click(screen.getByTitle(/Clear All/));
    expect(screen.getByLabelText(/^Syntax/)).toHaveValue('');
    expect(statusBar()).toHaveTextContent(/Original:.*plaintext.*Changed:.*plaintext/);
  });

  it('turns line wrapping on from the toolbar', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.click(originalEditor());
    await user.paste('a');
    await user.click(compareButton());
    expect(container.querySelector('.diff-view')).not.toHaveClass('diff-view-wrap');

    await user.click(screen.getByLabelText('Wrap Lines'));

    expect(container.querySelector('.diff-view')).toHaveClass('diff-view-wrap');
  });
});
